import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const { conceptId } = await req.json();

        if (!conceptId) {
            return Response.json({ error: 'Missing conceptId' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        
        const concepts = await base44.asServiceRole.entities.Concept.filter({ id: conceptId });
        const concept = concepts[0];

        if (!concept) {
            return Response.json({ error: 'Concept not found' }, { status: 404 });
        }

        let project = null;
        if (concept.project_id) {
            const projects = await base44.asServiceRole.entities.Project.filter({ id: concept.project_id });
            project = projects[0];
        }

        return Response.json({ concept, project });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});