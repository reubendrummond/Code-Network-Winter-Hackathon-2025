import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
// Removed Card-based wrapper to create a compact, Instagram-like grid
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Smile, X, Filter, ArrowLeft, Download } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  getEmojiOptions,
  getKeyFromEmoji,
  getEmojiFromKey,
} from "@/lib/emoji-mapping";
import { Dialog, DialogContent } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AspectRatio } from "./ui/aspect-ratio";
// No toggle-group component available; using simple buttons

interface MemMediaGalleryProps {
  memId: Id<"mems">;
}

const MediaPreview = ({ mediaItem }: { mediaItem: any }) => {
  const mediaUrl = useQuery(api.mems.getMediaUrl, {
    storageId: mediaItem.storageId,
  });

  if (!mediaUrl) {
    return (
      <AspectRatio ratio={4 / 5} className="bg-muted rounded-lg">
        <div className="w-full h-full flex items-center justify-center">
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </AspectRatio>
    );
  }

  if (mediaItem.format === "image") {
    return (
      <AspectRatio ratio={4 / 5} className="rounded-lg overflow-hidden">
        <img
          src={mediaUrl}
          alt={mediaItem.fileName}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      </AspectRatio>
    );
  }

  if (mediaItem.format === "video") {
    return (
      <AspectRatio ratio={4 / 5} className="rounded-lg overflow-hidden">
        <video
          src={mediaUrl}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
          crossOrigin="anonymous"
          autoPlay
          loop
        />
      </AspectRatio>
    );
  }

  return null;
};

