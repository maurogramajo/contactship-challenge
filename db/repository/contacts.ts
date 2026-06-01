import { db } from "@/db";
import { contacts, type Contact, type NewContact } from "@/db/schema";
import {
  eq,
  ilike,
  isNull,
  or,
  desc,
  and,
  sql,
  count,
  inArray,
  type SQL,
} from "drizzle-orm";

export interface GetContactsFilters {
  organizationId: string;
  page?: number;
  limit?: number;
  after?: string;
  search?: string;
  source?: "hubspot";
  sort?: "created_at" | "full_name" | "email";
  extraConditions?: SQL[];
  lifecycleStage?: string;
  leadStatus?: string;
}

export interface PaginatedResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage?: boolean;
  nextAfter?: string;
  totalIsApproximate?: boolean;
}

function buildContactsWhereClause(filters: GetContactsFilters): SQL | undefined {
  const conditions: SQL[] = [eq(contacts.organization_id, filters.organizationId)];

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    const searchCondition = or(
      ilike(contacts.full_name, searchTerm),
      ilike(contacts.email, searchTerm),
      ilike(contacts.phone_number, searchTerm),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (filters.source) {
    conditions.push(eq(contacts.source, filters.source));
  }

  if (filters.lifecycleStage) {
    conditions.push(eq(contacts.external_lifecycle_stage, filters.lifecycleStage));
  }

  if (filters.leadStatus) {
    conditions.push(eq(contacts.external_lead_status, filters.leadStatus));
  }

  if (filters.extraConditions?.length) {
    conditions.push(...filters.extraConditions);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getContacts(
  filters: GetContactsFilters,
): Promise<PaginatedResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 30;
  const offset = (page - 1) * limit;
  const whereClause = buildContactsWhereClause(filters);
  const listQuery = db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.created_at))
    .limit(limit)
    .offset(offset);
  const countQuery = db.select({ count: count() }).from(contacts);

  const [data, totalResult] = await Promise.all(
    whereClause
      ? [listQuery.where(whereClause), countQuery.where(whereClause)]
      : [listQuery, countQuery],
  );

  const total = totalResult[0]?.count ?? 0;

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAllContacts(
  filters: Omit<GetContactsFilters, "page" | "limit">,
): Promise<Contact[]> {
  const whereClause = buildContactsWhereClause(filters);
  const query = db.select().from(contacts).orderBy(desc(contacts.created_at));

  return whereClause ? query.where(whereClause) : query;
}

export async function getContactById(
  id: string,
  organizationId: string,
): Promise<Contact | null> {
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organization_id, organizationId)))
    .limit(1);

  return result[0] ?? null;
}

export async function getContactByExternalId(
  externalId: string,
  organizationId: string,
): Promise<Contact | null> {
  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organization_id, organizationId),
        eq(contacts.external_id, externalId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getContactByPhoneNumber(
  phoneNumber: string,
  organizationId: string,
): Promise<Contact | null> {
  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organization_id, organizationId),
        eq(contacts.phone_number, phoneNumber),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getContactByNormalizedEmail(
  email: string,
  organizationId: string,
): Promise<Contact | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organization_id, organizationId),
        sql`lower(trim(${contacts.email})) = ${normalizedEmail}`,
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getContactByNormalizedPhoneNumber(
  phoneNumber: string,
  organizationId: string,
): Promise<Contact | null> {
  const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");
  if (!normalizedPhoneNumber) {
    return null;
  }

  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organization_id, organizationId),
        sql`regexp_replace(coalesce(${contacts.phone_number}, ''), '[^0-9]+', '', 'g') = ${normalizedPhoneNumber}`,
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createContact(
  data: NewContact
): Promise<Contact> {
  const result = await db
    .insert(contacts)
    .values(data)
    .returning();

  return result[0];
}

export async function updateContact(
  id: string,
  organizationId: string,
  data: Partial<NewContact>,
): Promise<Contact> {
  const result = await db
    .update(contacts)
    .set({ ...data, updated_at: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.organization_id, organizationId)))
    .returning();

  return result[0];
}

export async function upsertContactByExternalId(
  data: NewContact
): Promise<Contact> {
  const result = await db
    .insert(contacts)
    .values(data)
    .onConflictDoUpdate({
      target: [contacts.organization_id, contacts.external_id, contacts.source],
      set: {
        full_name: sql`excluded.full_name`,
        email: sql`excluded.email`,
        phone_number: sql`excluded.phone_number`,
        country: sql`excluded.country`,
        description: sql`excluded.description`,
        external_lifecycle_stage: sql`excluded.external_lifecycle_stage`,
        external_lead_status: sql`excluded.external_lead_status`,
        updated_at: sql`excluded.updated_at`,
      },
    })
    .returning();

  return result[0];
}

export async function getContactsWithoutExternalIds(
  organizationId: string,
  options: Pick<
    GetContactsFilters,
    "limit" | "search" | "lifecycleStage" | "leadStatus"
  > = {},
): Promise<Contact[]> {
  const whereClause = buildContactsWhereClause({
    organizationId,
    search: options.search,
    lifecycleStage: options.lifecycleStage,
    leadStatus: options.leadStatus,
    extraConditions: [isNull(contacts.external_id)],
  });

  return db
    .select()
    .from(contacts)
    .where(whereClause)
    .orderBy(desc(contacts.created_at))
    .limit(options.limit ?? 30);
}

export async function getContactsByExternalIds(
  ids: string[],
  organizationId: string,
): Promise<Contact[]> {
  if (ids.length === 0) return [];

  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.organization_id, organizationId),
        inArray(contacts.external_id, ids),
      ),
    );
}
