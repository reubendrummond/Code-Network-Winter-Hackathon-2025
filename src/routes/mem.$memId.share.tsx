import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import QRCode from "qrcode";

export const Route = createFileRoute("/mem/$memId/share")({
  component: MemSharePage,
});

function MemSharePage() {
  const navigate = useNavigate();
  const { memId } = useParams({ from: "/mem/$memId/share" });
  const user = useQuery(api.auth.loggedInUser);
  const mem = useQuery(api.mems.getMemById, memId ? ({ memId } as any) : "skip");
  const [qr, setQr] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === undefined) return; // loading
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/mem/${memId}/share` } });
    }
  }, [user, navigate, memId]);

  const memPageLink = useMemo(() => {
    try {
      const origin = window.location.origin;
      return `${origin}/mem/${memId}`;
    } catch {
      return null;
    }
  }, [memId]);

  // Generate QR when we have the link
  useEffect(() => {
    (async () => {
      if (!memPageLink) return;
      const dataUrl = await QRCode.toDataURL(memPageLink, { width: 256, margin: 2 });
      setQr(dataUrl);
    })();
  }, [memPageLink]);

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
            <CardDescription>Please check the link and try again.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Share “{mem.name}”</CardTitle>
          <CardDescription>Scan to open the mem page. Users may need to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {qr && (
              <img
                src={qr}
                alt="Join QR"
                className="w-64 h-64 bg-white p-2 rounded shadow border"
              />
            )}
            {memPageLink && (
              <div className="w-full">
                <div className="text-xs text-muted-foreground break-all mb-2">{memPageLink}</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(memPageLink);
                      } catch {}
                    }}
                  >
                    Copy mem link
                  </Button>
                  {qr && (
                    <Button
                      type="button"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = qr;
                        a.download = `mem-${mem._id}-join.png`;
                        a.click();
                      }}
                      variant="outline"
                    >
                      Download QR
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

