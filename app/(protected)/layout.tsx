import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();
  if (user === null) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">{children}</div>
  );
}
