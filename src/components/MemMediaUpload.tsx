import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
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
import { BackButton } from "./ui/back-button";
import { Upload, Camera, Video, X, Image, Zap } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { compressFile } from "@/lib/compression";

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
  onImagesUploaded?: (mediaFiles: MediaFile[]) => void;
}

const MAX_IMAGE_SIZE = 0.2 * 1024 * 1024; // 200KB for images
const MAX_VIDEO_SIZE = 1 * 1024 * 1024; // 1MB for videos
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/mov",
  "video/quicktime",
];

// Helper function to get appropriate size limit based on file type
const getMaxFileSize = (file: File): number => {
  if (file.type.startsWith("image/")) {
    return MAX_IMAGE_SIZE;
  }
  if (file.type.startsWith("video/")) {
    return MAX_VIDEO_SIZE;
  }
  return MAX_IMAGE_SIZE; // Default to image size for other types
};

// Helper function to format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export function MemMediaUpload({
  memId,
  onImagesUploaded = () => {},
}: MemMediaUploadProps) {

  // Fetch the memory details to get the name
  const mem = useQuery(api.mems.getMemById, { memId });
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const generateUploadUrl = useMutation(api.mems.generateUploadUrl);
  const uploadMemMedia = useMutation(api.mems.uploadMemMedia);
  const existingMedia = useQuery(api.mems.getMemMedia, { memId });
  const mediaLimit = useQuery(api.mems.getMemMediaLimit, { memId });
  const isEnded = useQuery(api.mems.isMemEnded, { memId });

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
  if (isEnded) return; // Block selection
  const files = Array.from(event.target.files || []);
    const totalFiles =
      (existingMedia?.length || 0) + mediaFiles.length + files.length;
    const maxFiles = mediaLimit?.maxMedia || 0;

    if (totalFiles > maxFiles) {
      alert(
        `Maximum of ${mediaLimit?.perPerson || 20} media files per person (${maxFiles} total for ${mediaLimit?.participantCount || 1} participants)`
      );
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
      if (!mf.error && mf.file.size > getMaxFileSize(mf.file)) {
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
        getMaxFileSize(mediaFile.originalFile),
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

      setMediaFiles((prev) => {
        const updated = prev.map((mf, i) =>
          i === index
            ? { ...mf, state: "success" as UploadState, progress: 100, mediaId }
            : mf
        );

        // Call the callback with successfully uploaded files
        const successfulFiles = updated.filter((mf) => mf.state === "success");
        onImagesUploaded(successfulFiles);

        return updated;
      });
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

  const allMediaUploaded =
    mediaFiles.length > 0 && mediaFiles.every((mf) => mf.state === "success");

  useEffect(() => {
    if (allMediaUploaded) {
      navigate({
        to: "/mems/$memId",
        params: {
          memId,
        },
      });
    }
  }, [allMediaUploaded]);

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
    <div className="relative h-dvh flex flex-col font-sans bg-white overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute top-0 left-0 w-full h-32 sm:h-40 z-0"
        style={{
          background: "linear-gradient(135deg, #B470F5 0%, #F93138 100%)",
        }}
      />

      {/* Back button */}
      <div className="relative w-full flex justify-start px-4 pt-3 z-10">
        <BackButton to="/mems/$memId" params={{ memId }} />
      </div>

      {/* Memory name above upload UI */}
      <div className="w-full flex justify-center px-4 pt-2 pb-6 z-10">
  <div className="text-4xl font-medium text-white truncate max-w-2xl text-center drop-shadow-md">
          {mem === undefined ? "" : mem?.name || "Memory"}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 py-4 z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Media
            </CardTitle>
            <CardDescription>
              Add photos and videos to your mem. Max{" "}
              {mediaLimit?.perPerson || 20} files per person (
              {mediaLimit?.maxMedia || "..."} total).
              <br />
              Images: 200KB max, Videos: 1MB max
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
                  disabled={!!isEnded}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Select Files
                </Button>

                {pendingUploads > 0 && (
                  <Button
                    onClick={uploadAll}
                    disabled={uploadingFiles > 0 || compressingFiles > 0 || !!isEnded}
                  >
                    Upload All ({pendingUploads})
                  </Button>
                )}
              </div>
            </div>

            {/* Current Media Count */}
            {existingMedia && mediaLimit && (
              <div className="text-sm text-muted-foreground">
                You have uploaded {existingMedia.length}/{mediaLimit.maxMedia}{" "}
                media files in this mem
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
                          {formatFileSize(mediaFile.file.size)} /{" "}
                          {formatFileSize(getMaxFileSize(mediaFile.file))} limit
                        </span>
                        {mediaFile.compressed && mediaFile.originalSize && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            <Zap className="w-3 h-3 mr-1" />-
                            {Math.round(
                              (1 - mediaFile.compressionRatio!) * 100
                            )}
                            %
                          </Badge>
                        )}
                      </div>

                      {(mediaFile.state === "uploading" ||
                        mediaFile.state === "compressing") && (
                        <Progress
                          value={mediaFile.progress}
                          className="mt-1 h-1"
                        />
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
                {isEnded
                  ? "This mem session has ended. Uploads are disabled."
                  : "Supported formats: JPEG, PNG, WebP, GIF, MP4, WebM, MOV. Media is compressed."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