export function MemMediaGallery({ memId }: MemMediaGalleryProps) {
  const media = useQuery(api.mems.getMemMedia, { memId });
  const addReaction = useMutation(api.mems.addMediaReaction);

  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(
    null
  );
  const [modalReactionPickerOpen, setModalReactionPickerOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<Id<"memMedia"> | null>(
    null
  );

  const [sortMode, setSortMode] = useState<"rank" | "recent">("rank");
  const [selectedEmojiKey, setSelectedEmojiKey] = useState<string | null>(null);
  const [emojiFilterOpen, setEmojiFilterOpen] = useState(false);

  const toShow = (() => {
    const filtered = !selectedEmojiKey
      ? media
      : media?.filter((m: any) =>
          (m.reactions || []).some(
            (r: any) => r.emojiKey === selectedEmojiKey && r.count > 0
          )
        );
    const toShow =
      sortMode === "recent" && filtered
        ? [...filtered].sort((a: any, b: any) => b.uploadedAt - a.uploadedAt)
        : filtered;

    return toShow;
  })();

  // Queries for the selected media item
  const selectedMediaItem = useQuery(
    api.mems.getMediaItem,
    selectedMediaId ? { mediaId: selectedMediaId } : "skip"
  );

  const mediaUrl = useQuery(
    api.mems.getMediaUrl,
    selectedMediaItem ? { storageId: selectedMediaItem.storageId } : "skip"
  );

  const emojiOptions = getEmojiOptions();

  const handleOpenModal = (mediaId: Id<"memMedia">) => {
    setSelectedMediaId(mediaId);
  };

  const handleCloseModal = () => {
    setSelectedMediaId(null);
    setReactionPickerOpen(null);
    setModalReactionPickerOpen(false);
  };

  const handleToggleReaction = async (emoji: string) => {
    if (!selectedMediaItem) return;
    try {
      const emojiKey = getKeyFromEmoji(emoji);
      await addReaction({ mediaId: selectedMediaItem._id, emojiKey });
      setModalReactionPickerOpen(false);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleDownload = async () => {
    if (mediaUrl && selectedMediaItem) {
      try {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = selectedMediaItem?.fileName || "media";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to download file:", error);
      }
    }
  };

  const MediaReactions = ({ mediaItem }: { mediaItem: any }) => {
    const reactions = mediaItem.reactions || [];

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {reactions.map((reaction: any) => (
          <Button
            key={reaction.emojiKey}
            variant={reaction.userReacted ? "default" : "secondary"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              const emojiKey = getKeyFromEmoji(reaction.emoji);
              addReaction({ mediaId: mediaItem._id, emojiKey });
            }}
          >
            <span className="mr-1">{reaction.emoji}</span>
            {reaction.count}
          </Button>
        ))}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() =>
              setReactionPickerOpen(
                reactionPickerOpen === mediaItem._id ? null : mediaItem._id
              )
            }
          >
            <Smile className="w-3 h-3" />
          </Button>
          {reactionPickerOpen === mediaItem._id && (
            <div className="absolute bottom-full left-0 mb-1 bg-background border rounded-md shadow-lg p-2 flex gap-1 z-10">
              {emojiOptions.map(({ key, emoji }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => {
                    const emojiKey = getKeyFromEmoji(emoji);
                    addReaction({ mediaId: mediaItem._id, emojiKey });
                    setReactionPickerOpen(null);
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (media === undefined) {
    return (
      <div>
        <div className="mb-3 flex gap-2 items-center flex-wrap">
          {/* Controls placeholder while loading */}
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <AspectRatio
              key={i}
              ratio={4 / 5}
              className="bg-muted rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div>
        {/* Controls */}
        <div className="mb-3 flex gap-2 items-center flex-wrap">
          <Button variant="default" size="sm" disabled>
            Top
          </Button>
          <Button variant="outline" size="sm" disabled>
            Recent
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Filter className="w-4 h-4 mr-1" /> Filter
          </Button>
        </div>
        <div className="text-sm text-muted-foreground py-8 text-center">
          No media uploaded yet
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Controls */}
      <div className="mb-3 flex gap-2 items-center flex-wrap">
        <Button
          variant={sortMode === "rank" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortMode("rank")}
        >
          Top
        </Button>
        <Button
          variant={sortMode === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortMode("recent")}
        >
          Recent
        </Button>
        <Popover open={emojiFilterOpen} onOpenChange={setEmojiFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1"
            >
              {selectedEmojiKey ? (
                <>
                  <span className="text-base leading-none">
                    {getEmojiFromKey(selectedEmojiKey)}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear emoji filter"
                    className="ml-1 rounded hover:bg-muted p-0.5"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedEmojiKey(null);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-2 w-auto">
            <div className="flex gap-1">
              {emojiOptions.map(({ key, emoji }) => (
                <Button
                  key={key}
                  variant={selectedEmojiKey === key ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedEmojiKey(key);
                    setEmojiFilterOpen(false);
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {toShow === undefined ||
          (toShow.length === 0 && (
            <div className="text-sm text-muted-foreground py-8">
              No media match the selected emoji filters.
            </div>
          ))}
        {toShow?.map((mediaItem: any) => (
          <div>
            <div
              key={mediaItem._id}
              className="group relative cursor-pointer"
              onClick={() => handleOpenModal(mediaItem._id)}
            >
              <MediaPreview mediaItem={mediaItem} />
            </div>
            <MediaReactions mediaItem={mediaItem} />
          </div>
        ))}
      </div>
      {/* Media Modal */}
      {selectedMediaId && (
        <Dialog open={!!selectedMediaId} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-4xl w-[100vw] h-full max-h-[100vh] p-0 overflow-hidden">
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="bg-black/20 backdrop-blur-sm hover:bg-black/30 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="bg-black/20 backdrop-blur-sm hover:bg-black/30 text-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>

            {/* Mobile: Vertical layout, Laptop: Horizontal layout */}
            <div className="flex flex-col h-full">
              {/* Media Section */}
              <div className="flex flex-col items-center justify-center bg-black/5 min-h-[250px] lg:min-h-[400px] max-h-[80%] overflow-auto">
                {/* Image or Video */}
                <MediaDisplayLarge
                  mediaItem={selectedMediaItem}
                  mediaUrl={mediaUrl}
                />
              </div>
              {/* Reactions directly under photo */}
              {selectedMediaItem && (
                <div className="w-full p-3 border-t flex flex-wrap gap-1">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() =>
                        setModalReactionPickerOpen(!modalReactionPickerOpen)
                      }
                    >
                      <Smile className="w-3 h-3 mr-1" />
                      Add reaction
                    </Button>
                    {modalReactionPickerOpen && (
                      <div className="absolute bottom-full left-0 mb-1 bg-background border rounded-md shadow-lg p-2 flex gap-1 z-10">
                        {emojiOptions.map(({ key, emoji }) => (
                          <Button
                            key={key}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => handleToggleReaction(emoji)}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMediaItem.reactions?.map((reaction: any) => (
                    <Button
                      key={reaction.emojiKey}
                      variant={reaction.userReacted ? "default" : "secondary"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleToggleReaction(reaction.emoji)}
                    >
                      <span className="mr-1">{reaction.emoji}</span>
                      {reaction.count}
                    </Button>
                  ))}
                </div>
              )}

              {/* Info Section */}
              <div className="flex-1 lg:w-80 border-t lg:border-t-0 lg:border-l bg-background lg:flex-shrink-0 lg:flex lg:flex-col">
                {selectedMediaItem && (
                  <div className="p-4 lg:pt-0 flex items-center gap-3">
                    <img
                      src={selectedMediaItem.author.image || "/pfp.png"}
                      alt={selectedMediaItem.uploadedBy || "Anonymous"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {selectedMediaItem.author.name || "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(
                          selectedMediaItem.uploadedAt
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Large media renderer for the modal
function MediaDisplayLarge({
  mediaItem,
  mediaUrl,
}: {
  mediaItem: any;
  mediaUrl?: string | null;
}) {
  if (!mediaUrl || !mediaItem) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Skeleton className="w-16 h-16 rounded" />
      </div>
    );
  }

  if (mediaItem.format === "image") {
    return (
      <img
        src={mediaUrl}
        alt={mediaItem.fileName}
        className="w-full h-full object-contain rounded-lg"
        crossOrigin="anonymous"
      />
    );
  }

  if (mediaItem.format === "video") {
    return (
      <video
        src={mediaUrl}
        className="w-full h-full object-cover rounded-lg"
        controls
        preload="metadata"
        crossOrigin="anonymous"
        autoPlay
        loop
      />
    );
  }

  return null;
}
