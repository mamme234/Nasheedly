import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Trash2, ListMusic, Heart, X, Library as LibIcon, ArrowLeft, Music2 } from 'lucide-react';
import { db, uid, sanitizeName } from '@/lib/db';
import { usePlayer } from '@/lib/playerStore';
import TrackRow from '@/components/TrackRow';

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'duration', label: 'Longest' },
];

export default function Library() {
  const { playTrack, current, isPlaying, togglePlay } = usePlayer();
  const [tab, setTab] = useState('tracks');
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [favOnly, setFavOnly] = useState(false);
  const [openPlaylist, setOpenPlaylist] = useState(null);

  const reload = useCallback(async () => {
    setTracks(await db.all('tracks'));
    setPlaylists(await db.all('playlists'));
  }, []);
  useEffect(() => { reload(); const id = setInterval(reload, 1500); return () => clearInterval(id); }, [reload]);

  const filtered = [...tracks]
    .filter(t => !favOnly || t.favorite)
    .filter(t => !search || (t.title + ' ' + (t.artist || '')).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'duration') return (b.duration || 0) - (a.duration || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const play = (track) => {
    if (current?.id === track.id) { togglePlay(); return; }
    playTrack(track, filtered, filtered.indexOf(track));
  };
  const toggleFav = async (t) => { await db.put('tracks', { ...t, favorite: !t.favorite }); reload(); };
  const rename = async (t) => {
    const name = window.prompt('Rename track', t.title);
    if (name && name.trim()) { await db.put('tracks', { ...t, title: sanitizeName(name.trim()) }); reload(); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    await db.remove('tracks', t.id);
    for (const p of playlists) {
      if (p.trackIds?.includes(t.id)) await db.put('playlists', { ...p, trackIds: p.trackIds.filter(id => id !== t.id) });
    }
    reload();
  };
  const addToPlaylist = async (trackId, playlistId) => {
    const p = playlists.find(x => x.id === playlistId);
    if (!p) return;
    if (p.trackIds?.includes(trackId)) return;
    await db.put('playlists', { ...p, trackIds: [...(p.trackIds || []), trackId] });
    reload();
  };
  const createPlaylist = async () => {
    const name = window.prompt('Playlist name');
    if (!name?.trim()) return;
    await db.put('playlists', { id: uid(), name: name.trim(), trackIds: [], createdAt: Date.now() });
    reload();
  };
  const deletePlaylist = async (p) => {
    if (!window.confirm(`Delete playlist "${p.name}"?`)) return;
    await db.remove('playlists', p.id);
    if (openPlaylist?.id === p.id) setOpenPlaylist(null);
    reload();
  };
  const removeFromPlaylist = async (playlist, trackId) => {
    await db.put('playlists', { ...playlist, trackIds: playlist.trackIds.filter(id => id !== trackId) });
    reload();
  };

  if (openPlaylist) {
    const plistTracks = (openPlaylist.trackIds || []).map(id => tracks.find(t => t.id === id)).filter(Boolean);
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenPlaylist(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="flex items-center justify-between">
          <div><h1 className="font-heading text-3xl font-bold gold-text">{openPlaylist.name}</h1><p className="text-sm text-muted-foreground mt-1">{plistTracks.length} tracks</p></div>
          <button onClick={() => deletePlaylist(openPlaylist)} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
        </div>
        {plistTracks.length === 0 ? <Empty icon={Music2} text="This playlist is empty. Add tracks from the tracks tab." /> : (
          <div className="space-y-2">
            {plistTracks.map(t => {
              const isCur = current?.id === t.id;
              return <TrackRow key={t.id} track={t} isCurrent={isCur} isPlaying={isCur && isPlaying}
                onPlay={() => play(t)} onToggleFav={() => toggleFav(t)} onRename={() => rename(t)} onDelete={() => remove(t)}
                playlists={playlists.filter(p => p.id !== openPlaylist.id)} onAddToPlaylist={(pid) => addToPlaylist(t.id, pid)} />;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="font-heading text-4xl font-bold gold-text">My Library</h1>
        <p className="text-muted-foreground mt-1 text-sm">Offline tracks, converted MP3s, favorites & playlists.</p>
      </header>

      <div className="flex items-center gap-2 p-1 rounded-full bg-card border border-border w-fit">
        <TabBtn active={tab === 'tracks'} onClick={() => setTab('tracks')} icon={LibIcon} label="Tracks" count={tracks.length} />
        <TabBtn active={tab === 'playlists'} onClick={() => setTab('playlists')} icon={ListMusic} label="Playlists" count={playlists.length} />
      </div>

      {tab === 'tracks' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your library..."
                className="w-full h-11 pl-11 pr-4 rounded-full bg-card border border-border focus:border-primary/60 focus:outline-none text-sm" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="h-11 px-4 rounded-full bg-card border border-border text-sm">
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={() => setFavOnly(f => !f)} className={`h-11 px-4 rounded-full border text-sm flex items-center gap-2 ${favOnly ? 'gold-border text-primary' : 'border-border text-muted-foreground'}`}>
              <Heart className={`w-4 h-4 ${favOnly ? 'fill-primary' : ''}`} /> Favorites
            </button>
          </div>

          {filtered.length === 0 ? (
            <Empty icon={tracks.length === 0 ? Music2 : Search} text={tracks.length === 0 ? 'Your library is empty. Convert a video or download audio to get started.' : 'No tracks match your filters.'} />
          ) : (
            <div className="space-y-2">
              {filtered.map(t => {
                const isCur = current?.id === t.id;
                return <TrackRow key={t.id} track={t} isCurrent={isCur} isPlaying={isCur && isPlaying}
                  onPlay={() => play(t)} onToggleFav={() => toggleFav(t)} onRename={() => rename(t)} onDelete={() => remove(t)}
                  playlists={playlists} onAddToPlaylist={(pid) => addToPlaylist(t.id, pid)} />;
              })}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <button onClick={createPlaylist} className="w-full h-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <Plus className="w-5 h-5" /> Create playlist
          </button>
          {playlists.length === 0 ? (
            <Empty icon={ListMusic} text="No playlists yet. Create one to organize your tracks." />
          ) : playlists.map(p => {
            const count = (p.trackIds || []).length;
            return (
              <button key={p.id} onClick={() => setOpenPlaylist(p)} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 text-left">
                <span className="w-12 h-12 rounded-xl gold-sheen flex items-center justify-center text-black"><ListMusic className="w-6 h-6" /></span>
                <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-muted-foreground">{count} track{count !== 1 ? 's' : ''}</div></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button onClick={onClick} className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm transition ${active ? 'gold-sheen text-black font-medium' : 'text-muted-foreground'}`}>
      <Icon className="w-4 h-4" /> {label} {count > 0 && <span className={active ? 'text-black/60' : 'text-muted-foreground/60'}>{count}</span>}
    </button>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="w-14 h-14 rounded-2xl border border-border flex items-center justify-center text-muted-foreground"><Icon className="w-7 h-7" /></span>
      <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
    </div>
  );
}