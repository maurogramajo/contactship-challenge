export default function ContactsLoading() {
  return (
    <div className="flex flex-col gap-4 p-8 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-10 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}
