"use client";

import { AssistantBro } from "@/components/AssistantBro";
import { BinanceBalance } from "@/components/BinanceBalance";
import { BrandLogo } from "@/components/BrandLogo";
import { LogoutButton } from "@/components/LogoutButton";
import { ForecastButton } from "@/components/ForecastButton";
import { ForecastSelect } from "@/components/ForecastSelect";
import {
  MotionControlsSection,
  Stagger,
  StaggerItem,
} from "@/components/MotionLayout";
import { ProfileHeader } from "@/components/ProfileHeader";
import { UpdateDataButton } from "@/components/UpdateDataButton";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function AppSidebar() {
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-border bg-card">
      <motion.div
        className="shrink-0 border-b border-border px-3 pt-3 pb-2"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <BrandLogo width={220} className="mx-auto max-w-full" />
      </motion.div>
      <ProfileHeader />
      <BinanceBalance />
      <MotionControlsSection className="shrink-0 space-y-2 border-b border-border p-3">
        <motion.p
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease, delay: 0.18 }}
        >
          Controls
        </motion.p>
        <Stagger className="flex flex-col gap-2 pt-0" stagger={0.07} delayChildren={0.2}>
          <StaggerItem>
            <UpdateDataButton className="w-full" />
          </StaggerItem>
          <StaggerItem>
            <ForecastSelect />
          </StaggerItem>
          <StaggerItem>
            <ForecastButton />
          </StaggerItem>
        </Stagger>
      </MotionControlsSection>
      <AssistantBro />
      <footer className="mt-auto flex shrink-0 justify-center border-t border-border bg-card px-3 py-3">
        <LogoutButton />
      </footer>
    </aside>
  );
}
