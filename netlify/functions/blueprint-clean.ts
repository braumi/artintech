/*
  Netlify Function: blueprint-clean
  - Accepts POST JSON { imageBase64: string }
  - Runs the same Python preprocessing (remove_interior_lines.py) used by blueprint-to-plan
  - Returns { cleanedImageBase64: string } data URL
*/

import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const PY_TIMEOUT_MS = 15000;

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

    const cleaned = await runPreprocessor(imageBase64);

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ cleanedImageBase64: cleaned }),
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[blueprint-clean] unhandled error", err);
    const message = err?.message || "Unknown error";
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message }),
    };
  }
}

async function runPreprocessor(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!match) return dataUrl;

  const candidateScripts = [
    path.join(__dirname, "..", "..", "scripts", "remove_interior_lines.py"),
    path.join(__dirname, "..", "scripts", "remove_interior_lines.py"),
    path.join(process.cwd(), "scripts", "remove_interior_lines.py"),
  ];
  const scriptPath = candidateScripts.find((p) => fs.existsSync(p));
  if (!scriptPath) {
    // eslint-disable-next-line no-console
    console.warn(
      "[blueprint-clean] remove_interior_lines.py not found; returning original image",
      { searchPaths: candidateScripts }
    );
    return dataUrl;
  }

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buf = Buffer.from(match[2], "base64");
  const tmpIn = path.join(tmpdir(), `bp_in_${Date.now()}.${ext}`);
  const tmpOut = path.join(tmpdir(), `bp_out_${Date.now()}.png`);
  await fs.promises.writeFile(tmpIn, buf);

  try {
    // eslint-disable-next-line no-console
    console.log("[blueprint-clean] running Python preprocessor", {
      scriptPath,
      tmpIn,
      tmpOut,
    });
    await promisify(execFile)("python3", [scriptPath, tmpIn, tmpOut], {
      timeout: PY_TIMEOUT_MS,
    });
    const cleaned = await fs.promises.readFile(tmpOut);
    // eslint-disable-next-line no-console
    console.log("[blueprint-clean] preprocessing complete, returning cleaned image");
    return `data:image/png;base64,${cleaned.toString("base64")}`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[blueprint-clean] preprocessing failed, returning original image",
      err
    );
    return dataUrl;
  } finally {
    void fs.promises.unlink(tmpIn).catch(() => {});
    void fs.promises.unlink(tmpOut).catch(() => {});
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}


