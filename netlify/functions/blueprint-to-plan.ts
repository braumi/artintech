/*
  Netlify Function: blueprint-to-plan
  - Accepts POST JSON { imageBase64: string }
  - Tries CubiCasa5k API first (if configured) to extract walls, doors, windows
  - Falls back to OpenAI Vision API if CubiCasa5k is not available
  - Returns structured JSON describing rooms, walls, doors, windows suitable for 3D rendering

  CubiCasa5k API Configuration:
  - Set CUBICASA_API_URL environment variable to your API endpoint
  - Optional: Set CUBICASA_API_KEY for authentication
  - Example: CUBICASA_API_URL=https://api.example.com/v1/floorplan/parse
  
  Expected CubiCasa5k API format:
  POST { image: "data:image/png;base64,..." }
  Response: {
    walls?: [{ type: "wall", points: [[x,y],...], thickness?: number }],
    doors?: [{ type: "door", points: [[x,y],...], opening_direction?: string }],
    windows?: [{ type: "window", points: [[x,y],...] }],
    rooms?: [{ type: "room", points: [[x,y],...], room_type?: string }],
    image_width?: number,
    image_height?: number
  }
*/

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

type PlanRoom = {
  name: string;
  polygon: number[][]; // [ [x,y], ... ] in meters
  floorMaterial?: string;
};

type PlanDoor = {
  polygon: number[][]; // door opening outline
  opening_direction?: string;
};

type PlanWindow = {
  polygon: number[][]; // window outline
};

type Plan = {
  units: "meters";
  ceilingHeightMeters: number;
  defaultWallThicknessMeters: number;
  rooms: PlanRoom[];
  doors?: PlanDoor[];
  windows?: PlanWindow[];
};

// CubiCasa5k API response types
type CubiCasaWall = {
  type: "wall";
  points: number[][]; // [[x, y], ...] in pixels
  thickness?: number;
};

type CubiCasaDoor = {
  type: "door";
  points: number[][];
  opening_direction?: string;
};

type CubiCasaWindow = {
  type: "window";
  points: number[][];
};

type CubiCasaRoom = {
  type: "room";
  points: number[][];
  room_type?: string;
};

type CubiCasaResponse = {
  walls?: CubiCasaWall[];
  doors?: CubiCasaDoor[];
  windows?: CubiCasaWindow[];
  rooms?: CubiCasaRoom[];
  image_width?: number;
  image_height?: number;
};

/**
 * Calls CubiCasa5k API to extract walls, doors, windows from blueprint
 * Returns null if API is not configured or fails
 */
async function callCubiCasaAPI(
  imageBase64: string
): Promise<Plan | null> {
  const apiUrl =
    process.env.CUBICASA_API_URL || process.env.VITE_CUBICASA_API_URL;
  if (!apiUrl) {
    // eslint-disable-next-line no-console
    console.log("[blueprint-to-plan] CubiCasa5k API not configured, skipping");
    return null;
  }

  try {
    // eslint-disable-next-line no-console
    console.log("[blueprint-to-plan] Calling CubiCasa5k API", { apiUrl });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CUBICASA_API_KEY && {
          Authorization: `Bearer ${process.env.CUBICASA_API_KEY}`,
        }),
      },
      body: JSON.stringify({
        image: imageBase64,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.warn(
        "[blueprint-to-plan] CubiCasa5k API error",
        response.status,
        errorText
      );
      return null;
    }

    const data: CubiCasaResponse = await response.json();
    // eslint-disable-next-line no-console
    console.log("[blueprint-to-plan] CubiCasa5k API response", {
      walls: data.walls?.length || 0,
      doors: data.doors?.length || 0,
      windows: data.windows?.length || 0,
      rooms: data.rooms?.length || 0,
    });

    // Convert CubiCasa5k format to our Plan format
    return convertCubiCasaToPlan(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[blueprint-to-plan] CubiCasa5k API exception", err);
    return null;
  }
}

/**
 * Converts CubiCasa5k API response to our Plan format
 */
