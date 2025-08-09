import { MemMedia } from "@/components/MemMedia";
import { createFileRoute } from "@tanstack/react-router";
import { Id } from "convex/_generated/dataModel";

export const Route = createFileRoute("/_authenticated/mems/$memId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { memId } = Route.useParams();
  return <MemMedia memId={memId as Id<"mems">} />;
}
