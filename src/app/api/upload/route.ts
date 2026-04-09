import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "没有文件" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 使用 /tmp 目录，确保有写入权限
    const uploadDir = "/tmp/seedance-uploads";

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // 返回完整URL路径
    const url = `/api/uploads/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("上传失败:", error);
    return NextResponse.json({ success: false, message: "上传失败" }, { status: 500 });
  }
}
