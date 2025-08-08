import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/join/$joinCode")({
  beforeLoad: async ({ context, params }) => {
    const user = await context.convex.query(api.auth.loggedInUser);
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: `/dashboard`, joinCode: params.joinCode },
      });
    }
    return {};
  },
  component: () => null,
});
