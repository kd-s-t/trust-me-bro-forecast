"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { ChatPanel } from "@/components/ChatPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { UpdateDataButton } from "@/components/UpdateDataButton";

export function AppSidebar() {
  return (
    <aside className="flex w-[20%] shrink-0 flex-col self-stretch border-l border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 pt-3 pb-2">
        <BrandLogo width={220} className="mx-auto max-w-full" />
      </div>
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Controls
        </p>
        <div className="flex flex-col gap-2">
          <UpdateDataButton className="w-full" />
          <LogoutButton className="w-full" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="shrink-0 border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assistant Bro
        </p>
        <ChatPanel />
      </div>
    </aside>
  );
}
