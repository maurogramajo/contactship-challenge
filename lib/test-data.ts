import { faker } from "@faker-js/faker";
import { AssociationTypes } from "@hubspot/api-client";
import { db } from "@/db";
import {
  calls,
  comments,
  type NewCall,
  type NewComment,
  type NewContact,
} from "@/db/schema";
import {
  getHubSpotConnectionByOrganizationId,
  listSyncTasksByOrganizationId,
  upsertContactByExternalId,
} from "@/db/repository";
import { createUnifiedContact, toHubSpotVirtualContactId } from "@/lib/contacts";
import {
  getHubSpotClientForOrganization,
  mapHubSpotContactToOurModel,
  type HubSpotContact,
} from "@/lib/hubspot";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestScenario = "hubspot-basic" | "local-queue" | "advanced";

export interface TestDataStatus {
  hubSpotConnected: boolean;
  syncQueue: {
    pending: number;
    failed: number;
    completed: number;
  };
}

export interface TestDataResult {
  scenario: TestScenario;
  created: Array<{
    id: string;
    name: string;
    href: string;
    source: "hubspot" | "local";
  }>;
  message: string;
}

type HubSpotContactInput = {
  fullName: string;
  email: string;
  phone: string;
  lifecycleStage: string;
  leadStatus: string;
};

type HubSpotActivityInput = {
  notes?: string[];
  tasks?: Array<{
    title: string;
    body: string;
    dueAt: Date;
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }>;
  meetings?: Array<{
    title: string;
    body: string;
    startAt: Date;
    outcome?: string;
  }>;
};

// ─── Seed & ID Helpers ───────────────────────────────────────────────────────

/** Seed faker once per scenario for deterministic but varied output. */
function seedFromNow(): number {
  const seed = Date.now();
  faker.seed(seed);
  return seed;
}

function generateRunId(): string {
  return faker.string.alphanumeric({ length: 6, casing: "lower" });
}

// ─── Name & Contact Helpers ──────────────────────────────────────────────────

function generateFullName(): string {
  return faker.person.fullName();
}

function splitFullName(fullName: string) {
  const [firstname, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstname: firstname ?? "",
    lastname: rest.join(" "),
  };
}

function firstNameOnly(fullName: string): string {
  return splitFullName(fullName).firstname;
}

function generateEmail(firstName: string, lastName: string, testNumber: number, runId: string): string {
  return faker.internet.email({
    firstName,
    lastName,
    provider: `contactship-test${testNumber}-${runId}.com`,
  });
}

const LATAM_COUNTRY_CODES: Record<string, string> = {
  AR: "+54",
  CL: "+56",
  MX: "+52",
  CO: "+57",
  PE: "+51",
};

