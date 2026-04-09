"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

interface UploadedImage {
  file: File | null;
  preview: string;
  url: string;
  uploading: boolean;
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>(
    Array(8).fill(null).map(() => ({ file: null, preview: "", url: "", uploading: false }))
  );
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(11);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/submit?taskId=${taskId}`);
        if (response.ok) {
          const data = await response.json();
          setTaskStatus(data.status);
          if (data.status === "succeeded" || data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
            // 任务结束，停止轮询
          }
        }
      } catch (err) {
        console.error("查询状态失败", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [taskId]);

  const handleImageUpload = useCallback(async (files: FileList | null, index: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const preview = URL.createObjectURL(file);

    // 先显示预览，设置上传中状态
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages[index] = { file, preview, url: "", uploading: true };
      return newImages;
    });

    // 上传到服务器
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImages((prev) => {
          const newImages = [...prev];
          newImages[index].url = data.url;
          newImages[index].uploading = false;
          return newImages;
        });
      } else {
        // 上传失败，清除该槽位
        setImages((prev) => {
          const newImages = [...prev];
          URL.revokeObjectURL(newImages[index].preview);
          newImages[index] = { file: null, preview: "", url: "", uploading: false };
          return newImages;
        });
        alert("图片上传失败");
      }
    } catch {
      setImages((prev) => {
        const newImages = [...prev];
        URL.revokeObjectURL(newImages[index].preview);
        newImages[index] = { file: null, preview: "", url: "", uploading: false };
        return newImages;
      });
      alert("图片上传失败");
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages[index] = { file: null, preview: "", url: "", uploading: false };
      // 清除后续所有图片
      for (let i = index + 1; i < newImages.length; i++) {
        if (newImages[i].preview) {
          URL.revokeObjectURL(newImages[i].preview);
        }
        newImages[i] = { file: null, preview: "", url: "", uploading: false };
      }
      return newImages;
    });
  }, []);

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    alert("链接已复制!");
  }, []);

  const uploadedImages = images.filter((img) => img.url);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setDescription(value);
    setMentionCursorPos(cursorPos);

    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceOrNewlineAfter = /[\s\n]/.test(value.slice(lastAtIndex + 1, cursorPos));
      if (!hasSpaceOrNewlineAfter && textAfterAt.length < 10) {
        setMentionQuery(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionQuery("");
  }, []);

  const insertMention = useCallback((imageIndex: number) => {
    const textBeforeCursor = description.slice(0, mentionCursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = description.slice(mentionCursorPos);

    const newDescription = description.slice(0, lastAtIndex) + `@图片${imageIndex + 1} ` + textAfterCursor;
    setDescription(newDescription);
    setShowMentionDropdown(false);
    setMentionQuery("");

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + `@图片${imageIndex + 1} `.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [description, mentionCursorPos]);

  useEffect(() => {
    const handleClickOutside = () => setShowMentionDropdown(false);
    if (showMentionDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMentionDropdown]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTaskStatus(null);

    const imageUrls = images.filter(img => img.url).map(img => window.location.origin + img.url);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, imageUrls, duration }),
      });

      if (response.ok) {
        const data = await response.json();
        setTaskId(data.taskId);
        setTaskStatus("queued");
        alert(`提交成功！任务ID: ${data.taskId}`);
      } else {
        const error = await response.json();
        alert(`提交失败: ${error.message}`);
      }
    } catch (err) {
      alert("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        >
          <div className="space-y-6">
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      图片 {index + 1}
                    </div>
                    {img.preview ? (
                      <div className="relative aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <Image
                          src={img.preview}
                          alt={`图片 ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                            <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 transition-colors ${
                          index === 0 || images[index - 1]?.preview
                            ? "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 cursor-pointer"
                            : "border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-50"
                        }`}
                      >
                        {index === 0 || images[index - 1]?.preview ? (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e.target.files, index)}
                              className="hidden"
                              id={`image-upload-${index}`}
                            />
                            <label
                              htmlFor={`image-upload-${index}`}
                              className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2"
                            >
                              <svg
                                className="h-8 w-8 text-zinc-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              <span className="mt-1 text-xs text-zinc-500">
                                图片 {index + 1}
                              </span>
                            </label>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full p-2">
                            <svg
                              className="h-8 w-8 text-zinc-300 dark:text-zinc-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            <span className="mt-1 text-xs text-zinc-400">
                              请先上传图片 {index}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {img.url && (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== 'undefined' ? window.location.origin + img.url : img.url}
                          className="flex-1 text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate"
                        />
                        <button
                          type="button"
                          onClick={() => copyUrl(typeof window !== 'undefined' ? window.location.origin + img.url : img.url)}
                          className="px-2 py-1 text-xs bg-zinc-900 text-white rounded hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          复制
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                时长（秒）
              </label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Math.max(4, Math.min(15, parseInt(e.target.value) || 11)))}
                min={4}
                max={15}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p className="mt-1 text-xs text-zinc-500">Seedance 2.0 支持 4-15 秒</p>
            </div>

            <div className="relative">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                描述
              </label>
              <textarea
                ref={textareaRef}
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                rows={12}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="输入描述"
              />
              {showMentionDropdown && uploadedImages.length > 0 && (
                <div className="absolute z-10 mt-1 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-auto">
                  {images
                    .map((img, idx) => ({ img, idx }))
                    .filter(({ img, idx }) => img.url && `图片${idx + 1}`.includes(mentionQuery))
                    .map(({ img, idx }) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertMention(idx)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                      >
                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <Image src={img.preview} alt="" fill className="object-cover" />
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          图片 {idx + 1}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (taskId !== null && taskStatus !== null && !["succeeded", "failed", "cancelled", "expired"].includes(taskStatus))}
              className="w-full rounded-lg bg-zinc-900 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "提交中..." : "提交"}
            </button>

            {taskId && taskStatus && (
              <div className="mt-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">任务ID:</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 break-all">{taskId}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">状态:</span>
                  <span className={`text-sm font-medium ${
                    taskStatus === "succeeded" ? "text-green-600" :
                    taskStatus === "failed" ? "text-red-600" :
                    taskStatus === "queued" ? "text-yellow-600" :
                    taskStatus === "running" ? "text-blue-600" :
                    "text-zinc-600"
                  }`}>
                    {taskStatus === "queued" ? "排队中" :
                     taskStatus === "running" ? "生成中" :
                     taskStatus === "cancelled" ? "已取消" :
                     taskStatus === "succeeded" ? "成功" :
                     taskStatus === "failed" ? "失败" :
                     taskStatus === "expired" ? "已超时" : taskStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
