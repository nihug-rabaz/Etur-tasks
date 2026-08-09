import { redirect } from "next/navigation";

export default async function DovrutConceptRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dovrut/items/${id}`);
}
