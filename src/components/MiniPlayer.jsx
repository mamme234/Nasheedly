import { Play, Pause, SkipForward, X } from 'lucide-react';
import { usePlayer } from '@/lib/playerStore';
import { formatTime } from '@/lib/db';

export default function MiniPlayer() {
  const { current, isPlaying, togglePlay, next, currentTime, duration, setExpanded, stop } = usePlayer();
  if (!current) return null;
  const pct = duration ? (currentTime / duration) * 100 : 0;
  return (
    <div className="fixed bottom-16 inset-x-0 z-30 px-3">
      <div className="mx-auto max-w-5xl glass border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-2.5">
          <button onClick={() => setExpanded(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="w-11 h-11 rounded-xl gold-sheen flex items-center justify-center shrink-0 overflow-hidden">
              {current.artwork ? <img src={current.artwork} alt="" className="w-full h-full object-cover" /> : <Play className="w-5 h-5 text-black/70" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{current.title}</div>
              <div className="text-xs text-muted-foreground truncate">{current.artist || 'Local track'} · {formatTime(currentTime)} / {formatTime(duration)}</div>
            </div>
          </button>
          <button onClick={togglePlay} className="w-10 h-10 rounded-full gold-sheen flex items-center justify-center text-black shrink-0">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={next} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary shrink-0">
            <SkipForward className="w-4 h-4" />
          </button>
          <button onClick={stop} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-0.5 bg-border">
          <div className="h-full gold-sheen transition-all" style={{ width: pct + '%' }} />
        </div>
      </div>
    </div>
  );
}