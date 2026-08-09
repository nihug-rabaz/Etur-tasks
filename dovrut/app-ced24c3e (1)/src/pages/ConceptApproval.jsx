import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ApprovalSearchBox from '@/components/ApprovalSearchBox';
import ConceptApprovalDetails from '@/components/ConceptApprovalDetails';

export default function ConceptApproval() {
  const [conceptCode, setConceptCode] = useState('');
  const [concept, setConcept] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchConcept = async () => {
    if (!conceptCode.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parse code format: conceptId or conceptId:approvalStep
      const parts = conceptCode.trim().split(':');
      const conceptIdPart = parts[0];
      const approvalStepPart = parts[1] || null;
      
      const response = await base44.functions.invoke('getConceptForApproval', { conceptId: conceptIdPart });
      const data = response.data;
      
      // If a specific approval step was provided, validate it
      if (approvalStepPart) {
        if (data.concept.approval_status !== approvalStepPart) {
          setError('הקוד אינו תקף עבור השלב הנוכחי של הקונספט.');
          setConcept(null);
          setProject(null);
          setLoading(false);
          return;
        }
      }
      
      setConcept(data.concept);
      setProject(data.project);
    } catch (err) {
      setError('קונספט לא נמצא. נא לבדוק את הקוד ולנסות שוב.');
      setConcept(null);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConcept(null);
    setProject(null);
    setConceptCode('');
    setError(null);
  };

  return (
    <div className="page-shell p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {!concept && (
          <ApprovalSearchBox
            conceptCode={conceptCode}
            setConceptCode={setConceptCode}
            onSearch={searchConcept}
            loading={loading}
            error={error}
          />
        )}

        {concept && (
          <ConceptApprovalDetails
            concept={concept}
            project={project}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}