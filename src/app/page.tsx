"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

interface UploadedImage {
  file: File | null;
  preview: string;
  url: string;
  uploading: boolean;
}

interface UploadedVideo {
  file: File | null;
  preview: string;
  url: string;
  uploading: boolean;
}

interface UploadedAudio {
  file: File | null;
  preview: string;
  url: string;
  uploading: boolean;
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>(
    Array(8).fill(null).map(() => ({ file: null, preview: "", url: "", uploading: false }))
  );
  const [videos, setVideos] = useState<UploadedVideo[]>(
    Array(1).fill(null).map(() => ({ file: null, preview: "", url: "", uploading: false }))
  );
  const [audios, setAudios] = useState<UploadedAudio[]>(
    Array(3).fill(null).map(() => ({ file: null, preview: "", url: "", uploading: false }))
  );
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(11);
  const [ratio, setRatio] = useState("9:16");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionType, setMentionType] = useState<"图片" | "视频" | "音频">("图片");
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
          if (data.videoUrl) {
            setVideoUrl(data.videoUrl);
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
        const errorData = await response.json().catch(() => ({ message: "未知错误" }));
        setImages((prev) => {
          const newImages = [...prev];
          URL.revokeObjectURL(newImages[index].preview);
          newImages[index] = { file: null, preview: "", url: "", uploading: false };
          return newImages;
        });
        alert(`图片上传失败: ${errorData.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "网络错误";
      setImages((prev) => {
        const newImages = [...prev];
        URL.revokeObjectURL(newImages[index].preview);
        newImages[index] = { file: null, preview: "", url: "", uploading: false };
        return newImages;
      });
      alert(`图片上传失败: ${errorMessage}`);
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

  // 视频上传处理
  const handleVideoUpload = useCallback(async (files: FileList | null, index: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("video/")) return;

    const preview = URL.createObjectURL(file);

    setVideos((prev) => {
      const newVideos = [...prev];
      if (newVideos[index].preview) {
        URL.revokeObjectURL(newVideos[index].preview);
      }
      newVideos[index] = { file, preview, url: "", uploading: true };
      return newVideos;
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setVideos((prev) => {
          const newVideos = [...prev];
          newVideos[index].url = data.url;
          newVideos[index].uploading = false;
          return newVideos;
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: "未知错误" }));
        setVideos((prev) => {
          const newVideos = [...prev];
          URL.revokeObjectURL(newVideos[index].preview);
          newVideos[index] = { file: null, preview: "", url: "", uploading: false };
          return newVideos;
        });
        alert(`视频上传失败: ${errorData.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "网络错误";
      setVideos((prev) => {
        const newVideos = [...prev];
        URL.revokeObjectURL(newVideos[index].preview);
        newVideos[index] = { file: null, preview: "", url: "", uploading: false };
        return newVideos;
      });
      alert(`视频上传失败: ${errorMessage}`);
    }
  }, []);

  const removeVideo = useCallback((index: number) => {
    setVideos((prev) => {
      const newVideos = [...prev];
      if (newVideos[index].preview) {
        URL.revokeObjectURL(newVideos[index].preview);
      }
      newVideos[index] = { file: null, preview: "", url: "", uploading: false };
      return newVideos;
    });
  }, []);

  // 音频上传处理
  const handleAudioUpload = useCallback(async (files: FileList | null, index: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("audio/")) return;

    const preview = URL.createObjectURL(file);

    setAudios((prev) => {
      const newAudios = [...prev];
      if (newAudios[index].preview) {
        URL.revokeObjectURL(newAudios[index].preview);
      }
      newAudios[index] = { file, preview, url: "", uploading: true };
      return newAudios;
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAudios((prev) => {
          const newAudios = [...prev];
          newAudios[index].url = data.url;
          newAudios[index].uploading = false;
          return newAudios;
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: "未知错误" }));
        setAudios((prev) => {
          const newAudios = [...prev];
          URL.revokeObjectURL(newAudios[index].preview);
          newAudios[index] = { file: null, preview: "", url: "", uploading: false };
          return newAudios;
        });
        alert(`音频上传失败: ${errorData.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "网络错误";
      setAudios((prev) => {
        const newAudios = [...prev];
        URL.revokeObjectURL(newAudios[index].preview);
        newAudios[index] = { file: null, preview: "", url: "", uploading: false };
        return newAudios;
      });
      alert(`音频上传失败: ${errorMessage}`);
    }
  }, []);

  const removeAudio = useCallback((index: number) => {
    setAudios((prev) => {
      const newAudios = [...prev];
      if (newAudios[index].preview) {
        URL.revokeObjectURL(newAudios[index].preview);
      }
      newAudios[index] = { file: null, preview: "", url: "", uploading: false };
      return newAudios;
    });
  }, []);

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
        // 检测类型：图片、视频、音频
        if (textAfterAt.startsWith("图片")) {
          setMentionType("图片");
        } else if (textAfterAt.startsWith("视频")) {
          setMentionType("视频");
        } else if (textAfterAt.startsWith("音频")) {
          setMentionType("音频");
        } else {
          setMentionType("图片"); // 默认
        }
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionQuery("");
  }, []);

  const insertMention = useCallback((index: number, type: "图片" | "视频" | "音频") => {
    const textBeforeCursor = description.slice(0, mentionCursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = description.slice(mentionCursorPos);

    const mentionText = `@${type}${index + 1} `;
    const newDescription = description.slice(0, lastAtIndex) + mentionText + textAfterCursor;
    setDescription(newDescription);
    setShowMentionDropdown(false);
    setMentionQuery("");

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length;
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
    const videoUrls = videos.filter(vid => vid.url).map(vid => window.location.origin + vid.url);
    const audioUrls = audios.filter(aud => aud.url).map(aud => window.location.origin + aud.url);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, imageUrls, videoUrls, audioUrls, duration, ratio }),
      });

      if (response.ok) {
        const data = await response.json();
        setTaskId(data.taskId);
        setTaskStatus("queued");
        setVideoUrl(null);
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

            {/* 视频上传区域 */}
            <div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                参考视频（最多1个）
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {videos.map((vid, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      视频 {index + 1}
                    </div>
                    {vid.preview ? (
                      <div className="relative aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <video
                          src={vid.preview}
                          className="w-full h-full object-cover"
                        />
                        {vid.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                            <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-400 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoUpload(e.target.files, index)}
                          className="hidden"
                          id={`video-upload-${index}`}
                        />
                        <label htmlFor={`video-upload-${index}`} className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2">
                          <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="mt-1 text-xs text-zinc-500">视频 {index + 1}</span>
                        </label>
                      </div>
                    )}
                    {vid.url && (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== 'undefined' ? window.location.origin + vid.url : vid.url}
                          className="flex-1 text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate"
                        />
                        <button
                          type="button"
                          onClick={() => copyUrl(typeof window !== 'undefined' ? window.location.origin + vid.url : vid.url)}
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

            {/* 音频上传区域 */}
            <div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                参考音频（最多3个）
              </div>
              <div className="grid grid-cols-3 gap-4">
                {audios.map((aud, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      音频 {index + 1}
                    </div>
                    {aud.preview ? (
                      <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <audio src={aud.preview} controls className="w-full h-10" />
                        {aud.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                            <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAudio(index)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-400 cursor-pointer transition-colors h-16">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleAudioUpload(e.target.files, index)}
                          className="hidden"
                          id={`audio-upload-${index}`}
                        />
                        <label htmlFor={`audio-upload-${index}`} className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2">
                          <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="mt-1 text-xs text-zinc-500">音频 {index + 1}</span>
                        </label>
                      </div>
                    )}
                    {aud.url && (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== 'undefined' ? window.location.origin + aud.url : aud.url}
                          className="flex-1 text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate"
                        />
                        <button
                          type="button"
                          onClick={() => copyUrl(typeof window !== 'undefined' ? window.location.origin + aud.url : aud.url)}
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

            <div className="grid grid-cols-2 gap-4">
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
                <p className="mt-1 text-xs text-zinc-500">4-15 秒</p>
              </div>

              <div>
                <label
                  htmlFor="ratio"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  视频比例
                </label>
                <select
                  id="ratio"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="9:16">9:16 (竖版)</option>
                  <option value="16:9">16:9 (横版)</option>
                </select>
              </div>
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
              {showMentionDropdown && (
                <div className="absolute z-10 mt-1 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-auto">
                  {mentionType === "图片" && images
                    .map((img, idx) => ({ img, idx }))
                    .filter(({ img, idx }) => img.url && `图片${idx + 1}`.includes(mentionQuery))
                    .map(({ img, idx }) => (
                      <button
                        key={`img-${idx}`}
                        type="button"
                        onClick={() => insertMention(idx, "图片")}
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
                  {mentionType === "视频" && videos
                    .map((vid, idx) => ({ vid, idx }))
                    .filter(({ vid, idx }) => vid.url && `视频${idx + 1}`.includes(mentionQuery))
                    .map(({ idx }) => (
                      <button
                        key={`vid-${idx}`}
                        type="button"
                        onClick={() => insertMention(idx, "视频")}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                      >
                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-200 flex items-center justify-center">
                          <svg className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          视频 {idx + 1}
                        </span>
                      </button>
                    ))}
                  {mentionType === "音频" && audios
                    .map((aud, idx) => ({ aud, idx }))
                    .filter(({ aud, idx }) => aud.url && `音频${idx + 1}`.includes(mentionQuery))
                    .map(({ idx }) => (
                      <button
                        key={`aud-${idx}`}
                        type="button"
                        onClick={() => insertMention(idx, "音频")}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                      >
                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-200 flex items-center justify-center">
                          <svg className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          音频 {idx + 1}
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
                {videoUrl && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">视频地址:</span>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                      {videoUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
