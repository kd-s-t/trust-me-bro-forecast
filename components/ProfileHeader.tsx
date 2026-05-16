"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/userProfile";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ProfileHeader({ className }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const body = (await res.json()) as UserProfile & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to load profile");
        }
        if (!cancelled) {
          setProfile(body);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center border-b border-border px-3 py-4",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (profile === null) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center border-b border-border px-3 py-4 text-center",
        className,
      )}
    >
      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-full border border-border bg-muted object-cover"
      />
      <p className="mt-2 w-full truncate text-sm font-semibold leading-tight text-foreground">
        {profile.displayName}
      </p>
    </div>
  );
}
