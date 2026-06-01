export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 animate-pulse">
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-7 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-20 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex gap-3">
          <div className="h-10 w-40 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-10 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-7 w-40 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-24 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-32 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-10 w-44 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
