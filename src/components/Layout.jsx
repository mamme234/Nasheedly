import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search, Repeat, Library, Settings, Moon, Sun, Rocket } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import MiniPlayer from '@/components/MiniPlayer';

const nav = [
  { to: '/', label: 'Discover', icon: Search },
  { to: '/converter', label: 'Convert', icon: Repeat },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/releases', label: 'Releases', icon: Rocket },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl gold-sheen flex items-center justify-center glow-gold">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black/80" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
            </span>
            <div className="leading-none">
              <div className="font-heading text-2xl font-bold gold-text tracking-wide">Ansab</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Premium Nasheed</div>
            </div>
          </Link>
          <button onClick={toggle} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 pt-6 pb-40">
        <Outlet />
      </main>

      <MiniPlayer />

      <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
        <div className="mx-auto max-w-5xl px-2 flex items-center justify-around h-16">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link key={to} to={to} className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-[11px] transition-colors">
                <span className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'gold-sheen text-black' : 'text-muted-foreground'}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className={active ? 'text-primary font-medium' : 'text-muted-foreground'}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}