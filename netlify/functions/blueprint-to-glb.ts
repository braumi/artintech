/*
  Netlify Function: blueprint-to-glb
  - POST: { imageBase64?: string, plan?: Plan, returnPlan?: boolean }
  - If plan is missing, uses OpenAI Vision (gpt-4o-mini) to extract a plan JSON
  - Procedurally builds a simple GLB: floors (triangulated) + walls (segment boxes)
  - Returns GLB as application/octet-stream; if returnPlan=true, returns JSON with plan + base64 GLB
*/

import OpenAI from 'openai';
import earcut from 'earcut';
import { Document, NodeIO, Accessor, Primitive, vec3, Buffer as GltfBuffer } from '@gltf-transform/core';

type PlanRoom = { name: string; polygon: number[][]; floorMaterial?: string };
type Plan = { units: 'meters'; ceilingHeightMeters: number; defaultWallThicknessMeters: number; rooms: PlanRoom[] };

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const ct = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!ct.includes('application/json')) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Content-Type must be application/json' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const imageBase64: string | undefined = body.imageBase64;
    const providedPlan: Plan | undefined = body.plan;
    const returnPlan: boolean = !!body.returnPlan;

    let plan: Plan | null = null;
    if (providedPlan) {
      plan = providedPlan;
    } else if (imageBase64) {
      plan = await extractPlanFromImage(imageBase64);
    } else {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Provide plan or imageBase64' }) };
    }

    if (!plan) throw new Error('Failed to obtain plan');

    const glb = buildGlbFromPlan(plan);

    if (returnPlan) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, glbBase64: Buffer.from(glb).toString('base64') })
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="model.glb"' },
      body: Buffer.from(glb).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
  }
}

