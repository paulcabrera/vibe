"use server";

import { saveSignup } from "@/lib/newsletter-store";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialNewsletterState: NewsletterState = {
  status: "idle",
  message: "",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function subscribeToNewsletter(
  _previousState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return {
      status: "error",
      message: "Ingresa un correo para suscribirte.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Ese correo no parece valido.",
    };
  }

  try {
    const result = await saveSignup(email);

    if (result.status === "exists") {
      return {
        status: "success",
        message: "Ese correo ya estaba suscrito.",
      };
    }

    return {
      status: "success",
      message: "Listo. Ya quedaste suscrito al newsletter.",
    };
  } catch {
    return {
      status: "error",
      message: "No pudimos guardar tu suscripcion. Intentalo de nuevo.",
    };
  }
}
