import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/trust-me-bro-forecast.png";

type Props = {
  className?: string;
  /** Render width in px (height scales automatically). */
  width?: number;
  priority?: boolean;
};

export function BrandLogo({ className, width = 280, priority = false }: Props) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Trust Me Bro Forecast — AI-powered predictions based on NewsAPI"
      width={width}
      height={Math.round(width * 0.32)}
      priority={priority}
      className={cn("h-auto w-full max-w-full object-contain", className)}
    />
  );
}
