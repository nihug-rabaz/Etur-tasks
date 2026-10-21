import { redirect } from "next/navigation";

/** Statistics page removed — keep route as redirect for old bookmarks. */
export default function Page() {
  redirect("/malshabim");
}
