"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { subscribeToNewsletter } from "@/app/actions";
import { initialNewsletterState } from "@/lib/newsletter-form-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      className="inline-flex h-14 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Suscribiendo..." : "Suscribirme"}
    </button>
  );
}

export function NewsletterForm() {
  const [state, formAction] = useActionState(
    subscribeToNewsletter,
    initialNewsletterState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="space-y-3">
      <form
        ref={formRef}
        action={formAction}
        className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-3 shadow-sm sm:grid-cols-[1fr_auto]"
      >
        <label className="sr-only" htmlFor="email">
          Correo electronico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          className="h-14 rounded-full border border-slate-200 bg-white px-5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
        <SubmitButton />
      </form>

      <p className="px-2 text-sm leading-6 text-slate-500">
        Sin spam. Puedes salirte cuando quieras.
      </p>

      <p
        aria-live="polite"
        className={`px-2 text-sm font-medium ${
          state.status === "error" ? "text-rose-600" : "text-emerald-700"
        }`}
      >
        {state.message}
      </p>
    </div>
  );
}
