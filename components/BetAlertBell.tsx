"use client";

import { Bell } from "lucide-react";
import {
  showBetAboveToast,
  showBetBelowToast,
} from "@/lib/chart/betBelowToast";
import { cn } from "@/lib/utils";

type Props = {
  below: boolean;
  message: string | null;
};

export function BetAlertBell({ below, message }: Props) {
  return (
    <button
      type="button"
      aria-label={
        below
          ? "Price below your buy — show alert"
          : "Price at or above your buy"
      }
      title={
        below
          ? "Below your buy — toast every 6h; click for details"
          : "At or above your buy"
      }
      onClick={() => {
        if (below && message !== null) {
          showBetBelowToast(message);
          return;
        }
        showBetAboveToast();
      }}
      className={cn(
        "relative rounded-md p-1.5 transition-colors",
        below
          ? "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/50"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Bell className="size-4" strokeWidth={below ? 2.25 : 2} aria-hidden />
      {below ? (
        <span
          className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500 ring-2 ring-card"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
