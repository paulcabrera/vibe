import { NextResponse } from "next/server";

import { ingestLatestNews } from "@/lib/news/news-ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getAuthorizationHeader(request: Request) {
  return request.headers.get("authorization");
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      ok: false,
      status: 500,
      message: "CRON_SECRET is not configured.",
    };
  }

  const expectedHeader = `Bearer ${cronSecret}`;

  if (getAuthorizationHeader(request) !== expectedHeader) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized cron request.",
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Authorized",
  };
}

export async function GET(request: Request) {
  const authorization = isAuthorizedCronRequest(request);

  if (!authorization.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: authorization.message,
      },
      { status: authorization.status },
    );
  }

  try {
    const result = await ingestLatestNews();

    return NextResponse.json({
      ok: true,
      message: "News ingestion completed.",
      result,
    });
  } catch (error) {
    console.error("News ingestion cron failed.", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected cron error.",
      },
      { status: 500 },
    );
  }
}
