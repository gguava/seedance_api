import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(request: Request) {
  let uploadDir = "/tmp/seedance-uploads";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "没有文件" }, { status: 400 });
    }

    // 检查目录是否存在，不存在则创建
    if (!existsSync(uploadDir)) {
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (mkdirError) {
        console.error("创建目录失败:", mkdirError);
        // 尝试使用备选目录
        uploadDir = path.join(process.cwd(), "uploads");
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const url = `/api/uploads/${filename}`;

    console.log(`上传成功: ${url}`);

    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("上传失败:", errorMessage);
    console.error("上传目录:", uploadDir);
    console.error("当前工作目录:", process.cwd());
    return NextResponse.json({ success: false, message: `上传失败: ${errorMessage}` }, { status: 500 });
  }
}