function generatePhone(): string {
  const code = faker.helpers.arrayElement(Object.values(LATAM_COUNTRY_CODES));
  const localLength = faker.number.int({ min: 8, max: 10 });
  const local = Array.from({ length: localLength }, () => faker.number.int({ min: 0, max: 9 })).join("");
  return `${code}${local}`;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function daysFromNow(days: number, hour = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

// ─── Content Generators ──────────────────────────────────────────────────────
//
// Each generator returns realistic, varied CRM content by combining
// faker-generated names/companies with contextual templates.
// This avoids AI API calls while producing meaningful test data.

const INDUSTRIES = [
  "tecnología", "finanzas", "salud", "manufactura", "retail",
  "logística", "educación", "energía", "telecomunicaciones", "construcción",
];

const PRODUCTS = [
  "automatización de ventas", "CRM integrado", "analítica predictiva",
  "gestión de leads", "engagement multicanal", "dashboard de métricas",
  "scoring de contactos", "workflows inteligentes",
];

const FEATURES = [
  "sincronización bidireccional", "reportes en tiempo real",
  "segmentación avanzada", "enriquecimiento de datos", "secuencias automatizadas",
  "integración con email", "vistas personalizadas", "alertas de actividad",
];

const CONCERNS = [
  "tiempos de implementación", "curva de aprendizaje del equipo",
  "integración con sistemas legacy", "costo por usuario",
  "soporte en español", "personalización de reportes",
];

interface ContentContext {
  fullName: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  product?: string;
  concern?: string;
  feature?: string;
}

function makeContext(fullName: string): ContentContext {
  return {
    fullName,
    company: faker.company.name(),
    jobTitle: faker.person.jobTitle(),
    industry: faker.helpers.arrayElement(INDUSTRIES),
    product: faker.helpers.arrayElement(PRODUCTS),
    concern: faker.helpers.arrayElement(CONCERNS),
    feature: faker.helpers.arrayElement(FEATURES),
  };
}

function firstName(ctx: ContentContext): string {
  return firstNameOnly(ctx.fullName);
}

// ── Note content ──

const NOTE_TEMPLATES: Array<(ctx: ContentContext) => string> = [
  (c) =>
    `Primer contacto con ${firstName(c)} de ${c.company}. Perfil: ${c.jobTitle}. Interés inicial en ${c.product}.`,
  (c) =>
    `${firstName(c)} solicitó información detallada sobre ${c.feature}. Quedó en revisar documentación.`,
  (c) =>
    `Seguimiento post-llamada. ${firstName(c)} mencionó que su equipo busca ${c.product} para optimizar procesos en ${c.industry}.`,
  (c) =>
    `${firstName(c)} viene de campaña inbound. Visitó la web y completó el formulario de demo. Industria: ${c.industry}.`,
  (c) =>
    `Lead calificado por scoring. ${firstName(c)} tiene autoridad de compra y presupuesto asignado para Q${faker.number.int({ min: 1, max: 4 })}.`,
  (c) =>
    `${firstName(c)} preguntó específicamente por ${c.concern}. Se agendó llamada de seguimiento para resolver dudas técnicas.`,
  (c) =>
    `Contacto transferido desde el equipo de soporte. ${firstName(c)} es usuario activo y quiere explorar upgrade a plan enterprise.`,
  (c) =>
    `Reunión inicial completada. ${firstName(c)} comparando soluciones. Pidió caso de éxito en ${c.industry}.`,
];

function generateNoteContent(ctx: ContentContext): string {
  return faker.helpers.arrayElement(NOTE_TEMPLATES)(ctx);
}

// ── Task content ──

interface TaskContent {
  title: string;
  body: string;
}

const TASK_TEMPLATES: Array<(ctx: ContentContext) => TaskContent> = [
  (c) => ({
    title: `Enviar propuesta comercial a ${firstName(c)}`,
    body: `Incluir pricing personalizado, caso de éxito en ${c.industry} y detalle de ${c.feature}.`,
  }),
  (c) => ({
    title: `Agendar demo técnica para ${firstName(c)}`,
    body: `Preparar demo enfocada en ${c.feature} y ${c.product}. Confirmar disponibilidad del equipo técnico.`,
  }),
  (c) => ({
    title: `Hacer seguimiento a ${firstName(c)}`,
    body: `Revisar si ya evaluaron la documentación enviada sobre ${c.concern}.`,
  }),
  (c) => ({
    title: `Validar fit comercial de ${c.company}`,
    body: `Revisar tamaño de empresa, vertical (${c.industry}), y presupuesto estimado.`,
  }),
  (c) => ({
    title: `Preparar caso de negocio para ${firstName(c)}`,
    body: `Armar ROI estimado con datos de ${c.industry}. Enfocar en ${c.product}.`,
  }),
  (c) => ({
    title: `Coordinar call con decisores de ${c.company}`,
    body: `${firstName(c)} mencionó que necesita aprobación de su gerencia. Agendar con stakeholders clave.`,
  }),
  (c) => ({
    title: `Enviar documentación de ${c.feature}`,
    body: `${firstName(c)} pidió especificaciones técnicas. Adjuntar whitepaper y guía de integración.`,
  }),
  (c) => ({
    title: `Revisar objeción de ${firstName(c)}`,
    body: `El contacto mencionó ${c.concern}. Preparar respuesta con evidencia y casos de clientes similares.`,
  }),
];

function generateTaskContent(ctx: ContentContext): TaskContent {
  return faker.helpers.arrayElement(TASK_TEMPLATES)(ctx);
}

// ── Meeting content ──

interface MeetingContent {
  title: string;
  body: string;
  outcome: string;
}

const MEETING_TEMPLATES: Array<(ctx: ContentContext) => MeetingContent> = [
  (c) => ({
    title: `Demo de ${c.product} para ${c.company}`,
    body: `Presentación de funcionalidades clave: ${c.feature}, integración y dashboard de métricas.`,
    outcome: "SCHEDULED",
  }),
  (c) => ({
    title: `Discovery call con ${firstName(c)}`,
    body: `Validar necesidades actuales, stack tecnológico y dolores en ${c.industry}.`,
    outcome: "COMPLETED",
  }),
  (c) => ({
    title: `Revisión de propuesta - ${c.company}`,
    body: `Repasar alcance, tiempos y pricing con ${firstName(c)} y su equipo.`,
    outcome: "SCHEDULED",
  }),
  (c) => ({
    title: `Onboarding kickoff - ${c.company}`,
    body: `Primera sesión de configuración. Enfocar en ${c.feature} que fue el punto clave de la venta.`,
    outcome: "SCHEDULED",
  }),
];

function generateMeetingContent(ctx: ContentContext): MeetingContent {
  return faker.helpers.arrayElement(MEETING_TEMPLATES)(ctx);
}

// ── Call summary ──

interface CallContent {
  summary: string;
  sentiment: string;
}

const CALL_TEMPLATES: Array<(ctx: ContentContext) => CallContent> = [
  (c) => ({
    summary: `Llamada productiva. ${firstName(c)} mostró interés en ${c.feature} y pidió documentación para compartir con su equipo.`,
    sentiment: "positive",
  }),
  (c) => ({
    summary: `El cliente tiene dudas sobre ${c.concern}. Se acordó enviar caso de éxito y agendar follow-up la próxima semana.`,
    sentiment: "neutral",
  }),
  (c) => ({
    summary: `${firstName(c)} confirmó que ${c.product} es prioridad para Q${faker.number.int({ min: 1, max: 4 })}. Solicitó propuesta formal.`,
    sentiment: "positive",
  }),
  (c) => ({
    summary: `Conversación exploratoria. ${firstName(c)} está evaluando opciones pero aún no tiene presupuesto definido.`,
    sentiment: "neutral",
  }),
  (c) => ({
    summary: `Llamada de seguimiento. ${firstName(c)} avanzó internamente y necesita datos de ROI para justificar la inversión.`,
    sentiment: "positive",
  }),
  (c) => ({
    summary: `El contacto compartió que el principal dolor es ${c.concern}. Quedamos en armar una demo personalizada.`,
    sentiment: "neutral",
  }),
];

function generateCallContent(ctx: ContentContext): CallContent {
  return faker.helpers.arrayElement(CALL_TEMPLATES)(ctx);
}

// ── Chat lines ──

interface ChatLine {
  role: "agent" | "user";
  content: string;
}

const CHAT_PAIRS: Array<(ctx: ContentContext) => ChatLine[]> = [
  (c) => [
    {
      role: "agent",
      content: `¡Hola ${firstName(c)}! Quería contarte sobre cómo nuestra solución de ${c.product} puede ayudarlos en ${c.industry}.`,
    },
    {
      role: "user",
      content: `Justo estábamos evaluando opciones. ¿Tienen algo enfocado en ${c.feature}?`,
    },
    {
      role: "agent",
      content: `Sí, justamente ${c.feature} es uno de nuestros diferenciales. ¿Te parece si agendamos una demo de 15 minutos?`,
    },
    {
      role: "user",
      content: `Dale, mándenme la invitación. ¿Tienen documentación que pueda compartir con mi equipo?`,
    },
  ],
  (c) => [
    {
      role: "agent",
      content: `Hola, vi que descargaron nuestro whitepaper sobre ${c.product}. ¿Querés que revisemos cómo aplica a ${c.company}?`,
    },
    {
      role: "user",
      content: `Me interesa, pero tenemos dudas con ${c.concern}. ¿Cómo lo manejan ustedes?`,
    },
    {
      role: "agent",
      content: `Buen punto. Tenemos varios clientes en ${c.industry} que pasaron por lo mismo. Te comparto un caso de éxito.`,
    },
    {
      role: "user",
      content: `Genial, reviso el caso y coordinamos una llamada la semana que viene.`,
    },
  ],
  (c) => [
    {
      role: "agent",
      content: `¿Cómo vas con la evaluación de la propuesta, ${firstName(c)}? Quedé en enviarte el detalle de ${c.feature}.`,
    },
    {
      role: "user",
      content: `La revisé con mi equipo. Nos gustó, pero necesitamos validar ${c.concern} antes de avanzar.`,
    },
    {
      role: "agent",
      content: `Entiendo. ¿Te sirve una sesión técnica de 30 min con nuestro equipo de soluciones para resolver esas dudas?`,
    },
    {
      role: "user",
      content: `Sí, buenísimo. Coordinemos para el jueves.`,
    },
  ],
];

function generateChatLines(ctx: ContentContext): ChatLine[] {
  return faker.helpers.arrayElement(CHAT_PAIRS)(ctx);
}

// ── Comment content ──

interface CommentContent {
  content: string;
  userName: string;
}

const COMMENT_TEMPLATES: Array<(ctx: ContentContext) => CommentContent> = [
  (c) => ({
    content: `${firstName(c)} tiene alto potencial. Empresa en ${c.industry} con necesidad clara de ${c.product}. Prioridad alta.`,
    userName: faker.person.fullName(),
  }),
  () => ({
    content: `Ojo con este contacto: pidió no ser contactado fuera de horario laboral. Prefiere comunicación por email.`,
    userName: faker.person.fullName(),
  }),
  (c) => ({
    content: `Lead calificado. ${firstName(c)} ya tuvo demo y le interesó ${c.feature}. Sugiero que el equipo de ventas haga follow-up esta semana.`,
    userName: faker.person.fullName(),
  }),
  (c) => ({
    content: `${c.company} es una cuenta target. ${firstName(c)} es ${c.jobTitle} — perfil decisor. Conviene involucrar a un AE senior.`,
    userName: faker.person.fullName(),
  }),
  (c) => ({
    content: `Venimos de campaña de outbound. ${firstName(c)} respondió al tercer touchpoint. Interés genuino en ${c.product}.`,
    userName: faker.person.fullName(),
  }),
  (c) => ({
    content: `${firstName(c)} preguntó específicamente por pricing enterprise. Mandar la propuesta antes del viernes así lo revisan el lunes.`,
    userName: faker.person.fullName(),
  }),
];

function generateCommentContent(ctx: ContentContext): CommentContent {
  return faker.helpers.arrayElement(COMMENT_TEMPLATES)(ctx);
}

// ── Description content ──

const DESCRIPTION_TEMPLATES: Array<(ctx: ContentContext) => string> = [
  (c) =>
    `Prospecto de ${c.industry} interesado en ${c.product}. Contacto inicial vía formulario web.`,
  (c) =>
    `Lead inbound de ${c.company}. ${c.jobTitle} buscando optimizar procesos con ${c.feature}.`,
  (c) =>
    `Contacto referido por cliente existente. Empresa en ${c.industry} evaluando soluciones de ${c.product}.`,
  (c) =>
    `Lead captado en evento del sector ${c.industry}. Interés en ${c.feature} y ${c.product}.`,
  (c) =>
    `Prospecto frío contactado vía campaña outbound. ${c.jobTitle} con autoridad de decisión.`,
  (c) =>
    `Usuario activo de prueba gratuita. ${c.company} explorando upgrade a plan pago para ${c.product}.`,
  (c) =>
    `Contacto derivado del equipo de ventas. Necesidad clara de ${c.feature} en sector ${c.industry}.`,
  (c) =>
    `Lead generado por contenido (whitepaper descargado). ${c.jobTitle} investigando ${c.product}.`,
];

function generateDescription(ctx: ContentContext): string {
  return faker.helpers.arrayElement(DESCRIPTION_TEMPLATES)(ctx);
}

// ─── HubSpot Association Helper ──────────────────────────────────────────────

function buildAssociation(contactId: string, associationTypeId: number) {
  return [
    {
      to: { id: contactId },
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED" as never,
          associationTypeId,
        },
      ],
    },
  ];
}

