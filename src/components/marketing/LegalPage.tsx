export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 pt-10 md:px-8 md:pt-16">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-haze">Last updated {updated}</p>
      <div className="prose-lite mt-10">{children}</div>
    </article>
  );
}
