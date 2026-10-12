import { Play, Pause, Heart, Pencil, Trash2, ListPlus, Clock, Music, X } from 'lucide-react';
import { useState } from 'react';
import { usePlayer } from '@/lib/playerStore';
import { formatTime, formatBytes, sanitizeName } from '@/lib/db';

export default function TrackRow({ track, isCurrent, isPlaying, onPlay, onToggleFav, onRename, onDelete, onAddToPlaylist, playlists }) {
  const [menu, setMenu] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  return (
    <div className={`group flex items-center gap-3 p-3 rounded-2xl border transition ${isCurrent ? 'border-primary/40 bg-accent/30' : 'border-border bg-card hover:border-primary/20'}`}>
      <button onClick={onPlay} className="w-11 h-11 rounded-xl gold-sheen flex items-center justify-center text-black shrink-0">
        {isCurrent && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <button onClick={onPlay} className="flex-1 min-w-0 text-left">
        <div className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>{track.title}</div>
        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
          {track.type === 'converted' && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> Converted</span>}
          {track.type === 'downloaded' && <span>Downloaded</span>}
          {track.type === 'audio_url' && <span>Stream</span>}
          {track.duration && <span>· {formatTime(track.duration)}</span>}
          {track.size && <span>· {formatBytes(track.size)}</span>}
        </div>
      </button>
      <button onClick={onToggleFav} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${track.favorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
        <Heart className={`w-4 h-4 ${track.favorite ? 'fill-primary' : ''}`} />
      </button>
      <div className="relative">
        <button onClick={() => setMenu(m => !m)} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-popover shadow-xl py-1 text-sm">
              <button onClick={() => { onRename(); setMenu(false); }} className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-secondary"><Pencil className="w-4 h-4" /> Rename</button>
              <button onClick={() => { setAddMenu(true); setMenu(false); }} className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-secondary"><ListPlus className="w-4 h-4" /> Add to playlist</button>
              <button onClick={() => { onDelete(); setMenu(false); }} className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-secondary text-destructive"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </>
        )}
        {addMenu && (
          <div className="absolute right-0 top-10 z-30 w-52 rounded-xl border border-border bg-popover shadow-xl p-2 text-sm">
            <div className="flex items-center justify-between px-1 pb-2"><span className="text-xs text-muted-foreground">Add to playlist</span><button onClick={() => setAddMenu(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button></div>
            {playlists.length === 0 ? <div className="px-1 py-2 text-xs text-muted-foreground">No playlists yet.</div> : playlists.map(p => (
              <button key={p.id} onClick={() => { onAddToPlaylist(p.id); setAddMenu(false); }} className="w-full px-2 py-1.5 text-left rounded-lg hover:bg-secondary truncate">{p.name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}