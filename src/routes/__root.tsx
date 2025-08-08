import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ConvexReactClient } from "convex/react";
interface MyRouterContext {
  convex: ConvexReactClient;
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <ConvexAuthProvider client={convex}>
        <Outlet />
      </ConvexAuthProvider>
      <TanStackRouterDevtools />
    </>
  ),
});
