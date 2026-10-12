import { Play, Eye } from 'lucide-react';

export default function NasheedCard({ item, onPlay }) {
  return (
    <button onClick={() => onPlay(item)} className="group text-left rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:-translate-y-0.5">
      <div className="relative aspect-video bg-secondary overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Play /></div>}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <span className="w-12 h-12 rounded-full gold-sheen flex items-center justify-center text-black"><Play className="w-5 h-5 ml-0.5" /></span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">{item.title}</div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" /> {item.channel}
        </div>
      </div>
    </button>
  );
}