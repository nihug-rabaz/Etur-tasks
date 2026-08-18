import { DovrutInquirySubjectDetailsPage } from "@/modules/dovrut/pages/inquiry-subject-details-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DovrutInquirySubjectDetailsPage subjectId={id} />;
}
