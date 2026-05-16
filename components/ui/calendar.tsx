"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import type { DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export function Calendar(props: DayPickerProps) {
  const { className, ...rest } = props;

  return (
    <DayPicker
      {...rest}
      className={cn("rounded-xl border-none p-3", className)}
    />
  );
}
