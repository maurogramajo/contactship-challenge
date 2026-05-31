import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentOrganization } from "@/lib/session";

export default async function LoginPage() {
  const organization = await getCurrentOrganization();
  if (organization) {
    redirect("/dashboard");
  }

  return <AuthForm mode="login" />;
}
