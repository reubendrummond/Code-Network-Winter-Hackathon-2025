import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayoutRoute,
});

function AuthenticatedLayoutRoute() {
  return (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  );
}