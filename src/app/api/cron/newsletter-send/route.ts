import { NextResponse } from "next/server";

import { processPendingNewsletterEmails } from "@/lib/newsletter-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      ok: false,
      status: 500,
      message: "CRON_SECRET is not configured.",
    };
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
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
    const result = await processPendingNewsletterEmails();

    return NextResponse.json({
      ok: true,
      message: "Newsletter delivery cron completed.",
      result,
    });
  } catch (error) {
    console.error("Newsletter delivery cron failed.", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unexpected newsletter cron error.",
      },
      { status: 500 },
    );
  }
}
