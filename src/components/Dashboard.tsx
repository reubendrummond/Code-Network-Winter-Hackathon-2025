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
    <div className="relative min-h-screen overflow-hidden text-white font-sans">
      {/* 1) Brand diagonal gradient background */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -30,
          background: "linear-gradient(135deg, #B470F5 0%, #F93138 100%)",
          transition: "background 0.5s ease",
        }}
      />
      {/* Vibrancy overlay for extra pop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: -25,
          background:
            "linear-gradient(135deg, rgba(180,112,245,0.18) 0%, rgba(249,49,56,0.18) 100%)",
          mixBlendMode: "lighten",
        }}
      />
      {/* Fuzzy translucent overlay */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          zIndex: -20,
          background: "rgba(255, 255, 255, 0.18)",
        }}
      />

      {/* 2) Subtle overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -20,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
        }}
      />

      {/* Top bar */}
      <div className="flex items-center justify-end px-6 py-4">
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Hero content */}
      <main className="relative z-0 flex flex-col items-center text-center mx-auto max-w-4xl px-6 pt-12 pb-24">
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">
          Welcome to <span className="text-white">mems</span>
        </h1>

        <p className="mt-4 text-lg text-white/80 min-h-[1.5rem]">
          {user?.name ?? ""}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            size="lg"
            className="px-6 py-5 text-base font-medium"
            style={{
              background: "rgb(249, 49, 56)",
              color: "#fff",
              boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
            }}
            onClick={() => navigate({ to: "/mem/create" })}
          >
            Create your first mem
          </Button>
        </div>

        <p className="mt-3 text-sm text-white/70 max-w-md">
          Start capturing moments and invite friends to join.
        </p>
      </main>
    </div>
  );
}
