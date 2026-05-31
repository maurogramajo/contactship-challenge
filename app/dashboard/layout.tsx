import type { Metadata } from "next";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import { requireCurrentOrganization } from "@/lib/session";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export const metadata: Metadata = {
  title: "ContactShip — Dashboard",
  description: "Gestiona tus contactos con inteligencia artificial",
};

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organization = await requireCurrentOrganization();
  const hubSpotConnection = await getHubSpotConnectionByOrganizationId(
    organization.id,
  );

  return (
    <DashboardLayout
      organizationName={organization.name}
      organizationEmail={organization.email}
      hubSpotConnected={Boolean(hubSpotConnection)}
    >
      {children}
    </DashboardLayout>
  );
}
