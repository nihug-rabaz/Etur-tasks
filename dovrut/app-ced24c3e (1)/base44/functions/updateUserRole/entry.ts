import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, data } = await req.json();

    if (!userId || !data) {
      return Response.json({ error: 'Missing userId or data' }, { status: 400 });
    }

    // Prevent self-demotion edge cases — still allow, but block self role change
    if (userId === currentUser.id) {
      return Response.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const updatedUser = await base44.asServiceRole.entities.User.update(userId, data);
    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});