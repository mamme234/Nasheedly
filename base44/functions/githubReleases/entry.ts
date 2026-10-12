import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const API = 'https://api.github.com';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    if (!accessToken) return Response.json({ error: 'GitHub is not connected' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Base44-App',
    };

    // List the builder's repositories (most recently updated first)
    if (action === 'listRepos') {
      const res = await fetch(`${API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return Response.json({ error: err.message || `GitHub API error: ${res.status}` }, { status: 502 });
      }
      const repos = await res.json();
      const items = repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: r.owner?.login,
        private: r.private,
        default_branch: r.default_branch,
        pushed_at: r.pushed_at,
        description: r.description,
      }));
      return Response.json({ items });
    }

    // Validate repo params shared by the tag/release actions
    const owner = (body.owner || '').trim();
    const repo = (body.repo || '').trim();
    if (!owner || !repo) return Response.json({ error: 'owner and repo are required' }, { status: 400 });

    // List existing tags (so the UI can suggest the next version)
    if (action === 'listTags') {
      const res = await fetch(`${API}/repos/${owner}/${repo}/tags?per_page=50`, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return Response.json({ error: `GitHub API error: ${res.status}` }, { status: 502 });
      const tags = await res.json();
      return Response.json({ items: tags.map((t: any) => ({ name: t.name, commit: t.commit?.sha })) });
    }

    // Preview auto-generated release notes for a not-yet-created tag
    if (action === 'previewNotes') {
      const tag = (body.tag || '').trim();
      if (!tag) return Response.json({ error: 'tag is required' }, { status: 400 });
      const res = await fetch(`${API}/repos/${owner}/${repo}/releases/generate-notes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: tag,
          target_commitish: body.target || undefined,
          previous_tag_name: body.previousTag || undefined,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data.message || `GitHub API error: ${res.status}` }, { status: 502 });
      return Response.json({ name: data.name, body: data.body });
    }

    // Create a release (and the tag if it doesn't exist yet)
    if (action === 'createRelease') {
      const tag = (body.tag || '').trim();
      if (!tag) return Response.json({ error: 'tag is required' }, { status: 400 });
      const payload: any = {
        tag_name: tag,
        name: body.name || tag,
        target_commitish: body.target || undefined,
        draft: !!body.draft,
        prerelease: !!body.prerelease,
      };
      if (body.autoNotes) {
        payload.generate_release_notes = true;
      } else {
        payload.body = body.body || '';
      }
      const res = await fetch(`${API}/repos/${owner}/${repo}/releases`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data.message || `GitHub API error: ${res.status}` }, { status: 502 });
      return Response.json({
        id: data.id,
        html_url: data.html_url,
        tag_name: data.tag_name,
        name: data.name,
        body: data.body,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}