import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import QRCode from "qrcode";

type Created = { memId: string; name: string; joinCode: string; joinUrl: string };

export function CreateMem() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const createMem = useMutation(api.mems.createMem);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !place.trim()) return;
    const result = await createMem({ name, description, place, isPublic: false });
    setCreated(result as Created);
    const dataUrl = await QRCode.toDataURL(result.joinUrl, { width: 256, margin: 2 });
    setQr(dataUrl);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Mem</CardTitle>
        <CardDescription>Fill details and generate a QR for others to join.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mem-name">Name</Label>
            <Input id="mem-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mem-place">Location</Label>
            <Input id="mem-place" value={place} onChange={(e) => setPlace(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mem-desc">Description</Label>
            <Textarea id="mem-desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <Button type="submit">Create & Generate QR</Button>
        </form>

        {created && (
          <div className="mt-6 space-y-3">
            <div className="text-sm">Join code: <strong>{created.joinCode}</strong></div>
            {qr && <img src={qr} alt="Join QR" className="w-64 h-64 bg-white p-2 rounded" />}
            <div className="text-xs text-muted-foreground break-all">Link: {created.joinUrl}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
