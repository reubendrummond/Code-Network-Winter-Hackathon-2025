import { MemMediaUpload } from "@/components/MemMediaUpload";
import { createFileRoute } from "@tanstack/react-router";
import { Id } from "convex/_generated/dataModel";

export const Route = createFileRoute("/_authenticated/mems/$memId/upload")({
  component: RouteComponent,
});

function RouteComponent() {
  const { memId } = Route.useParams();
  return <MemMediaUpload memId={memId as Id<"mems">} />;
}
