import { NextResponse } from "next/server";

const SEEDANCE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
const SEEDANCE_API_KEY = "e1b3db2f-a6e6-4f26-9091-310c7ada75e6";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ success: false, message: "缺少 taskId" }, { status: 400 });
  }

  try {
    const response = await fetch(`${SEEDANCE_API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SEEDANCE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, message: `查询失败: ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      taskId: result.id,
      status: result.status,
      videoUrl: result.content?.video_url || null,
      error: result.error || null,
    });
  } catch (error) {
    console.error("查询任务状态失败:", error);
    return NextResponse.json(
      { success: false, message: "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { description, imageUrls, duration } = await request.json();

    if (!description) {
      return NextResponse.json({ success: false, message: "描述不能为空" }, { status: 400 });
    }

    // 解析描述中的 @图片N 引用
    const imageRefRegex = /@图片(\d+)/g;
    const content: Array<{ type: string; text?: string; image_url?: { url: string }; role?: string }> = [];

    // 提取描述文本
    let textContent = description;
    const imageRefs: number[] = [];

    let match;
    while ((match = imageRefRegex.exec(description)) !== null) {
      const imageIndex = parseInt(match[1], 10) - 1;
      if (!imageRefs.includes(imageIndex)) {
        imageRefs.push(imageIndex);
      }
    }

    // 构建 content 数组
    // 第一部分：文本
    content.push({
      type: "text",
      text: textContent,
    });

    // 第二部分：引用的图片（按引用顺序）
    const addedImages = new Set<number>();
    for (const idx of imageRefs) {
      if (idx >= 0 && idx < imageUrls.length && !addedImages.has(idx)) {
        content.push({
          type: "image_url",
          image_url: {
            url: imageUrls[idx],
          },
          role: "reference_image",
        });
        addedImages.add(idx);
      }
    }

    const body = {
      model: "doubao-seedance-2-0-260128",
      content,
      generate_audio: true,
      ratio: "16:9",
      duration: duration || 11,
      watermark: false,
    };

    console.log("发送到 Seedance:", JSON.stringify(body, null, 2));

    const seedanceResponse = await fetch(SEEDANCE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SEEDANCE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!seedanceResponse.ok) {
      const errorText = await seedanceResponse.text();
      console.error("Seedance API 错误:", errorText);
      return NextResponse.json(
        { success: false, message: `Seedance API 错误: ${errorText}` },
        { status: 500 }
      );
    }

    const result = await seedanceResponse.json();
    console.log("Seedance 响应:", result);

    return NextResponse.json({
      success: true,
      message: "提交成功",
      taskId: result.id || result.task_id || result.data?.task_id,
    });
  } catch (error) {
    console.error("提交失败:", error);
    return NextResponse.json(
      { success: false, message: "提交失败" },
      { status: 500 }
    );
  }
}
