import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: () => (
    <>
      <ConvexAuthProvider client={convex}>
        <Outlet />
      </ConvexAuthProvider>
      <TanStackRouterDevtools />
    </>
  ),
});
