import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated
    const user = await context.convex.query(api.auth.loggedInUser);
    if (!user) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const user = useQuery(api.auth.loggedInUser);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <Dashboard user={user} />;
}
