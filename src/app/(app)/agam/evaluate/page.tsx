import type { Metadata } from "next";
import { AgamEvaluatorHomePage } from "@/modules/agam/pages/evaluator-home-page";

export const metadata: Metadata = {
  title: "פורטל מעריכים · קצינים",
};

export default function Page() {
  return <AgamEvaluatorHomePage />;
}
