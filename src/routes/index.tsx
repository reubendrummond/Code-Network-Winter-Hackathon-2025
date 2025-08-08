import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated and redirect accordingly
    const user = await context.convex.query(api.auth.loggedInUser);
    if (user) {
      throw redirect({
        to: "/dashboard",
      });
    } else {
      throw redirect({
        to: "/login",
      });
    }
  },
});
