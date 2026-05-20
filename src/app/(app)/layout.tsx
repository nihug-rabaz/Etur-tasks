import { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthorizationService } from "@/services/authorization.service";

export default async function ApplicationLayout({ children }: { children: ReactNode }) {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureApproved();
  return <AppShell>{children}</AppShell>;
}
