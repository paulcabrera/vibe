import { NewsletterForm } from "@/components/newsletter-form";
import { NewsletterPreview } from "@/components/newsletter-preview";
import { landingNewsletterPreviewContent } from "@/lib/newsletter-template";

const benefits = [
  "Ideas accionables para lanzar y crecer productos digitales.",
  "Plantillas, frameworks y recursos curados cada semana.",
  "Casos reales con aprendizajes claros, sin relleno.",
];

const stats = [
  { value: "3 min", label: "de lectura semanal" },
  { value: "1 correo", label: "cada viernes" },
  { value: "0 spam", label: "solo contenido util" },
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <section className="grid gap-10 rounded-4xl border border-white/60 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div className="flex flex-col justify-center gap-8">
            <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              Newsletter para builders, founders y marketers
            </div>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Recibe ideas practicas para lanzar mejores productos.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Una dosis semanal con estrategias de crecimiento, diseno de
                producto y ejemplos reales para equipos que construyen en
                internet.
              </p>
            </div>

            <NewsletterForm />

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                >
                  <p className="text-2xl font-semibold text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
                  Que recibes
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Contenido accionable que puedes aplicar esta misma semana.
                </h2>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <p className="text-base leading-7 text-slate-200">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">
              Crecimiento sostenible
            </p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">
              Aprende a validar mensajes y canales antes de escalar.
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              Enfoques simples para mejorar conversiones, onboarding y
              retencion sin depender de intuicion solamente.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-sky-700">Producto con foco</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">
              Prioriza mejor con ejemplos concretos de producto.
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              Cada correo resume una idea clave y la aterriza a decisiones de
              roadmap, UX y propuesta de valor.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-violet-700">
              Curacion de recursos
            </p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">
              Ahorra tiempo con referencias ya filtradas.
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              Herramientas, articulos y templates seleccionados para equipos
              pequenos que quieren ejecutar mas rapido.
            </p>
          </article>
        </section>

        <section className="grid gap-8 rounded-4xl border border-slate-200 bg-white/85 p-8 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <div className="space-y-5">
            <div className="inline-flex w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
              Asi se vera el newsletter
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Un preview real del correo que enviaremos a tus suscriptores.
              </h2>
              <p className="text-base leading-8 text-slate-600 sm:text-lg">
                Este ejemplo no es una maqueta aislada. Usa la misma estructura
                de contenido que el sistema reutiliza para generar el correo en
                HTML y texto plano antes de enviarlo por Zavu.
              </p>
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">
                La plantilla ya queda preparada para:
              </p>
              <ul className="space-y-3 text-sm leading-7 text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Mostrar una historia destacada con CTA principal.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span>Listar noticias secundarias en un bloque reusable.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-violet-500" />
                  <span>Construir `subject`, `text` y `htmlBody` para Zavu.</span>
                </li>
              </ul>
            </div>
          </div>

          <NewsletterPreview content={landingNewsletterPreviewContent} />
        </section>
      </div>
    </main>
  );
}
