import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

/** Auth is enforced in middleware — avoid duplicate session verify on every RSC render. */
export default function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {children}
      <Toaster />
    </div>
  );
}
