import { NewsletterTemplateContent } from "@/lib/newsletter-template";

type NewsletterPreviewProps = {
  content: NewsletterTemplateContent;
};

function ArticleMeta({
  sourceName,
  publishedAtLabel,
}: {
  sourceName: string | null;
  publishedAtLabel: string | null;
}) {
  const meta = [sourceName, publishedAtLabel].filter(Boolean).join(" · ");

  if (!meta) {
    return null;
  }

  return <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{meta}</p>;
}

export function NewsletterPreview({ content }: NewsletterPreviewProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <p>
            <span className="font-semibold text-slate-700">Asunto:</span>{" "}
            {content.newsletterName} - {content.headline}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Preheader:</span>{" "}
            {content.preheader}
          </p>
        </div>
      </div>

      <div className="bg-slate-950 px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          {content.newsletterName} · {content.editionLabel}
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight">
          {content.headline}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          {content.intro}
        </p>
      </div>

      <div className="space-y-6 px-6 py-8 sm:px-8">
        {content.featuredArticle ? (
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
              Historia destacada
            </p>
            <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {content.featuredArticle.title}
            </h4>
            <ArticleMeta
              sourceName={content.featuredArticle.sourceName}
              publishedAtLabel={content.featuredArticle.publishedAtLabel}
            />
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              {content.featuredArticle.summary}
            </p>
            {content.featuredArticle.href ? (
              <a
                href={content.featuredArticle.href}
                className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Leer destacada
              </a>
            ) : null}
          </section>
        ) : null}

        {content.articles.length > 0 ? (
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Radar rapido
              </p>
              <h4 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Lecturas cortas para ponerte al dia.
              </h4>
            </div>

            <div className="space-y-4">
              {content.articles.map((article) => (
                <article
                  key={article.title}
                  className="rounded-3xl border border-slate-200 bg-white p-5"
                >
                  <h5 className="text-lg font-semibold text-slate-950">
                    {article.title}
                  </h5>
                  <ArticleMeta
                    sourceName={article.sourceName}
                    publishedAtLabel={article.publishedAtLabel}
                  />
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {article.summary}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-6">
          <p className="text-sm font-semibold text-cyan-700">
            Por que este formato funciona
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            {content.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-slate-200 pt-5 text-xs leading-6 text-slate-400">
          <p>{content.footerNote}</p>
          <p className="mt-2">
            {content.companyName} · {content.companyAddress}
          </p>
        </footer>
      </div>
    </div>
  );
}
