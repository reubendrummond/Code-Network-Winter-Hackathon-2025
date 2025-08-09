import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Dialog, DialogContent } from "./ui/dialog";
import { Badge } from "./ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Skeleton } from "./ui/skeleton";
import { Image, Video, Trash2, Calendar } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface MemMediaGalleryProps {
  memId: Id<"mems">;
}

export function MemMediaGallery({ memId }: MemMediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  const media = useQuery(api.mems.getMemMedia, { memId });
  const deleteMedia = useMutation(api.mems.deleteMemMedia);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async (mediaId: Id<"memMedia">) => {
    try {
      await deleteMedia({ mediaId });
    } catch (error) {
      console.error("Failed to delete media:", error);
    }
  };

  const MediaPreview = ({ mediaItem }: { mediaItem: any }) => {
    const mediaUrl = useQuery(api.mems.getMediaUrl, {
      storageId: mediaItem.storageId,
    });

    if (!mediaUrl) {
      return (
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      );
    }

    if (mediaItem.format === "image") {
      return (
        <img
          src={mediaUrl}
          alt={mediaItem.fileName}
          className="aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setSelectedMedia(mediaUrl)}
        />
      );
    }

    if (mediaItem.format === "video") {
      return (
        <div className="aspect-square bg-black rounded-lg overflow-hidden relative cursor-pointer group">
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Video className="w-8 h-8 text-white" />
          </div>
        </div>
      );
    }

    return null;
  };

  if (media === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!media || media.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Media Gallery
          </CardTitle>
          <CardDescription>No media uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Upload photos and videos to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Media Gallery
            <Badge variant="secondary">{media.length}/50</Badge>
          </CardTitle>
          <CardDescription>
            {media.length} {media.length === 1 ? "file" : "files"} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((mediaItem) => (
              <div key={mediaItem._id} className="group relative">
                <MediaPreview mediaItem={mediaItem} />

                {/* Media Info Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-white text-xs">
                        {mediaItem.format === "image" ? (
                          <Image className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                        <span>{formatFileSize(mediaItem.fileSize)}</span>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 w-6 p-0 opacity-80 hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Media</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "
                              {mediaItem.fileName}"? This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(mediaItem._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {/* Media Details on Hover */}
                <div className="absolute top-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/70 text-white text-xs p-2 rounded">
                    <div className="font-medium truncate mb-1">
                      {mediaItem.fileName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(mediaItem.uploadedAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Size Image Dialog */}
      {selectedMedia && (
        <Dialog
          open={!!selectedMedia}
          onOpenChange={() => setSelectedMedia(null)}
        >
          <DialogContent className="max-w-4xl w-full p-0">
            <img
              src={selectedMedia}
              alt="Full size"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
