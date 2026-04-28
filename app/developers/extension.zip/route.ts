import { readFile } from "fs/promises";
import path from "path";

import JSZip from "jszip";

export const runtime = "nodejs";

const extensionFiles = ["manifest.json", "background.js", "content.js", "options.html", "options.js"];

export async function GET() {
  const zip = new JSZip();
  const extensionDir = path.join(process.cwd(), "extension");

  for (const file of extensionFiles) {
    zip.file(file, await readFile(path.join(extensionDir, file)));
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Disposition": 'attachment; filename="myformsvault-extension.zip"',
      "Content-Type": "application/zip",
    },
  });
}
