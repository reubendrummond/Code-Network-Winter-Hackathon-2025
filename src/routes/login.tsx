import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "../components/LoginForm";
import { AuthGuard } from "../components/AuthGuard";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const redirectTo = redirect || "/dashboard";
  const joinCode = useMemo(() => {
    const m = redirect?.match?.(/^\/join\/(\w{4,10})$/);
    return m ? m[1] : undefined;
  }, [redirect]);
  const mem = useQuery(api.mems.getMemByJoinCode, joinCode ? ({ joinCode } as any) : "skip");

  return (
    <AuthGuard requireAuth={false} redirectTo={redirectTo}>
      <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 md:p-12 shadow-sm">
          <div className="text-center">
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#f93138] via-[#d44b8a] to-[#b470f5]" />
              <span className="text-sm font-medium text-slate-600">Welcome</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Welcome to {" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #B470F5 0%, #F93138 100%)" }}
              >
                mems
              </span>
            </h1>
            <p className="mt-3 text-base text-slate-600">Sign in to your account</p>
            {mem && (
              <p className="mt-2 text-sm text-slate-500">You are joining “{mem.name}” at {mem.place}</p>
            )}
          </div>
          <div className="mt-8 h-[2px] w-full bg-gradient-to-r from-[#f93138]/50 via-[#d44b8a]/35 to-[#b470f5]/50" />
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
