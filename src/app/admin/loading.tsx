export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex" aria-busy="true" aria-label="Loading admin">
      <div className="hidden md:block w-72 border-r border-slate-200 bg-white p-6 space-y-3 animate-pulse">
        <div className="h-9 w-40 rounded-lg bg-slate-100" />
        <div className="h-8 rounded-xl bg-slate-100" />
        <div className="h-8 rounded-xl bg-slate-100" />
        <div className="h-8 rounded-xl bg-slate-100" />
      </div>
      <div className="flex-1 p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-6 w-56 rounded-lg bg-slate-200/80" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
        </div>
        <div className="h-72 rounded-2xl bg-white border border-slate-200" />
      </div>
    </div>
  );
}
