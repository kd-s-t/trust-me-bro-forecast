"use client";

import { motion } from "framer-motion";
import type { AriaRole, ReactNode } from "react";

import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease },
  },
};

export function MotionHeader({ children }: { children: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      {children}
    </motion.header>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("flex flex-col gap-5 pt-6", className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function FadePanel({
  children,
  className,
  role,
}: {
  children: ReactNode;
  className?: string;
  role?: AriaRole;
}) {
  return (
    <motion.section
      className={cn(
        "rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm",
        className,
      )}
      role={role}
      variants={fadeItem}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.section>
  );
}
