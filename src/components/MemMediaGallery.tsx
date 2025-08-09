import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Image } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface MemMediaGalleryProps {
  memId: Id<"mems">;
}

export function MemMediaGallery({ memId }: MemMediaGalleryProps) {
  const media = useQuery(api.mems.getMemMedia, { memId });

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
          className="aspect-square object-cover rounded-lg"
          crossOrigin="anonymous"
        />
      );
    }

    if (mediaItem.format === "video") {
      return (
        <video
          src={mediaUrl}
          className="aspect-square object-cover rounded-lg"
          controls
          preload="metadata"
          crossOrigin="anonymous"
        />
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
