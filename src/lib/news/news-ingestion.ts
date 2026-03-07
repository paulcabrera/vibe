import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  ExternalNewsArticle,
  GoogleNewsProvider,
} from "@/lib/news/google-news-provider";

const DEFAULT_NEWSLETTER_SLUG = "general";
const DEFAULT_NEWSLETTER_NAME = "Newsletter General";
const DEFAULT_NEWSLETTER_DESCRIPTION = "Newsletter principal del sitio.";
const DEFAULT_NEWS_INGEST_LIMIT = 30;
const DEFAULT_NEWS_QUERIES = [
  "tecnologia",
  "inteligencia artificial",
  "startups",
];

export type IngestNewsResult = {
  provider: string;
  requestedCount: number;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  totalProcessed: number;
  queries: string[];
};

function getEnvNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfiguredQueries() {
  const queries = (process.env.GOOGLE_NEWS_QUERIES ?? process.env.GOOGLE_NEWS_QUERY ?? "")
    .split("|")
    .map((query) => query.trim())
    .filter(Boolean);

  return queries.length > 0 ? queries : DEFAULT_NEWS_QUERIES;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createStableSlug(article: Pick<ExternalNewsArticle, "title" | "url">) {
  const baseSlug = slugify(article.title) || "noticia";
  const urlHash = createHash("sha1").update(article.url).digest("hex").slice(0, 10);
  return `${baseSlug}-${urlHash}`;
}

function dedupeFetchedArticles(articles: ExternalNewsArticle[]) {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const url = article.url.trim();

    if (!url || seen.has(url)) {
      return false;
    }

    seen.add(url);
    return true;
  });
}

async function ensureDefaultNewsletter() {
  return prisma.newsletter.upsert({
    where: { slug: DEFAULT_NEWSLETTER_SLUG },
    update: {},
    create: {
      slug: DEFAULT_NEWSLETTER_SLUG,
      nombre: DEFAULT_NEWSLETTER_NAME,
      descripcion: DEFAULT_NEWSLETTER_DESCRIPTION,
    },
  });
}

function buildArticleContent(article: ExternalNewsArticle) {
  return article.description?.trim() || article.title;
}

function getIngestLimit(limit?: number) {
  return limit ?? getEnvNumber(process.env.NEWS_INGEST_LIMIT, DEFAULT_NEWS_INGEST_LIMIT);
}

export async function ingestLatestNews(limit?: number): Promise<IngestNewsResult> {
  const requestedCount = getIngestLimit(limit);
  const queries = getConfiguredQueries();
  const language = process.env.GOOGLE_NEWS_LANG?.trim() || "es-419";
  const country = process.env.GOOGLE_NEWS_COUNTRY?.trim() || "MX";
  const provider = new GoogleNewsProvider();
  const providerName = provider.getPreferredProviderName();

  const run = await prisma.ingestionRun.create({
    data: {
      provider: providerName,
      query: queries.join(" | "),
      status: "running",
      requestedCount,
    },
  });

  try {
    const newsletter = await ensureDefaultNewsletter();
    const collectedArticles: ExternalNewsArticle[] = [];
    const fetchLimitPerQuery = Math.max(15, Math.ceil((requestedCount * 2) / queries.length));

    for (const query of queries) {
      const remainingNeeded = requestedCount * 2 - collectedArticles.length;
      if (remainingNeeded <= 0) {
        break;
      }

      const articles = await provider.fetchArticles({
        query,
        limit: Math.max(fetchLimitPerQuery, remainingNeeded),
        language,
        country,
      });

      collectedArticles.push(...articles);
    }

    const uniqueArticles = dedupeFetchedArticles(collectedArticles);

    let insertedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;

    for (const article of uniqueArticles) {
      if (insertedCount >= requestedCount) {
        break;
      }

      const slug = createStableSlug(article);
      const existing = await prisma.noticia.findFirst({
        where: {
          OR: [{ slug }, { sourceUrl: article.url }],
        },
        select: {
          id: true,
        },
      });

      const noticiaData = {
        titulo: article.title,
        slug,
        resumen: article.description,
        contenido: buildArticleContent(article),
        publicada: true,
        esExterna: true,
        sourceUrl: article.url,
        sourceName: article.sourceName,
        provider: article.provider,
        externalId: article.externalId,
        imageUrl: article.imageUrl,
        idioma: article.language,
        pais: article.country,
        rawPayload: article.rawPayload,
        ingestedAt: new Date(),
        publishedAt: article.publishedAt,
        newsletterId: newsletter.id,
      };

      if (existing) {
        duplicateCount += 1;
        updatedCount += 1;

        await prisma.noticia.update({
          where: { id: existing.id },
          data: noticiaData,
        });

        continue;
      }

      await prisma.noticia.create({
        data: noticiaData,
      });

      insertedCount += 1;
    }

    const result = {
      provider: providerName,
      requestedCount,
      fetchedCount: uniqueArticles.length,
      insertedCount,
      updatedCount,
      duplicateCount,
      totalProcessed: Math.min(uniqueArticles.length, insertedCount + updatedCount),
      queries,
    };

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: insertedCount > 0 ? "success" : "partial",
        fetchedCount: uniqueArticles.length,
        insertedCount,
        updatedCount,
        duplicateCount,
        finishedAt: new Date(),
      },
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown ingestion error.";

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage,
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}
