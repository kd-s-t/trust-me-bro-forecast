"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import "sonner/dist/styles.css";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:opacity-90",
          warning:
            "!border-amber-500/70 !bg-amber-50 !text-amber-950 dark:!border-amber-500/50 dark:!bg-amber-950 dark:!text-amber-50",
        },
      }}
      {...props}
    />
  );
}
