  import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import { BackButton } from "../../../components/ui/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

export const Route = createFileRoute("/_authenticated/mems/create")({
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
      navigate({ to: "/mems/$memId", params: { memId: (res as any).memId } });
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
      navigate({ to: "/login", search: { redirect: "/mems/create" } });
    }
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen bg-white flex items-center justify-center">
      <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
        <BackButton to="/mems" />
      </div>
      <div className="w-full max-w-xl px-4 sm:px-6 py-8 sm:py-12">
        <Card className="w-full border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 text-center">
              Create a new mem
            </CardTitle>
            <CardDescription className="text-center text-gray-500">
              Start a memory session and invite others to add moments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Sam & Priya's Engagement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place">Location</Label>
                <Input
                  id="place"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  required
                  placeholder="City or venue (optional details)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="What is this mem about?"
                  className="min-h-24"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-base text-white bg-gradient-to-r from-[#B470F5] to-[#F93138] hover:opacity-90"
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
