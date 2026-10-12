import { useEffect, useState } from 'react';
import { X, Heart, Clock, Check } from 'lucide-react';
import { db, uid } from '@/lib/db';

// Official YouTube embed (youtube-nocookie) — permitted playback. No audio extraction.
export default function YoutubeModal({ video, onClose }) {
  const [fav, setFav] = useState(false);
  const [savedRecent, setSavedRecent] = useState(false);

  useEffect(() => {
    if (!video) return;
    db.all('favorites').then(fs => setFav(fs.some(f => f.id === video.videoId)));
    db.put('recent', { id: video.videoId, ...video, viewedAt: Date.now() }).then(() => setSavedRecent(true));
  }, [video]);

  if (!video) return null;

  const toggleFav = async () => {
    const favs = await db.all('favorites');
    if (favs.some(f => f.id === video.videoId)) {
      await db.remove('favorites', video.videoId); setFav(false);
    } else {
      await db.put('favorites', { id: video.videoId, ...video, savedAt: Date.now() }); setFav(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-video bg-black">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-heading text-xl font-semibold leading-snug">{video.title}</h3>
            <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{video.channel}</p>
          <div className="flex items-center gap-2">
            <button onClick={toggleFav} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition ${fav ? 'gold-border text-primary' : 'border-border text-muted-foreground'}`}>
              <Heart className={`w-4 h-4 ${fav ? 'fill-primary text-primary' : ''}`} /> {fav ? 'Favorited' : 'Add to favorites'}
            </button>
            {savedRecent && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Saved to recently viewed <Check className="w-3.5 h-3.5 text-primary" /></span>}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-secondary/50 text-xs text-muted-foreground leading-relaxed">
            Playback uses YouTube's official embedded player. Audio extraction and downloads from YouTube are not available — YouTube's terms prohibit them.
          </div>
        </div>
      </div>
    </div>
  );
}