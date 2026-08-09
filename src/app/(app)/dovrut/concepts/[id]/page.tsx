import { DovrutConceptDetailsPage } from "@/modules/dovrut/pages/concept-details-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DovrutConceptDetailsPage conceptId={id} />;
}
