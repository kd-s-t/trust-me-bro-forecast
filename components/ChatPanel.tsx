"use client";

import { MessageSquare, Send } from "lucide-react";
import { ModelSelect } from "@/components/ModelSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <ModelSelect />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <MessageSquare
            className="size-8 text-muted-foreground/70"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">Assistant Bro</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Coming soon
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2 opacity-60">
          <Input
            placeholder="Coming soon…"
            className="min-w-0 flex-1 text-sm"
            aria-label="Chat message"
            disabled
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            disabled
            aria-label="Send message"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