async function extractPlanFromImage(imageBase64: string): Promise<Plan> {
  if (!/^data:image\/(png|jpeg|jpg);base64,/.test(imageBase64)) {
    throw new Error('imageBase64 must be a data URL (png/jpeg)');
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const openai = new OpenAI({ apiKey });

  const REQUIRED_SCHEMA_HINT = `Return ONLY valid JSON with this schema:\n{\n  \"units\": \"meters\",\n  \"ceilingHeightMeters\": number,\n  \"defaultWallThicknessMeters\": number,\n  \"rooms\": [\n    { \"name\": string, \"polygon\": [[number, number], ...] }\n  ]\n}\nRules: Coordinates in meters, non-self-intersecting polygons.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' } as any,
    messages: [
      { role: 'system', content: `You are an expert architecture assistant. ${REQUIRED_SCHEMA_HINT}` },
      { role: 'user', content: [
        { type: 'text', text: 'Analyze this blueprint image and return the plan JSON.' },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ] as any }
    ]
  });
  const raw = completion.choices?.[0]?.message?.content || '';
  let plan: Plan;
  try { plan = JSON.parse(raw); } catch { plan = JSON.parse(extractJson(raw)); }
  if (!plan || plan.units !== 'meters' || !Array.isArray(plan.rooms)) {
    throw new Error('Invalid plan JSON');
  }
  return plan;
}

function buildGlbFromPlan(plan: Plan): Uint8Array {
  const doc = new Document();
  const root = doc.getRoot();
  const buffer = doc.createBuffer();

  const floorMat = doc.createMaterial('Floor').setBaseColorFactor([0.86, 0.86, 0.86, 1]);
  const wallMat = doc.createMaterial('Wall').setBaseColorFactor([0.8, 0.8, 0.8, 1]);

  const allPoints: vec3[] = [] as any;
  for (const r of plan.rooms) {
    for (const [x, y] of r.polygon) allPoints.push([x, 0, y] as any);
  }
  // Center geometry
  const bbox = bounds(allPoints);
  const cx = (bbox.min[0] + bbox.max[0]) / 2;
  const cz = (bbox.min[2] + bbox.max[2]) / 2;

  // Floors per room
  for (const room of plan.rooms) {
    const flat: number[] = [];
    for (const [x, y] of room.polygon) { flat.push(x - cx, y - cz); }
    const tri = earcut(flat);
    const positions: number[] = [];
    const uvs: number[] = [];
    for (let i = 0; i < flat.length; i += 2) {
      const x = flat[i];
      const z = flat[i + 1];
      positions.push(x, 0, z);
      uvs.push(x, z);
    }

    const prim = createPrimitive(doc, buffer, new Float32Array(positions), new Uint32Array(tri), new Float32Array(repeatNormal(positions.length/3, [0,1,0])), new Float32Array(uvs));
    const mesh = doc.createMesh(room.name).addPrimitive(prim.setMaterial(floorMat));
    const node = doc.createNode(room.name).setMesh(mesh);
    root.listScenes()[0] ? root.listScenes()[0].addChild(node) : root.createScene('Scene').addChild(node);
  }

  // Walls as thin boxes per edge
  const h = plan.ceilingHeightMeters;
  const t = plan.defaultWallThicknessMeters;
  for (const room of plan.rooms) {
    const poly = room.polygon;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const wall = createWallBox(doc, buffer, [a[0]-cx, 0, a[1]-cz], [b[0]-cx, 0, b[1]-cz], t, h);
      wall.setMaterial(wallMat);
      const mesh = doc.createMesh(`wall-${room.name}-${i}`).addPrimitive(wall);
      const node = doc.createNode(`wall-${room.name}-${i}`).setMesh(mesh);
      root.listScenes()[0] ? root.listScenes()[0].addChild(node) : root.createScene('Scene').addChild(node);
    }
  }

  const io = new NodeIO();
  return io.writeBinary(doc);
}

function createPrimitive(doc: Document, buffer: GltfBuffer, positions: Float32Array, indices: Uint32Array, normals: Float32Array, uvs?: Float32Array): Primitive {
  const posAcc = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(positions).setBuffer(buffer);
  const idxAcc = doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(indices).setBuffer(buffer);
  const nrmAcc = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(normals).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setAttribute('NORMAL', nrmAcc).setIndices(idxAcc);
  if (uvs) {
    const uvAcc = doc.createAccessor().setType(Accessor.Type.VEC2).setArray(uvs).setBuffer(buffer);
    prim.setAttribute('TEXCOORD_0', uvAcc);
  }
  return prim;
}

function createWallBox(doc: Document, buffer: GltfBuffer, a: number[], b: number[], thickness: number, height: number): Primitive {
  // Build a box aligned with segment AB (X,Z plane), centered on the segment, with given thickness (perpendicular to edge)
  const ax = a[0], az = a[2];
  const bx = b[0], bz = b[2];
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx*dx + dz*dz) || 0.0001;
  const ux = dx / len, uz = dz / len; // along edge
  const px = -uz, pz = ux; // perpendicular
  const halfT = thickness / 2;

  // Rectangle corners on ground
  const g1 = [ax + px*halfT, 0, az + pz*halfT];
  const g2 = [bx + px*halfT, 0, bz + pz*halfT];
  const g3 = [bx - px*halfT, 0, bz - pz*halfT];
  const g4 = [ax - px*halfT, 0, az - pz*halfT];

  // 8 vertices (bottom and top)
  const v = [g1,g2,g3,g4].flatMap(([x,y,z]) => [
    x, y, z,
    x, y+height, z
  ]);

  // Indices for 12 triangles (6 faces)
  // Faces: bottom (0,3,2,1), top (5,6,7,4), and four sides
  const indices = [
    0,6,4, 0,2,6, // bottom
    1,5,7, 1,7,3, // top
    0,1,5, 0,5,4, // side1
    1,2,6, 1,6,5, // side2
    2,3,7, 2,7,6, // side3
    3,0,4, 3,4,7  // side4
  ];

  const positions = new Float32Array(v);
  const indicesArr = new Uint32Array(indices);
  const normals = computeFlatNormals(positions, indicesArr);
  return createPrimitive(doc, buffer, positions, indicesArr, normals);
}

function computeFlatNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]*3, i1 = indices[i+1]*3, i2 = indices[i+2]*3;
    const ax = positions[i0], ay = positions[i0+1], az = positions[i0+2];
    const bx = positions[i1], by = positions[i1+1], bz = positions[i1+2];
    const cx = positions[i2], cy = positions[i2+1], cz = positions[i2+2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    // cross
    const nx = uy*vz - uz*vy;
    const ny = uz*vx - ux*vz;
    const nz = ux*vy - uy*vx;
    normals[i0] += nx; normals[i0+1] += ny; normals[i0+2] += nz;
    normals[i1] += nx; normals[i1+1] += ny; normals[i1+2] += nz;
    normals[i2] += nx; normals[i2+1] += ny; normals[i2+2] += nz;
  }
  // normalize
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i], ny = normals[i+1], nz = normals[i+2];
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i] = nx/len; normals[i+1] = ny/len; normals[i+2] = nz/len;
  }
  return normals;
}

function repeatNormal(count: number, n: [number,number,number]): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(n[0], n[1], n[2]);
  return out;
}

function bounds(points: vec3[]) {
  const min: vec3 = [Infinity, Infinity, Infinity] as any;
  const max: vec3 = [-Infinity, -Infinity, -Infinity] as any;
  for (const p of points) {
    min[0] = Math.min(min[0], p[0]);
    min[1] = Math.min(min[1], p[1]);
    min[2] = Math.min(min[2], p[2]);
    max[0] = Math.max(max[0], p[0]);
    max[1] = Math.max(max[1], p[1]);
    max[2] = Math.max(max[2], p[2]);
  }
  return { min, max };
}

function extractJson(text: string): string {
  try { JSON.parse(text); return text; } catch {}
  const match = text.match(/\{[\s\S]*\}$/);
  if (match) return match[0];
  throw new Error('Failed to parse JSON');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}


