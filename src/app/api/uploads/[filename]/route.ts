import { NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filepath = path.join("/tmp/seedance-uploads", filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  const stream = createReadStream(filepath);
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }

  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
