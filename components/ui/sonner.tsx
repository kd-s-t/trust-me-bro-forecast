"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-left"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-card text-foreground shadow-md",
        },
      }}
    />
  );
}