function convertCubiCasaToPlan(data: CubiCasaResponse): Plan {
  const imageWidth = data.image_width || 1000; // default fallback
  const imageHeight = data.image_height || 1000;
  
  // Estimate scale: assume blueprint represents ~20m x 20m typical apartment
  // This is a heuristic - adjust based on your typical blueprint sizes
  const scaleX = 20 / imageWidth; // meters per pixel
  const scaleY = 20 / imageHeight;
  const scale = Math.min(scaleX, scaleY); // use smaller to ensure fit

  // Convert pixel coordinates to meters
  const pixelsToMeters = (points: number[][]): number[][] => {
    return points.map(([x, y]) => [x * scale, y * scale]);
  };

  // Extract doors from CubiCasa5k response
  const doors: PlanDoor[] = [];
  if (data.doors && data.doors.length > 0) {
    for (const door of data.doors) {
      if (door.points && door.points.length >= 2) {
        doors.push({
          polygon: pixelsToMeters(door.points),
          opening_direction: door.opening_direction,
        });
      }
    }
  }

  // Extract windows from CubiCasa5k response
  const windows: PlanWindow[] = [];
  if (data.windows && data.windows.length > 0) {
    for (const window of data.windows) {
      if (window.points && window.points.length >= 2) {
        windows.push({
          polygon: pixelsToMeters(window.points),
        });
      }
    }
  }

  // Extract rooms from CubiCasa5k response
  const rooms: PlanRoom[] = [];
  if (data.rooms && data.rooms.length > 0) {
    for (const room of data.rooms) {
      if (room.points && room.points.length >= 3) {
        const polygon = pixelsToMeters(room.points);
        rooms.push({
          name: room.room_type || "Room",
          polygon,
        });
      }
    }
  } else if (data.walls && data.walls.length > 0) {
    // If no rooms provided, try to infer from walls
    // Group walls that form closed loops
    const wallSegments = data.walls.map((wall) => ({
      points: pixelsToMeters(wall.points),
      thickness: wall.thickness
        ? wall.thickness * scale
        : 0.1, // default 10cm
    }));

    // Simple approach: create rooms from wall-enclosed regions
    // This is a simplified version - you may want more sophisticated polygon detection
    // For now, we'll create a bounding box approach or use the walls to define rooms
    // This is a placeholder - you'd need proper polygon clipping/union logic here
    if (wallSegments.length > 0) {
      // Find bounding box of all walls
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      wallSegments.forEach((seg) => {
        seg.points.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      });

      // Create a single room from the bounding box (simplified)
      // In production, you'd want proper room detection from wall loops
      if (minX < maxX && minY < maxY) {
        rooms.push({
          name: "Main Room",
          polygon: [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
          ],
        });
      }
    }
  }

  // Calculate average wall thickness from walls
  let avgWallThickness = 0.1; // default 10cm
  if (data.walls && data.walls.length > 0) {
    const thicknesses = data.walls
      .map((w) => w.thickness)
      .filter((t): t is number => t !== undefined);
    if (thicknesses.length > 0) {
      avgWallThickness =
        (thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length) * scale;
    }
  }

  return {
    units: "meters",
    ceilingHeightMeters: 2.8, // default ceiling height
    defaultWallThicknessMeters: Math.max(0.05, Math.min(0.2, avgWallThickness)), // clamp between 5cm and 20cm
    rooms: rooms.length > 0 ? rooms : [
      // Fallback: create a default room if none detected
      {
        name: "Room",
        polygon: [
          [0, 0],
          [5, 0],
          [5, 5],
          [0, 5],
        ],
      },
    ],
    doors: doors.length > 0 ? doors : undefined,
    windows: windows.length > 0 ? windows : undefined,
  };
}

const REQUIRED_SCHEMA_HINT = `
Return ONLY valid JSON with this schema:
{
  "units": "meters",
  "ceilingHeightMeters": number,
  "defaultWallThicknessMeters": number,
  "rooms": [
    { "name": string, "polygon": [[number, number], ...], "floorMaterial"?: string }
  ]
}

Rules:
- Coordinates must be meters, not pixels. Estimate scale realistically from blueprint annotations and typical room sizes.
- The origin (0,0) can be the bottom-left of the overall plan; ensure all coordinates are non-negative.
- Polygons must be simple, non-self-intersecting, counter-clockwise, and closed implicitly (first point repeats is not necessary).
- Prefer fewer than 20 vertices per room polygon; simplify corners sensibly.
`;

