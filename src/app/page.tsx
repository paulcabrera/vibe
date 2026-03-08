import type { Metadata } from "next";

import { NewsletterForm } from "@/components/newsletter-form";
import {
  ExternalNewsArticle,
  FetchGoogleNewsParams,
  GoogleNewsProvider,
} from "@/lib/news/google-news-provider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Vibe | Crypto satire con noticias reales",
  description:
    "Home page con noticias reales de crypto obtenidas desde Google News y una capa editorial de satira.",
};

const CRYPTO_QUERY_OPTIONS: FetchGoogleNewsParams[] = [
  {
    query: "crypto OR bitcoin OR ethereum OR solana OR blockchain",
    limit: 6,
    language: "es-419",
    country: "MX",
  },
  {
    query: "crypto OR bitcoin OR ethereum OR solana OR blockchain",
    limit: 6,
    language: "en-US",
    country: "US",
  },
];

const EDITORIAL_NOTES = [
  "Titulares y links reales. El comentario dramatico es completamente nuestro.",
  "Si una nota parece exagerada, tranquilo: probablemente solo describe al mercado.",
  "Leemos Google News para que tu no tengas que abrir 17 tabs y una crisis existencial.",
];

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

type DecoratedArticle = ExternalNewsArticle & {
  shortSource: string;
  publishedAtLabel: string | null;
  dramaScore: number;
  fomoScore: number;
  smokeScore: number;
  marketMood: string;
  satireTag: string;
  satiricalSummary: string;
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPublishedAt(value: Date | null) {
  return value ? dateFormatter.format(value) : null;
}

function getShortSourceName(article: ExternalNewsArticle) {
  return article.sourceName?.trim() || "Google News Wire";
}

function getKeywordBonus(value: string, expressions: RegExp[]) {
  return expressions.reduce(
    (total, expression) => total + (expression.test(value) ? 9 : 0),
    0,
  );
}

function getMoodLabel(score: number) {
  if (score >= 82) {
    return "Modo moon con dignidad dudosa";
  }

  if (score >= 68) {
    return "Optimismo apalancado";
  }

  if (score >= 54) {
    return "Volatilidad con cafe";
  }

  return "Reflexion post-hype";
}

function buildSatireTag(seed: number) {
  const tags = [
    "FOMO premium",
    "Bullish con maquillaje",
    "Drama on-chain",
    "Narrativa para spaces",
    "Humo grado institucional",
    "Velas y emociones",
  ];

  return tags[seed % tags.length];
}

function buildSatiricalSummary(article: ExternalNewsArticle, seed: number) {
  const source = getShortSourceName(article);
  const fallbackSummary = article.description?.trim() || article.title.trim();
  const intros = [
    "El mercado vuelve a descubrir que",
    "Otra vez internet nos recuerda que",
    "La mesa de trading emocional confirma que",
    "Segun el consenso del timeline, hoy resulta que",
    "En el nuevo episodio de 'nadie sabe nada',",
  ];
  const endings = [
    "conviene actuar como si esto fuera perfectamente normal.",
    "alguien intentara venderlo como senal historica.",
    "los expertos saldran a explicar por que ya lo habian anticipado.",
    "todo luce obvio despues de que la vela ya se movio.",
    "hay material suficiente para tres podcasts y cero certezas.",
  ];

  return `${intros[seed % intros.length]} ${fallbackSummary.toLowerCase()} y ${endings[seed % endings.length]} Fuente real: ${source}.`;
}

function decorateArticle(
  article: ExternalNewsArticle,
  index: number,
): DecoratedArticle {
  const seed = hashString(`${article.title}-${article.url}-${index}`);
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  const dramaScore = clamp(
    48 +
      (seed % 38) +
      getKeywordBonus(text, [
        /crash|hack|lawsuit|ban|liquidation|fall|drop|fraud|dump|collapse/,
        /volatility|uncertainty|risk|warning|sell-off|panic/,
      ]),
    40,
    99,
  );
  const fomoScore = clamp(
    45 +
      ((seed >> 3) % 36) +
      getKeywordBonus(text, [
        /rally|surge|record|bull|soar|jump|etf|adoption|treasury|breakout/,
        /all-time high|institutional|fund|inflow|accumulation/,
      ]),
    38,
    99,
  );
  const smokeScore = clamp(
    42 +
      ((seed >> 5) % 34) +
      getKeywordBonus(text, [
        /token|roadmap|launch|vision|meme|web3|platform|ecosystem|announce/,
        /partnership|promise|future|next phase|rebrand/,
      ]),
    35,
    96,
  );
  const marketMood = getMoodLabel(Math.round((dramaScore + fomoScore) / 2));

  return {
    ...article,
    shortSource: getShortSourceName(article),
    publishedAtLabel: formatPublishedAt(article.publishedAt),
    dramaScore,
    fomoScore,
    smokeScore,
    marketMood,
    satireTag: buildSatireTag(seed),
    satiricalSummary: buildSatiricalSummary(article, seed),
  };
}

function dedupeArticles(articles: ExternalNewsArticle[]) {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = article.url.trim() || article.externalId || article.title.trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function getCryptoArticles() {
  const provider = new GoogleNewsProvider();
  const results = await Promise.allSettled(
    CRYPTO_QUERY_OPTIONS.map((params) => provider.fetchArticles(params)),
  );

  const fulfilledArticles = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupeArticles(fulfilledArticles).slice(0, 7);
}

function getAverageScore(
  articles: DecoratedArticle[],
  scoreKey: keyof Pick<DecoratedArticle, "dramaScore" | "fomoScore" | "smokeScore">,
) {
  if (articles.length === 0) {
    return 0;
  }

  const total = articles.reduce((sum, article) => sum + article[scoreKey], 0);
  return Math.round(total / articles.length);
}

export default async function Home() {
  const liveArticles = await getCryptoArticles();
  const articles = liveArticles.map((article, index) =>
    decorateArticle(article, index),
  );
  const [featuredArticle, ...secondaryArticles] = articles;
  const sourceCount = new Set(articles.map((article) => article.shortSource)).size;
  const averageDrama = getAverageScore(articles, "dramaScore");
  const averageFomo = getAverageScore(articles, "fomoScore");
  const averageSmoke = getAverageScore(articles, "smokeScore");

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 sm:px-10 lg:px-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-112 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_32%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_34%)]" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-4xl border border-white/60 bg-slate-950 px-8 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-10 sm:py-10">
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.24em]">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-emerald-200">
                Crypto Daily Satire
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                Titulares reales desde Google News
              </span>
            </div>

            <div className="mt-8 max-w-4xl space-y-5">
              <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Crypto, pero narrado como si el mercado tuviera acceso a un
                microfono y cero verguenza.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                Esta portada mezcla noticias reales de Google News sobre crypto
                con una capa editorial satirica para resumir el estado del
                ecosistema: mucho ruido, algo de señal y una cantidad
                preocupante de conviccion improvisada.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-300">
                  Noticias en radar
                </p>
                <p className="mt-3 text-4xl font-semibold text-white">
                  {articles.length || "--"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Seleccionadas en tiempo real desde Google News.
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-300">
                  FOMO promedio
                </p>
                <p className="mt-3 text-4xl font-semibold text-cyan-300">
                  {averageFomo || "--"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Cuanto urge fingir que ya lo viste venir.
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-300">
                  Humo premium
                </p>
                <p className="mt-3 text-4xl font-semibold text-fuchsia-300">
                  {averageSmoke || "--"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Nivel de narrativa lista para spaces y thumbnails.
                </p>
              </article>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-4xl border border-slate-200 bg-white/85 p-7 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-600">
                    Memo editorial
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    Lo que prometemos no exagerar
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                  {sourceCount || 0} fuentes
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {EDITORIAL_NOTES.map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-sm leading-7 text-slate-600">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-4xl border border-emerald-200 bg-white/90 p-7 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Suscribete al caos curado
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Un correo para seguir crypto sin adoptar una segunda
                personalidad.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Recibe un resumen con links reales, contexto rapido y el nivel
                exacto de ironia necesario para no confundir conviccion con
                marketing.
              </p>
              <div className="mt-6">
                <NewsletterForm />
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-rose-700">Indice de drama</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {averageDrama || "--"}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Mide la probabilidad de que alguien use la frase
              {" \"momento historico\""} antes del lunch.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-sky-700">Cobertura real</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              Google News + satire
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Los titulares son externos y verificables. La narracion es
              intencionalmente insolente.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-violet-700">Mood del ciclo</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {featuredArticle?.marketMood ?? "Sin pulso live"}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Sintesis editorial del momento para quienes prefieren contexto en
              lugar de caps lock.
            </p>
          </article>
        </section>

        {featuredArticle ? (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="relative overflow-hidden rounded-4xl border border-white/60 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_32%)]" />
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                  Portada del dia
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500">
                  {featuredArticle.satireTag}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                  {featuredArticle.shortSource}
                  {featuredArticle.publishedAtLabel
                    ? ` · ${featuredArticle.publishedAtLabel}`
                    : ""}
                </p>
                <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {featuredArticle.title}
                </h2>
                <p className="max-w-3xl text-lg leading-8 text-slate-600">
                  {featuredArticle.description?.trim() ||
                    "Google News encontro una nueva razon para que crypto se tome demasiado en serio."}
                </p>
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Traduccion satirica
                </p>
                <p className="mt-4 text-base leading-8 text-slate-200 sm:text-lg">
                  {featuredArticle.satiricalSummary}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={featuredArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Leer nota real
                </a>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Fuente: {featuredArticle.shortSource}
                </span>
              </div>
            </article>

            <aside className="grid gap-4">
              <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Termometro del titular
                </p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        Drama
                      </span>
                      <span className="text-lg font-semibold text-rose-600">
                        {featuredArticle.dramaScore}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        FOMO
                      </span>
                      <span className="text-lg font-semibold text-sky-600">
                        {featuredArticle.fomoScore}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        Humo
                      </span>
                      <span className="text-lg font-semibold text-violet-600">
                        {featuredArticle.smokeScore}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-4xl border border-slate-200 bg-linear-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Diagnostico rapido
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {featuredArticle.marketMood}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Interpretacion no financiera del momento: suficiente
                  entusiasmo para abrir hilos eternos, pero tambien suficiente
                  incertidumbre para que nadie los relea manana.
                </p>
              </article>
            </aside>
          </section>
        ) : (
          <section className="rounded-4xl border border-amber-200 bg-amber-50/90 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Sin feed disponible
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Google News no devolvio titulares crypto en este momento.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              La portada ya esta preparada para usar noticias reales. Si el
              feed falla temporalmente, este estado evita inventar titulares que
              no existan.
            </p>
          </section>
        )}

        {secondaryArticles.length > 0 ? (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Radar de humo util
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Mas noticias reales para reirte antes de abrir TradingView.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-500">
                Cada tarjeta conserva el titular y el enlace original. Solo le
                agregamos contexto satirico para ahorrar solemnidad.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {secondaryArticles.map((article) => (
                <article
                  key={article.url}
                  className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {article.satireTag}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {article.publishedAtLabel ?? "Sin fecha"}
                    </span>
                  </div>

                  <div className="mt-5 flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        {article.shortSource}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {article.title}
                      </h3>
                    </div>

                    <p className="text-sm leading-7 text-slate-600">
                      {article.description?.trim() ||
                        "La nota original llega sin resumen, pero no sin consecuencias para el timeline."}
                    </p>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                        Lectura satirica
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {article.satiricalSummary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-700">
                      Drama {article.dramaScore}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-2 text-sky-700">
                      FOMO {article.fomoScore}
                    </span>
                    <span className="rounded-full bg-violet-50 px-3 py-2 text-violet-700">
                      Humo {article.smokeScore}
                    </span>
                  </div>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Abrir fuente real
                  </a>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
