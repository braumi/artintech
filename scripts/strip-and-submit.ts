/**
 * Dev helper: call the Python `remove_interior_lines.py` cleaner, then
 * optionally POST the cleaned image to the blueprint-to-plan function.
 *
 * This keeps all image processing in Python so we only have one image-processing
 * environment in the project.
 *
 * Usage:
 *   ts-node scripts/strip-and-submit.ts input.png cleaned.png http://localhost:8888/.netlify/functions/blueprint-to-plan
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [inputPath, outputPath, endpoint] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: ts-node scripts/strip-and-submit.ts <inputImage> <outputImage> [endpoint]"
    );
    process.exit(1);
  }

  const scriptCandidates = [
    path.join(__dirname, "remove_interior_lines.py"),
    path.join(process.cwd(), "scripts", "remove_interior_lines.py"),
  ];

  const scriptPath = scriptCandidates.find((p) => fs.existsSync(p));
  if (!scriptPath) {
    console.error("remove_interior_lines.py not found. Expected in ./scripts/");
    process.exit(1);
  }

  console.log(`Running Python cleaner: python3 ${scriptPath} ${inputPath} ${outputPath}`);
  await execFileAsync("python3", [scriptPath, inputPath, outputPath]);
  console.log(`Saved cleaned image to ${outputPath}`);

  if (endpoint) {
    const dataUrl = fileToDataUrl(outputPath);
    console.log(`Posting cleaned image to ${endpoint} ...`);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });
    const json = await resp.json();
    console.log("blueprint-to-plan response:", JSON.stringify(json, null, 2));
  }
}

function fileToDataUrl(filePath: string): string {
  const data = fs.readFileSync(filePath);
  const base64 = data.toString("base64");
  const ext = path.extname(filePath).toLowerCase().replace(".", "") || "png";
  return `data:image/${ext};base64,${base64}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

