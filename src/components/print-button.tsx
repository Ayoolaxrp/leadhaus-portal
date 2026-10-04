"use client";

import { Printer } from "@phosphor-icons/react";
import { btn } from "./ui";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btn.secondary} print:hidden`}>
      <Printer size={16} aria-hidden /> {label}
    </button>
  );
}
