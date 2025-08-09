import { createFileRoute, useNavigate, useParams, useLocation, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useState } from "react";

export const Route = createFileRoute("/mem/$memId")({
  component: MemDetailPage,
});

function MemDetailPage() {
  const navigate = useNavigate();
  const { memId } = useParams({ from: "/mem/$memId" });
  const location = useLocation();
  const mem = useQuery(api.mems.getMemById, memId ? ({ memId } as any) : "skip");
  const user = useQuery(api.auth.loggedInUser);
  const isParticipant = useQuery(api.mems.isParticipant, memId ? ({ memId } as any) : "skip");
  const notes = useQuery(api.mems.listMemNotes, memId ? ({ memId } as any) : "skip");
  const addNote = useMutation(api.mems.addMemNote);
  const [note, setNote] = useState("");

  const isShareRoute = location.pathname.endsWith("/share");

  if (user === null) {
    navigate({ to: "/login", search: { redirect: isShareRoute ? `/mem/${memId}/share` : `/mem/${memId}` } });
    return null;
  }

  if (!mem) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Mem not found</CardTitle>
            <CardDescription>The mem you're looking for doesn't exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isShareRoute) {
    return <Outlet />;
  }

  // If the user is authenticated and the mem is loaded, but they're not a participant,
  // prompt them to join via the join route.
  if (user && mem && isParticipant === false) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Join “{mem.name}”</CardTitle>
            <CardDescription>You don’t have access yet. Join to view and contribute.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate({ to: "/join/$joinCode", params: { joinCode: mem.joinCode } as any })}
            >
              Join this mem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>{mem.name}</CardTitle>
          <CardDescription>{mem.place}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mem.description}</p>
          <div className="mt-6 flex gap-2">
            <Button onClick={() => navigate({ to: "/mem/$memId/share", params: { memId } })}>Share</Button>
          </div>
          <div className="mt-8">
            <h3 className="font-semibold mb-2">Notes</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const content = note.trim();
                if (!content) return;
                await addNote({ memId: mem._id as any, content });
                setNote("");
              }}
              className="space-y-2"
            >
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a note..." />
              <Button type="submit" size="sm">Add Note</Button>
            </form>
            <div className="mt-4 space-y-3">
              {notes?.map((n) => (
                <div key={(n as any)._id} className="border rounded p-2 text-sm">
                  {(n as any).content}
                </div>
              )) || null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
