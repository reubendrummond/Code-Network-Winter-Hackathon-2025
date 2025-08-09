"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Users } from "lucide-react";

interface ParticipantsSummaryProps {
  memId: Id<"mems">;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ParticipantsSummary({ memId }: ParticipantsSummaryProps) {
  const [open, setOpen] = useState(false);
  const participants = useQuery(api.mems.getMemParticipants, { memId });

  if (!participants) {
    return (
      <div className="flex -space-x-2">
        {/* Loading skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  const visibleParticipants = participants.slice(0, 3);
  const remainingCount = Math.max(0, participants.length - 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex -space-x-2 hover:scale-105 transition-transform cursor-pointer">
          {visibleParticipants.map((participant) => (
            <Avatar key={participant._id} className="w-8 h-8 ring-2 ring-background">
              <AvatarImage src={participant.image || ""} alt={participant.name} />
              <AvatarFallback className="text-xs font-medium">
                {getInitials(participant.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
              <span className="text-xs font-medium text-muted-foreground">
                +{remainingCount}
              </span>
            </div>
          )}
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {participants.map((participant) => (
            <div key={participant._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="w-10 h-10">
                <AvatarImage src={participant.image || ""} alt={participant.name} />
                <AvatarFallback className="text-sm font-medium">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{participant.name}</p>
                  {participant.role === "creator" && (
                    <Badge variant="secondary" className="text-xs">
                      Creator
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {participant.mediaCount} media uploaded
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}