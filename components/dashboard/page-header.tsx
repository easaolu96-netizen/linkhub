export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  /** Optional controls aligned to the right of the title (e.g. a date range). */
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.75rem] leading-none tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-3 max-w-lg text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/**
 * A titled block inside a dashboard tab. Blocks are separated by space and a
 * hairline rule rather than boxed cards, so the page reads as one document.
 */
export function Section({
  id,
  title,
  description,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t py-9 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 id={id} className={tone === "danger" ? "font-medium text-destructive" : "font-medium"}>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