// ─── HubSpot Operations ─────────────────────────────────────────────────────

export async function getTestDataStatus(
  organizationId: string,
): Promise<TestDataStatus> {
  const [connection, tasks] = await Promise.all([
    getHubSpotConnectionByOrganizationId(organizationId),
    listSyncTasksByOrganizationId(organizationId),
  ]);

  return {
    hubSpotConnected: Boolean(connection),
    syncQueue: {
      pending: tasks.filter((task) => task.status === "pending").length,
      failed: tasks.filter((task) => task.status === "failed").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    },
  };
}

async function requireHubSpot(organizationId: string) {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    throw new Error("HubSpot debe estar conectado para ejecutar este test.");
  }

  return getHubSpotClientForOrganization(organizationId);
}

async function createHubSpotContactOnly(
  organizationId: string,
  input: HubSpotContactInput,
): Promise<HubSpotContact> {
  const client = await requireHubSpot(organizationId);
  const { firstname, lastname } = splitFullName(input.fullName);

  return client.crm.contacts.basicApi.create({
    properties: {
      firstname,
      lastname,
      email: input.email,
      phone: input.phone,
      lifecyclestage: input.lifecycleStage,
      hs_lead_status: input.leadStatus,
    },
  }) as unknown as Promise<HubSpotContact>;
}

