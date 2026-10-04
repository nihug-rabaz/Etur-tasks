import { AgamApplyWizard } from "@/modules/agam/components/apply-wizard";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AgamApplyWizard inviteSlug={decodeURIComponent(slug)} />;
}
