import { Id } from "../../convex/_generated/dataModel";
import { MemMediaGallery } from "./MemMediaGallery";
import { Link } from "@tanstack/react-router";
import { BackButton } from "./ui/back-button";

interface MemMediaProps {
  memId: Id<"mems">;
}

export function MemMedia({ memId }: MemMediaProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <BackButton to="/mems" />
      </div>
      <div className="flex gap-4">
        <Link
          to={"/mems/$memId/upload"}
          params={{
            memId,
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Upload
        </Link>
        <Link
          to={"/mems/$memId/share"}
          params={{
            memId,
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
        >
          Share
        </Link>
      </div>
      <MemMediaGallery memId={memId} />
    </div>
  );
}
