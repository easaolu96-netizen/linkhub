import { cn } from "@/lib/utils";

/**
 * Decorative phone bezel used by the dashboard preview and the landing page.
 * `scrollable` frames can be focused so keyboard users can scroll them with
 * the arrow keys; static frames (landing demo) simply clip their content.
 */
export function PhoneFrame({
  children,
  className,
  scrollable = true,
  label = "Phone preview",
}: {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/19] w-[280px] rounded-[2.75rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-xl xl:w-[300px]",
        className,
      )}
    >
      <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900" aria-hidden />
      {scrollable ? (
        <div
          tabIndex={0}
          role="region"
          aria-label={label}
          className="h-full w-full overflow-y-auto overscroll-contain rounded-[2rem] outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          {children}
        </div>
      ) : (
        <div className="h-full w-full overflow-hidden rounded-[2rem]">{children}</div>
      )}
    </div>
  );
}
