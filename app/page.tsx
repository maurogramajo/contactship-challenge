import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/session";

export default async function Home() {
  const organization = await getCurrentOrganization();
  redirect(organization ? "/dashboard" : "/login");
}
