import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

type MemFormValues = {
  name: string;
  place: string;
  description: string;
};

type MemFormProps = {
  onSubmit: (values: MemFormValues) => Promise<void> | void;
  submitting?: boolean;
  initial?: Partial<MemFormValues>;
  submitLabel?: string;
  className?: string;
};

export function MemForm({
  onSubmit,
  submitting,
  initial,
  submitLabel = "Create",
  className,
}: MemFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || !place.trim() || !description.trim()) return;
        await onSubmit({ name, place, description });
      }}
      className={className ?? "space-y-4"}
    >
      <div>
        <Label htmlFor="mem-name">Name</Label>
        <Input
          id="mem-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. College Reunion 2025"
        />
      </div>
      <div>
        <Label htmlFor="mem-place">Location</Label>
        <Input
          id="mem-place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          required
          placeholder="e.g. San Francisco, CA"
        />
      </div>
      <div>
        <Label htmlFor="mem-desc">Description</Label>
        <Textarea
          id="mem-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="What is this mem about?"
        />
      </div>
      <Button type="submit" disabled={!!submitting}>
        {submitting ? "Submitting..." : submitLabel}
      </Button>
    </form>
  );
}
