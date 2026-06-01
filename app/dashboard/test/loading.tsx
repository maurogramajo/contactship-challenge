export default function TestPageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 animate-pulse">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-6 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-6 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 rounded-xl border border-border bg-surface p-5"
          />
        ))}
      </div>
    </div>
  );
}
