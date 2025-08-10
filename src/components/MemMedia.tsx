import { Id } from "../../convex/_generated/dataModel";
import { MemMediaGallery } from "./MemMediaGallery";
import { Link } from "@tanstack/react-router";
import { BackButton } from "./ui/back-button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "./ui/skeleton";
import { Upload, Share } from "lucide-react";
import { ParticipantsSummary } from "./ParticipantsSummary";
import { Button } from "./ui/button";

interface MemMediaProps {
  memId: Id<"mems">;
}

export function MemMedia({ memId }: MemMediaProps) {
  const mem = useQuery(api.mems.getMemById, { memId });
  const currentUser = useQuery(api.auth.loggedInUser);
  const endSession = useMutation(api.mems.endMemSession);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-start">
        <BackButton to="/mems" />
      </div>
      
      {/* Mem Title and Description with Share Button */}
      <div className="space-y-2 relative">
        {mem === undefined ? (
          <>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </>
        ) : mem === null ? (
          <div className="text-red-500">Mem not found</div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{mem.name}</h1>
                <p className="text-muted-foreground">{mem.description}</p>
                {mem.endedAt && (
                  <div className="text-sm text-destructive">Session ended</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <ParticipantsSummary memId={memId} />
                {/* End Session button only for creator and only if not ended */}
                {currentUser && currentUser._id === mem.creatorId && !mem.endedAt && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await endSession({ memId });
                      } catch (e) {
                        // no-op
                      }
                    }}
                  >
                    End Session
                  </Button>
                )}
                <Link
                  to={"/mems/$memId/share"}
                  params={{
                    memId,
                  }}
                  className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  <Share className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Upload Button - Fixed Bottom Right */}
      {!mem?.endedAt && (
        <Link
          to={"/mems/$memId/upload"}
          params={{
            memId,
          }}
          className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-lg z-50"
        >
          <Upload className="h-6 w-6" />
        </Link>
      )}
      <MemMediaGallery memId={memId} />
    </div>
  );
}
