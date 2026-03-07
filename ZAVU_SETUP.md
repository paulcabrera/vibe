# Configuracion de Zavu para correos y suscripciones

Este proyecto ya tiene un formulario de newsletter, pero hoy guarda los correos en local dentro de `data/newsletter-signups.json`. Para pasar a Zavu, necesitamos separar dos cosas:

1. `Envio de correos`: Zavu si cubre esta parte.
2. `Suscripciones`: necesitamos definir donde se guardara la lista de suscriptores y que flujo de alta vamos a usar.

## Lo que necesito de tu lado

### 1. Credenciales y cuenta

- Un `ZAVU_API_KEY` valido.
- Un sender profile creado en Zavu.
- Confirmar si vamos a empezar con `Sandbox Email` o con `Custom Domain`.

### 2. Configuracion del remitente

Necesito que me compartas o decidas estos datos:

- Nombre del sender profile.
- `From Email Address` que quieres usar.
- `From Name` visible para el usuario.
- `Reply-To Email` si aplica.

### 3. Definicion del flujo de suscripcion

Necesito que me confirmes cual de estas opciones quieres:

- `Solo guardar suscriptor`: registrar email y no enviar nada.
- `Guardar + email de bienvenida`: registrar email y enviar un correo inicial.
- `Double opt-in`: registrar email, enviar correo de confirmacion y activar la suscripcion solo si confirma.

Importante: segun la guia de Zavu, el servicio resuelve muy bien el envio y la recepcion de emails, pero para la lista de suscriptores seguimos necesitando una fuente de verdad. Para este proyecto propongo una de estas opciones:

- Mantenerlo en una base de datos propia.
- Mantenerlo temporalmente en archivo local solo para pruebas.
- Integrarlo mas adelante con otro sistema de CRM o newsletter.

## Pasos en Zavu

## Opcion A: Sandbox Email

Sirve para empezar rapido en pruebas.

1. Crear o abrir el sender profile.
2. Ir a `Channels`.
3. Abrir el canal `Email`.
4. Activar `Sandbox Email`.
5. Configurar:
   - `From Email Address`
   - `From Name`
   - `Reply-To Email` opcional
   - `Enable Email Receiving` si vamos a recibir correos
6. Guardar.

Notas:

- El sandbox tiene limite de `100 emails por hora`.
- No requiere KYC.
- No es la mejor opcion para produccion por entregabilidad.

## Opcion B: Custom Domain

Sirve para produccion.

1. Crear o abrir el sender profile.
2. Ir a `Channels`.
3. Abrir `Email`.
4. Ir a la pestana `Custom Domain`.
5. Agregar el dominio o subdominio desde el que enviaremos.
6. Crear en tu proveedor DNS los registros `DKIM CNAME` que entregue Zavu.
7. Esperar propagacion y pulsar `Verify DNS`.
8. Cuando el dominio quede `Verified`, configurar:
   - `From Email Address`
   - `From Name`
   - `Reply-To Email` opcional
9. Guardar.

Notas:

- Para produccion con custom domain Zavu pide `KYC`.
- Si quieres recibir correos entrantes, tambien hay que agregar el `MX record`.

## Si tambien quieres recibir correos

Para manejar respuestas o inbound emails necesito:

- Una URL publica para webhook, por ejemplo `https://tu-dominio.com/api/webhooks/zavu`.
- Confirmar que evento vamos a escuchar: `message.inbound`.
- Si usamos custom domain, acceso para crear el `MX record`.

## Cambios que hay que hacer en este proyecto

### 1. Variables de entorno

Necesitare como minimo:

```env
ZAVU_API_KEY=
ZAVU_SENDER_ID=
ZAVU_FROM_EMAIL=
ZAVU_FROM_NAME=
APP_URL=
```

Opcionales, segun el flujo final:

```env
ZAVU_REPLY_TO_EMAIL=
ZAVU_WEBHOOK_SECRET=
```

### 2. Dependencia del SDK

Habra que instalar el SDK oficial:

```bash
npm install @zavudev/sdk
```

### 3. Sustituir el almacenamiento local actual

Hoy el alta del newsletter se guarda en:

- `src/app/actions.ts`
- `src/lib/newsletter-store.ts`

Para dejarlo listo hay que decidir:

- Si seguimos guardando la suscripcion en una base propia.
- Si ademas enviamos un correo de bienvenida con Zavu.
- Si vamos a usar double opt-in.

Mi recomendacion:

- Usar Zavu para envio de correos.
- Guardar suscriptores en una base propia desde el primer dia.
- Enviar un correo de bienvenida tras una alta exitosa.

### 4. Webhook opcional

Si quieres recibir correos o eventos, tambien hay que crear una ruta en Next.js para el webhook y validar su firma.

## Lo que ya identifique en el proyecto

- Ya existe formulario de newsletter en `src/components/newsletter-form.tsx`.
- Ya existe una server action en `src/app/actions.ts`.
- Hoy las altas se guardan en archivo local, lo cual no sirve bien para produccion.
- Todavia no esta instalada la dependencia `@zavudev/sdk`.
- No vi variables de entorno de Zavu integradas en el codigo.

## Checklist para avanzar

Marcame estos puntos y con eso ya puedo hacer la integracion:

- Compartirme el `ZAVU_API_KEY`.
- Decirme si arrancamos con `sandbox` o `custom domain`.
- Si es `custom domain`, pasarme el dominio o subdominio a usar.
- Confirmar el `From Name` y el `From Email Address`.
- Decidir si el newsletter sera `simple`, `welcome email` o `double opt-in`.
- Decidir donde guardaremos la lista de suscriptores.
- Si quieres inbound emails, pasarme la URL publica del webhook o confirmar que la creare en este proyecto.

## Recomendacion practica

Para avanzar rapido sin bloquear desarrollo:

1. Empezar con `Sandbox Email`.
2. Integrar el SDK y el envio de correo de bienvenida.
3. Mover las suscripciones desde archivo local a una base de datos.
4. Cuando ya tengamos dominio, pasar a `Custom Domain` y configurar `DKIM` y `MX`.

## Referencia

Segui la guia oficial de Zavu para esta preparacion:

- [Zavu Email Setup Guide](https://docs.zavu.dev/guides/email/setup)
