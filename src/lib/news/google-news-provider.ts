type ProviderName = "serpapi" | "google-news-rss";

export type ExternalNewsArticle = {
  title: string;
  description: string | null;
  url: string;
  sourceName: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  externalId: string | null;
  provider: ProviderName;
  language: string;
  country: string;
  query: string;
  rawPayload: string | null;
};

export type FetchGoogleNewsParams = {
  query: string;
  limit: number;
  language: string;
  country: string;
};

export class GoogleNewsProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleNewsProviderError";
  }
}

type SerpApiNewsResult = {
  title?: string;
  link?: string;
  snippet?: string;
  thumbnail?: string;
  date?: string;
  source?: string | { name?: string };
  story_token?: string;
  position?: number;
};

type SerpApiResponse = {
  news_results?: SerpApiNewsResult[];
};

function getJsonString(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeWhitespace(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripHtml(value: string) {
  return normalizeWhitespace(decodeHtmlEntities(value).replaceAll(/<[^>]*>/g, " "));
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function getCountryCode(country: string) {
  return country.trim().toUpperCase();
}

function getLanguageCode(language: string) {
  return language.trim();
}

function buildGoogleNewsCeid(country: string, language: string) {
  return `${getCountryCode(country)}:${getLanguageCode(language)}`;
}

function buildGoogleNewsRssSearchUrl({
  query,
  language,
  country,
}: Pick<FetchGoogleNewsParams, "query" | "language" | "country">) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", getLanguageCode(language));
  url.searchParams.set("gl", getCountryCode(country));
  url.searchParams.set("ceid", buildGoogleNewsCeid(country, language));
  return url;
}

function extractTagContent(xml: string, tagName: string) {
  const tagExpression = new RegExp(
    String.raw`<${tagName}\b[^>]*>([\s\S]*?)<\/${tagName}>`,
    "i",
  );
  const match = tagExpression.exec(xml);
  return match?.[1] ?? null;
}

function parseRssItems(xml: string) {
  return xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
}

function getRssSourceName(itemXml: string) {
  const match = /<source\b[^>]*>([\s\S]*?)<\/source>/i.exec(itemXml);
  return match ? stripHtml(match[1]) : null;
}

function parseRssArticle(
  itemXml: string,
  params: Pick<FetchGoogleNewsParams, "query" | "language" | "country">,
): ExternalNewsArticle | null {
  const title = extractTagContent(itemXml, "title");
  const url = extractTagContent(itemXml, "link");

  if (!title || !url) {
    return null;
  }

  const description = extractTagContent(itemXml, "description");
  const guid = extractTagContent(itemXml, "guid");
  const publishedAt = parseDate(extractTagContent(itemXml, "pubDate") ?? undefined);

  return {
    title: stripHtml(title),
    description: description ? stripHtml(description) : null,
    url: stripHtml(url),
    sourceName: getRssSourceName(itemXml),
    imageUrl: null,
    publishedAt,
    externalId: guid ? stripHtml(guid) : null,
    provider: "google-news-rss",
    language: params.language,
    country: params.country,
    query: params.query,
    rawPayload: itemXml,
  };
}

export class GoogleNewsRssProvider {
  async fetchArticles(params: FetchGoogleNewsParams): Promise<ExternalNewsArticle[]> {
    const response = await fetch(buildGoogleNewsRssSearchUrl(params), {
      headers: {
        "User-Agent": "Mozilla/5.0 VibeNewsBot/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new GoogleNewsProviderError(
        `Google News RSS request failed with status ${response.status}.`,
      );
    }

    const xml = await response.text();

    return parseRssItems(xml)
      .map((itemXml) => parseRssArticle(itemXml, params))
      .filter((article): article is ExternalNewsArticle => article !== null)
      .slice(0, params.limit);
  }
}

export class SerpApiGoogleNewsProvider {
  constructor(private readonly apiKey: string) {}

  async fetchArticles(params: FetchGoogleNewsParams): Promise<ExternalNewsArticle[]> {
    const collected: ExternalNewsArticle[] = [];
    let start = 0;

    while (collected.length < params.limit) {
      const pageSize = Math.min(10, params.limit - collected.length);
      const url = new URL("https://serpapi.com/search.json");

      url.searchParams.set("engine", "google_news");
      url.searchParams.set("api_key", this.apiKey);
      url.searchParams.set("q", params.query);
      url.searchParams.set("hl", getLanguageCode(params.language));
      url.searchParams.set("gl", getCountryCode(params.country));
      url.searchParams.set("num", String(pageSize));
      url.searchParams.set("start", String(start));

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new GoogleNewsProviderError(
          `SerpApi request failed with status ${response.status}.`,
        );
      }

      const payload = (await response.json()) as SerpApiResponse;
      const pageResults = (payload.news_results ?? [])
        .map((item) => this.mapArticle(item, params))
        .filter((article): article is ExternalNewsArticle => article !== null);

      if (pageResults.length === 0) {
        break;
      }

      collected.push(...pageResults);
      start += pageSize;

      if (pageResults.length < pageSize) {
        break;
      }
    }

    return collected.slice(0, params.limit);
  }

  private mapArticle(
    item: SerpApiNewsResult,
    params: FetchGoogleNewsParams,
  ): ExternalNewsArticle | null {
    const title = normalizeWhitespace(item.title ?? "");
    const url = normalizeWhitespace(item.link ?? "");

    if (!title || !url) {
      return null;
    }

    const sourceName =
      typeof item.source === "string"
        ? item.source
        : item.source?.name ?? null;

    return {
      title,
      description: item.snippet ? normalizeWhitespace(item.snippet) : null,
      url,
      sourceName: sourceName ? normalizeWhitespace(sourceName) : null,
      imageUrl: item.thumbnail ? normalizeWhitespace(item.thumbnail) : null,
      publishedAt: parseDate(item.date),
      externalId: item.story_token ?? (item.position ? String(item.position) : null),
      provider: "serpapi",
      language: params.language,
      country: params.country,
      query: params.query,
      rawPayload: getJsonString(item) || null,
    };
  }
}

export class GoogleNewsProvider {
  private readonly rssProvider = new GoogleNewsRssProvider();
  private readonly serpApiProvider: SerpApiGoogleNewsProvider | null;

  constructor(apiKey = process.env.SERPAPI_API_KEY?.trim()) {
    this.serpApiProvider = apiKey ? new SerpApiGoogleNewsProvider(apiKey) : null;
  }

  async fetchArticles(params: FetchGoogleNewsParams) {
    if (this.serpApiProvider) {
      try {
        return await this.serpApiProvider.fetchArticles(params);
      } catch (error) {
        console.error("SerpApi failed, falling back to Google News RSS.", error);
      }
    }

    return this.rssProvider.fetchArticles(params);
  }

  getPreferredProviderName(): ProviderName {
    return this.serpApiProvider ? "serpapi" : "google-news-rss";
  }
}
