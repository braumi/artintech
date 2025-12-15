/*
  Netlify Function: blueprint-to-plan
  - Accepts POST JSON { imageBase64: string }
  - Calls OpenAI Vision to extract apartment plan geometry
  - Returns structured JSON describing rooms and walls suitable for 3D rendering
*/

import OpenAI from 'openai';

type PlanRoom = {
  name: string;
  polygon: number[][]; // [ [x,y], ... ] in meters
  floorMaterial?: string;
};

type Plan = {
  units: 'meters';
  ceilingHeightMeters: number;
  defaultWallThicknessMeters: number;
  rooms: PlanRoom[];
};

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
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('application/json')) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Content-Type must be application/json' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const imageBase64: string | undefined = body.imageBase64;
    if (!imageBase64 || !/^data:image\/(png|jpeg|jpg);base64,/.test(imageBase64)) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'imageBase64 data URL (png/jpeg) is required' })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Server misconfigured: OPENAI_API_KEY is missing' })
      };
    }

    const openai = new OpenAI({ apiKey });

    const system = `You are an expert architectural assistant. Extract structured apartment geometry from a blueprint image. ${REQUIRED_SCHEMA_HINT}`;
    const user: any = {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this blueprint image and return the plan JSON.' },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    };

    // Use GPT-4o-mini with JSON mode for deterministic parsing
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' } as any,
      messages: [
        { role: 'system', content: system },
        user
      ]
    });

    const rawText = completion.choices?.[0]?.message?.content || '';

    // Parse JSON directly; fallback to loose extraction if needed
    let plan: Plan;
    try {
      plan = JSON.parse(rawText);
    } catch {
      const jsonText = extractJson(rawText);
      plan = JSON.parse(jsonText);
    }

    // Basic validation
    if (!plan || plan.units !== 'meters' || !Array.isArray(plan.rooms)) {
      throw new Error('Invalid plan JSON shape');
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    };
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message })
    };
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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
  throw new Error('Failed to parse JSON from model output');
}


