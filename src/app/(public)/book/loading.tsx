export default function BookingLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl animate-pulse px-5 py-16 sm:px-8">
      <div className="mx-auto h-4 w-28 rounded bg-secondary" />
      <div className="mx-auto mt-5 h-12 w-full max-w-lg rounded bg-secondary" />
      <div className="mx-auto mt-4 h-5 w-full max-w-xl rounded bg-muted" />
      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="h-5 w-40 rounded bg-secondary" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-lg bg-muted" />
          <div className="h-36 rounded-lg bg-muted" />
        </div>
      </div>
    </section>
  );
}
