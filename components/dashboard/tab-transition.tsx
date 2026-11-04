"use client";

import { usePathname } from "next/navigation";

/** Fades each dashboard tab's content in when you switch tabs (none with reduced motion). */
export function TabTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
      {children}
    </div>
  );
}
