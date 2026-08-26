import React from 'react';
import Summary from '@/pages/Summary';

export default function FinalDecisionStage({ cid }) {
  return <Summary candidateId={cid} embedded />;
}