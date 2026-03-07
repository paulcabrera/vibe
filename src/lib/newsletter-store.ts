import { prisma } from "@/lib/prisma";
import { EstadoSubscripcion } from "@prisma/client";

const DEFAULT_NEWSLETTER_SLUG = "general";
const DEFAULT_NEWSLETTER_NAME = "Newsletter Principal";

async function getPrimaryNewsletter() {
  const defaultNewsletter = await prisma.newsletter.findUnique({
    where: { slug: DEFAULT_NEWSLETTER_SLUG },
  });

  if (defaultNewsletter) {
    return defaultNewsletter;
  }

  const existingNewsletter = await prisma.newsletter.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingNewsletter) {
    return existingNewsletter;
  }

  return prisma.newsletter.create({
    data: {
      slug: DEFAULT_NEWSLETTER_SLUG,
      nombre: DEFAULT_NEWSLETTER_NAME,
      descripcion: "Newsletter principal del sitio.",
      activa: true,
    },
  });
}

export async function saveSignup(email: string) {
  const newsletter = await getPrimaryNewsletter();
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
    },
  });
  const existingSignup = await prisma.subscripcion.findUnique({
    where: {
      email_newsletterId: {
        email,
        newsletterId: newsletter.id,
      },
    },
  });

  if (existingSignup) {
    if (
      existingSignup.usuarioId !== usuario.id ||
      existingSignup.estado !== EstadoSubscripcion.ACTIVA
    ) {
      await prisma.subscripcion.update({
        where: { id: existingSignup.id },
        data: {
          usuarioId: usuario.id,
          estado: EstadoSubscripcion.ACTIVA,
        },
      });

      return { status: "reactivated" as const };
    }

    return { status: "exists" as const };
  }

  await prisma.subscripcion.create({
    data: {
      email,
      newsletterId: newsletter.id,
      usuarioId: usuario.id,
    },
  });

  return { status: "created" as const };
}
