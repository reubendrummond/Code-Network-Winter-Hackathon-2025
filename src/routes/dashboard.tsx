import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dashboard } from "@/components/Dashboard";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useQuery(api.auth.loggedInUser);

  return (
    <AuthGuard requireAuth={true} redirectTo="/login">
      {user && <Dashboard user={user} />}
    </AuthGuard>
  );
}
