import { Id } from "../../convex/_generated/dataModel";
import { MemMediaUpload } from "./MemMediaUpload";
import { MemMediaGallery } from "./MemMediaGallery";

interface MemMediaProps {
  memId: Id<"mems">;
}

export function MemMedia({ memId }: MemMediaProps) {
  return (
    <div className="space-y-6">
      <MemMediaUpload memId={memId} />

      <MemMediaGallery memId={memId} />
    </div>
  );
}
