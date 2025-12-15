export type PlanRoom = {
  name: string;
  polygon: number[][]; // meters
  floorMaterial?: string;
};

export type Plan = {
  units: 'meters';
  ceilingHeightMeters: number;
  defaultWallThicknessMeters: number;
  rooms: PlanRoom[];
};

export async function sendBlueprintForPlan(file: File): Promise<Plan> {
  const base64 = await fileToDataUrl(file);
  const endpoint = getNetlifyFunctionUrl('blueprint-to-plan');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blueprint processing failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.plan as Plan;
}

function getNetlifyFunctionUrl(name: string): string {
  // In production or when using Netlify dev as the web server, this relative path works.
  const relative = `/.netlify/functions/${name}`;
  if (typeof window === 'undefined') return relative;
  const port = window.location.port;
  const host = window.location.hostname;
  const netlifyDevPort = (import.meta as any).env?.VITE_NETLIFY_DEV_PORT || '8888';
  const onLocalhost = host === 'localhost' || host === '127.0.0.1';
  const alreadyOnNetlifyDev = onLocalhost && port === String(netlifyDevPort);
  // If running Vite dev (e.g., :3000), point directly at Netlify dev port if available
  if (onLocalhost && !alreadyOnNetlifyDev) {
    return `http://localhost:${netlifyDevPort}/.netlify/functions/${name}`;
  }
  return relative;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


