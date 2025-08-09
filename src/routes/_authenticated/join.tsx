import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/join")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/join"!</div>;
}
