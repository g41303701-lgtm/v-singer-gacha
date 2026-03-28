"use client";

import { SettingsProvider } from "@/lib/SettingsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
}
