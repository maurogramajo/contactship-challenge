import "dotenv/config";
import { db } from "@/db";
import {
  contacts,
  calls,
  comments,
  tags,
  contactTags,
  contactActionables,
  organizations,
  organizationRefreshTokens,
  hubspotConnections,
  type NewContact,
  type NewCall,
  type NewComment,
  type NewTag,
  type NewContactTag,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
// ── Seeded PRNG (loggable seed for reproducibility) ─────────────────────────
const SEED = Date.now();
console.log(`🌱 Seed PRNG initialized with seed: ${SEED}`);

const random = (() => {
  let s = SEED;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Data pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Alejandro", "María", "José", "Carmen", "Francisco",
  "Isabel", "Manuel", "Ana", "Juan", "Dolores",
  "Carlos", "Laura", "Miguel", "Sofía", "Javier",
  "Elena", "Diego", "Lucía", "Pedro", "Marta",
  "Antonio", "Rosa", "David", "Patricia", "Pablo",
  "Cristina", "Sergio", "Raquel", "Fernando", "Valentina",
  "Luis", "Adriana", "Andrés", "Camila", "Gabriel",
];

const LAST_NAMES = [
  "García", "Rodríguez", "Martínez", "López", "Hernández",
  "González", "Pérez", "Sánchez", "Ramírez", "Torres",
  "Flores", "Rivera", "Gómez", "Díaz", "Cruz",
  "Morales", "Ortiz", "Reyes", "Ruiz", "Jiménez",
  "Vargas", "Castro", "Mendoza", "Guerrero", "Romero",
  "Álvarez", "Medina", "Castillo", "Herrera", "Aguilar",
  "Navarro", "Rojas", "Moreno", "Silva", "Paredes",
];

const DOMAINS = [
  "@gmail.com", "@hotmail.com", "@yahoo.com",
  "@empresa.mx", "@correo.co", "@negocio.ar",
  "@compania.cl", "@entel.pe", "@telefonica.es",
];

const COUNTRIES = [
  { name: "México", code: "+52" },
  { name: "Colombia", code: "+57" },
  { name: "Argentina", code: "+54" },
  { name: "Chile", code: "+56" },
  { name: "Perú", code: "+51" },
  { name: "España", code: "+34" },
];

const COMMENT_PHRASES = [
  "Cliente interesado en plan premium. Enviar cotización.",
  "Llamar la próxima semana para seguimiento de propuesta.",
  "Solicitó información sobre precios y condiciones.",
  "No contestó, intentar en horario laboral de su país.",
  "Pide demostración del producto. Agendar para viernes.",
  "Cliente satisfecho con el servicio actual.",
  "Revisar caso con soporte técnico antes de volver a llamar.",
  "Envió correo con dudas sobre facturación.",
  "Potencial cliente referido por Carlos. Prioridad alta.",
  "Dejó mensaje en buzón de voz. Reintentar mañana.",
  "Solicita cambio de plan a empresarial.",
  "Actualizar datos de contacto. Email rebotó.",
  "Cliente VIP. Tratar con atención personalizada.",
  "Interesado pero necesita aprobación de gerencia.",
  "Queja sobre tiempo de respuesta. Escalar a supervisor.",
  "Llamada de cortesía para verificar satisfacción.",
  "Confirmó asistencia al webinar del próximo mes.",
  "Pidió información sobre integración con CRM.",
  "Cliente inactivo desde hace 3 meses. Reactivar.",
  "Solicitó cambio de asesor asignado.",
  "Interés en producto nuevo. Enviar brochure digital.",
  "Revisar historial antes de contacto. Alta tasa de rechazo.",
  "Coordinando reunión con equipo técnico para demo.",
  "Consulta sobre garantía extendida del servicio.",
  "Feedback positivo sobre última actualización del producto.",
];

const USER_NAMES = [
  "Ana García",
  "Carlos Rodríguez",
  "María López",
  "Pedro Sánchez",
  "Laura Martínez",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function generatePhone(countryCode: string): string {
  const area = randInt(100, 999);
  const part1 = randInt(100, 999);
  const part2 = randInt(1000, 9999);
  return `${countryCode}${area}${part1}${part2}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const normalized = (firstName + lastName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
  const num = randInt(0, 999);
  const domain = pick(DOMAINS);
  if (random() > 0.5) {
    return `${normalized}${num}${domain}`;
  }
  return `${normalized.charAt(0)}${lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n")}${num}${domain}`;
}

function randomPastDate(maxDaysAgo: number): Date {
  const now = Date.now();
  const offset = randInt(0, maxDaysAgo * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

function randomCallStatus(): "answered" | "missed" | "rejected" | "busy" | "failed" {
  const roll = random();
  if (roll < 0.6) return "answered";
  if (roll < 0.8) return "missed";
  if (roll < 0.9) return "rejected";
  if (roll < 0.95) return "busy";
  return "failed";
}

// ── Additional data generators ──────────────────────────────────────────────

function generateAdditionalData(): { type: string; field: string; value: string }[] {
  const types = ["empresa", "personal", "referencia", "evento"];
  const fields: Record<string, string[]> = {
    empresa: ["sector", "tamaño", "facturación", "empleados"],
    personal: ["cargo", "antigüedad", "idioma", "disponibilidad"],
    referencia: ["fuente", "contacto", "canal", "campaña"],
    evento: ["feria", "webinar", "fecha", "asistentes"],
  };
  const values: Record<string, Record<string, string[]>> = {
    empresa: {
      sector: ["Tecnología", "Finanzas", "Salud", "Retail", "Educación", "Manufactura"],
      tamaño: ["1-10", "11-50", "51-200", "201-500", "500+"],
      facturación: ["<$1M", "$1M-$5M", "$5M-$20M", ">$20M"],
      empleados: ["<10", "10-50", "50-200", "200-1000", ">1000"],
    },
    personal: {
      cargo: ["Gerente", "Director", "Coordinador", "Analista", "VP"],
      antigüedad: ["<1 año", "1-3 años", "3-5 años", ">5 años"],
      idioma: ["Español", "Inglés", "Portugués", "Bilingüe"],
      disponibilidad: ["Mañana", "Tarde", "Full-time", "Medio tiempo"],
    },
    referencia: {
      fuente: ["LinkedIn", "Feria", "Recomendación", "Publicidad", "Web"],
      contacto: ["Juan Pérez", "María Gómez", "Carlos Ruiz", "Ana Torres"],
      canal: ["Email", "Teléfono", "WhatsApp", "Presencial"],
      campaña: ["Q1-2026", "Q2-2026", "Black Friday", "Navidad"],
    },
    evento: {
      feria: ["Expo Tech 2026", "Congreso Fintech", "Salud Digital Summit"],
      webinar: ["Producto demo", "Onboarding", "Casos de éxito", "Tendencias"],
      fecha: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"],
      asistentes: ["10", "25", "50", "100", "200+"],
    },
  };

  const count = randInt(1, 3);
  const data: { type: string; field: string; value: string }[] = [];
  for (let i = 0; i < count; i++) {
    const type = pick(types);
    const field = pick(fields[type]);
    const value = pick(values[type]?.[field] ?? ["N/A"]);
    data.push({ type, field, value });
  }
  return data;
}

// ── Main seeder ─────────────────────────────────────────────────────────────

async function seed() {
  console.log("🧹 Cleaning database (idempotent)...");

  // FK order: junction tables first → child tables → parent tables
  await db.delete(contactTags);
  await db.delete(contactActionables);
  await db.delete(comments);
  await db.delete(calls);
  await db.delete(hubspotConnections);
  await db.delete(organizationRefreshTokens);
  await db.delete(organizations);
  await db.delete(tags);
  await db.delete(contacts);
  console.log("✅ All tables cleared.");

  const [demoOrganization] = await db
    .insert(organizations)
    .values({
      name: "Demo ContactShip",
      email: "demo@contactship.local",
      password_hash: hashPassword("demo123456"),
    })
    .returning();
  console.log(
    `🏢 Demo organization created: ${demoOrganization.email} / demo123456`,
  );

  // ── 1. Insert Contacts ──────────────────────────────────────────────────
  const NUM_CONTACTS = 80;
  const HUBSPOT_COUNT = 15;
  console.log(`👥 Seeding ${NUM_CONTACTS} contacts (${HUBSPOT_COUNT} HubSpot)...`);

  const contactRows: NewContact[] = [];

  for (let i = 0; i < NUM_CONTACTS; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const country = pick(COUNTRIES);
    const isHubspot = i < HUBSPOT_COUNT;
    const hasAdditionalData = random() < 0.3;

    const contact: NewContact = {
      organization_id: demoOrganization.id,
      full_name: `${firstName} ${lastName}${random() > 0.6 ? ` ${pick(LAST_NAMES)}` : ""}`,
      phone_number: generatePhone(country.code),
      country: country.name,
      email: generateEmail(firstName, lastName),
      description: random() > 0.5
        ? `Contacto de ${country.name} en sector ${pick(["tecnología", "finanzas", "salud", "retail", "educación"])}.`
        : null,
      ...(isHubspot
        ? {
            source: "hubspot" as const,
            external_id: `hs-${Date.now()}-${i}-${randInt(10000, 99999)}`,
          }
        : {}),
      ...(hasAdditionalData
        ? { additional_data: generateAdditionalData() }
        : {}),
    };

    contactRows.push(contact);
  }

  const insertedContacts = await db
    .insert(contacts)
    .values(contactRows)
    .returning({ id: contacts.id, full_name: contacts.full_name });
  console.log(`✅ ${insertedContacts.length} contacts inserted.`);

  // ── 2. Insert Tags ──────────────────────────────────────────────────────
  const TAG_DEFS: { name: string; color: string; label: string }[] = [
    { name: "hot-lead", color: "#EF4444", label: "Cliente potencial caliente" },
    { name: "cold-lead", color: "#3B82F6", label: "Cliente potencial frío" },
    { name: "customer", color: "#10B981", label: "Cliente activo" },
    { name: "vip", color: "#F59E0B", label: "Cliente VIP" },
    { name: "salud", color: "#8B5CF6", label: "Sector salud" },
    { name: "tecnologia", color: "#06B6D4", label: "Sector tecnología" },
    { name: "financiero", color: "#6366F1", label: "Sector financiero" },
    { name: "retail", color: "#EC4899", label: "Sector retail" },
    { name: "inactive", color: "#6B7280", label: "Cliente inactivo" },
    { name: "follow-up", color: "#14B8A6", label: "Requiere seguimiento" },
  ];

  console.log(`🏷️  Seeding ${TAG_DEFS.length} tags...`);
  const tagRows: NewTag[] = TAG_DEFS.map((t) => ({
    name: t.name,
    color: t.color,
    label: t.label,
  }));
  const insertedTags = await db
    .insert(tags)
    .values(tagRows)
    .returning({ id: tags.id, name: tags.name });
  console.log(`✅ ${insertedTags.length} tags inserted.`);

  // ── 3. Assign Tags to Contacts (0–4 per contact) ────────────────────────
  console.log("🔗 Assigning tags to contacts...");
  const contactTagRows: NewContactTag[] = [];
  for (const contact of insertedContacts) {
    const tagCount = randInt(0, 4);
    if (tagCount > 0) {
      const assigned = pickN(insertedTags, tagCount);
      for (const tag of assigned) {
        contactTagRows.push({
          contact_id: contact.id,
          tag_id: tag.id,
        });
      }
    }
  }
  if (contactTagRows.length > 0) {
    await db.insert(contactTags).values(contactTagRows);
  }
  console.log(`✅ ${contactTagRows.length} contact-tag assignments.`);

  // ── 4. Insert Calls (2–8 per contact) ───────────────────────────────────
  console.log("📞 Seeding calls...");
  const callRows: NewCall[] = [];
  const directions: Array<"inbound" | "outbound"> = ["inbound", "outbound"];

  for (const contact of insertedContacts) {
    const callCount = randInt(2, 8);
    for (let c = 0; c < callCount; c++) {
      const dir = pick(directions);
      const status = randomCallStatus();
      const duration = status === "answered" ? randInt(30, 600) : null;

      callRows.push({
        contact_id: contact.id,
        organization_id: demoOrganization.id,
        call_time: randomPastDate(90),
        direction: dir,
        status,
        duration,
        notes:
          random() > 0.4
            ? `Llamada ${dir === "inbound" ? "entrante" : "saliente"} — ${status === "answered" ? "atendida" : status === "missed" ? "perdida" : status}. ${pick(["Cliente satisfecho.", "Requiere seguimiento.", "Información enviada.", "Agendar nueva llamada.", ""])}`
            : null,
      });
    }
  }

  // Batch insert calls in chunks to avoid huge statements
  const CHUNK_SIZE = 100;
  let totalCalls = 0;
  for (let i = 0; i < callRows.length; i += CHUNK_SIZE) {
    const chunk = callRows.slice(i, i + CHUNK_SIZE);
    const inserted = await db.insert(calls).values(chunk).returning();
    totalCalls += inserted.length;
  }
  console.log(`✅ ${totalCalls} calls inserted.`);

  // ── 5. Insert Comments (0–5 per contact) ────────────────────────────────
  console.log("💬 Seeding comments...");
  const commentRows: NewComment[] = [];

  for (const contact of insertedContacts) {
    const commentCount = randInt(0, 5);
    for (let c = 0; c < commentCount; c++) {
      commentRows.push({
        contact_id: contact.id,
        organization_id: demoOrganization.id,
        content: pick(COMMENT_PHRASES),
        user_name: pick(USER_NAMES),
        created_at: randomPastDate(90),
      });
    }
  }

  let totalComments = 0;
  for (let i = 0; i < commentRows.length; i += CHUNK_SIZE) {
    const chunk = commentRows.slice(i, i + CHUNK_SIZE);
    const inserted = await db.insert(comments).values(chunk).returning();
    totalComments += inserted.length;
  }
  console.log(`✅ ${totalComments} comments inserted.`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete!");
  console.log(`   Seed value: ${SEED}`);
  console.log(`   Contacts:   ${insertedContacts.length}`);
  console.log(`   HubSpot:    ${HUBSPOT_COUNT}`);
  console.log(`   Tags:       ${insertedTags.length}`);
  console.log(`   Tag links:  ${contactTagRows.length}`);
  console.log(`   Calls:      ${totalCalls}`);
  console.log(`   Comments:   ${totalComments}`);
}

seed()
  .then(() => {
    console.log("🏁 Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
