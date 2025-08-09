import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const user = useQuery(api.auth.loggedInUser);
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return; // Still loading

    if (user) {
      router.navigate({ to: "/dashboard" });
    } else {
      router.navigate({ to: "/login" });
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
