type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-tic-navy">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-tic-muted">
        This route is stubbed in Sprint 0/Sprint 1 and reserved for the later sprint implementation specified in the development prompt.
      </p>
    </div>
  );
}
