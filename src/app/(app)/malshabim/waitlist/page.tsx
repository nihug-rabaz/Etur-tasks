import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimWaitlistPage } from "@/modules/malshabim/pages/waitlist-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimWaitlistService } from "@/modules/malshabim/services/waitlist.service";

interface PageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    if (access.status === 401) await redirectMalshabimLogin("/malshabim/waitlist");
    redirect("/");
  }

  const params = await searchParams;
  let entries: Awaited<ReturnType<MalshabimWaitlistService["list"]>> = [];
  try {
    entries = await new MalshabimWaitlistService().list();
  } catch {
    entries = [];
  }

  return (
    <MalshabimWaitlistPage
      initialEntries={entries}
      initialRole={access.role}
      openForm={params.new === "1"}
    />
  );
}
