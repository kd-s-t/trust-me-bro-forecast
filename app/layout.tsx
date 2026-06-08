import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ExtensionNoiseShield } from "@/components/ExtensionNoiseShield";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Trust Me Bro Forecast",
    template: "%s · Trust Me Bro Forecast",
  },
  description:
    "Bitcoin price history and forecast outlook — trust me bro.",
  applicationName: "Trust Me Bro Forecast",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-dvh" suppressHydrationWarning>
      <head>
        <ExtensionNoiseShield />
      </head>
      <body className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden">
        {children}
      </body>
    </html>
  );
}
