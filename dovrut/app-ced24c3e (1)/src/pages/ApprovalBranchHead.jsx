import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ConceptApprovalDetails from '@/components/ConceptApprovalDetails';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

export default function ApprovalBranchHead() {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const { data: concepts = [], isLoading, error } = useQuery({
    queryKey: ['waiting_branch_head_concepts'],
    queryFn: async () => {
      const allConcepts = await base44.entities.Concept.list();
      return allConcepts.filter(c => c.approval_status === 'waiting_branch_head');
    }
  });

  const handleSelectConcept = async (concept) => {
    const project = await base44.entities.Project.get(concept.project_id);
    setSelectedConcept(concept);
    setSelectedProject(project);
  };

  const handleReset = () => {
    setSelectedConcept(null);
    setSelectedProject(null);
  };

  if (selectedConcept) {
    return (
      <ConceptApprovalDetails
        concept={selectedConcept}
        project={selectedProject}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="page-shell p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-black text-text-primary text-center">
              סביבת אישור רמ״ח
            </CardTitle>
            <p className="text-text-secondary text-center mt-2">
              קונספטים ממתינים לאישור
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-red-700">
                אירעה שגיאה בטעינת הקונספטים
              </CardContent>
            </Card>
          )}

          {concepts.length === 0 && !isLoading && (
            <Card>
              <CardContent className="pt-6 text-center text-text-secondary">
                אין קונספטים ממתינים לאישור כרגע
              </CardContent>
            </Card>
          )}

          {concepts.map(concept => (
            <Card 
              key={concept.id} 
              className="cursor-pointer hover:shadow-2xl transition-shadow"
              onClick={() => handleSelectConcept(concept)}
            >
              <CardContent className="pt-6">
                <p className="text-lg font-semibold text-text-primary">{concept.name}</p>
                <p className="text-sm text-text-secondary mt-2">תחום: {concept.domain}</p>
                <p className="text-sm text-text-secondary">סוג: {concept.type === 'article_interview' ? 'כתבה/ראיון' : 'מדיה חברתית'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}