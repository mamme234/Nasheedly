import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, ListMusic, Heart } from 'lucide-react';
import { usePlayer } from '@/lib/playerStore';
import { formatTime } from '@/lib/db';
import Waveform from '@/components/Waveform';

export default function FullPlayer() {
  const { current, isPlaying, togglePlay, next, prev, playIndex, seek, seekBy, volume, muted, changeVolume, toggleMute, currentTime, duration, error, queue, index, setExpanded, stop } = usePlayer();
  if (!current) return null;
  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in">
      <div className="flex items-center justify-between px-5 h-16 border-b border-border">
        <button onClick={() => setExpanded(false)} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary">
          <X className="w-5 h-5" />
        </button>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Now Playing</div>
        <button onClick={stop} className="text-sm text-muted-foreground hover:text-destructive">Stop</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center">
        <div className="w-56 h-56 rounded-3xl gold-sheen flex items-center justify-center glow-gold overflow-hidden mb-8">
          {current.artwork ? <img src={current.artwork} alt="" className="w-full h-full object-cover" /> : <Play className="w-20 h-20 text-black/50" />}
        </div>
        <div className="text-center mb-2 max-w-md">
          <h2 className="font-heading text-3xl font-semibold">{current.title}</h2>
          <p className="text-muted-foreground mt-1">{current.artist || 'Local track'}</p>
        </div>

        <div className="w-full max-w-md my-6">
          <Waveform height={72} />
        </div>

        {error && <div className="text-destructive text-sm mb-4 text-center">{error}</div>}

        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1" />
            <span>{formatTime(duration)}</span>
          </div>
          <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
            onChange={e => seek(Number(e.target.value))}
            className="w-full h-1.5 accent-gold-400 cursor-pointer" style={{ accentColor: '#D4AF37' }} />
        </div>

        <div className="flex items-center justify-center gap-6 my-8">
          <button onClick={() => seekBy(-10)} className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40">
            <SkipBack className="w-5 h-5" />
          </button>
          <button onClick={togglePlay} className="w-20 h-20 rounded-full gold-sheen flex items-center justify-center text-black glow-gold">
            {isPlaying ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
          </button>
          <button onClick={() => seekBy(10)} className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 rotate-180">
            <SkipBack className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full max-w-xs">
          <button onClick={toggleMute}>{muted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}</button>
          <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={e => changeVolume(Number(e.target.value))}
            className="flex-1 h-1.5" style={{ accentColor: '#D4AF37' }} />
        </div>

        {queue.length > 1 && (
          <div className="w-full max-w-md mt-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3"><ListMusic className="w-4 h-4" /> Queue</div>
            <div className="space-y-1.5">
              {queue.map((t, i) => (
                <button key={i} onClick={() => playIndex(i)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${i === index ? 'bg-accent' : 'hover:bg-secondary'}`}>
                  <span className={`w-6 text-xs ${i === index ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${i === index ? 'text-primary font-medium' : ''}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
                  </div>
                  {i === index && isPlaying && <Heart className="w-3.5 h-3.5 text-primary fill-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}