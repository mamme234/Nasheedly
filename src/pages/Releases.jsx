import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Loader2, Tag, Rocket, RefreshCw, Check, ExternalLink, AlertTriangle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Releases() {
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selected, setSelected] = useState(null); // {owner, name, default_branch}
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [autoNotes, setAutoNotes] = useState(true);
  const [notes, setNotes] = useState('');
  const [prerelease, setPrerelease] = useState(false);
  const [draft, setDraft] = useState(false);

  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true); setError(null);
    try {
      const res = await base44.functions.invoke('githubReleases', { action: 'listRepos' });
      setRepos(res.data.items || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load your repositories.');
    } finally { setLoadingRepos(false); }
  }, []);

  useEffect(() => { loadRepos(); }, [loadRepos]);

  const loadTags = useCallback(async (owner, name) => {
    setLoadingTags(true);
    try {
      const res = await base44.functions.invoke('githubReleases', { action: 'listTags', owner, repo: name });
      setTags(res.data.items || []);
    } catch { setTags([]); }
    finally { setLoadingTags(false); }
  }, []);

  const pickRepo = (r) => {
    setSelected(r);
    setResult(null); setError(null); setNotes(''); setVersion(''); setTitle('');
    loadTags(r.owner, r.name);
  };

  const suggestNext = () => {
    const last = tags[0]?.name?.match(/(\d+)\.(\d+)\.(\d+)/);
    if (last) {
      const [maj, min, patch] = [parseInt(last[1]), parseInt(last[2]), parseInt(last[3])];
      setVersion(`v${maj}.${min}.${patch + 1}`);
    } else {
      setVersion('v1.0.0');
    }
  };

  const preview = async () => {
    if (!selected || !version) return;
    setPreviewing(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke('githubReleases', {
        action: 'previewNotes', owner: selected.owner, repo: selected.name,
        tag: version, target: selected.default_branch,
      });
      setNotes(res.data.body || '');
      if (res.data.name && !title) setTitle(res.data.name);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not generate notes. The tag may not exist yet — GitHub still previews notes from the target branch.');
    } finally { setPreviewing(false); }
  };

  const publish = async () => {
    if (!selected || !version) return;
    setPublishing(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke('githubReleases', {
        action: 'createRelease', owner: selected.owner, repo: selected.name,
        tag: version, name: title || version, target: selected.default_branch,
        autoNotes, body: notes, draft, prerelease,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create release.');
    } finally { setPublishing(false); }
  };

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="font-heading text-4xl font-bold gold-text">Release Notes</h1>
        <p className="text-muted-foreground mt-1 text-sm">Publish GitHub releases with auto-generated notes for new app versions.</p>
      </header>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{error}</span>
        </div>
      )}

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Repository</h2>
          <button onClick={loadRepos} className="ml-auto text-muted-foreground hover:text-primary"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {loadingRepos ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repositories found on your connected GitHub account.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {repos.map(r => {
              const active = selected?.id === r.id;
              return (
                <button key={r.id} onClick={() => pickRepo(r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${active ? 'border-primary/50 bg-accent/40' : 'border-border hover:border-primary/30'}`}>
                  <span className="w-9 h-9 rounded-lg gold-sheen flex items-center justify-center text-black shrink-0"><GitBranch className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.full_name}</div>
                    {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                  </div>
                  {r.private && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">private</span>}
                  {active && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-3xl border border-border bg-card p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading text-lg font-semibold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Existing tags</h2>
              {loadingTags ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> :
                tags.length > 0 && <span className="text-xs text-muted-foreground">latest: {tags[0].name}</span>}
            </div>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags yet — this will be the first release.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 12).map(t => (
                  <span key={t.name} className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground">{t.name}</span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">New version tag</label>
            <div className="flex gap-2">
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.2.0"
                className="flex-1 h-11 px-4 rounded-xl bg-secondary border border-border text-sm focus:border-primary/60 focus:outline-none" />
              <button onClick={suggestNext} className="h-11 px-4 rounded-xl border border-border text-sm flex items-center gap-1.5 hover:border-primary/40"><Sparkles className="w-4 h-4" /> Suggest</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Release title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={version || 'Release title'}
              className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-sm focus:border-primary/60 focus:outline-none" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Release notes</label>
              <button onClick={() => setAutoNotes(a => !a)} className={`text-xs px-3 py-1.5 rounded-full border transition ${autoNotes ? 'gold-border text-primary' : 'border-border text-muted-foreground'}`}>
                {autoNotes ? 'Auto-generate' : 'Custom'}
              </button>
            </div>
            {autoNotes ? (
              <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-xl bg-secondary/50">GitHub will auto-generate notes from commits since the last release. Click Preview to see them before publishing.</p>
            ) : (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={7} placeholder="Describe what's new..."
                className="w-full p-3 rounded-xl bg-secondary border border-border text-sm focus:border-primary/60 focus:outline-none resize-y" />
            )}
          </div>

          {autoNotes && notes && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="text-xs text-muted-foreground mb-2">Preview (auto-generated):</div>
              <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">{notes}</pre>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPrerelease(p => !p)} className={`text-xs px-3 py-2 rounded-full border transition ${prerelease ? 'gold-border text-primary' : 'border-border text-muted-foreground'}`}>Pre-release</button>
            <button onClick={() => setDraft(d => !d)} className={`text-xs px-3 py-2 rounded-full border transition ${draft ? 'gold-border text-primary' : 'border-border text-muted-foreground'}`}>Save as draft</button>
          </div>

          <div className="flex gap-2">
            {autoNotes && (
              <button onClick={preview} disabled={previewing || !version}
                className="flex-1 h-12 rounded-xl border border-border text-sm flex items-center justify-center gap-2 hover:border-primary/40 disabled:opacity-50">
                {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Preview
              </button>
            )}
            <button onClick={publish} disabled={publishing || !version}
              className="flex-[2] h-12 rounded-xl gold-sheen text-black font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />} Publish release
            </button>
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-3xl border border-primary/30 bg-accent/30 p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full gold-sheen flex items-center justify-center text-black"><Check className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{result.name}</div>
              <div className="text-sm text-muted-foreground">Release {result.tag_name} created</div>
            </div>
            <a href={result.html_url} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-xl border border-border text-sm flex items-center gap-1.5 hover:border-primary/40">
              <ExternalLink className="w-4 h-4" /> View
            </a>
          </div>
        </section>
      )}
    </div>
  );
}