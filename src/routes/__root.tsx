import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "../components/ui/sonner";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: () => (
    <>
      <ConvexAuthProvider client={convex}>
        <Outlet />
  <Toaster position="top-center" richColors />
      </ConvexAuthProvider>
      <TanStackRouterDevtools />
    </>
  ),
});
