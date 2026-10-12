import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

// Global audio engine for local files (converted MP3s, downloaded audio, direct URLs).
// YouTube discovery results are NOT routed here — they play via the official YouTube iframe.
export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const queueRef = useRef([]);
  const indexRef = useRef(-1);
  const nextRef = useRef(() => {});

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = index; }, [index]);

  const loadTrack = useCallback((track) => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setError(null);
    let src = track.url;
    if (!src && track.blob) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      src = URL.createObjectURL(track.blob);
      objectUrlRef.current = src;
    }
    if (!src) { setError('No playable source for this track.'); return; }
    audio.src = src;
    audio.volume = muted ? 0 : volume;
    audio.play().catch(() => setError('Unable to start playback. Tap play again.'));
    setCurrent(track);
    // Lock-screen / media session controls (Android Chrome + supported browsers)
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Unknown',
          artist: track.artist || 'Nasheed',
          album: 'Premium Nasheed',
          artwork: track.artwork ? [{ src: track.artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
      } catch (_) {}
    }
  }, [volume, muted]);

  const next = useCallback(() => {
    const q = queueRef.current, i = indexRef.current;
    if (i < q.length - 1) { const ni = i + 1; setIndex(ni); loadTrack(q[ni]); }
    else { audioRef.current?.pause(); setIsPlaying(false); }
  }, [loadTrack]);

  const prev = useCallback(() => {
    const i = indexRef.current;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0; return;
    }
    if (i > 0) { const ni = i - 1; setIndex(ni); loadTrack(queueRef.current[ni]); }
  }, [loadTrack]);

  useEffect(() => { nextRef.current = next; }, [next]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    setReady(true);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onErr = () => { setError('Playback failed — the source may be unsupported or corrupted.'); setIsPlaying(false); };
    const onEnd = () => nextRef.current();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('durationchange', onDur);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextRef.current());
        navigator.mediaSession.setActionHandler('previoustrack', () => audio.currentTime = 0);
      } catch (_) {}
    }
    return () => {
      audio.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const playTrack = useCallback((track, list, startIndex) => {
    const q = list && list.length ? list : [track];
    const si = startIndex != null ? startIndex : 0;
    setQueue(q); setIndex(si);
    loadTrack(q[si] || track);
  }, [loadTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setError('Playback could not start.'));
    else audio.pause();
  }, []);

  const seek = useCallback((t) => { if (audioRef.current) audioRef.current.currentTime = t; }, []);
  const seekBy = useCallback((d) => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d)); }, []);
  const changeVolume = useCallback((v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = muted ? 0 : v; }, [muted]);
  const toggleMute = useCallback(() => { setMuted(m => { const nm = !m; if (audioRef.current) audioRef.current.volume = nm ? 0 : volume; return nm; }); }, [volume]);
  const playIndex = useCallback((i) => { const q = queueRef.current; if (q[i]) { setIndex(i); loadTrack(q[i]); } }, [loadTrack]);

  const stop = useCallback(() => { const a = audioRef.current; if (a) { a.pause(); a.removeAttribute('src'); } setCurrent(null); setQueue([]); setIndex(-1); setIsPlaying(false); }, []);

  const value = {
    getAudioEl: () => audioRef.current,
    current, queue, index, isPlaying, currentTime, duration, volume, muted, error, expanded, ready,
    setExpanded, playTrack, togglePlay, next, prev, playIndex, seek, seekBy, changeVolume, toggleMute, stop, setError,
  };
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}