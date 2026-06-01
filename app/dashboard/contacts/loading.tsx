export default function ContactsLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-32 rounded-lg bg-slate-200" />
            <div className="h-4 w-72 rounded bg-slate-200" />
          </div>
          <div className="h-fit rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:min-w-32">
            <div className="h-3 w-10 rounded bg-slate-200" />
            <div className="mt-1 h-6 w-12 rounded bg-slate-200" />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="h-10 w-full rounded-xl bg-slate-200 xl:max-w-3xl" />
            <div className="h-10 w-48 rounded-xl bg-slate-200" />
            <div className="h-10 w-48 rounded-xl bg-slate-200" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_1fr] gap-4 bg-slate-50 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-slate-200" />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_1fr] gap-4 px-4 py-4"
            >
              <div className="h-4 w-11/12 rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-6 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-5/6 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