async function createHubSpotActivity(
  organizationId: string,
  contactId: string,
  activity: HubSpotActivityInput,
) {
  const client = await getHubSpotClientForOrganization(organizationId);

  await Promise.all([
    ...(activity.notes ?? []).map((note) =>
      client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: note,
          hs_timestamp: new Date().toISOString(),
        },
        associations: buildAssociation(contactId, AssociationTypes.noteToContact),
      }),
    ),
    ...(activity.tasks ?? []).map((task) =>
      client.crm.objects.tasks.basicApi.create({
        properties: {
          hs_timestamp: task.dueAt.toISOString(),
          hs_task_subject: task.title,
          hs_task_body: task.body,
          hs_task_status: "NOT_STARTED",
          hs_task_priority: task.priority ?? "MEDIUM",
          hs_task_type: "TODO",
        },
        associations: buildAssociation(contactId, AssociationTypes.taskToContact),
      }),
    ),
    ...(activity.meetings ?? []).map((meeting) => {
      const endAt = new Date(meeting.startAt.getTime() + 30 * 60 * 1000);

      return client.crm.objects.meetings.basicApi.create({
        properties: {
          hs_timestamp: meeting.startAt.toISOString(),
          hs_meeting_title: meeting.title,
          hs_meeting_body: meeting.body,
          hs_internal_meeting_notes: meeting.body,
          hs_meeting_start_time: meeting.startAt.toISOString(),
          hs_meeting_end_time: endAt.toISOString(),
          hs_meeting_outcome: meeting.outcome ?? "SCHEDULED",
        },
        associations: buildAssociation(contactId, AssociationTypes.meetingToContact),
      });
    }),
  ]);
}

