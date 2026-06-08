import { playBetBelowAlertSound } from "@/lib/chart/betBelowSound";
import { toast } from "sonner";

const BET_BELOW_TOAST_ID = "bet-below-market";

const betBelowToastClassNames = {
  toast:
    "!border-amber-500/70 !bg-amber-50 !text-amber-950 dark:!border-amber-500/50 dark:!bg-amber-950 dark:!text-amber-50",
  title: "!font-semibold !text-amber-950 dark:!text-amber-50",
  description: "!text-amber-900/90 dark:!text-amber-100/90",
  icon: "!text-amber-600 dark:!text-amber-400",
  closeButton:
    "!border-amber-300 !bg-amber-100 !text-amber-900 dark:!border-amber-700 dark:!bg-amber-900 dark:!text-amber-100",
} as const;

export function showBetBelowToast(description: string): void {
  playBetBelowAlertSound();
  toast.warning("Below your buy", {
    id: BET_BELOW_TOAST_ID,
    description,
    duration: 15_000,
    classNames: betBelowToastClassNames,
  });
}

export function showBetAboveToast(): void {
  toast.success("Above your buy", {
    description: "BTC is at or above your Jun 2 entry.",
    duration: 5000,
  });
}
