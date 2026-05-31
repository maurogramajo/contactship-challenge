import { getActionablesByContactId } from "@/db/repository";
import {
  getLocalMaterializedContactByIdentifier,
  getUnifiedContactById,
} from "@/lib/contacts";
import { requireCurrentOrganization } from "@/lib/session";
import { notFound } from "next/navigation";
import ContactDetailClient from "@/components/contacts/contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await requireCurrentOrganization();

  const [contact, localContact] = await Promise.all([
    getUnifiedContactById(id, organization.id),
    getLocalMaterializedContactByIdentifier(id, organization.id),
  ]);

  if (!contact) {
    notFound();
  }

  const insights = localContact
    ? await getActionablesByContactId(localContact.id)
    : [];

  return <ContactDetailClient contact={contact} initialInsights={insights} />;
}
