import { EstadoSubscripcion, RolUsuario } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

import {
  createNewsletter,
  createNoticia,
  createSubscription,
  deleteUser,
  deleteNewsletter,
  deleteNoticia,
  deleteSubscription,
  updateNewsletter,
  updateNoticia,
  updateSubscription,
} from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const textareaClass = `${inputClass} min-h-32 resize-y`;
const selectClass = inputClass;
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100";

function formatDate(date: Date | null) {
  if (!date) {
    return "Sin fecha";
  }

  return dateFormatter.format(date);
}

function getRoleLabel(role: RolUsuario) {
  switch (role) {
    case RolUsuario.ADMIN:
      return "Admin";
    case RolUsuario.EDITOR:
      return "Editor";
    default:
      return "Lector";
  }
}

function getRoleClasses(role: RolUsuario) {
  switch (role) {
    case RolUsuario.ADMIN:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case RolUsuario.EDITOR:
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getStatusClasses(status: string | undefined) {
  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getSubscriptionStateLabel(state: EstadoSubscripcion) {
  switch (state) {
    case EstadoSubscripcion.ACTIVA:
      return "Activa";
    case EstadoSubscripcion.PAUSADA:
      return "Pausada";
    default:
      return "Cancelada";
  }
}

function getSubscriptionStateClasses(state: EstadoSubscripcion) {
  switch (state) {
    case EstadoSubscripcion.ACTIVA:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case EstadoSubscripcion.PAUSADA:
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getStringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function getAdminData() {
  try {
    const [users, newsletters, subscriptions, newsItems] = await Promise.all([
      prisma.usuario.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          subscripciones: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              newsletter: {
                select: {
                  id: true,
                  nombre: true,
                  slug: true,
                },
              },
            },
          },
          _count: {
            select: {
              noticias: true,
              subscripciones: true,
            },
          },
        },
      }),
      prisma.newsletter.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              noticias: true,
              subscripciones: true,
            },
          },
        },
      }),
      prisma.subscripcion.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          usuario: {
            select: {
              id: true,
              email: true,
              nombre: true,
              rol: true,
            },
          },
          newsletter: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
      }),
      prisma.noticia.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          autor: {
            select: {
              id: true,
              email: true,
              nombre: true,
              rol: true,
            },
          },
          newsletter: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      newsletters,
      subscriptions,
      newsItems,
      error: null,
    };
  } catch (error) {
    console.error("No se pudo cargar el panel de admin", error);

    return {
      users: [],
      newsletters: [],
      subscriptions: [],
      newsItems: [],
      error: "No pudimos cargar el panel de administracion en este momento.",
    };
  }
}

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const status = getStringParam(resolvedSearchParams.status);
  const message = getStringParam(resolvedSearchParams.message);
  const { users, newsletters, subscriptions, newsItems, error } =
    await getAdminData();

  const totalActiveSubscriptions = subscriptions.filter(
    (subscription) => subscription.estado === EstadoSubscripcion.ACTIVA,
  ).length;
  const adminUsers = users.filter((user) => user.rol === RolUsuario.ADMIN).length;
  const editorUsers = users.filter(
    (user) => user.rol === RolUsuario.EDITOR,
  ).length;

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-end md:justify-between md:p-10">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
              Panel de administracion
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Administra usuarios, newsletters y noticias
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                Este panel centraliza el CRUD de newsletters, noticias y
                subscripciones, que representan la relacion entre usuarios y
                publicaciones.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className={secondaryButtonClass}>
              Volver al inicio
            </Link>
          </div>
        </section>

        {message ? (
          <section
            className={`rounded-3xl border px-6 py-4 ${getStatusClasses(
              status,
            )}`}
          >
            <p className="text-sm font-semibold">{message}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Usuarios</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {users.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {adminUsers} admins y {editorUsers} editores
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Newsletters</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {newsletters.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Publicaciones configuradas en la base
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Noticias</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {newsItems.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Contenidos editoriales registrados
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Suscripciones activas
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {totalActiveSubscriptions}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Relaciones activas entre usuario y newsletter
            </p>
          </article>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="text-base font-semibold">{error}</p>
            <p className="mt-2 text-sm">
              Verifica la conexion a Prisma y tu variable `DATABASE_URL`.
            </p>
          </section>
        ) : null}

        <section className="rounded-4xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Usuarios</h2>
              <p className="mt-1 text-sm text-slate-600">
                Vista general de los perfiles y su actividad.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4 py-2 font-medium">Usuario</th>
                  <th className="px-4 py-2 font-medium">Rol</th>
                  <th className="px-4 py-2 font-medium">Suscripciones</th>
                  <th className="px-4 py-2 font-medium">Newsletters</th>
                  <th className="px-4 py-2 font-medium">Noticias</th>
                  <th className="px-4 py-2 font-medium">Alta</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center"
                    >
                      <p className="text-lg font-semibold text-slate-950">
                        Aun no hay usuarios registrados.
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Cuando alguien se suscriba o cree un perfil, aparecera
                        aqui.
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const activeSubscriptions = user.subscripciones.filter(
                      (subscription) =>
                        subscription.estado === EstadoSubscripcion.ACTIVA,
                    ).length;
                    const newsletterNames = user.subscripciones.map(
                      (subscription) => subscription.newsletter.nombre,
                    );

                    return (
                      <tr
                        key={user.id}
                        className="rounded-3xl bg-slate-50 text-sm text-slate-700"
                      >
                        <td className="rounded-l-3xl px-4 py-5 align-top">
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-slate-950">
                              {user.nombre?.trim() || "Sin nombre"}
                            </p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-5 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleClasses(
                              user.rol,
                            )}`}
                          >
                            {getRoleLabel(user.rol)}
                          </span>
                        </td>
                        <td className="px-4 py-5 align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950">
                              {activeSubscriptions} activas
                            </p>
                            <p className="text-slate-500">
                              {user._count.subscripciones} registradas
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-5 align-top">
                          {newsletterNames.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {newsletterNames.map((newsletterName) => (
                                <span
                                  key={`${user.id}-${newsletterName}`}
                                  className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                  {newsletterName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sin newsletters</span>
                          )}
                        </td>
                        <td className="px-4 py-5 align-top font-semibold text-slate-950">
                          {user._count.noticias}
                        </td>
                        <td className="px-4 py-5 align-top text-slate-500">
                          <div className="space-y-1">
                            <p>{formatDate(user.createdAt)}</p>
                            <p>Actualizado: {formatDate(user.updatedAt)}</p>
                          </div>
                        </td>
                        <td className="rounded-r-3xl px-4 py-5 align-top">
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <button type="submit" className={dangerButtonClass}>
                              Eliminar usuario
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              Crear newsletter
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Agrega una nueva publicacion para relacionarla con usuarios y
              noticias.
            </p>

            <form action={createNewsletter} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                <span>Nombre</span>
                <input name="nombre" type="text" required className={inputClass} />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span>Slug</span>
                <input
                  name="slug"
                  type="text"
                  required
                  placeholder="newsletter-general"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span>Descripcion</span>
                <textarea
                  name="descripcion"
                  rows={4}
                  className={textareaClass}
                  placeholder="Describe el enfoque de esta newsletter."
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="activa"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>Activa desde su creacion</span>
              </label>

              <button type="submit" className={primaryButtonClass}>
                Guardar newsletter
              </button>
            </form>
          </article>

          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              CRUD de newsletters
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Edita el nombre, slug, estado y descripcion de cada newsletter.
            </p>

            <div className="mt-6 space-y-4">
              {newsletters.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-slate-950">
                    No hay newsletters registradas.
                  </p>
                </div>
              ) : (
                newsletters.map((newsletter) => (
                  <details
                    key={newsletter.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">
                            {newsletter.nombre}
                          </p>
                          <p className="text-sm text-slate-500">
                            /{newsletter.slug}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                            {newsletter._count.subscripciones} suscripciones
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                            {newsletter._count.noticias} noticias
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${
                              newsletter.activa
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                            }`}
                          >
                            {newsletter.activa ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-5 grid gap-4">
                      <form action={updateNewsletter} className="grid gap-4">
                        <input type="hidden" name="id" value={newsletter.id} />

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            <span>Nombre</span>
                            <input
                              name="nombre"
                              type="text"
                              required
                              defaultValue={newsletter.nombre}
                              className={inputClass}
                            />
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            <span>Slug</span>
                            <input
                              name="slug"
                              type="text"
                              required
                              defaultValue={newsletter.slug}
                              className={inputClass}
                            />
                          </label>
                        </div>

                        <label className="block text-sm font-medium text-slate-700">
                          <span>Descripcion</span>
                          <textarea
                            name="descripcion"
                            rows={4}
                            defaultValue={newsletter.descripcion ?? ""}
                            className={textareaClass}
                          />
                        </label>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                            <input
                              name="activa"
                              type="checkbox"
                              defaultChecked={newsletter.activa}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            />
                            <span>Newsletter activa</span>
                          </label>

                          <div className="flex flex-wrap gap-3">
                            <button type="submit" className={primaryButtonClass}>
                              Guardar cambios
                            </button>
                          </div>
                        </div>
                      </form>

                      <form action={deleteNewsletter}>
                        <input type="hidden" name="id" value={newsletter.id} />
                        <button type="submit" className={dangerButtonClass}>
                          Eliminar newsletter
                        </button>
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              Crear noticia
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Publica contenido nuevo y asignalo a una newsletter y a un autor.
            </p>

            {newsletters.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-sm text-slate-600">
                Primero crea al menos una newsletter para poder registrar
                noticias.
              </div>
            ) : (
              <form action={createNoticia} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  <span>Titulo</span>
                  <input name="titulo" type="text" required className={inputClass} />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Slug</span>
                  <input
                    name="slug"
                    type="text"
                    required
                    placeholder="mi-primera-noticia"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Newsletter</span>
                  <select
                    name="newsletterId"
                    required
                    defaultValue={newsletters[0]?.id}
                    className={selectClass}
                  >
                    {newsletters.map((newsletter) => (
                      <option key={newsletter.id} value={newsletter.id}>
                        {newsletter.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Autor</span>
                  <select
                    name="autorId"
                    defaultValue=""
                    className={selectClass}
                  >
                    <option value="">Sin autor</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {(user.nombre?.trim() || user.email) +
                          ` (${getRoleLabel(user.rol)})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Resumen</span>
                  <textarea
                    name="resumen"
                    rows={3}
                    className={textareaClass}
                    placeholder="Resumen breve para previews."
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Contenido</span>
                  <textarea
                    name="contenido"
                    rows={8}
                    required
                    className={textareaClass}
                    placeholder="Contenido completo de la noticia."
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    name="publicada"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>Marcar como publicada</span>
                </label>

                <button type="submit" className={primaryButtonClass}>
                  Guardar noticia
                </button>
              </form>
            )}
          </article>

          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              CRUD de noticias
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Edita contenido, asignaciones editoriales y estado de publicacion.
            </p>

            <div className="mt-6 space-y-4">
              {newsItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-slate-950">
                    No hay noticias registradas.
                  </p>
                </div>
              ) : (
                newsItems.map((newsItem) => (
                  <details
                    key={newsItem.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">
                            {newsItem.titulo}
                          </p>
                          <p className="text-sm text-slate-500">
                            {newsItem.newsletter.nombre} · /{newsItem.slug}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span
                            className={`rounded-full px-3 py-1 ${
                              newsItem.publicada
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            {newsItem.publicada ? "Publicada" : "Borrador"}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                            {newsItem.autor?.nombre?.trim() ||
                              newsItem.autor?.email ||
                              "Sin autor"}
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-5 grid gap-4">
                      <form action={updateNoticia} className="grid gap-4">
                        <input type="hidden" name="id" value={newsItem.id} />

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            <span>Titulo</span>
                            <input
                              name="titulo"
                              type="text"
                              required
                              defaultValue={newsItem.titulo}
                              className={inputClass}
                            />
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            <span>Slug</span>
                            <input
                              name="slug"
                              type="text"
                              required
                              defaultValue={newsItem.slug}
                              className={inputClass}
                            />
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            <span>Newsletter</span>
                            <select
                              name="newsletterId"
                              required
                              defaultValue={newsItem.newsletterId}
                              className={selectClass}
                            >
                              {newsletters.map((newsletter) => (
                                <option
                                  key={newsletter.id}
                                  value={newsletter.id}
                                >
                                  {newsletter.nombre}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            <span>Autor</span>
                            <select
                              name="autorId"
                              defaultValue={newsItem.autorId ?? ""}
                              className={selectClass}
                            >
                              <option value="">Sin autor</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {(user.nombre?.trim() || user.email) +
                                    ` (${getRoleLabel(user.rol)})`}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="block text-sm font-medium text-slate-700">
                          <span>Resumen</span>
                          <textarea
                            name="resumen"
                            rows={3}
                            defaultValue={newsItem.resumen ?? ""}
                            className={textareaClass}
                          />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          <span>Contenido</span>
                          <textarea
                            name="contenido"
                            rows={8}
                            required
                            defaultValue={newsItem.contenido}
                            className={textareaClass}
                          />
                        </label>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                            <input
                              name="publicada"
                              type="checkbox"
                              defaultChecked={newsItem.publicada}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            />
                            <span>Noticia publicada</span>
                          </label>

                          <p className="text-sm text-slate-500">
                            Publicada: {formatDate(newsItem.publishedAt)}
                          </p>
                        </div>

                        <button type="submit" className={primaryButtonClass}>
                          Guardar cambios
                        </button>
                      </form>

                      <form action={deleteNoticia}>
                        <input type="hidden" name="id" value={newsItem.id} />
                        <button type="submit" className={dangerButtonClass}>
                          Eliminar noticia
                        </button>
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              Crear suscripcion
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta entidad conecta a un usuario con una newsletter.
            </p>

            {newsletters.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-sm text-slate-600">
                Primero crea una newsletter para poder registrar suscripciones.
              </div>
            ) : (
              <form action={createSubscription} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  <span>Usuario existente</span>
                  <select
                    name="usuarioId"
                    defaultValue=""
                    className={selectClass}
                  >
                    <option value="">Crear o enlazar por email</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {(user.nombre?.trim() || user.email) +
                          ` (${getRoleLabel(user.rol)})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="solo se usa si no eliges usuario"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Newsletter</span>
                  <select
                    name="newsletterId"
                    required
                    defaultValue={newsletters[0]?.id}
                    className={selectClass}
                  >
                    {newsletters.map((newsletter) => (
                      <option key={newsletter.id} value={newsletter.id}>
                        {newsletter.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span>Estado</span>
                  <select
                    name="estado"
                    defaultValue={EstadoSubscripcion.ACTIVA}
                    className={selectClass}
                  >
                    {Object.values(EstadoSubscripcion).map((state) => (
                      <option key={state} value={state}>
                        {getSubscriptionStateLabel(state)}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className={primaryButtonClass}>
                  Guardar suscripcion
                </button>
              </form>
            )}
          </article>

          <article className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              CRUD de suscripciones
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Gestiona la relacion usuario-newsletter y su estado.
            </p>

            <div className="mt-6 space-y-4">
              {subscriptions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-slate-950">
                    No hay suscripciones registradas.
                  </p>
                </div>
              ) : (
                subscriptions.map((subscription) => (
                  <details
                    key={subscription.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">
                            {subscription.usuario?.nombre?.trim() ||
                              subscription.usuario?.email ||
                              subscription.email}
                          </p>
                          <p className="text-sm text-slate-500">
                            {subscription.email} · {subscription.newsletter.nombre}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getSubscriptionStateClasses(
                            subscription.estado,
                          )}`}
                        >
                          {getSubscriptionStateLabel(subscription.estado)}
                        </span>
                      </div>
                    </summary>

                    <div className="mt-5 grid gap-4">
                      <form action={updateSubscription} className="grid gap-4">
                        <input type="hidden" name="id" value={subscription.id} />

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            <span>Usuario existente</span>
                            <select
                              name="usuarioId"
                              defaultValue={subscription.usuarioId ?? ""}
                              className={selectClass}
                            >
                              <option value="">Resolver por email</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {(user.nombre?.trim() || user.email) +
                                    ` (${getRoleLabel(user.rol)})`}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            <span>Email</span>
                            <input
                              name="email"
                              type="email"
                              defaultValue={subscription.email}
                              className={inputClass}
                            />
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            <span>Newsletter</span>
                            <select
                              name="newsletterId"
                              required
                              defaultValue={subscription.newsletterId}
                              className={selectClass}
                            >
                              {newsletters.map((newsletter) => (
                                <option
                                  key={newsletter.id}
                                  value={newsletter.id}
                                >
                                  {newsletter.nombre}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            <span>Estado</span>
                            <select
                              name="estado"
                              defaultValue={subscription.estado}
                              className={selectClass}
                            >
                              {Object.values(EstadoSubscripcion).map((state) => (
                                <option key={state} value={state}>
                                  {getSubscriptionStateLabel(state)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm text-slate-500">
                            Creada: {formatDate(subscription.createdAt)}
                          </p>

                          <button type="submit" className={primaryButtonClass}>
                            Guardar cambios
                          </button>
                        </div>
                      </form>

                      <form action={deleteSubscription}>
                        <input type="hidden" name="id" value={subscription.id} />
                        <button type="submit" className={dangerButtonClass}>
                          Eliminar suscripcion
                        </button>
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
