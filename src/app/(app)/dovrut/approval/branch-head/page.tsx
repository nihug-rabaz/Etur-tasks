import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dovrut/approvals?step=waiting_branch_head");
}
