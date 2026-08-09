import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { conceptId, action, approvalStep, rejectionReason } = await req.json();

    if (!conceptId || !action || !approvalStep) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch concept
    const concept = await base44.asServiceRole.entities.Concept.get(conceptId);
    if (!concept) {
      return Response.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Verify the approvalStep matches the current approval_status
    if (concept.approval_status !== approvalStep) {
      return Response.json({ 
        error: 'Approval step mismatch', 
        expected: approvalStep, 
        actual: concept.approval_status 
      }, { status: 400 });
    }

    const domain = concept.domain;
    if (!domain) {
      return Response.json({ error: 'Concept has no domain set' }, { status: 400 });
    }

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

    const flow = domainFlows[domain];
    if (!flow) {
      return Response.json({ error: 'Invalid domain' }, { status: 400 });
    }

    const currentIndex = flow.indexOf(concept.approval_status);
    if (currentIndex === -1) {
      return Response.json({ error: 'Invalid current approval status' }, { status: 400 });
    }

    let newStatus;
    let updateData = {};

    if (action === 'approve') {
      // Move to next step
      if (currentIndex < flow.length - 1) {
        newStatus = flow[currentIndex + 1];
        updateData = { approval_status: newStatus };
      } else {
        // Already approved
        return Response.json({ 
          message: 'Concept is already fully approved',
          approval_status: concept.approval_status
        });
      }
    } else if (action === 'reject') {
      // Reset to first step
      newStatus = flow[0];
      updateData = {
        approval_status: newStatus,
        work_status_article: 'planning',
        rejection_reason: rejectionReason || '',
        rejected_at_step: concept.approval_status,
        last_rejection_date: new Date().toISOString()
      };
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the concept
    await base44.asServiceRole.entities.Concept.update(conceptId, updateData);

    // Log the change
    const logData = {
      concept_id: conceptId,
      project_id: concept.project_id,
      action_type: 'approval_changed',
      field_changed: 'approval_status',
      old_value: concept.approval_status,
      new_value: newStatus,
      user_name: 'System',
      user_email: ''
    };
    
    // Add rejection reason to activity log if rejected
    if (action === 'reject' && rejectionReason) {
      logData.details = `דחה עם הסיבה: ${rejectionReason}`;
    }
    
    await base44.asServiceRole.entities.ActivityLog.create(logData);

    return Response.json({ 
      success: true, 
      approval_status: newStatus,
      message: action === 'approve' ? 'אושר בהצלחה' : 'נדחה - חזר לתחילת התהליך'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});