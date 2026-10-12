import { useEffect, useState } from 'react';
import { Moon, Sun, Trash2, Database, Shield, KeyRound, HardDrive, Music2, Heart, Clock, ListMusic as ListIcon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { db, formatBytes } from '@/lib/db';

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [counts, setCounts] = useState({ tracks: 0, favorites: 0, recent: 0, playlists: 0, bytes: 0 });
  const [storage, setStorage] = useState(null);

  const load = async () => {
    const [tracks, favorites, recent, playlists] = await Promise.all([db.all('tracks'), db.all('favorites'), db.all('recent'), db.all('playlists')]);
    const bytes = tracks.reduce((s, t) => s + (t.size || 0), 0);
    setCounts({ tracks: tracks.length, favorites: favorites.length, recent: recent.length, playlists: playlists.length, bytes });
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); setStorage(e); }
  };
  useEffect(() => { load(); }, []);

  const clear = async (store, label) => {
    if (!window.confirm(`Remove all ${label}? This cannot be undone.`)) return;
    await db.clear(store); load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="pt-2">
        <h1 className="font-heading text-4xl font-bold gold-text">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Appearance, storage and privacy.</p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold mb-4">Appearance</h2>
        <button onClick={toggle} className="w-full flex items-center justify-between p-4 rounded-2xl border border-border hover:border-primary/30">
          <span className="flex items-center gap-3">{theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}<span className="text-sm">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</span></span>
          <span className="relative w-12 h-7 rounded-full bg-secondary border border-border">
            <span className={`absolute top-0.5 w-6 h-6 rounded-full gold-sheen transition-all ${theme === 'dark' ? 'left-0.5' : 'left-[1.375rem]'}`} />
          </span>
        </button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Storage</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Music2} label="Tracks" value={counts.tracks} />
          <Stat icon={ListIcon} label="Playlists" value={counts.playlists} />
          <Stat icon={Heart} label="Favorites" value={counts.favorites} />
          <Stat icon={Clock} label="Recently viewed" value={counts.recent} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><HardDrive className="w-4 h-4" /> Library size: {formatBytes(counts.bytes)}</div>
          {storage && <div className="flex items-center gap-2 text-muted-foreground"><Database className="w-4 h-4" /> Browser quota: {formatBytes(storage.usage)} of {formatBytes(storage.quota)} used</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          <button onClick={() => clear('tracks', 'tracks (converted & downloaded files)')} className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm hover:border-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /> Clear library</button>
          <button onClick={() => clear('favorites', 'favorites')} className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm hover:border-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /> Clear favorites</button>
          <button onClick={() => clear('recent', 'recently viewed')} className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm hover:border-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /> Clear recent</button>
          <button onClick={() => clear('playlists', 'playlists')} className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-sm hover:border-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /> Clear playlists</button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Privacy & sources</h2>
        <p><KeyRound className="w-4 h-4 inline mr-1.5 text-primary" />YouTube discovery uses the official YouTube Data API and plays via YouTube's embedded player. The API key is kept on the server, never in the app.</p>
        <p>Audio extraction or downloading from YouTube is <strong className="text-foreground">not</strong> available — it is prohibited by YouTube's terms of service.</p>
        <p>MP4→MP3 conversion runs entirely in your browser. Selected videos never leave your device and no upload occurs.</p>
        <p>Downloads are supported only for audio sources that explicitly permit them. Converted and downloaded files persist locally across app restarts.</p>
      </section>

      <p className="text-center text-xs text-muted-foreground/60 pt-2">Ansab · Premium Nasheed · Built with FFmpeg (WASM)</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50">
      <span className="w-9 h-9 rounded-xl gold-sheen flex items-center justify-center text-black shrink-0"><Icon className="w-4 h-4" /></span>
      <div><div className="text-lg font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
    </div>
  );
}