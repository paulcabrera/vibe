type SourceArticle = {
  titulo: string;
  resumen: string | null;
  contenido: string;
  slug: string;
  sourceUrl: string | null;
  sourceName: string | null;
  publishedAt: Date | null;
};

export type NewsletterTemplateArticle = {
  title: string;
  summary: string;
  href: string | null;
  sourceName: string | null;
  publishedAtLabel: string | null;
};

export type NewsletterTemplateContent = {
  newsletterName: string;
  editionLabel: string;
  preheader: string;
  headline: string;
  intro: string;
  featuredArticle: NewsletterTemplateArticle | null;
  articles: NewsletterTemplateArticle[];
  highlights: string[];
  ctaLabel: string;
  ctaHref: string | null;
  footerNote: string;
  companyName: string;
  companyAddress: string;
  unsubscribeHref: string | null;
};

type BuildTemplateOptions = {
  newsletterName: string;
  newsletterDescription: string | null;
  articles: SourceArticle[];
  baseUrl?: string | null;
  unsubscribeHref?: string | null;
  companyName?: string;
  companyAddress?: string;
};

type CreateZavuPayloadOptions = {
  to: string;
  content: NewsletterTemplateContent;
  replyTo?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWhitespace(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

function trimSummary(value: string) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 220 ? `${normalized.slice(0, 217).trim()}...` : normalized;
}

function formatDateLabel(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function normalizeBaseUrl(baseUrl?: string | null) {
  return baseUrl?.trim().replaceAll(/\/+$/g, "") || null;
}

function buildArticleHref(
  sourceUrl: string | null,
  slug: string,
  baseUrl?: string | null,
) {
  if (sourceUrl) {
    return sourceUrl;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return normalizedBaseUrl ? `${normalizedBaseUrl}/?news=${slug}` : null;
}

function toTemplateArticle(article: SourceArticle, baseUrl?: string | null) {
  return {
    title: normalizeWhitespace(article.titulo),
    summary: trimSummary(article.resumen?.trim() || article.contenido.trim()),
    href: buildArticleHref(article.sourceUrl, article.slug, baseUrl),
    sourceName: article.sourceName?.trim() || null,
    publishedAtLabel: formatDateLabel(article.publishedAt),
  };
}

function buildSubject(content: NewsletterTemplateContent) {
  const articleCount =
    (content.featuredArticle ? 1 : 0) + content.articles.length;

  return articleCount <= 1
    ? `${content.newsletterName}: nueva edicion disponible`
    : `${content.newsletterName}: ${articleCount} ideas para esta semana`;
}

export function buildNewsletterTemplateContent({
  newsletterName,
  newsletterDescription,
  articles,
  baseUrl,
  unsubscribeHref,
  companyName = "Vibe",
  companyAddress = "Ciudad de Mexico, MX",
}: BuildTemplateOptions): NewsletterTemplateContent {
  const normalizedArticles = articles.map((article) =>
    toTemplateArticle(article, baseUrl),
  );
  const [featuredArticle, ...remainingArticles] = normalizedArticles;
  const intro =
    newsletterDescription?.trim() ||
    "Una seleccion corta con ideas practicas, senales del mercado y oportunidades para ejecutar mejor.";

  return {
    newsletterName,
    editionLabel: "Edicion semanal",
    preheader: intro,
    headline: `Lo mas relevante de ${newsletterName} en pocos minutos`,
    intro,
    featuredArticle: featuredArticle ?? null,
    articles: remainingArticles.slice(0, 4),
    highlights: [
      "Una lectura breve con foco en decisiones accionables.",
      "Menos ruido, mas contexto para producto y crecimiento.",
      "Enlaces y aprendizajes listos para compartir con tu equipo.",
    ],
    ctaLabel: "Ver todas las historias",
    ctaHref: normalizeBaseUrl(baseUrl),
    footerNote:
      "Recibiste este correo porque tu suscripcion al newsletter esta activa.",
    companyName,
    companyAddress,
    unsubscribeHref: unsubscribeHref ?? null,
  };
}

export function buildNewsletterEmail(content: NewsletterTemplateContent) {
  const subject = buildSubject(content);
  const articleBlocks = content.articles
    .map((article) => {
      const meta = [article.sourceName, article.publishedAtLabel]
        .filter(Boolean)
        .join(" · ");

      return `
        <article style="padding:0 0 20px;margin:0 0 20px;border-bottom:1px solid #e2e8f0;">
          <h3 style="margin:0 0 8px;font-size:20px;line-height:1.4;color:#0f172a;">${escapeHtml(article.title)}</h3>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(meta)}</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(article.summary)}</p>
          ${
            article.href
              ? `<a href="${escapeHtml(article.href)}" style="color:#2563eb;text-decoration:none;font-weight:600;">Abrir historia</a>`
              : ""
          }
        </article>
      `;
    })
    .join("");

  const highlightBlocks = content.highlights
    .map(
      (item) =>
        `<li style="margin:0 0 10px;color:#334155;">${escapeHtml(item)}</li>`,
    )
    .join("");

  const featuredMeta = content.featuredArticle
    ? [content.featuredArticle.sourceName, content.featuredArticle.publishedAtLabel]
        .filter(Boolean)
        .join(" · ")
    : "";

  const htmlBody = `
    <div style="margin:0;background:#eef2ff;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
        ${escapeHtml(content.preheader)}
      </div>
      <div style="margin:0 auto;max-width:680px;overflow:hidden;border-radius:28px;background:#ffffff;">
        <div style="background:#0f172a;padding:32px 32px 24px;color:#ffffff;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#a5f3fc;">
            ${escapeHtml(content.newsletterName)} · ${escapeHtml(content.editionLabel)}
          </p>
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;">${escapeHtml(content.headline)}</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#cbd5e1;">${escapeHtml(content.intro)}</p>
        </div>

        <div style="padding:32px;">
          ${
            content.featuredArticle
              ? `
                <section style="margin:0 0 28px;padding:24px;border-radius:24px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">Historia destacada</p>
                  <h2 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#0f172a;">${escapeHtml(content.featuredArticle.title)}</h2>
                  <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(featuredMeta)}</p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#334155;">${escapeHtml(content.featuredArticle.summary)}</p>
                  ${
                    content.featuredArticle.href
                      ? `<a href="${escapeHtml(content.featuredArticle.href)}" style="display:inline-block;border-radius:999px;background:#0f172a;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:600;">Leer destacada</a>`
                      : ""
                  }
                </section>
              `
              : ""
          }

          ${
            content.articles.length > 0
              ? `
                <section style="margin:0 0 28px;">
                  <h2 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#0f172a;">Radar rapido</h2>
                  ${articleBlocks}
                </section>
              `
              : ""
          }

          <section style="margin:0 0 28px;padding:24px;border-radius:24px;background:#ecfeff;border:1px solid #bae6fd;">
            <h2 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">Por que vale la pena leerlo</h2>
            <ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7;">
              ${highlightBlocks}
            </ul>
          </section>

          ${
            content.ctaHref
              ? `
                <div style="margin:0 0 20px;">
                  <a href="${escapeHtml(content.ctaHref)}" style="display:inline-block;border-radius:999px;background:#14b8a6;padding:14px 20px;color:#042f2e;text-decoration:none;font-weight:700;">
                    ${escapeHtml(content.ctaLabel)}
                  </a>
                </div>
              `
              : ""
          }

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:#64748b;">${escapeHtml(content.footerNote)}</p>
          <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
            ${escapeHtml(content.companyName)} · ${escapeHtml(content.companyAddress)}
            ${
              content.unsubscribeHref
                ? ` · <a href="${escapeHtml(content.unsubscribeHref)}" style="color:#475569;">Cancelar suscripcion</a>`
                : ""
            }
          </p>
        </div>
      </div>
    </div>
  `.trim();

  const textSections = [
    `${content.newsletterName} - ${content.editionLabel}`,
    content.headline,
    content.intro,
    content.featuredArticle
      ? [
          "Historia destacada",
          content.featuredArticle.title,
          [content.featuredArticle.sourceName, content.featuredArticle.publishedAtLabel]
            .filter(Boolean)
            .join(" · "),
          content.featuredArticle.summary,
          content.featuredArticle.href
            ? `Link: ${content.featuredArticle.href}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    content.articles.length > 0
      ? [
          "Radar rapido",
          ...content.articles.map((article, index) =>
            [
              `${index + 1}. ${article.title}`,
              [article.sourceName, article.publishedAtLabel]
                .filter(Boolean)
                .join(" · "),
              article.summary,
              article.href ? `Link: ${article.href}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n")
      : null,
    [
      "Por que vale la pena leerlo",
      ...content.highlights.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n"),
    content.ctaHref ? `${content.ctaLabel}: ${content.ctaHref}` : null,
    content.footerNote,
    `${content.companyName} · ${content.companyAddress}`,
    content.unsubscribeHref
      ? `Cancelar suscripcion: ${content.unsubscribeHref}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    text: textSections,
    htmlBody,
  };
}

export function createZavuEmailPayload({
  to,
  content,
  replyTo,
}: CreateZavuPayloadOptions) {
  const email = buildNewsletterEmail(content);

  return {
    to,
    channel: "email" as const,
    subject: email.subject,
    text: email.text,
    htmlBody: email.htmlBody,
    ...(replyTo ? { replyTo } : {}),
  };
}

export const landingNewsletterPreviewContent: NewsletterTemplateContent = {
  newsletterName: "Pulse",
  editionLabel: "Ejemplo de edicion",
  preheader:
    "Un preview del correo que recibiran tus suscriptores cada semana.",
  headline: "3 ideas para mejorar producto, distribucion y enfoque",
  intro:
    "Cada edicion mezcla una historia destacada, lecturas rapidas y aprendizajes listos para ejecutar con tu equipo.",
  featuredArticle: {
    title: "La mejor growth loop no siempre trae mas trafico, sino mejor retencion",
    summary:
      "Un framework corto para detectar que parte de tu embudo merece foco primero y como convertir hallazgos en experimentos semanales.",
    href: "https://vibe.local/news/growth-loop",
    sourceName: "Editorial Vibe",
    publishedAtLabel: "7 mar 2026",
  },
  articles: [
    {
      title: "Como priorizar una landing cuando aun no tienes suficiente trafico",
      summary:
        "Que medir en etapas tempranas y como separar feedback util de opiniones aisladas.",
      href: "https://vibe.local/news/landing-priorities",
      sourceName: "Producto",
      publishedAtLabel: "7 mar 2026",
    },
    {
      title: "El mensaje correcto antes del canal correcto",
      summary:
        "Por que conviene afinar propuesta de valor y CTA antes de invertir mas en adquisicion.",
      href: "https://vibe.local/news/message-before-channel",
      sourceName: "Growth",
      publishedAtLabel: "6 mar 2026",
    },
    {
      title: "Una plantilla simple para convertir hallazgos en proximas acciones",
      summary:
        "Un formato reusable para cerrar cada semana con aprendizajes, decisiones y siguientes pasos.",
      href: "https://vibe.local/news/insights-template",
      sourceName: "Ops",
      publishedAtLabel: "5 mar 2026",
    },
  ],
  highlights: [
    "Una estructura clara para leer en menos de 3 minutos.",
    "Un bloque destacado para la historia mas importante de la semana.",
    "Secciones reutilizables que el sistema puede enviar por Zavu sin rehacer el HTML.",
  ],
  ctaLabel: "Ir al archivo de newsletters",
  ctaHref: "https://vibe.local",
  footerNote:
    "Este preview usa la misma estructura que se reutiliza al generar correos para Zavu.",
  companyName: "Vibe",
  companyAddress: "Ciudad de Mexico, MX",
  unsubscribeHref: "https://vibe.local/unsubscribe",
};
