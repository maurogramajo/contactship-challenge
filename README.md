# ContactShip + HubSpot

Integración entre ContactShip y HubSpot que permite gestionar contactos desde un panel unificado, sincronizar datos desde el CRM y obtener insights generados por IA sobre cada contacto. Construida como prueba técnica para el rol de Lead Engineer en ContactShip AI.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| Base de datos | PostgreSQL en Supabase |
| ORM | Drizzle ORM + Drizzle Kit |
| Validación | Zod 4 |
| IA | DeepSeek / OpenAI / Anthropic / Google via OpenAI-compatible SDK |
| CRM | HubSpot API (`@hubspot/api-client`) |
| Auth | bcryptjs + jsonwebtoken (JWT) |
| Estilos | Tailwind CSS 4 |
| Runtime | Bun |
| Testing | Bun test |

## Requisitos previos

- **Bun** instalado (v1.2 o superior). Si no lo tenés: `curl -fsSL https://bun.sh/install | bash`
- Una base de datos PostgreSQL (se recomienda Supabase)
- Una API key de un proveedor de IA (DeepSeek, OpenAI, Anthropic, o Google)
- Una app OAuth de HubSpot con `client_id`, `client_secret` y redirect URL

## Configuración inicial

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd contactship-challenge

# 2. Copiar el archivo de variables de entorno
cp .env.example .env.local

# 3. Editar .env.local con tus credenciales (ver .env.example para valores de referencia)
#    Requeridas:
#    - DATABASE_URL: string de conexión a PostgreSQL
#    - AI_API_KEY: API key del proveedor de IA
#    - AI_PROVIDER: deepseek | openai | anthropic | google
#    - AI_MODEL: modelo a usar (ej. deepseek-chat, gpt-4o)
#    - AUTH_SECRET: secreto de al menos 32 caracteres para firmar JWT
#    - HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI
#    Opcionales:
#    - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#    - WEBHOOK_SECRET

# 4. Instalar dependencias
bun install

# 5. Ejecutar migraciones
bun run db:migrate

# 6. Cargar datos de prueba (80 contactos, 320 llamadas, 200 comentarios)
bun run db:seed

# 7. Iniciar servidor de desarrollo
bun run dev
```

La app estará disponible en `http://localhost:3000`.

El seed crea una cuenta demo para entrar rápido al dashboard:

- Email: `demo@contactship.local`
- Password: `demo123456`

## Estructura del proyecto

```
app/                      # Next.js App Router
  api/                    # Endpoints REST
    ai/                   #   Análisis y búsqueda NL de contactos
    auth/                 #   Registro, login, logout, sesión
    contacts/             #   CRUD de contactos, comentarios, llamadas
    hubspot/              #   OAuth callback, connect/disconnect, status, sync
    webhooks/             #   Recepción de webhooks externos
  contacts/               # Página de detalle de contacto individual
  dashboard/              # Panel principal (lista, insights, configuración)
  login/                  # Página de inicio de sesión
  register/               # Página de registro
  page.tsx                # Landing page
  layout.tsx              # Layout raíz (providers, estilos globales)

components/               # Componentes React
  auth/                   #   Formularios de login y registro
  contacts/               #   Tabla, filtros, detalle, panel de contacto
  layout/                 #   Navbar, sidebar, shell del dashboard
  ui/                     #   Componentes base reutilizables

db/                       # Capa de datos
  schema/                 #   Definiciones de tablas (Drizzle ORM)
  zod/                    #   Schemas de validación (Zod)
  repository/             #   Funciones de acceso a datos tipadas
  index.ts                #   Re-export del módulo de base de datos
  migrate.ts              #   Runner de migraciones
  seed.ts                 #   Script de carga de datos de prueba

lib/                      # Lógica de negocio
  ai/                     #   Cliente de IA (búsqueda NL, generación de insights)
  api/                    #   Cliente HTTP tipado para consumir la API desde el frontend
  hubspot/                #   Cliente de HubSpot (sync, mapeo de propiedades)
  auth.ts                 #   Hashing de passwords, firma/verificación de JWT
  contacts.ts             #   Lógica unificada de contactos (locales + HubSpot)
  env.ts                  #   Validación de variables de entorno con Zod
  session.ts              #   Manejo de sesiones en server components

drizzle/                  # Archivos de migración SQL generados por Drizzle Kit
tests/                    # Tests unitarios y de integración (Bun test)
```

## Decisiones de arquitectura

### 1. Drizzle ORM en lugar de Prisma

Prisma requiere un paso de generación de código (`prisma generate`) que agrega fricción al flujo de desarrollo y no siempre es compatible con runtimes como Bun. Drizzle es TypeScript-first: los esquemas se escriben en TypeScript puro, sin codegen, y el tipado es inferido directamente desde las definiciones de tabla. Esto reduce la superficie de herramientas, elimina un paso del ciclo de desarrollo y funciona de forma nativa con Bun. La contrapartida es que Drizzle tiene una comunidad más chica y menos recetas para casos complejos, pero para el alcance de este proyecto (6 tablas, relaciones estándar) es más que suficiente.

### 2. Cuenta autenticada = organización

