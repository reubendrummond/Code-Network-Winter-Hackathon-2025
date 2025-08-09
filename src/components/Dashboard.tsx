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
      {/* 1) Vibrant blurred color radials centered */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -30,
          backgroundColor: "#1a0b2e",
          backgroundImage: [
            // Central purple burst
            "radial-gradient(800px 800px at 50% 50%, rgba(147, 51, 234, 0.7), rgba(147, 51, 234, 0) 70%)",
            // Teal glow center-left
            "radial-gradient(600px 600px at 35% 45%, rgba(20, 184, 166, 0.6), rgba(20, 184, 166, 0) 65%)",
            // Orange glow center-right
            "radial-gradient(650px 650px at 65% 55%, rgba(251, 146, 60, 0.5), rgba(251, 146, 60, 0) 65%)",
            // Pink accent top-center
            "radial-gradient(500px 500px at 50% 25%, rgba(236, 72, 153, 0.4), rgba(236, 72, 153, 0) 60%)",
            // Blue glow bottom
            "radial-gradient(700px 700px at 50% 75%, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0) 70%)"
          ].join(', '),
          filter: "blur(120px) saturate(130%)",
          opacity: 1,
          transition: "background 0.5s ease",
        }}
      />

      {/* 2) Subtle overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -20,
          background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
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
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-sky-300 to-purple-300">
            mems
          </span>
        </h1>

        <p className="mt-4 text-lg text-white/80 min-h-[1.5rem]">
          {user?.name ?? ""}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            size="lg"
            className="px-6 py-5 text-base font-medium bg-gradient-to-r from-teal-400 via-sky-400 to-purple-400 text-slate-900 hover:opacity-90 border-0 transition"
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
