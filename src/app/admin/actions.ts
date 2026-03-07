"use server";

import { EstadoSubscripcion } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ADMIN_PATH = "/admin";

function getRequiredString(
  formData: FormData,
  key: string,
  label: string,
): string {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`El campo ${label} es obligatorio.`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "-")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function redirectToAdmin(status: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    status,
    message,
  });

  redirect(`${ADMIN_PATH}?${searchParams.toString()}`);
}

async function handleAdminAction(
  action: () => Promise<void>,
  successMessage: string,
  fallbackErrorMessage: string,
) {
  try {
    await action();
    revalidatePath(ADMIN_PATH);
  } catch (error) {
    console.error(fallbackErrorMessage, error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : fallbackErrorMessage;

    redirectToAdmin("error", message);
  }

  redirectToAdmin("success", successMessage);
}

async function resolveSubscriptionUser(formData: FormData) {
  const usuarioId = getOptionalString(formData, "usuarioId");

  if (usuarioId) {
    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!user) {
      throw new Error("El usuario seleccionado ya no existe.");
    }

    return {
      usuarioId: user.id,
      email: user.email,
    };
  }

  const email = normalizeEmail(getRequiredString(formData, "email", "email"));

  const user = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return {
    usuarioId: user.id,
    email: user.email,
  };
}

function getSubscriptionState(formData: FormData) {
  const estado = getRequiredString(formData, "estado", "estado");

  if (!Object.values(EstadoSubscripcion).includes(estado as EstadoSubscripcion)) {
    throw new Error("El estado de la suscripcion no es valido.");
  }

  return estado as EstadoSubscripcion;
}

export async function createNewsletter(formData: FormData) {
  await handleAdminAction(
    async () => {
      const nombre = getRequiredString(formData, "nombre", "nombre");
      const slug = normalizeSlug(getRequiredString(formData, "slug", "slug"));
      const descripcion = getOptionalString(formData, "descripcion");
      const activa = getBoolean(formData, "activa");

      if (!slug) {
        throw new Error("Ingresa un slug valido para la newsletter.");
      }

      await prisma.newsletter.create({
        data: {
          nombre,
          slug,
          descripcion: descripcion || null,
          activa,
        },
      });
    },
    "Newsletter creada correctamente.",
    "No pudimos crear la newsletter.",
  );
}

export async function updateNewsletter(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");
      const nombre = getRequiredString(formData, "nombre", "nombre");
      const slug = normalizeSlug(getRequiredString(formData, "slug", "slug"));
      const descripcion = getOptionalString(formData, "descripcion");
      const activa = getBoolean(formData, "activa");

      if (!slug) {
        throw new Error("Ingresa un slug valido para la newsletter.");
      }

      await prisma.newsletter.update({
        where: { id },
        data: {
          nombre,
          slug,
          descripcion: descripcion || null,
          activa,
        },
      });
    },
    "Newsletter actualizada correctamente.",
    "No pudimos actualizar la newsletter.",
  );
}

export async function deleteNewsletter(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");

      await prisma.newsletter.delete({
        where: { id },
      });
    },
    "Newsletter eliminada correctamente.",
    "No pudimos eliminar la newsletter.",
  );
}

export async function createNoticia(formData: FormData) {
  await handleAdminAction(
    async () => {
      const titulo = getRequiredString(formData, "titulo", "titulo");
      const slug = normalizeSlug(getRequiredString(formData, "slug", "slug"));
      const resumen = getOptionalString(formData, "resumen");
      const contenido = getRequiredString(formData, "contenido", "contenido");
      const newsletterId = getRequiredString(
        formData,
        "newsletterId",
        "newsletter",
      );
      const autorId = getOptionalString(formData, "autorId");
      const publicada = getBoolean(formData, "publicada");

      if (!slug) {
        throw new Error("Ingresa un slug valido para la noticia.");
      }

      await prisma.noticia.create({
        data: {
          titulo,
          slug,
          resumen: resumen || null,
          contenido,
          newsletterId,
          autorId: autorId || null,
          publicada,
          publishedAt: publicada ? new Date() : null,
        },
      });
    },
    "Noticia creada correctamente.",
    "No pudimos crear la noticia.",
  );
}

export async function updateNoticia(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");
      const titulo = getRequiredString(formData, "titulo", "titulo");
      const slug = normalizeSlug(getRequiredString(formData, "slug", "slug"));
      const resumen = getOptionalString(formData, "resumen");
      const contenido = getRequiredString(formData, "contenido", "contenido");
      const newsletterId = getRequiredString(
        formData,
        "newsletterId",
        "newsletter",
      );
      const autorId = getOptionalString(formData, "autorId");
      const publicada = getBoolean(formData, "publicada");

      if (!slug) {
        throw new Error("Ingresa un slug valido para la noticia.");
      }

      const existingNews = await prisma.noticia.findUnique({
        where: { id },
        select: { publishedAt: true },
      });

      if (!existingNews) {
        throw new Error("La noticia que quieres editar ya no existe.");
      }

      await prisma.noticia.update({
        where: { id },
        data: {
          titulo,
          slug,
          resumen: resumen || null,
          contenido,
          newsletterId,
          autorId: autorId || null,
          publicada,
          publishedAt: publicada ? existingNews.publishedAt ?? new Date() : null,
        },
      });
    },
    "Noticia actualizada correctamente.",
    "No pudimos actualizar la noticia.",
  );
}

export async function deleteNoticia(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");

      await prisma.noticia.delete({
        where: { id },
      });
    },
    "Noticia eliminada correctamente.",
    "No pudimos eliminar la noticia.",
  );
}

export async function createSubscription(formData: FormData) {
  await handleAdminAction(
    async () => {
      const newsletterId = getRequiredString(
        formData,
        "newsletterId",
        "newsletter",
      );
      const estado = getSubscriptionState(formData);
      const { usuarioId, email } = await resolveSubscriptionUser(formData);

      await prisma.subscripcion.create({
        data: {
          email,
          usuarioId,
          newsletterId,
          estado,
        },
      });
    },
    "Suscripcion creada correctamente.",
    "No pudimos crear la suscripcion.",
  );
}

export async function updateSubscription(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");
      const newsletterId = getRequiredString(
        formData,
        "newsletterId",
        "newsletter",
      );
      const estado = getSubscriptionState(formData);
      const { usuarioId, email } = await resolveSubscriptionUser(formData);

      await prisma.subscripcion.update({
        where: { id },
        data: {
          email,
          usuarioId,
          newsletterId,
          estado,
        },
      });
    },
    "Suscripcion actualizada correctamente.",
    "No pudimos actualizar la suscripcion.",
  );
}

export async function deleteSubscription(formData: FormData) {
  await handleAdminAction(
    async () => {
      const id = getRequiredString(formData, "id", "id");

      await prisma.subscripcion.delete({
        where: { id },
      });
    },
    "Suscripcion eliminada correctamente.",
    "No pudimos eliminar la suscripcion.",
  );
}
