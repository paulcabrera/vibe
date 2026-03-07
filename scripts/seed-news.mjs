import "dotenv/config";

import { PrismaClient, RolUsuario } from "@prisma/client";

const prisma = new PrismaClient();

const AUTHOR_EMAIL = "editor@vibe.local";
const NEWSLETTER_SLUG = "general";

const mockNews = [
  {
    slug: "lanzamiento-vibe-news",
    titulo: "Vibe News arranca su primera edicion",
    resumen: "Presentamos el newsletter principal con foco en producto, IA y creacion digital.",
    contenido: `
Vibe News nace para compartir aprendizajes utiles sobre producto, inteligencia artificial y creacion digital.

En esta primera edicion reunimos ideas practicas, herramientas recomendadas y pequenos experimentos que el equipo esta probando semana a semana.

La meta es simple: enviar contenido breve, accionable y facil de compartir.
    `.trim(),
    publicada: true,
    publishedAt: new Date("2026-03-01T10:00:00.000Z"),
  },
  {
    slug: "automatizaciones-que-ahorran-tiempo",
    titulo: "5 automatizaciones que ahorran tiempo al equipo",
    resumen: "Un repaso por flujos simples que reducen tareas manuales en marketing y operaciones.",
    contenido: `
Automatizar no siempre significa construir algo complejo.

Con un buen formulario, una base de datos ordenada y un par de acciones de servidor, muchas tareas repetitivas desaparecen.

Estas son cinco automatizaciones pequenas que ya demostraron impacto real en velocidad y consistencia.
    `.trim(),
    publicada: true,
    publishedAt: new Date("2026-03-03T15:30:00.000Z"),
  },
  {
    slug: "como-escribimos-mejores-newsletters",
    titulo: "Como escribimos newsletters que se leen completas",
    resumen: "Estructura, tono y ritmo editorial para mejorar apertura y lectura.",
    contenido: `
Una buena newsletter no depende solo del asunto.

Tambien importa el primer parrafo, la claridad de cada bloque y una promesa editorial facil de reconocer.

En esta nota compartimos el marco que usamos para decidir que publicar y como contarlo.
    `.trim(),
    publicada: true,
    publishedAt: new Date("2026-03-05T08:45:00.000Z"),
  },
  {
    slug: "roadmap-editorial-abril",
    titulo: "Roadmap editorial para el proximo mes",
    resumen: "Temas planeados para abril con foco en crecimiento, retention y herramientas de IA.",
    contenido: `
El siguiente mes queremos profundizar en tres frentes: adquisicion, retencion y calidad de contenido.

Cada entrega explorara un caso concreto, una herramienta y una recomendacion aplicable al mismo dia.

Tambien abriremos espacio para entrevistas cortas con operadores y creadores.
    `.trim(),
    publicada: false,
    publishedAt: null,
  },
];

async function seed() {
  const author = await prisma.usuario.upsert({
    where: { email: AUTHOR_EMAIL },
    update: {
      nombre: "Equipo Editorial",
      rol: RolUsuario.EDITOR,
    },
    create: {
      email: AUTHOR_EMAIL,
      nombre: "Equipo Editorial",
      rol: RolUsuario.EDITOR,
    },
  });

  const newsletter = await prisma.newsletter.upsert({
    where: { slug: NEWSLETTER_SLUG },
    update: {
      nombre: "Newsletter General",
      descripcion: "Contenido semanal sobre producto, IA y tendencias digitales.",
      activa: true,
    },
    create: {
      slug: NEWSLETTER_SLUG,
      nombre: "Newsletter General",
      descripcion: "Contenido semanal sobre producto, IA y tendencias digitales.",
      activa: true,
    },
  });

  for (const item of mockNews) {
    await prisma.noticia.upsert({
      where: { slug: item.slug },
      update: {
        titulo: item.titulo,
        resumen: item.resumen,
        contenido: item.contenido,
        publicada: item.publicada,
        publishedAt: item.publishedAt,
        autorId: author.id,
        newsletterId: newsletter.id,
      },
      create: {
        slug: item.slug,
        titulo: item.titulo,
        resumen: item.resumen,
        contenido: item.contenido,
        publicada: item.publicada,
        publishedAt: item.publishedAt,
        autorId: author.id,
        newsletterId: newsletter.id,
      },
    });
  }

  console.log(`Autor listo: ${author.email}`);
  console.log(`Newsletter listo: ${newsletter.slug}`);
  console.log(`Noticias procesadas: ${mockNews.length}`);
}

try {
  await seed();
} catch (error) {
  console.error("Error cargando mock data de noticias.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
