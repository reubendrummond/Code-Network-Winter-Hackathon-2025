import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/join/$joinCode")({
  component: JoinAndRedirect,
});

function JoinAndRedirect() {
  const join = useMutation(api.mems.joinMem);
  const { joinCode } = Route.useParams();
  const navigate = Route.useNavigate();
  const user = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/join/${joinCode}` } });
      return;
    }
    (async () => {
      try {
        const res = await join({ joinCode });
        const { memId, name } = res as any;
        toast.success(`Joined ${name}`);
        navigate({ to: "/mem/$memId", params: { memId } });
      } catch {
        navigate({ to: "/dashboard" });
      }
    })();
  }, [join, joinCode, navigate, user]);

  return null;
}
