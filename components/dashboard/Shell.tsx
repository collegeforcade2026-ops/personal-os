import { ReactNode } from "react";
import { TopRail } from "./TopRail";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-[var(--background)] overflow-hidden">
      <TopRail />
      <main className="flex-1 overflow-auto p-3">
        {children}
      </main>
    </div>
  );
}
