import React from 'react';
import { CheckCircle2, Circle, Clock, Copy, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

const stepLabels = {
  waiting_branch_head: 'רמ״ח',
  waiting_deputy_commander: 'רמ״ט',
  waiting_chief_rabbi: 'רבצ״ר',
  approved: 'אושר'
};

const domainFlows = {
  kashrut: ['waiting_branch_head', 'waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  halacha: ['waiting_branch_head', 'waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  reut: ['waiting_branch_head', 'waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  tipuch: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  lehaka: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  zuq: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  masan: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  agam_hachsharot: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  logistic: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved'],
  field: ['waiting_deputy_commander', 'waiting_chief_rabbi', 'approved']
};

export default function ApprovalTimeline({ domain, currentStatus, isAdmin, onStatusChange, conceptId, rejectionReason, rejectedAtStep }) {
  const flowSteps = domainFlows[domain] || domainFlows.kashrut;
  const steps = flowSteps.map(id => ({ id, label: stepLabels[id] }));
  
  const getCurrentIndex = () => {
    const index = steps.findIndex(s => s.id === currentStatus);
    return index === -1 ? 0 : index;
  };
  
  const currentIndex = getCurrentIndex();
  
  const getStepStatus = (index) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  const copyApprovalCode = (stepId) => {
    const approvalCode = `${conceptId}:${stepId}`;
    navigator.clipboard.writeText(approvalCode);
  };

  return (
    <div className="relative py-4">
      <div className="flex flex-col gap-0">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 relative"
            >
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div 
                  className={`absolute right-[15px] top-8 w-0.5 h-12 ${
                    stepStatus === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
              
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                {stepStatus === 'completed' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                ) : stepStatus === 'current' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Circle className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-8 flex items-start justify-between gap-3">
                <div 
                  className={`flex-1 ${isAdmin ? 'cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors' : ''}`}
                  onClick={() => {
                    if (isAdmin && onStatusChange) {
                      if (stepStatus === 'completed') {
                        // If already completed, clicking returns to this step (cancels everything after)
                        onStatusChange(step.id);
                      } else {
                        // If current or pending, approve up to and including this step
                        const nextStepId = index < steps.length - 1 ? steps[index + 1].id : 'approved';
                        onStatusChange(nextStepId);
                      }
                    }
                  }}
                >
                  <p className={`font-medium ${
                    stepStatus === 'completed' ? 'text-emerald-700' : 
                    stepStatus === 'current' ? 'text-blue-700' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </p>
                  {stepStatus === 'current' && (
                    <p className="text-xs text-slate-500 mt-1">ממתין לאישור - לחץ לאשר</p>
                  )}
                  {isAdmin && stepStatus === 'completed' && (
                    <p className="text-xs text-emerald-600 mt-1">אושר ✓ - לחץ לבטל</p>
                  )}
                  {isAdmin && stepStatus === 'pending' && (
                    <p className="text-xs text-slate-400 mt-1">לחץ לאשר עד כאן</p>
                  )}
                  {rejectionReason && rejectedAtStep === step.id && (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-md p-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-800">
                        <span className="font-semibold">נדחה בשלב זה:</span> {rejectionReason}
                      </div>
                    </div>
                  )}
                </div>
                {step.id !== 'approved' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyApprovalCode(step.id);
                    }}
                    title = "העתק קוד לאישור"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}