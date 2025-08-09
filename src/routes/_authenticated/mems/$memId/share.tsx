import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";

// Helper to generate random float positions
function getRandomOffset() {
  return {
    x: (Math.random() - 0.5) * 16, // -8px to +8px
    y: (Math.random() - 0.5) * 16, // -8px to +8px
  };
}

// Helper to interpolate between two points
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

import { useQuery } from "convex/react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import QRCode from "qrcode";
import { api } from "../../../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/mems/$memId/share")({
  component: MemSharePage,
});

function MemSharePage() {
  // Floating avatars state (fluid animation)
  const [floatOffsets, setFloatOffsets] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const targets = useRef([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let running = true;
    // Continuously update targets for fluid movement
    function updateTargets() {
      targets.current = [
        getRandomOffset(),
        getRandomOffset(),
        getRandomOffset(),
      ];
    }
    updateTargets();
    let lastTargetUpdate = Date.now();
    const targetUpdateInterval = 1200; // ms

    function animate() {
      // Update targets every interval
      if (Date.now() - lastTargetUpdate > targetUpdateInterval) {
        updateTargets();
        lastTargetUpdate = Date.now();
      }
      setFloatOffsets((prev) =>
        prev.map((offset, i) => ({
          x: lerp(offset.x, targets.current[i].x, 0.08),
          y: lerp(offset.y, targets.current[i].y, 0.08),
        }))
      );
      if (running) rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
  const navigate = useNavigate();
  const { memId } = useParams({ from: "/_authenticated/mems/$memId/share" });
  const user = useQuery(api.auth.loggedInUser);
  const mem = useQuery(
    api.mems.getMemById,
    memId ? ({ memId } as any) : "skip"
  );
  const [qr, setQr] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === undefined) return; // loading
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/mem/${memId}/share` } });
    }
  }, [user, navigate, memId]);

  const joinLink = useMemo(() => {
    if (!mem?.joinCode) return null;
    try {
      const origin = window.location.origin;
      return `${origin}/join/${mem.joinCode}`;
    } catch {
      return null;
    }
  }, [mem?.joinCode]);

  // Generate QR when we have the link
  useEffect(() => {
    (async () => {
      if (!joinLink) return;

      const dataUrl = await QRCode.toDataURL(joinLink, {
        width: 256,
        margin: 2,
      });
      setQr(dataUrl);
    })();
  }, [joinLink]);

  if (user === undefined || mem === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!mem) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Mem not found</CardTitle>
            <CardDescription>
              Please check the link and try again.
            </CardDescription>
            <CardDescription>
              Please check the link and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-start font-sans bg-white"
      style={{ overflow: "hidden" }}
    >
      {/* Gradient background - reduced height and rounded bottom */}
      <div
        className="absolute top-0 left-0 w-full h-[300px] z-0 rounded-b-3xl"
        style={{
          background: "linear-gradient(135deg, #B470F5 0%, #F93138 100%)",
        }}
      />

      {/* Back link */}
      <div className="relative w-full flex justify-start px-6 pt-4 z-10">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="text-base px-5 py-2 rounded-full font-semibold text-black bg-white hover:bg-white/90 focus:bg-white/90 shadow-lg border border-white/20 transition-all duration-150 outline-none focus:ring-2 focus:ring-white"
        >
          &#8592; Back
        </button>
      </div>

      {/* QR code, event name, and scan info */}
      <div
        className="relative flex flex-col items-center w-full z-20"
        style={{ marginTop: "64px" }}
      >
        <div className="w-64 bg-white rounded-xl shadow border flex flex-col items-center p-4">
          {qr && <img src={qr} alt="Join QR" className="w-56 h-56 mb-2" />}
          <div className="w-full py-2 text-lg font-medium text-black text-center">
            {mem.name || "Event"}
          </div>
        </div>
        <div className="text-base text-black mt-6 mb-4 font-medium">
          Scan to join this mem. You may be asked to sign in.
        </div>
      </div>

      {/* Friends avatars */}
      <div className="w-full flex flex-col items-center mt-8 z-10">
        <div className="text-lg text-black font-semibold mb-6">
          These friends are in this mem
        </div>
        <div className="flex gap-6 justify-center">
          {/* ...existing code... */}
          {[
            { name: "You", src: "/pfp.png" },
            { name: "Reuben", src: "/pfp.png" },
            { name: "Garv", src: "/pfp.png" },
          ].map((friend, i) => (
            <div
              key={friend.name}
              className="flex flex-col items-center"
              style={{
                transform: `translate(${floatOffsets[i].x}px, ${floatOffsets[i].y}px)`,
                willChange: "transform",
              }}
            >
              <div className="w-20 h-20">
                <img
                  src={friend.src}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow"
                />
              </div>
              <span className="text-base text-black mt-1">{friend.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copy join link button at the bottom */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-20 pb-4">
        {joinLink && (
          <button
            className="w-11/12 max-w-md py-4 rounded-full text-2xl font-semibold text-white shadow-xl"
            style={{
              background: "#FF343A",
            }}
            onClick={async () => {
              if (joinLink) await navigator.clipboard.writeText(joinLink);
            }}
          >
            Copy join link
          </button>
        )}
      </div>
    </div>
  );
}
