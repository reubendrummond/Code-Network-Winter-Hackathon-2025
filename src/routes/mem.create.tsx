import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/mem/create")({
  component: CreateMemPage,
});

function CreateMemPage() {
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createMem({
        name,
        place,
        description,
        isPublic: false,
      });
      navigate({ to: "/mem/$memId", params: { memId: (res as any).memId } });
    } finally {
      setSubmitting(false);
    }
  }
  const navigate = useNavigate();
  const createMem = useMutation(api.mems.createMem);
  const user = useQuery(api.auth.loggedInUser);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/mem/create" } });
    }
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-start font-sans">
      {/* Top gradient background */}
      <div
        className="absolute top-0 left-0 w-full h-[38vh] min-h-[220px] z-0"
        style={{
          background: "linear-gradient(135deg, #B470F5 0%, #F93138 100%)",
        }}
      />
      {/* Curved white card with form */}
      <div
        className="relative w-full max-w-md mx-auto z-20 flex-1 flex flex-col justify-center"
        style={{ marginTop: "2.5rem" }}
      >
        <div className="bg-white rounded-t-[2.5rem] shadow-xl px-6 pt-10 pb-8 min-h-[60vh] flex flex-col items-center">
          <h1 className="text-2xl font-semibold text-gray-700 mb-2">
            Let's make a new mem
          </h1>
          <form onSubmit={onSubmit} className="w-full space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder=""
                className="placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="place">Location</Label>
              <Input
                id="place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                required
                placeholder=""
                className="placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder=""
                className="placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full text-lg font-medium rounded-lg mt-2"
              style={{
                background: "linear-gradient(90deg, #B470F5 0%, #F93138 100%)",
                color: "#fff",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
              }}
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