async function materializeHubSpotContact(
  organizationId: string,
  hubSpotContact: HubSpotContact,
  fallback: Pick<HubSpotContactInput, "fullName" | "email" | "phone">,
) {
  const mapped = mapHubSpotContactToOurModel(hubSpotContact, organizationId);
  const data: NewContact = {
    ...mapped,
    full_name: mapped.full_name ?? fallback.fullName,
    email: mapped.email ?? fallback.email,
    phone_number: mapped.phone_number ?? fallback.phone,
    organization_id: organizationId,
  };

  return upsertContactByExternalId(data);
}

async function addContactshipComments(
  organizationId: string,
  contactId: string,
  entries: Array<{ content: string; userName: string; daysAgo: number }>,
) {
  const rows: NewComment[] = entries.map((entry) => {
    const createdAt = daysFromNow(-entry.daysAgo, 11);
    return {
      content: entry.content,
      user_name: entry.userName,
      user_id: `test-user-${entry.userName.toLowerCase().replace(/\s+/g, "-")}`,
      contact_id: contactId,
      organization_id: organizationId,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  await db.insert(comments).values(rows);
}

async function addContactshipCalls(
  organizationId: string,
  contactId: string,
  entries: Array<{
    direction: "inbound" | "outbound";
    result: string;
    summary: string;
    sentiment: string;
    daysAgo: number;
    duration: number;
    chat: Array<{ role: "agent" | "user"; content: string }>;
  }>,
) {
  const rows: NewCall[] = entries.map((entry, index) => {
    const startAt = daysFromNow(-entry.daysAgo, 15 + index);
    const finishedAt = new Date(startAt.getTime() + entry.duration * 1000);

    return {
      direction: entry.direction,
      from: "+12025550100",
      call_record: `https://api.contactship.ai/recordings/test-${contactId}-${index}.mp3`,
      call_status: "completed",
      call_result: entry.result,
      disconnection_reason: "agent_hangup",
      start_at: startAt,
      finished_at: finishedAt,
      duration: entry.duration,
      call_analysis: {
        summary: entry.summary,
        sentiment: entry.sentiment,
      },
      type: "ai_call",
      agent_id: "test-agent-contactship",
      contact_id: contactId,
      chat_history: entry.chat,
      transcript_format: "json",
      organization_id: organizationId,
    };
  });

  await db.insert(calls).values(rows);
}

// ─── Scenario 1: HubSpot Basic ──────────────────────────────────────────────
//
// HubSpot connected. Creates 5 contacts with notes and tasks directly in HubSpot.
// Purpose: list HubSpot contacts, create insights from HubSpot-only data.

export async function createHubSpotBasicTestData(
  organizationId: string,
): Promise<TestDataResult> {
  await requireHubSpot(organizationId);
  seedFromNow();
  const runId = generateRunId();

  const lifecycleStages = ["marketingqualifiedlead", "salesqualifiedlead", "lead", "lead", "subscriber"];
  const leadStatuses = ["OPEN", "IN_PROGRESS", "NEW", "NEW", "NEW"];

  const contactsToCreate: Array<HubSpotContactInput & { ctx: ContentContext }> =
    Array.from({ length: 5 }, (_, index) => {
      const fullName = generateFullName();
      const { firstname, lastname } = splitFullName(fullName);
      const ctx = makeContext(fullName);

      return {
        fullName,
email: generateEmail(firstname, lastname, 1, runId),
        phone: generatePhone(),
        lifecycleStage: lifecycleStages[index],
        leadStatus: leadStatuses[index],
        ctx,
      };
    });

  const created = [];

  for (const [index, input] of contactsToCreate.entries()) {
    const contact = await createHubSpotContactOnly(organizationId, input);
    const { title, body } = generateTaskContent(input.ctx);

    await createHubSpotActivity(organizationId, contact.id, {
      notes: [generateNoteContent(input.ctx)],
      tasks: [
        {
          title,
          body,
          dueAt: daysFromNow(index + 1, 10),
          priority: index < 2 ? "HIGH" : "MEDIUM",
        },
      ],
    });

    created.push({
      id: toHubSpotVirtualContactId(contact.id),
      name: input.fullName,
      href: `/dashboard/contacts/${encodeURIComponent(toHubSpotVirtualContactId(contact.id))}`,
      source: "hubspot" as const,
    });
  }

  return {
    scenario: "hubspot-basic",
    created,
    message: "Se crearon 5 contactos con notas y tareas solo en HubSpot.",
  };
}

// ─── Scenario 2: Local Queue ────────────────────────────────────────────────
//
// HubSpot disconnected. Creates 3 contacts from the platform (normal flow).
// Purpose: list contacts, observe sync queue growth.
// Creating an insight on one shows the queue continuing to grow.

export async function createLocalQueueTestData(
  organizationId: string,
): Promise<TestDataResult> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (connection) {
    throw new Error("HubSpot debe estar desconectado para ejecutar este test.");
  }

  seedFromNow();
  const runId = generateRunId();

  const contactsToCreate = Array.from({ length: 3 }, () => {
    const fullName = generateFullName();
    const { firstname, lastname } = splitFullName(fullName);
    const ctx = makeContext(fullName);

    return {
      full_name: fullName,
      phone_number: generatePhone(),
      email: generateEmail(firstname, lastname, 2, runId),
      country: faker.helpers.arrayElement([
        "Argentina", "Chile", "México", "Colombia", "Perú",
      ]),
      description: generateDescription(ctx),
    };
  });

  const created = [];
  for (const input of contactsToCreate) {
    const result = await createUnifiedContact(organizationId, input);
    created.push({
      id: result.contact.id,
      name: result.contact.full_name ?? input.full_name,
      href: `/dashboard/contacts/${result.contact.id}`,
      source: "local" as const,
    });
  }

  return {
    scenario: "local-queue",
    created,
    message: "Se crearon 3 contactos locales con tareas de sync pendientes.",
  };
}

// ─── Scenario 3: Advanced ───────────────────────────────────────────────────
//
// HubSpot connected. Creates 2 contacts with rich activity data.
// Contact 1: notes, tasks, calls, comments
// Contact 2: notes, tasks, meetings, calls, comments
// Purpose: test insight generation depending on state and available information.
// Different data → different insights → observable reasoning differences.

export async function createAdvancedTestData(
  organizationId: string,
): Promise<TestDataResult> {
  await requireHubSpot(organizationId);
  seedFromNow();
  const runId = generateRunId();

  // ── Contact 1: Warm Lead ──
  const name1 = generateFullName();
  const { firstname: fn1, lastname: ln1 } = splitFullName(name1);
  const ctx1 = makeContext(name1);

  const input1: HubSpotContactInput = {
    fullName: name1,
    email: generateEmail(fn1, ln1, 3, runId),
    phone: generatePhone(),
    lifecycleStage: "salesqualifiedlead",
    leadStatus: "CONNECTED",
  };

  const note1 = generateNoteContent(ctx1);
  const task1 = generateTaskContent(ctx1);
  const call1 = generateCallContent(ctx1);
  const chat1 = generateChatLines(ctx1);
  const comment1 = generateCommentContent(ctx1);

  const hubSpotContact1 = await createHubSpotContactOnly(organizationId, input1);
  await createHubSpotActivity(organizationId, hubSpotContact1.id, {
    notes: [note1],
    tasks: [
      {
        title: task1.title,
        body: task1.body,
        dueAt: daysFromNow(1, 9),
        priority: "HIGH",
      },
    ],
  });

  const localContact1 = await materializeHubSpotContact(
    organizationId,
    hubSpotContact1,
    input1,
  );

  await addContactshipCalls(organizationId, localContact1.id, [
    {
      direction: "outbound",
      result: "answered",
      summary: call1.summary,
      sentiment: call1.sentiment,
      daysAgo: 3,
      duration: faker.number.int({ min: 180, max: 600 }),
      chat: chat1,
    },
  ]);

  await addContactshipComments(organizationId, localContact1.id, [
    {
      content: comment1.content,
      userName: comment1.userName,
      daysAgo: 2,
    },
  ]);

  // ── Contact 2: Demo Ready ──
  const name2 = generateFullName();
  const { firstname: fn2, lastname: ln2 } = splitFullName(name2);
  const ctx2 = makeContext(name2);

  const input2: HubSpotContactInput = {
    fullName: name2,
    email: generateEmail(fn2, ln2, 3, runId),
    phone: generatePhone(),
    lifecycleStage: "opportunity",
    leadStatus: "OPEN_DEAL",
  };

  const note2 = generateNoteContent(ctx2);
  const task2 = generateTaskContent(ctx2);
  const meeting2 = generateMeetingContent(ctx2);
  const call2 = generateCallContent(ctx2);
  const chat2 = generateChatLines(ctx2);
  const comment2 = generateCommentContent(ctx2);

  const hubSpotContact2 = await createHubSpotContactOnly(organizationId, input2);
  await createHubSpotActivity(organizationId, hubSpotContact2.id, {
    notes: [note2],
    tasks: [
      {
        title: task2.title,
        body: task2.body,
        dueAt: daysFromNow(1, 9),
        priority: "HIGH",
      },
    ],
    meetings: [
      {
        title: meeting2.title,
        body: meeting2.body,
        startAt: daysFromNow(2, 11),
        outcome: meeting2.outcome,
      },
    ],
  });

  const localContact2 = await materializeHubSpotContact(
    organizationId,
    hubSpotContact2,
    input2,
  );

  await addContactshipCalls(organizationId, localContact2.id, [
    {
      direction: "outbound",
      result: "answered",
      summary: call2.summary,
      sentiment: call2.sentiment,
      daysAgo: 1,
      duration: faker.number.int({ min: 180, max: 600 }),
      chat: chat2,
    },
  ]);

  await addContactshipComments(organizationId, localContact2.id, [
    {
      content: comment2.content,
      userName: comment2.userName,
      daysAgo: 1,
    },
  ]);

  return {
    scenario: "advanced",
    created: [
      {
        id: localContact1.id,
        name: localContact1.full_name ?? input1.fullName,
        href: `/dashboard/contacts/${localContact1.id}`,
        source: "hubspot" as const,
      },
      {
        id: localContact2.id,
        name: localContact2.full_name ?? input2.fullName,
        href: `/dashboard/contacts/${localContact2.id}`,
        source: "hubspot" as const,
      },
    ],
    message:
      "Se crearon 2 contactos avanzados con actividad de HubSpot y ContactShip.",
  };
}
