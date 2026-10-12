import { useEffect, useCallback, useState } from 'react';
import { Search, Loader2, AlertCircle, Clock, Heart, RefreshCw, Trash2, Flame } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { db } from '@/lib/db';
import NasheedCard from '@/components/NasheedCard';
import YoutubeModal from '@/components/YoutubeModal';

export default function Discover() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selected, setSelected] = useState(null);

  const search = useCallback(async (q, token) => {
    setError(null);
    if (token) setLoadingMore(true); else { setLoading(true); setItems([]); }
    try {
      const res = await base44.functions.invoke('youtubeSearch', { query: q, pageToken: token });
      const data = res.data;
      if (data.error) throw new Error(data.error);
      setItems(prev => token ? [...prev, ...(data.items || [])] : (data.items || []));
      setNextPage(data.nextPageToken || null);
    } catch (e) {
      setError(e.message || 'Search failed. Check your connection or API key.');
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, []);

  useEffect(() => { search(''); }, [search]);
  useEffect(() => { db.all('recent').then(r => setRecent([...r].sort((a,b)=>b.viewedAt-a.viewedAt).slice(0,12))); }, []);
  useEffect(() => { db.all('favorites').then(f => setFavorites(f)); }, [selected]);

  const onSubmit = (e) => { e.preventDefault(); setQuery(input); search(input); };
  const clearRecent = async () => { await db.clear('recent'); setRecent([]); };

  return (
    <div className="space-y-8">
      <section className="text-center pt-2">
        <h1 className="font-heading text-4xl font-bold gold-text">Discover Nasheeds</h1>
        <p className="text-muted-foreground mt-2 text-sm">Search titles, artists, and channels via YouTube.</p>
        <form onSubmit={onSubmit} className="mt-5 max-w-xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Search nasheeds, artists, channels..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-card border border-border focus:border-primary/60 focus:outline-none text-sm" />
          </div>
          <button type="submit" className="h-12 px-6 rounded-full gold-sheen text-black font-medium text-sm disabled:opacity-50" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</button>
        </form>
      </section>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-destructive">Search unavailable</div>
            <div className="text-muted-foreground mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {favorites.length > 0 && (
        <section>
          <SectionHeader icon={Heart} title="Favorites" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {favorites.slice(0, 8).map(f => <NasheedCard key={f.id} item={f} onPlay={setSelected} />)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Clock} title="Recently viewed" inline />
            <button onClick={clearRecent} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recent.map(r => (
              <button key={r.id} onClick={() => setSelected(r)} className="shrink-0 w-36 rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 text-left">
                <div className="aspect-video bg-secondary"><img src={r.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                <div className="p-2.5"><div className="text-xs font-medium line-clamp-2 min-h-[2rem]">{r.title}</div><div className="text-[10px] text-muted-foreground truncate mt-1">{r.channel}</div></div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader icon={Flame} title={query ? `Results for "${query}"` : 'Trending nasheeds'} />
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : items.length === 0 && !error ? (
          <EmptyState text="No results found. Try a different search." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(it => <NasheedCard key={it.videoId} item={it} onPlay={setSelected} />)}
            </div>
            {nextPage && (
              <div className="flex justify-center mt-6">
                <button onClick={() => search(query, nextPage)} disabled={loadingMore} className="h-11 px-6 rounded-full border border-border text-sm flex items-center gap-2 hover:border-primary/40 disabled:opacity-50">
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Load more
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && <YoutubeModal video={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, inline }) {
  return (
    <div className={`flex items-center gap-2 ${inline ? 'mb-0' : 'mb-3'}`}>
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-center py-16 text-muted-foreground text-sm">{text}</div>;
}