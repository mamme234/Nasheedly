import { useRef, useState, useCallback } from 'react';
import { Upload, FileVideo, Loader2, Check, X, Play, Save, Music, AlertTriangle, HardDrive } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { db, uid, formatBytes, formatTime, sanitizeName } from '@/lib/db';
import { usePlayer } from '@/lib/playerStore';

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
const WASM_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';

export default function Converter() {
  const { playTrack } = usePlayer();
  const ffmpegRef = useRef(null);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loadingEngine, setLoadingEngine] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [outputName, setOutputName] = useState('');
  const [storage, setStorage] = useState(null);
  const [addedToLib, setAddedToLib] = useState(false);

  const loadEngine = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setLoadingEngine(true);
    try {
      const ff = new FFmpeg();
      ff.on('progress', ({ progress }) => { if (progress >= 0 && progress <= 1) setProgress(progress); });
      ff.on('log', ({ message }) => setLog(message));
      await ff.load({ coreURL: CORE_URL, wasmURL: WASM_URL });
      ffmpegRef.current = ff;
      return ff;
    } catch (e) {
      throw new Error('Could not load the conversion engine. Check your connection — the engine loads from a CDN.');
    } finally { setLoadingEngine(false); }
  }, []);

  const onPickFile = useCallback(async (f) => {
    setError(null); setResult(null); setProgress(0); setLog(''); setAddedToLib(false);
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { setError('File is larger than 500 MB. Choose a smaller file.'); return; }
    setFile(f);
    setOutputName(sanitizeName(f.name.replace(/\.[^.]+$/, '')) + '.mp3');
    const url = URL.createObjectURL(f);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { setMeta({ duration: v.duration }); URL.revokeObjectURL(url); };
    v.onerror = () => { setMeta({ duration: null }); URL.revokeObjectURL(url); };
    v.src = url;
    if (navigator.storage?.estimate) navigator.storage.estimate().then(e => setStorage(e));
  }, []);

  const convert = useCallback(async () => {
    if (!file) return;
    setError(null); setResult(null); setProgress(0); setLog('');
    setConverting(true);
    try {
      const ff = await loadEngine();
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const inName = 'in.' + ext;
      const outName = 'out.mp3';
      await ff.writeFile(inName, await fetchFile(file));

      let logs = [];
      const probeLog = ({ message }) => logs.push(message);
      ff.on('log', probeLog);
      try { await ff.exec(['-i', inName]); } catch (_) {}
      ff.off('log', probeLog);
      const hasAudio = logs.some(m => m.includes('Audio:'));
      if (!hasAudio) throw new Error('No audio track found in this file. The video has no sound to extract.');

      await ff.exec(['-i', inName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outName]);
      const data = await ff.readFile(outName);
      const blob = new Blob([data], { type: 'audio/mp3' });
      if (blob.size < 1024) throw new Error('Conversion produced an invalid file. The source may be corrupted.');

      setResult({ blob, size: blob.size });
      setProgress(1);
      try { await ff.deleteFile(inName); await ff.deleteFile(outName); } catch (_) {}
    } catch (e) {
      setError(e.message || 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  }, [file, loadEngine]);

  const cancel = useCallback(() => {
    try { ffmpegRef.current?.terminate(); } catch (_) {}
    ffmpegRef.current = null;
    setConverting(false); setProgress(0); setLog('');
    setError('Conversion cancelled.');
  }, []);

  const saveDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = outputName || 'converted.mp3';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const buildTrack = () => ({
    id: uid(),
    title: outputName.replace(/\.mp3$/i, ''),
    artist: 'Converted locally',
    type: 'converted',
    blob: result.blob,
    size: result.size,
    duration: meta?.duration || null,
    favorite: false,
    createdAt: Date.now(),
  });

  const addToLibrary = async () => {
    if (!result) return;
    await db.put('tracks', buildTrack());
    setAddedToLib(true);
  };

  const playNow = async () => {
    if (!result) return;
    const track = buildTrack();
    await db.put('tracks', track);
    playTrack(track, [track], 0);
    setAddedToLib(true);
  };

  const reset = () => { setFile(null); setMeta(null); setResult(null); setError(null); setProgress(0); setLog(''); setAddedToLib(false); if (fileInputRef.current) fileInputRef.current.value = ''; };

  return (
    <div className="space-y-6">
      <header className="text-center pt-2">
        <h1 className="font-heading text-4xl font-bold gold-text">MP4 → MP3 Converter</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">Convert local video to MP3 entirely on your device. Your file never leaves the browser and no upload is needed.</p>
      </header>

      {!file && (
        <button onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition p-10 flex flex-col items-center gap-4 text-center bg-card/50">
          <span className="w-16 h-16 rounded-2xl gold-sheen flex items-center justify-center text-black"><Upload className="w-7 h-7" /></span>
          <div>
            <div className="font-heading text-xl font-semibold">Select a video file</div>
            <div className="text-sm text-muted-foreground mt-1">MP4, MOV, MKV, WEBM, AVI and more · processed locally</div>
          </div>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden"
        onChange={e => onPickFile(e.target.files?.[0])} />

      {file && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 rounded-xl gold-sheen flex items-center justify-center text-black shrink-0"><FileVideo className="w-6 h-6" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                <span>{formatBytes(file.size)}</span>
                {meta?.duration && <span>{formatTime(meta.duration)}</span>}
              </div>
            </div>
            {!converting && <button onClick={reset} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>

          {storage && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><HardDrive className="w-3.5 h-3.5" /> {formatBytes(storage.usage)} used · {formatBytes(storage.quota)} available</div>
          )}

          {!result && !converting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input value={outputName} onChange={e => setOutputName(sanitizeName(e.target.value))}
                  className="flex-1 h-11 px-4 rounded-xl bg-secondary border border-border text-sm" placeholder="output filename" />
                <span className="text-muted-foreground text-sm">.mp3</span>
              </div>
              <button onClick={convert} disabled={loadingEngine}
                className="w-full h-12 rounded-xl gold-sheen text-black font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {loadingEngine ? <><Loader2 className="w-5 h-5 animate-spin" /> Loading engine…</> : <><Music className="w-5 h-5" /> Convert to MP3</>}
              </button>
            </div>
          )}

          {converting && (
            <div className="space-y-3">
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full gold-sheen transition-all" style={{ width: Math.round(progress * 100) + '%' }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Converting… {Math.round(progress * 100)}%</span>
                <button onClick={cancel} className="text-destructive flex items-center gap-1.5"><X className="w-4 h-4" /> Cancel</button>
              </div>
              {log && <div className="text-[11px] text-muted-foreground/70 font-mono truncate">ffmpeg: {log}</div>}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-accent/30">
                <span className="w-10 h-10 rounded-full gold-sheen flex items-center justify-center text-black"><Check className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{outputName}</div>
                  <div className="text-sm text-muted-foreground">{formatBytes(result.size)} · MP3 · ready</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={playNow} className="h-11 rounded-xl gold-sheen text-black text-sm font-medium flex items-center justify-center gap-1.5"><Play className="w-4 h-4" /> Play</button>
                <button onClick={saveDownload} className="h-11 rounded-xl border border-border text-sm flex items-center justify-center gap-1.5 hover:border-primary/40"><Save className="w-4 h-4" /> Save</button>
                <button onClick={addToLibrary} disabled={addedToLib} className="h-11 rounded-xl border border-border text-sm flex items-center justify-center gap-1.5 hover:border-primary/40 disabled:opacity-50">
                  {addedToLib ? <Check className="w-4 h-4 text-primary" /> : <Music className="w-4 h-4" />} {addedToLib ? 'Added' : 'Library'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">The original video is preserved unchanged. Saved to your offline library — available after restart.</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/50 p-4 text-xs text-muted-foreground leading-relaxed">
        <div className="font-medium text-foreground mb-1.5">How it works</div>
        Conversion runs in your browser via FFmpeg (compiled to WebAssembly). The first conversion downloads the engine (~30 MB) from a CDN; afterwards it works fully offline. Browser sandbox limits may restrict very large files or some codecs.
      </div>
    </div>
  );
}