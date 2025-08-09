import {
  createFileRoute,
  Link,
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mems/$memId/share")({
  component: MemSharePage,
});

function MemSharePage() {
  const navigate = useNavigate();
  const { memId } = useParams({ from: "/_authenticated/mems/$memId/share" });
  const user = useQuery(api.auth.loggedInUser);
  const mem = useQuery(
    api.mems.getMemById,
    memId ? ({ memId } as any) : "skip"
  );
  const participants = useQuery(
    api.mems.getMemParticipants,
    memId ? ({ memId } as any) : "skip"
  );

  // Initialize floating animation based on participant count
  const participantCount = participants?.length || 0;
  const [floatOffsets, setFloatOffsets] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const targets = useRef<Array<{ x: number; y: number }>>([]);
  const rafRef = useRef<number | null>(null);

  // Initialize animation arrays when participant count changes
  useEffect(() => {
    if (participantCount > 0) {
      const initialOffsets = Array(participantCount)
        .fill(0)
        .map(() => ({ x: 0, y: 0 }));
      const initialTargets = Array(participantCount)
        .fill(0)
        .map(() => getRandomOffset());
      setFloatOffsets(initialOffsets);
      targets.current = initialTargets;
    }
  }, [participantCount]);

  useEffect(() => {
    if (participantCount === 0) return;

    let running = true;
    // Continuously update targets for fluid movement
    function updateTargets() {
      targets.current = Array(participantCount)
        .fill(0)
        .map(() => getRandomOffset());
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
          x: lerp(offset.x, targets.current[i]?.x || 0, 0.08),
          y: lerp(offset.y, targets.current[i]?.y || 0, 0.08),
        }))
      );
      if (running) rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [participantCount]);
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

  if (user === undefined || mem === undefined || participants === undefined) {
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
    <div className="relative h-dvh flex flex-col font-sans bg-white overflow-hidden justify-between">
      {/* Gradient background */}
      <div
        className="absolute top-0 left-0 w-full h-32 sm:h-40 z-0"
        style={{
          background: "linear-gradient(135deg, #B470F5 0%, #F93138 100%)",
        }}
      />

      {/* Back button */}
      <div className="relative w-full flex justify-start px-4 pt-3 z-10">
        <Link
          to="/mems/$memId"
          params={{
            memId,
          }}
          className="text-sm px-4 py-2 rounded-full font-semibold text-black bg-white hover:bg-white/90 shadow-lg transition-all"
        >
          ← Back
        </Link>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex-grow flex flex-col items-center justify-between px-4 py-4">
        {/* QR Section */}
        <div className="flex flex-col items-center mb-6 z-1">
          <div className="w-58 bg-white rounded-xl shadow-lg border flex flex-col items-center p-3">
            {qr && <img src={qr} alt="Join QR" className="w-48 h-48 mb-2" />}
            <div className="text-sm font-medium text-black text-center truncate px-2">
              {mem.name || "Event"}
            </div>
          </div>
          <p className="text-xs text-black mt-2 text-center">
            Scan to join this mem
          </p>
        </div>

        {/* Participants */}
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold text-black mb-3">
            People in this mem
          </h3>
          <div className="flex gap-3 justify-center flex-wrap max-w-xs">
            {participants?.slice(0, 6).map((participant, i) => (
              <div
                key={participant._id}
                className="flex flex-col items-center"
                style={{
                  transform: `translate(${(floatOffsets[i]?.x || 0) * 0.3}px, ${(floatOffsets[i]?.y || 0) * 0.3}px)`,
                  willChange: "transform",
                }}
              >
                <div className="w-16 h-16">
                  <img
                    src={participant.image || "/pfp.png"}
                    alt={`${participant.name}'s profile`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                    onError={(e) => {
                      e.currentTarget.src = "/pfp.png";
                    }}
                  />
                </div>
                <span className="text-xs text-black mt-1 text-center max-w-[70px] truncate">
                  {participant.userId === user?._id ? "You" : participant.name}
                </span>
                {participant.role === "creator" && (
                  <span className="text-xs text-gray-600">Owner</span>
                )}
              </div>
            )) || []}
          </div>
        </div>
        {/* Fixed bottom button */}
        <div className="w-full p-4">
          {joinLink && (
            <button
              className="w-full py-3 rounded-full text-base font-semibold text-white shadow-lg active:scale-[0.98] transition-transform hover:cursor-pointer"
              style={{
                background: "#FF343A",
              }}
              onClick={async () => {
                await navigator.clipboard.writeText(joinLink);
                toast("Copied to clipboard");
              }}
            >
              Copy join link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
