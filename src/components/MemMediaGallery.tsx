import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
// Removed Card-based wrapper to create a compact, Instagram-like grid
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Smile, X, Filter } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { getEmojiOptions, getKeyFromEmoji, getEmojiFromKey } from "@/lib/emoji-mapping";
import { Dialog, DialogContent } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AspectRatio } from "./ui/aspect-ratio";
// No toggle-group component available; using simple buttons

interface MemMediaGalleryProps {
  memId: Id<"mems">;
}

export function MemMediaGallery({ memId }: MemMediaGalleryProps) {
  const media = useQuery(api.mems.getMemMedia, { memId });
  const addReaction = useMutation(api.mems.addMediaReaction);

  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(
    null
  );
  const [selectedMediaId, setSelectedMediaId] = useState<Id<"memMedia"> | null>(
    null
  );

  const emojiOptions = getEmojiOptions();
  const [sortMode, setSortMode] = useState<"rank" | "recent">("rank");
  const [selectedEmojiKey, setSelectedEmojiKey] = useState<string | null>(null);
  const [emojiFilterOpen, setEmojiFilterOpen] = useState(false);

  // Modal: 1×n list with per-item comments
  const AllMediaModal = ({
    open,
    onOpenChange,
    media,
    initialFocusId,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    media: any[];
    initialFocusId?: Id<"memMedia">;
  }) => {
    const [openCommentsFor, setOpenCommentsFor] =
      useState<Id<"memMedia"> | null>(initialFocusId ?? null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
      if (!open || !initialFocusId) return;
      const el = itemRefs.current[initialFocusId as unknown as string];
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, [open, initialFocusId]);

    const ModalMediaItem = ({
      m,
      isOpen,
      onToggleComments,
    }: {
      m: any;
      isOpen: boolean;
      onToggleComments: () => void;
    }) => {
      const comments = useQuery(
        api.mems.listMediaComments,
        isOpen ? { mediaId: m._id } : "skip"
      );
      const [commentText, setCommentText] = useState("");
      const addComment = useMutation(api.mems.addMediaComment);

      return (
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="p-4 flex items-center justify-between">
            <div className="font-medium truncate">{m.fileName}</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onToggleComments}>
                {isOpen ? "Hide" : "Show"} comments
              </Button>
            </div>
          </div>
          <div className="px-4 pb-4">
            <SelectedMediaLarge mediaItem={m} />
            <div className="mt-3">
              <MediaReactions mediaItem={m} />
            </div>
          </div>
          {isOpen && (
            <div className="border-t">
              <div className="max-h-[40vh] overflow-auto p-4 space-y-3">
                {comments === undefined ? (
                  <div className="text-sm text-muted-foreground">
                    Loading comments…
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No comments yet
                  </div>
                ) : (
                  comments.map((c: any) => (
                    <div key={c._id} className="text-sm">
                      <div className="text-muted-foreground">
                        {c.userId.substring(0, 6)} •{" "}
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div>{c.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={!commentText.trim()}
                    onClick={async () => {
                      if (!commentText.trim()) return;
                      await addComment({
                        mediaId: m._id,
                        content: commentText.trim(),
                      });
                      setCommentText("");
                    }}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
          <ScrollArea className="max-h-[80vh]">
            <div className="p-4 space-y-8">
              {media.map((m) => {
                const isOpen = openCommentsFor === m._id;
                return (
                  <div
                    key={m._id}
                    ref={(el) => {
                      itemRefs.current[m._id as unknown as string] = el;
                    }}
                  >
                    <ModalMediaItem
                      m={m}
                      isOpen={isOpen}
                      onToggleComments={() =>
                        setOpenCommentsFor((prev) =>
                          prev === m._id ? null : m._id
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  const MediaReactions = ({ mediaItem }: { mediaItem: any }) => {
    const handleToggleReaction = async (emoji: string) => {
      try {
        const emojiKey = getKeyFromEmoji(emoji);
        await addReaction({ mediaId: mediaItem._id, emojiKey });
        setReactionPickerOpen(null);
      } catch (error) {
        console.error("Failed to toggle reaction:", error);
      }
    };

    const reactions = mediaItem.reactions || [];

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {reactions.map((reaction: any) => (
          <Button
            key={reaction.emojiKey}
            variant={reaction.userReacted ? "default" : "secondary"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleReaction(reaction.emoji);
            }}
          >
            <span className="mr-1">{reaction.emoji}</span>
            {reaction.count}
          </Button>
        ))}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setReactionPickerOpen(
                reactionPickerOpen === mediaItem._id ? null : mediaItem._id
              );
            }}
            aria-label="React"
            title="React"
          >
            <Smile className="w-3 h-3" />
          </Button>
          {reactionPickerOpen === mediaItem._id && (
            <div className="absolute bottom-full left-0 mb-1 bg-background border rounded-md shadow-lg p-2 flex gap-1 z-20">
              {emojiOptions.map(({ key, emoji }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReaction(emoji);
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
          />
        </AspectRatio>
      );
    }

    return null;
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
            <AspectRatio key={i} ratio={4 / 5} className="bg-muted rounded-lg" />
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
          <Button
            variant="default"
            size="sm"
            disabled
          >
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
                <Button variant="outline" size="sm" className="inline-flex items-center gap-1">
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
          {(() => {
            // Apply emoji filter (single selection)
            const filtered =
              !selectedEmojiKey
                ? media
                : media.filter((m: any) =>
                    (m.reactions || []).some(
                      (r: any) => r.emojiKey === selectedEmojiKey && r.count > 0
                    )
                  );
            const toShow =
              sortMode === "recent"
                ? [...filtered].sort((a: any, b: any) => b.uploadedAt - a.uploadedAt)
                : filtered;
            if (toShow.length === 0) {
              return (
                <div className="text-sm text-muted-foreground py-8">
                  No media match the selected emoji filters.
                </div>
              );
            }
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {toShow.map((mediaItem: any) => (
              <div
                key={mediaItem._id}
                className="group relative cursor-pointer"
                onClick={() => {
                  setSelectedMediaId(mediaItem._id);
                }}
              >
                    <MediaPreview mediaItem={mediaItem} />
                <MediaReactions mediaItem={mediaItem} />
              </div>
                ))}
              </div>
            );
          })()}

      {/* Expanded media modal: 1 column x n rows list with per-item comments */}
      {(() => {
        const filtered =
          !selectedEmojiKey
            ? media || []
            : (media || []).filter((m: any) =>
                (m.reactions || []).some(
                  (r: any) => r.emojiKey === selectedEmojiKey && r.count > 0
                )
              );
        const toShow =
          sortMode === "recent"
            ? [...filtered].sort((a: any, b: any) => b.uploadedAt - a.uploadedAt)
            : filtered;
        return (
          <AllMediaModal
            open={!!selectedMediaId}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedMediaId(null);
                setReactionPickerOpen(null);
              }
            }}
            media={toShow}
            initialFocusId={selectedMediaId || undefined}
          />
        );
      })()}
    </>
  );
}

// Large media renderer for the modal
function SelectedMediaLarge({ mediaItem }: { mediaItem: any }) {
  const mediaUrl = useQuery(api.mems.getMediaUrl, {
    storageId: mediaItem.storageId,
  });

  if (!mediaUrl) {
    return (
      <div className="aspect-video w-full max-w-3xl bg-muted rounded-lg flex items-center justify-center">
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    );
  }

  if (mediaItem.format === "image") {
    return (
      <img
        src={mediaUrl}
        alt={mediaItem.fileName}
        className="max-h-[70vh] w-auto object-contain rounded-md"
        crossOrigin="anonymous"
      />
    );
  }

  if (mediaItem.format === "video") {
    return (
      <video
        src={mediaUrl}
        className="max-h-[70vh] w-auto object-contain rounded-md"
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
