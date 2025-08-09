import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";

interface DashboardProps {
  user: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
}
export function Dashboard({ user }: DashboardProps) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg- white text-slate-900 font-sans">

      {/* Top bar */}
    <div className="flex items-center justify-end px-6 py-4">
        <Button
          onClick={handleSignOut}
      variant="outline"
      size="sm"
      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Hero content */}
  <main className="relative z-0 mx-auto max-w-5xl px-6 py-10 min-h-[70vh] flex flex-col items-center justify-center text-center">
        {/* Accent pill */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#f93138] via-[#d44b8a] to-[#b470f5]" />
          <span className="text-xs font-medium text-slate-600">Minimal, modern, and vibrant</span>
        </div>

  {/* Hero card */}
  <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
            Welcome to {" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #06b6d4 0%, #3b82f6 25%, #a855f7 55%, #f472b6 80%, #fef08a 100%)",
              }}
            >
              mems
            </span>
          </h1>

          <p className="mt-5 text-lg sm:text-2xl text-slate-600 min-h-[1.75rem]">
            {user?.name ?? ""}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              size="lg"
              className="px-7 py-6 text-base sm:text-lg font-semibold rounded-xl text-white transition will-change-transform active:scale-[0.98] shadow-md hover:shadow-lg"
              style={{
                background: "linear-gradient(90deg, #B470F5 0%, #F93138 100%)",
                color: "#fff",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
              }}
              onClick={() => navigate({ to: "/mem/create" })}
            >
              Create your first mem
            </Button>
          </div>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Start capturing moments and invite friends to join.
          </p>
        </div>
      </main>
    </div>
  );
}
