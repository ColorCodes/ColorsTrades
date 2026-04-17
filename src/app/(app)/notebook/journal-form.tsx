"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Initial {
  id?: string;
  date?: string;
  title?: string;
  bodyMarkdown?: string;
  tags?: string[];
}

export function JournalForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [date, setDate] = React.useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [body, setBody] = React.useState(initial?.bodyMarkdown ?? "");
  const [tags, setTags] = React.useState((initial?.tags ?? []).join(","));
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      date,
      title,
      bodyMarkdown: body,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch(initial?.id ? `/api/notebook/${initial.id}` : "/api/notebook", {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Save failed" }));
      toast.error(error ?? "Save failed");
      return;
    }
    toast.success(initial?.id ? "Entry updated" : "Entry created");
    router.push("/notebook");
    router.refresh();
  }

  return (
    <Card><CardContent className="p-4 sm:p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="review, ES, news" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Body</Label>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Markdown supported…" />
            </TabsContent>
            <TabsContent value="preview">
              <div className="prose prose-invert max-w-none rounded-md border p-3 bg-background/50 min-h-[200px] text-sm">
                <ReactMarkdown>{body || "_Nothing yet._"}</ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : initial?.id ? "Update" : "Create"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}
