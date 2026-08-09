import { DovrutProjectDetailsPage } from "@/modules/dovrut/pages/project-details-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DovrutProjectDetailsPage projectId={id} />;
}
