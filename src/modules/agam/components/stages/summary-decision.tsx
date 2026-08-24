"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type {
  AgamCandidate,
  AgamCandidateStatus,
  AgamDayEvaluation,
  AgamInterview,
  AgamOrgSettings,
} from "@/modules/agam/types";

export function SummaryDecision({
  candidate,
  interviews,
  dayEvals,
  org,
  onSaved,
}: {
  candidate: AgamCandidate;
  interviews: AgamInterview[];
  dayEvals: AgamDayEvaluation[];
  org: AgamOrgSettings | null;
  onSaved: () => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(candidate.ramad_notes ?? "");
  const [exporting, setExporting] = useState(false);

  const decide = async (status: Exclude<AgamCandidateStatus, "pending">) => {
    try {
      await agamFetch(`/api/agam/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "passed" ? "עבר" : "לא עבר");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "החלטה נכשלה");
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${candidate.full_name}_${candidate.personal_number}.pdf`);
    } catch {
      toast.error("ייצוא PDF נכשל");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dashboard-glass space-y-4 rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">החלטה סופית</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} onClick={() => void decide("passed")}>
            עבר
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"
            onClick={() => void decide("not_passed")}
          >
            לא עבר
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => void exportPdf()}
            disabled={exporting}
          >
            {exporting ? "מייצא…" : "ייצוא PDF"}
          </button>
        </div>
        <textarea
          className={fieldClass}
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={async () => {
            await agamFetch(`/api/agam/candidates/${candidate.id}`, {
              method: "PATCH",
              body: JSON.stringify({ ramad_notes: notes }),
            });
          }}
          placeholder="הערות רמ״ד"
        />
        <p className="text-sm text-text-muted">סטטוס נוכחי: {STATUS_LABELS[candidate.status]}</p>
      </div>

      <div ref={reportRef} className="space-y-4 rounded-3xl bg-white p-8 text-black">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-2xl font-extrabold">{org?.unit_name ?? "איתור קציני דת"}</p>
            <p className="text-sm">דוח מועמד</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org?.logo_url || "/logo-mador-omtz.png"}
            alt={org?.unit_name ?? "איתור קציני דת"}
            className="h-14 object-contain"
          />
        </div>
        <div>
          <p>
            <strong>שם:</strong> {candidate.full_name}
          </p>
          <p dir="ltr">
            <strong>מספר אישי:</strong> {candidate.personal_number}
          </p>
          <p>
            <strong>סטטוס:</strong> {STATUS_LABELS[candidate.status]}
          </p>
        </div>
        <div>
          <h3 className="font-bold">ראיונות</h3>
          {interviews.map((interview) => (
            <p key={interview.id} className="text-sm">
              {interview.evaluator_name}: {interview.recommendation ?? "—"}
            </p>
          ))}
        </div>
        <div>
          <h3 className="font-bold">הערכות יום מיונים</h3>
          {dayEvals.map((evaluation) => (
            <p key={evaluation.id} className="text-sm">
              {evaluation.evaluator_name}: משוקלל {evaluation.weighted_score ?? "—"} / סופי{" "}
              {evaluation.final_score ?? "—"}
            </p>
          ))}
        </div>
        <div>
          <h3 className="font-bold">הערות</h3>
          <p className="whitespace-pre-wrap text-sm">{notes || "—"}</p>
        </div>
        <div className="pt-10 text-sm">חתימה: ______________________</div>
      </div>
    </div>
  );
}
