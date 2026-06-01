export default function TestPageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 animate-pulse">
      {/* Status header */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-40 rounded-lg bg-slate-200" />
            <div className="h-4 w-64 rounded bg-slate-200" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-6 w-14 rounded-full bg-slate-200" />
            <div className="h-6 w-14 rounded-full bg-slate-200" />
            <div className="h-9 w-28 rounded-lg bg-slate-200" />
          </div>
        </div>
      </section>

      {/* 3 test cards in grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <article
            key={i}
            className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-5 w-28 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-5/6 rounded bg-slate-200" />
            </div>
            <div className="h-9 w-full rounded-lg bg-slate-200" />
          </article>
        ))}
      </section>
    </div>
  );
}
