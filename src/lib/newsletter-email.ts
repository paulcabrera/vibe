import {
  EstadoEntregaNewsletter,
  EstadoEnvioNewsletter,
  EstadoSubscripcion,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_SEND_BATCH_SIZE = 50;
const DEFAULT_NEWS_ITEMS_PER_EMAIL = 5;
const ZAVU_MESSAGES_URL = "https://api.zavu.dev/v1/messages";

type ZavuSendResponse = {
  message?: {
    id?: string;
    status?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export type ProcessNewsletterEmailsResult = {
  dispatchesProcessed: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  dispatchesCreated: number;
};

function getEnvNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBaseUrl() {
  return process.env.APP_URL?.trim().replaceAll(/\/+$/g, "") ?? "";
}

function formatDate(date: Date | null) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildArticleUrl(sourceUrl: string | null, slug: string) {
  if (sourceUrl) {
    return sourceUrl;
  }

  const baseUrl = getBaseUrl();
  return baseUrl ? `${baseUrl}/?news=${slug}` : null;
}

function buildEmailSubject(newsletterName: string, newsCount: number) {
  return newsCount === 1
    ? `${newsletterName}: nueva noticia disponible`
    : `${newsletterName}: ${newsCount} noticias nuevas`;
}

function buildEmailContent({
  newsletterName,
  newsletterDescription,
  articles,
}: {
  newsletterName: string;
  newsletterDescription: string | null;
  articles: Array<{
    id: string;
    titulo: string;
    resumen: string | null;
    contenido: string;
    slug: string;
    sourceUrl: string | null;
    sourceName: string | null;
    publishedAt: Date | null;
  }>;
}) {
  const intro = newsletterDescription?.trim() || `Resumen reciente de ${newsletterName}.`;
  const htmlItems = articles
    .map((article) => {
      const articleUrl = buildArticleUrl(article.sourceUrl, article.slug);
      const summary = escapeHtml(article.resumen?.trim() || article.contenido.trim());
      const source = article.sourceName ? `Fuente: ${escapeHtml(article.sourceName)}` : "";
      const publishedAt = formatDate(article.publishedAt);

      return `
        <article style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e2e8f0;">
          <h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">${escapeHtml(article.titulo)}</h2>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">${[source, publishedAt].filter(Boolean).join(" · ")}</p>
          <p style="margin:0 0 12px;color:#334155;font-size:16px;line-height:1.6;">${summary}</p>
          ${
            articleUrl
              ? `<p style="margin:0;"><a href="${escapeHtml(articleUrl)}" style="color:#2563eb;text-decoration:none;">Leer mas</a></p>`
              : ""
          }
        </article>
      `;
    })
    .join("");

  const textItems = articles
    .map((article, index) => {
      const articleUrl = buildArticleUrl(article.sourceUrl, article.slug);
      const summary = article.resumen?.trim() || article.contenido.trim();
      const source = article.sourceName ? `Fuente: ${article.sourceName}` : null;
      const publishedAt = formatDate(article.publishedAt);

      return [
        `${index + 1}. ${article.titulo}`,
        source,
        publishedAt ? `Publicado: ${publishedAt}` : null,
        summary,
        articleUrl ? `Link: ${articleUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const html = `
    <div style="margin:0 auto;max-width:680px;padding:32px 24px;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;">
      <header style="margin-bottom:32px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">${escapeHtml(newsletterName)}</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.2;">Noticias recientes</h1>
        <p style="margin:0;color:#475569;font-size:16px;line-height:1.6;">${escapeHtml(intro)}</p>
      </header>
      ${htmlItems}
      <footer style="margin-top:32px;font-size:12px;line-height:1.6;color:#64748b;">
        Recibiste este correo porque tu suscripcion al newsletter esta activa.
      </footer>
    </div>
  `.trim();

  const text = `
${newsletterName}

Noticias recientes

${intro}

${textItems}

Recibiste este correo porque tu suscripcion al newsletter esta activa.
  `.trim();

  return { html, text };
}

async function sendEmailWithZavu({
  to,
  subject,
  text,
  htmlBody,
}: {
  to: string;
  subject: string;
  text: string;
  htmlBody: string;
}) {
  const apiKey = process.env.ZAVU_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("ZAVU_API_KEY is not configured.");
  }

  const senderId = process.env.ZAVU_SENDER_ID?.trim();
  const replyTo = process.env.ZAVU_REPLY_TO_EMAIL?.trim();

  const response = await fetch(ZAVU_MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(senderId ? { "Zavu-Sender": senderId } : {}),
    },
    body: JSON.stringify({
      to,
      channel: "email",
      subject,
      text,
      htmlBody,
      ...(replyTo ? { replyTo } : {}),
    }),
    cache: "no-store",
  });

  const rawResponse = await response.text();
  const payload = rawResponse ? (JSON.parse(rawResponse) as ZavuSendResponse) : {};

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Zavu email request failed with status ${response.status}.`,
    );
  }

  return {
    messageId: payload.message?.id ?? null,
    status: payload.message?.status ?? "queued",
    provider: "zavu-email",
  };
}

async function createDispatchForNewsletter(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: {
      subscripciones: {
        where: {
          estado: EstadoSubscripcion.ACTIVA,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!newsletter || !newsletter.activa || newsletter.subscripciones.length === 0) {
    return null;
  }

  const newsLimit = getEnvNumber(
    process.env.NEWSLETTER_SEND_NEWS_LIMIT,
    DEFAULT_NEWS_ITEMS_PER_EMAIL,
  );

  const noticias = await prisma.noticia.findMany({
    where: {
      newsletterId,
      publicada: true,
      emailSentAt: null,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: newsLimit,
    select: {
      id: true,
      titulo: true,
      resumen: true,
      contenido: true,
      slug: true,
      sourceUrl: true,
      sourceName: true,
      publishedAt: true,
    },
  });

  if (noticias.length === 0) {
    return null;
  }

  const subject = buildEmailSubject(newsletter.nombre, noticias.length);
  const { html, text } = buildEmailContent({
    newsletterName: newsletter.nombre,
    newsletterDescription: newsletter.descripcion,
    articles: noticias,
  });

  const envio = await prisma.newsletterEnvio.create({
    data: {
      newsletterId: newsletter.id,
      asunto: subject,
      contenidoHtml: html,
      contenidoTexto: text,
      noticiaIds: noticias.map((item) => item.id),
      recipientCount: newsletter.subscripciones.length,
      estado: EstadoEnvioNewsletter.PENDING,
    },
  });

  await prisma.newsletterEntrega.createMany({
    data: newsletter.subscripciones.map((subscription) => ({
      envioId: envio.id,
      subscripcionId: subscription.id,
      email: subscription.email,
      estado: EstadoEntregaNewsletter.PENDING,
    })),
  });

  return envio.id;
}

async function getOrCreatePendingDispatchIds() {
  const existingDispatches = await prisma.newsletterEnvio.findMany({
    where: {
      estado: {
        in: [
          EstadoEnvioNewsletter.PENDING,
          EstadoEnvioNewsletter.PROCESSING,
          EstadoEnvioNewsletter.PARTIAL,
        ],
      },
    },
    select: {
      id: true,
      newsletterId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const dispatchIds = existingDispatches.map((dispatch) => dispatch.id);
  const newsletterIdsWithOpenDispatch = new Set(
    existingDispatches.map((dispatch) => dispatch.newsletterId),
  );

  const newsletters = await prisma.newsletter.findMany({
    where: {
      activa: true,
    },
    select: {
      id: true,
    },
  });

  let createdCount = 0;

  for (const newsletter of newsletters) {
    if (newsletterIdsWithOpenDispatch.has(newsletter.id)) {
      continue;
    }

    const createdDispatchId = await createDispatchForNewsletter(newsletter.id);
    if (createdDispatchId) {
      createdCount += 1;
      dispatchIds.push(createdDispatchId);
    }
  }

  return { dispatchIds, createdCount };
}

async function updateDispatchStatus(envioId: string) {
  const [counts, deliveryCounts] = await Promise.all([
    prisma.newsletterEnvio.findUnique({
      where: { id: envioId },
      select: {
        id: true,
        recipientCount: true,
      },
    }),
    prisma.newsletterEntrega.groupBy({
      by: ["estado"],
      where: {
        envioId,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  if (!counts) {
    return null;
  }

  const sentCount =
    deliveryCounts.find((item) => item.estado === EstadoEntregaNewsletter.SENT)?._count
      ._all ?? 0;
  const failedCount =
    deliveryCounts.find((item) => item.estado === EstadoEntregaNewsletter.FAILED)?._count
      ._all ?? 0;
  const pendingCount = Math.max(counts.recipientCount - sentCount - failedCount, 0);

  if (sentCount === counts.recipientCount) {
    const envio = await prisma.newsletterEnvio.update({
      where: { id: envioId },
      data: {
        estado: EstadoEnvioNewsletter.SENT,
        successCount: sentCount,
        failureCount: failedCount,
        completedAt: new Date(),
      },
      select: {
        noticiaIds: true,
      },
    });

    await prisma.noticia.updateMany({
      where: {
        id: {
          in: envio.noticiaIds,
        },
      },
      data: {
        emailSentAt: new Date(),
      },
    });

    return { sentCount, failedCount, pendingCount };
  }

  const nextStatus =
    sentCount > 0 || failedCount > 0
      ? pendingCount > 0
        ? EstadoEnvioNewsletter.PROCESSING
        : sentCount > 0
          ? EstadoEnvioNewsletter.PARTIAL
          : EstadoEnvioNewsletter.FAILED
      : EstadoEnvioNewsletter.PENDING;

  await prisma.newsletterEnvio.update({
    where: { id: envioId },
    data: {
      estado: nextStatus,
      successCount: sentCount,
      failureCount: failedCount,
      completedAt: pendingCount === 0 ? new Date() : null,
    },
  });

  return { sentCount, failedCount, pendingCount };
}

async function processDispatch(envioId: string, batchSize: number) {
  const envio = await prisma.newsletterEnvio.findUnique({
    where: { id: envioId },
    include: {
      newsletter: {
        select: {
          id: true,
          nombre: true,
        },
      },
      entregas: {
        where: {
          estado: {
            in: [EstadoEntregaNewsletter.PENDING, EstadoEntregaNewsletter.FAILED],
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: batchSize,
      },
    },
  });

  if (!envio) {
    return { sent: 0, failed: 0 };
  }

  if (envio.entregas.length === 0) {
    await updateDispatchStatus(envio.id);
    return { sent: 0, failed: 0 };
  }

  await prisma.newsletterEnvio.update({
    where: { id: envio.id },
    data: {
      estado: EstadoEnvioNewsletter.PROCESSING,
      startedAt: envio.startedAt ?? new Date(),
      lastError: null,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const entrega of envio.entregas) {
    try {
      const result = await sendEmailWithZavu({
        to: entrega.email,
        subject: envio.asunto,
        text: envio.contenidoTexto,
        htmlBody: envio.contenidoHtml,
      });

      await prisma.newsletterEntrega.update({
        where: { id: entrega.id },
        data: {
          estado: EstadoEntregaNewsletter.SENT,
          provider: result.provider,
          providerMessageId: result.messageId,
          providerStatus: result.status,
          errorMessage: null,
          sentAt: new Date(),
        },
      });

      sent += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected email delivery error.";

      await prisma.newsletterEntrega.update({
        where: { id: entrega.id },
        data: {
          estado: EstadoEntregaNewsletter.FAILED,
          errorMessage: message,
          provider: "zavu-email",
        },
      });

      await prisma.newsletterEnvio.update({
        where: { id: envio.id },
        data: {
          lastError: message,
        },
      });

      failed += 1;
    }
  }

  await updateDispatchStatus(envio.id);

  return { sent, failed };
}

export async function processPendingNewsletterEmails(): Promise<ProcessNewsletterEmailsResult> {
  const batchSize = getEnvNumber(
    process.env.NEWSLETTER_SEND_BATCH_SIZE,
    DEFAULT_SEND_BATCH_SIZE,
  );
  const { dispatchIds, createdCount } = await getOrCreatePendingDispatchIds();

  let deliveriesSent = 0;
  let deliveriesFailed = 0;
  let dispatchesProcessed = 0;

  for (const dispatchId of dispatchIds) {
    const result = await processDispatch(dispatchId, batchSize);
    deliveriesSent += result.sent;
    deliveriesFailed += result.failed;
    dispatchesProcessed += 1;
  }

  return {
    dispatchesProcessed,
    deliveriesSent,
    deliveriesFailed,
    dispatchesCreated: createdCount,
  };
}