export async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Debug: trace incoming request meta
    // eslint-disable-next-line no-console
    console.log("[blueprint-to-plan] handler invoked", {
      method: event.httpMethod,
      path: event.path,
    });
    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.includes("application/json")) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "Content-Type must be application/json",
        }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const imageBase64: string | undefined = body.imageBase64;
    if (
      !imageBase64 ||
      !/^data:image\/(png|jpeg|jpg);base64,/.test(imageBase64)
    ) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "imageBase64 data URL (png/jpeg) is required",
        }),
      };
    }

    // Prefer a server-only key, but fall back to VITE_OPENAI_API_KEY in local/dev
    const apiKey =
      process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({
          error:
            "Server misconfigured: OPENAI_API_KEY (or VITE_OPENAI_API_KEY) is missing",
        }),
      };
    }

    const openai = new OpenAI({ apiKey });

    // Optional preprocessing via scripts/remove_interior_lines.py
    const maybeRunPreprocessor = async (dataUrl: string): Promise<string> => {
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!match) return dataUrl;

      // Locate script in common local/dev layouts
      const candidateScripts = [
        path.join(__dirname, "..", "..", "scripts", "remove_interior_lines.py"), // when bundled next to netlify functions
        path.join(__dirname, "..", "scripts", "remove_interior_lines.py"),
        path.join(process.cwd(), "scripts", "remove_interior_lines.py"), // local dev from repo root
      ];
      const scriptPath = candidateScripts.find((p) => fs.existsSync(p));
      if (!scriptPath) {
        // eslint-disable-next-line no-console
        console.warn(
          "[blueprint-to-plan] remove_interior_lines.py not found; skipping preprocessing",
          { searchPaths: candidateScripts }
        );
        return dataUrl;
      }

      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const buf = Buffer.from(match[2], "base64");
      const tmpIn = path.join(tmpdir(), `bp_in.${ext}`);
      const tmpOut = path.join(tmpdir(), `bp_out.png`);
      await fs.promises.writeFile(tmpIn, buf);

      try {
        // eslint-disable-next-line no-console
        console.log("[blueprint-to-plan] running Python preprocessor", {
          scriptPath,
          tmpIn,
          tmpOut,
        });
        await promisify(execFile)("python3", [scriptPath, tmpIn, tmpOut], {
          timeout: 15000,
        });
        const cleaned = await fs.promises.readFile(tmpOut);
        // eslint-disable-next-line no-console
        console.log("[blueprint-to-plan] preprocessing complete, using cleaned image");
        return `data:image/png;base64,${cleaned.toString("base64")}`;
      } catch (err) {
        // If preprocessing fails, fall back to original image
        // eslint-disable-next-line no-console
        console.warn(
          "[blueprint-to-plan] preprocessing failed, using original image",
          err
        );
        return dataUrl;
      } finally {
        // best-effort cleanup
        void fs.promises.unlink(tmpIn).catch(() => {});
        void fs.promises.unlink(tmpOut).catch(() => {});
      }
    };

    const preprocessedImage = await maybeRunPreprocessor(imageBase64);
    // Debug: indicate whether image was changed
    // eslint-disable-next-line no-console
    console.log(
      "[blueprint-to-plan] image preprocessed",
      preprocessedImage === imageBase64 ? "original-used" : "cleaned-used"
    );

    // Try CubiCasa5k API first if configured
    let plan: Plan | null = await callCubiCasaAPI(preprocessedImage);
    
    // Fall back to OpenAI if CubiCasa5k is not available or failed
    if (!plan) {
      // eslint-disable-next-line no-console
      console.log("[blueprint-to-plan] Using OpenAI Vision API as fallback");
      
      const system = `
You are a computer-vision architectural parser.

Your task is to extract ONLY structural walls from a blueprint image and return
ONLY room polygons formed exclusively by those walls.

You must be conservative.
If uncertain, exclude geometry rather than guessing.

========================
WALL IDENTIFICATION RULES
========================

Walls are the darkest, thickest, and most continuous strokes in the entire image.

ONLY consider strokes within the TOP 5% of stroke thickness globally.
Any stroke thinner than the exterior perimeter walls is NOT a wall.

A stroke qualifies as a wall ONLY IF:
1. It matches the dominant wall stroke thickness
2. It connects to other walls
3. It contributes to enclosing a room

If removing a stroke does NOT break room enclosure, it is NOT a wall.

====================
ABSOLUTE EXCLUSIONS
====================

NEVER trace or infer walls from:
- Furniture (beds, sofas, tables, chairs)
- Built-ins or cabinetry (kitchen counters, wardrobes, closets)
- Appliances (stoves, ovens, refrigerators, washers/dryers)
- Plumbing fixtures (toilets, sinks, showers, tubs, vanities)
- Doors, door swings, frames, hinges
- Windows or glazing lines
- Dashed, dotted, or broken lines
- Thin interior partitions or guides
- Floor tiles, grids, hatching, shading
- Symbols, icons, annotations, or dimensions

If a shape could plausibly be furniture, it is NOT a wall.

========================
THICKNESS & AREA FILTERS
========================

Reject any stroke or shape:
- Thinner than ~0.15 meters equivalent
- With area < 0.5 m²

Exception ONLY if it connects two qualifying wall segments
AND matches their thickness exactly.

========================
CONFLICT RESOLUTION RULE
========================

When ambiguous:
- Prefer under-extraction
- Missing a wall is acceptable
- Tracing furniture is NOT acceptable

================
ROOM & FLOOR LOGIC
================

Return ONLY room polygons formed by closed wall loops.

Each room polygon represents the FLOOR of that room.
Floors must be perfectly contained within walls.

DO NOT:
- Create a bounding box
- Create a convex hull
- Merge multiple rooms
- Fill the entire apartment outline
- Infer missing boundaries
- Use furniture or symbols to guide geometry

If walls do not form a closed enclosure, DO NOT return a room.

=================
FAILURE CONDITION
=================

If ANY furniture, fixture, or interior detailing influenced wall placement,
RETURN AN EMPTY RESULT.

${REQUIRED_SCHEMA_HINT}
`;

      const user: any = {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this blueprint image and return the plan JSON.",
          },
          { type: "image_url", image_url: { url: preprocessedImage } },
        ],
      };

      // Use GPT-4o-mini with JSON mode for deterministic parsing
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" } as any,
        messages: [{ role: "system", content: system }, user],
      });

      const rawText = completion.choices?.[0]?.message?.content || "";

      // Parse JSON directly; fallback to loose extraction if needed
      try {
        plan = JSON.parse(rawText);
      } catch {
        const jsonText = extractJson(rawText);
        plan = JSON.parse(jsonText);
      }
    }

    // Basic validation
    if (!plan || plan.units !== "meters" || !Array.isArray(plan.rooms)) {
      throw new Error("Invalid plan JSON shape");
    }

    // Defensive filtering to enforce walls-only output
    const furnitureTerms = [
      "sofa",
      "chair",
      "table",
      "bed",
      "sink",
      "toilet",
      "shower",
      "bathtub",
      "cabinet",
      "stove",
      "oven",
      "fridge",
      "wardrobe",
      "closet",
      "washer",
      "dryer",
      "appliance",
      "fixture",
      "island",
    ];

    plan.rooms = plan.rooms.filter((room) => {
      if (!room || !Array.isArray(room.polygon)) return false;
      const name = (room.name || "").toLowerCase();
      if (furnitureTerms.some((term) => name.includes(term))) return false;
      const area = polygonArea(room.polygon);
      // Allow very small rooms but drop clearly degenerate polygons
      if (!Number.isFinite(area) || area <= 0) return false;
      return true;
    });

    if (plan.rooms.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[blueprint-to-plan] model returned no usable rooms after filtering; returning original plan"
      );
      // fall back to unfiltered rooms instead of failing hard
      plan.rooms = (plan as any).rooms ?? [];
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[blueprint-to-plan] unhandled error", err);
    const message = err?.message || "Unknown error";
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function extractJson(text: string): string {
  try {
    // If the whole content is JSON
    JSON.parse(text);
    return text;
  } catch {}

  const match = text.match(/\{[\s\S]*\}$/);
  if (match) return match[0];
  throw new Error("Failed to parse JSON from model output");
}

function polygonArea(points: number[][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}
