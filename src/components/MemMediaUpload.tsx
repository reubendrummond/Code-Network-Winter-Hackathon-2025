import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Upload, Camera, Video, X, Image, Zap } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { compressFile, preloadFFmpeg } from "@/lib/compression";

type UploadState = "idle" | "compressing" | "uploading" | "success" | "error";

interface MediaFile {
  file: File;
  originalFile: File; // Keep reference to original
  preview: string;
  state: UploadState;
  error?: string;
  progress: number;
  mediaId?: Id<"memMedia">;
  compressed?: boolean;
  originalSize?: number;
  compressionRatio?: number;
}

interface MemMediaUploadProps {
  memId: Id<"mems">;
}

const MAX_FILE_SIZE = 0.2 * 1024 * 1024; // 1MB (matches backend)
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov"];

export function MemMediaUpload({ memId }: MemMediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.mems.generateUploadUrl);
  const uploadMemMedia = useMutation(api.mems.uploadMemMedia);
  const existingMedia = useQuery(api.mems.getMemMedia, { memId });

  // Preload FFmpeg on component mount for faster video compression
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await preloadFFmpeg();
        setFfmpegReady(true);
      } catch (error) {
        console.warn("FFmpeg preload failed:", error);
        setFfmpegReady(false);
      }
    };

    initFFmpeg();
  }, []);

  const [filesNeedingCompression, setFilesNeedingCompression] = useState<
    number[]
  >([]);

  // After files are added, run compression automatically
  useEffect(() => {
    if (filesNeedingCompression.length > 0) {
      filesNeedingCompression.forEach((index) => {
        compressMediaFile(index);
      });
      setFilesNeedingCompression([]);
    }
  }, [filesNeedingCompression, mediaFiles]);

  const validateFile = (file: File): string | null => {
    // Only validate file type - size will be handled by compression
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return "Only images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed";
    }

    return null;
  };

  const createPreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const totalFiles =
      (existingMedia?.length || 0) + mediaFiles.length + files.length;

    if (totalFiles > 50) {
      alert("Maximum of 50 media files per mem");
      return;
    }

    const newMediaFiles: MediaFile[] = files.map((file) => {
      const error = validateFile(file);
      return {
        file,
        originalFile: file,
        preview: createPreview(file),
        state: error ? "error" : "idle",
        error: error || undefined,
        progress: 0,
        originalSize: file.size,
      };
    });

    // Calculate indexes for compression after state update
    const startIndex = mediaFiles.length;
    const compressionIndexes: number[] = [];
    newMediaFiles.forEach((mf, i) => {
      if (!mf.error && mf.file.size > MAX_FILE_SIZE) {
        compressionIndexes.push(startIndex + i);
      }
    });

    setMediaFiles((prev) => [...prev, ...newMediaFiles]);
    setFilesNeedingCompression((prev) => [...prev, ...compressionIndexes]);
  };

  const compressMediaFile = async (index: number) => {
    const mediaFile = mediaFiles[index];
    if (!mediaFile || mediaFile.state !== "idle") return;

    try {
      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index ? { ...mf, state: "compressing", progress: 0 } : mf
        )
      );

      const compressedFile = await compressFile(
        mediaFile.originalFile,
        MAX_FILE_SIZE,
        (progress) => {
          setMediaFiles((prev) =>
            prev.map((mf, i) =>
              i === index ? { ...mf, progress: Math.round(progress) } : mf
            )
          );
        }
      );

      const compressionRatio =
        compressedFile.size / mediaFile.originalFile.size;
      const wasCompressed = compressedFile.size < mediaFile.originalFile.size;

      // Update preview if file type changed (e.g., video to image)
      let newPreview = mediaFile.preview;
      if (compressedFile.type !== mediaFile.originalFile.type) {
        URL.revokeObjectURL(mediaFile.preview);
        newPreview = createPreview(compressedFile);
      }

      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index
            ? {
                ...mf,
                file: compressedFile,
                preview: newPreview,
                state: "idle",
                progress: 0,
                compressed: wasCompressed,
                compressionRatio: compressionRatio,
              }
            : mf
        )
      );
    } catch (error) {
      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index
            ? {
                ...mf,
                state: "error",
                error:
                  error instanceof Error ? error.message : "Compression failed",
                progress: 0,
              }
            : mf
        )
      );
    }
  };

  const uploadFile = async (mediaFile: MediaFile, index: number) => {
    try {
      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index ? { ...mf, state: "uploading", progress: 10 } : mf
        )
      );

      // Generate upload URL
      const uploadUrl = await generateUploadUrl({
        memId,
        contentType: mediaFile.file.type,
        fileName: mediaFile.file.name,
      });

      setMediaFiles((prev) =>
        prev.map((mf, i) => (i === index ? { ...mf, progress: 30 } : mf))
      );

      // Upload to storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mediaFile.file.type },
        body: mediaFile.file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();

      setMediaFiles((prev) =>
        prev.map((mf, i) => (i === index ? { ...mf, progress: 70 } : mf))
      );

      // Save media metadata
      const mediaId = await uploadMemMedia({
        memId,
        storageId,
        fileName: mediaFile.file.name,
        contentType: mediaFile.file.type,
        fileSize: mediaFile.file.size,
      });

      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index ? { ...mf, state: "success", progress: 100, mediaId } : mf
        )
      );
    } catch (error) {
      setMediaFiles((prev) =>
        prev.map((mf, i) =>
          i === index
            ? {
                ...mf,
                state: "error",
                error: error instanceof Error ? error.message : "Upload failed",
                progress: 0,
              }
            : mf
        )
      );
    }
  };

  const removeMediaFile = (index: number) => {
    const mediaFile = mediaFiles[index];
    URL.revokeObjectURL(mediaFile.preview);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = () => {
    mediaFiles.forEach((mediaFile, index) => {
      if (mediaFile.state === "idle") {
        uploadFile(mediaFile, index);
      }
    });
  };

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (file.type.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <Upload className="w-4 h-4" />;
  };

  const pendingUploads = mediaFiles.filter((mf) => mf.state === "idle").length;
  const uploadingFiles = mediaFiles.filter(
    (mf) => mf.state === "uploading"
  ).length;
  const compressingFiles = mediaFiles.filter(
    (mf) => mf.state === "compressing"
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Media
        </CardTitle>
        <CardDescription>
          Add photos and videos to your mem. Professional compression using
          browser-image-compression and FFmpeg.wasm. Max 50 files total.
          {!ffmpegReady && (
            <div className="text-xs text-amber-600 mt-1">
              ⚡ Loading video compression engine...
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Select Files
            </Button>

            {pendingUploads > 0 && (
              <Button
                onClick={uploadAll}
                disabled={uploadingFiles > 0 || compressingFiles > 0}
              >
                Upload All ({pendingUploads})
              </Button>
            )}
          </div>
        </div>

        {/* Current Media Count */}
        {existingMedia && (
          <div className="text-sm text-muted-foreground">
            {existingMedia.length}/50 media files in this mem
          </div>
        )}

        {/* Media Files List */}
        {mediaFiles.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mediaFiles.map((mediaFile, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {/* File Preview */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {mediaFile.file.type.startsWith("image/") ? (
                    <img
                      src={mediaFile.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileTypeIcon(mediaFile.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {mediaFile.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>
                      {(mediaFile.file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    {mediaFile.compressed && mediaFile.originalSize && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        <Zap className="w-3 h-3 mr-1" />-
                        {Math.round((1 - mediaFile.compressionRatio!) * 100)}%
                      </Badge>
                    )}
                  </div>

                  {(mediaFile.state === "uploading" ||
                    mediaFile.state === "compressing") && (
                    <Progress value={mediaFile.progress} className="mt-1 h-1" />
                  )}

                  {mediaFile.error && (
                    <div className="text-xs text-destructive mt-1">
                      {mediaFile.error}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      mediaFile.state === "success"
                        ? "default"
                        : mediaFile.state === "error"
                          ? "destructive"
                          : mediaFile.state === "uploading"
                            ? "secondary"
                            : mediaFile.state === "compressing"
                              ? "secondary"
                              : "outline"
                    }
                  >
                    {mediaFile.state === "idle" && "Ready"}
                    {mediaFile.state === "compressing" && "Compressing..."}
                    {mediaFile.state === "uploading" && "Uploading..."}
                    {mediaFile.state === "success" && "Uploaded"}
                    {mediaFile.state === "error" && "Error"}
                  </Badge>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMediaFile(index)}
                    disabled={
                      mediaFile.state === "uploading" ||
                      mediaFile.state === "compressing"
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <AlertDescription>
            Supported formats: JPEG, PNG, WebP, GIF, MP4, WebM, MOV. Images are
            compressed using browser-image-compression library. Videos use
            FFmpeg.wasm for professional compression {ffmpegReady ? "✅" : "⚡"}
            .
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