La API pública de ContactShip modela los contactos por `organization_id`, no por usuario individual. Para no sobrediseñar el challenge, la cuenta autenticada representa directamente a una organización. El usuario se registra con email/password, pero internamente esa identidad es la organización dueña de los contactos y de la conexión HubSpot. Esto mantiene el aislamiento de datos sin abrir el frente completo de multi-tenant B2B con miembros, invitaciones y roles.

### 3. OAuth de HubSpot con restricción 1:1

En lugar de un token estático global, cada organización autentica su propia cuenta de HubSpot vía OAuth. La restricción deliberada es `1 organización local -> 1 cuenta HubSpot`. Si la organización ya está vinculada, solo se permite reautorizar la misma cuenta; para cambiarla, primero hay que desconectarla. Este recorte reduce superficie de errores y hace más defendible la trazabilidad durante la demo.

### 4. Búsqueda en lenguaje natural con la BD como fuente de verdad

Cuando un usuario escribe una consulta como "clientes inactivos de México", el LLM no responde directamente. En cambio, traduce la consulta a filtros estructurados (`SearchFilters`) que se ejecutan contra PostgreSQL. El LLM actúa como intérprete, no como base de conocimiento. Esto evita alucinaciones, mantiene los datos reales como fuente de verdad, y permite que los filtros sean auditables y depurables. Si el LLM falla, la búsqueda degrada con gracia devolviendo todos los contactos.

### 5. Insights on-demand, no automáticos

Los insights de IA se generan únicamente cuando el usuario hace clic en "Analizar contacto". No hay generación en lote ni en background. Esto le da al usuario control sobre cuándo y para qué contactos gasta créditos de API, mantiene los costos predecibles, y evita procesar datos que quizás nunca se consulten. El contexto que recibe el LLM incluye perfil del contacto, estadísticas de llamadas (total, respondidas, perdidas), últimos comentarios, y etiquetas.

### 6. Sincronización unidireccional (HubSpot → ContactShip)

Para el alcance de esta demo, los contactos se sincronizan de HubSpot hacia ContactShip, no en ambas direcciones. Esto simplifica la lógica de conflictos, evita loops de actualización, y mantiene el modelo de datos predecible. Cada contacto sincronizado guarda `external_id` y `source: "hubspot"` para trazabilidad. La sincronización inversa (ContactShip → HubSpot) queda como mejora futura.

### 7. API REST con server components

Las rutas de la App Router (`app/api/`) exponen una API REST consumida tanto por el frontend (vía `lib/api/client.ts`) como potencialmente por integraciones externas (webhooks). Los server components obtienen datos llamando directamente a la capa de repositorio (`db/repository/`), mientras que los client components usan el cliente HTTP tipado. Esta separación permite que el código de negocio en `lib/` sea compartido entre ambos contextos.

## Mejoras futuras

1. **Sincronización bidireccional**: permitir que cambios hechos en ContactShip (nuevos comentarios, actualización de datos) se reflejen en HubSpot, con detección y resolución de conflictos cuando el mismo campo se modifica en ambos lados.

2. **Resolución de conflictos**: cuando un contacto se modifica tanto en HubSpot como en ContactShip entre sincronizaciones, implementar una estrategia de merge (last-write-wins con registro de auditoría, o merge campo por campo con intervención manual).

3. **Actualizaciones en tiempo real**: reemplazar el polling manual por webhooks de HubSpot o Supabase Realtime para que los cambios en el CRM se reflejen en la interfaz sin recargar la página.

4. **Usuarios reales por organización**: agregar múltiples usuarios por organización, invitaciones y roles. En esta versión, una cuenta autenticada representa directamente a la organización.

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Inicia el servidor de desarrollo (Turbopack) |
| `bun run build` | Compila la app para producción |
| `bun run start` | Inicia el servidor en modo producción |
| `bun run lint` | Ejecuta ESLint |
| `bun run test` | Corre los tests con Bun |
| `bun run db:generate` | Genera archivos de migración desde los schemas |
| `bun run db:migrate` | Ejecuta las migraciones pendientes |
| `bun run db:seed` | Carga datos de prueba en la base de datos |
| `bun run db:studio` | Abre Drizzle Studio para explorar la BD |

## Despliegue en Vercel

```bash
# 1. Instalar Vercel CLI (opcional, también se puede hacer desde la web)
bun add -g vercel

# 2. Importar el proyecto
vercel

# 3. Configurar variables de entorno en el panel de Vercel
#    Settings > Environment Variables:
#    Requeridas:
#    - DATABASE_URL
#    - AI_API_KEY
#    - AI_PROVIDER
#    - AI_MODEL
#    - AUTH_SECRET
#    - HUBSPOT_CLIENT_ID
#    - HUBSPOT_CLIENT_SECRET
#    - HUBSPOT_REDIRECT_URI
#    Opcionales:
#    - SUPABASE_URL
#    - SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY
#    - WEBHOOK_SECRET

# 4. Desplegar
vercel --prod
```

Alternativamente, importar el repositorio directamente desde el dashboard de Vercel en `vercel.com/new`. La plataforma detecta Next.js automáticamente y aplica la configuración óptima. Las migraciones de base de datos deben ejecutarse manualmente (o mediante un script de build) antes del primer despliegue.

## Licencia

MIT
