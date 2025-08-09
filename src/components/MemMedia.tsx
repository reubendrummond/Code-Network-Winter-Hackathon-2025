import { Id } from "../../convex/_generated/dataModel";
import { MemMediaGallery } from "./MemMediaGallery";
import { Link } from "@tanstack/react-router";

interface MemMediaProps {
  memId: Id<"mems">;
}

export function MemMedia({ memId }: MemMediaProps) {
  return (
    <div className="space-y-6">
      <Link
        to={"/mems/$memId/upload"}
        params={{
          memId,
        }}
      >
        Upload
      </Link>
      <Link
        to={"/mems/$memId/share"}
        params={{
          memId,
        }}
      >
        Share
      </Link>
      <MemMediaGallery memId={memId} />
    </div>
  );
}
