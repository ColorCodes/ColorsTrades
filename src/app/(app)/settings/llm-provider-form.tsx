"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LlmSettingsState } from "@/lib/llm-settings";

type Provider = "ANTHROPIC" | "GOOGLE";

const LABELS: Record<Provider, string> = {
  ANTHROPIC: "Anthropic (Claude)",
  GOOGLE: "Google (Gemini)",
};

const PLACEHOLDERS: Record<Provider, string> = {
  ANTHROPIC: "sk-ant-api03-…",
  GOOGLE: "AIza…",
};

function blockClipboard(e: React.ClipboardEvent<HTMLInputElement>) {
  e.preventDefault();
}

function KeyInput({ provider }: { provider: Provider }) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <Input
      ref={ref}
      type="password"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      inputMode="text"
      name={`llm-key-${provider}-${Math.random().toString(36).slice(2, 8)}`}
      data-1p-ignore
      data-lpignore="true"
      data-form-type="other"
      placeholder={PLACEHOLDERS[provider]}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      data-sensitive="true"
      aria-describedby={`llm-key-${provider}-help`}
    />
  );
}

function ProviderCard({
  provider,
  state,
  onSaved,
}: {
  provider: Provider;
  state: LlmSettingsState["providers"][Provider];
  onSaved: (next: LlmSettingsState) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [showForm, setShowForm] = React.useState(!state.configured);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input = formRef.current?.querySelector('input[type="password"]') as HTMLInputElement | null;
    const apiKey = input?.value.trim() ?? "";
    if (apiKey.length < 10) {
      toast.error("That key looks too short");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveKey", provider, apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (input) input.value = "";
      toast.success(`${LABELS[provider]} key saved`);
      setShowForm(false);
      onSaved(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${LABELS[provider]} key? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeKey", provider }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Remove failed");
      toast.success(`${LABELS[provider]} key removed`);
      setShowForm(true);
      onSaved(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{LABELS[provider]}</span>
          {state.configured ? (
            <Badge variant="success">Configured · ••••{state.lastFour}</Badge>
          ) : (
            <Badge variant="secondary">Not set</Badge>
          )}
        </div>
        {state.configured && !showForm && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} disabled={busy}>
              Replace key
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={remove} disabled={busy}>
              Remove
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={save} className="flex flex-col gap-2">
          <Label>New API key</Label>
          <KeyInput provider={provider} />
          <p id={`llm-key-${provider}-help`} className="text-xs text-muted-foreground">
            Stored encrypted on the server. Once saved, it can&apos;t be read back — only replaced or removed.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} size="sm">
              {busy ? "Saving…" : "Save key"}
            </Button>
            {state.configured && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={busy}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function LlmProviderForm({ initial }: { initial: LlmSettingsState }) {
  const [state, setState] = React.useState<LlmSettingsState>(initial);
  const [activeBusy, setActiveBusy] = React.useState(false);

  async function setActive(next: string) {
    const provider = next === "NONE" ? null : (next as Provider);
    setActiveBusy(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActive", provider }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setState(json);
      toast.success(provider ? `Active provider: ${LABELS[provider]}` : "AI import disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActiveBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label>Active provider</Label>
        <Select value={state.activeProvider ?? "NONE"} onValueChange={setActive} disabled={activeBusy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Disabled</SelectItem>
            <SelectItem value="ANTHROPIC" disabled={!state.providers.ANTHROPIC.configured}>
              Anthropic (Claude)
            </SelectItem>
            <SelectItem value="GOOGLE" disabled={!state.providers.GOOGLE.configured}>
              Google (Gemini)
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The AI chat importer uses whichever provider you pick here.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ProviderCard provider="ANTHROPIC" state={state.providers.ANTHROPIC} onSaved={setState} />
        <ProviderCard provider="GOOGLE" state={state.providers.GOOGLE} onSaved={setState} />
      </div>
    </div>
  );
}
