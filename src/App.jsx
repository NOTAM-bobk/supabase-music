import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Search, Settings, X, ChevronLeft,
  Music, Folder, List, Info, Code, MessageSquarePlus, Check,
  RefreshCw, ChevronRight
} from "lucide-react";

/* ─── CONFIG ─────────────────────────────────────────── */
const SUPABASE_URL = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET = "songs";
const GITHUB_URL = "https://github.com/your-repo/music-player"; // replace
const REQUEST_URL = "PLACEHOLDER_REQUEST_URL"; // replace with your URL

const REPEAT = { NONE: "none", ALL: "all", ONE: "one" };

/* ─── HELPERS ─────────────────────────────────────────── */
const fmt = (t) => {
  if (!t || isNaN(t) || t === Infinity) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

/* ─── HOOKS ───────────────────────────────────────────── */
function useSupabase() {
  const [client, setClient] = useState(null);
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.async = true;
    s.onload = () => {
      if (window.supabase)
        setClient(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    };
    document.head.appendChild(s);
  }, []);
  return client;
}

/* ─── VISUALIZER ─────────────────────────────────────── */
function Visualizer({ isPlaying, analyser, bars = 40, color = "#a78bfa" }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const bw = c.width / bars;
      for (let i = 0; i < bars; i++) {
        let v;
        if (analyser && isPlaying) {
          const buf = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(buf);
          v = (buf[Math.floor((i / bars) * buf.length)] / 255) * c.height;
        } else {
          v = isPlaying ? Math.random() * c.height * 0.8 + c.height * 0.05 : c.height * 0.04;
        }
        const alpha = 0.4 + (v / c.height) * 0.6;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(i * bw + 1, c.height - v, bw - 2, v, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [isPlaying, analyser, bars, color]);
  return (
    <canvas
      ref={canvasRef}
      width={bars * 10}
      height={60}
      style={{ width: "100%", height: 60 }}
    />
  );
}

/* ─── SETTINGS PANEL ─────────────────────────────────── */
function SettingsPanel({ settings, onChange, onClose, githubUrl, requestUrl }) {
  const [tab, setTab] = useState("playback");
  const tabs = [
    { id: "playback", label: "Playback", icon: <Music size={14} /> },
    { id: "display", label: "Display", icon: <List size={14} /> },
    { id: "info", label: "How It Works", icon: <Info size={14} /> },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, 94vw)", background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Configuration</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "16px 24px 0" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--muted)",
                transition: "all 0.15s",
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px", maxHeight: "55vh", overflowY: "auto" }}>
          {tab === "playback" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SettingRow label="Crossfade between tracks" sub="Smooth transition when skipping songs">
                <Toggle value={settings.crossfade} onChange={v => onChange("crossfade", v)} />
              </SettingRow>
              <SettingRow label="Autoplay next" sub="Continue playing when a track ends">
                <Toggle value={settings.autoplay} onChange={v => onChange("autoplay", v)} />
              </SettingRow>
              <SettingRow label="Gapless playback" sub="Remove silence between tracks">
                <Toggle value={settings.gapless} onChange={v => onChange("gapless", v)} />
              </SettingRow>
              <SettingRow label="Volume normalization" sub="Balance volume across different tracks">
                <Toggle value={settings.normalize} onChange={v => onChange("normalize", v)} />
              </SettingRow>
              <SettingRow label="Default volume" sub={`${Math.round(settings.defaultVolume * 100)}%`}>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.defaultVolume}
                  onChange={e => onChange("defaultVolume", parseFloat(e.target.value))}
                  style={{ width: 120, accentColor: "var(--accent)" }}
                />
              </SettingRow>
            </div>
          )}

          {tab === "display" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SettingRow label="Animated visualizer" sub="Show audio spectrum bars">
                <Toggle value={settings.visualizer} onChange={v => onChange("visualizer", v)} />
              </SettingRow>
              <SettingRow label="Show file sizes" sub="Display track file size in the browser">
                <Toggle value={settings.showSizes} onChange={v => onChange("showSizes", v)} />
              </SettingRow>
              <SettingRow label="Accent color" sub="Main highlight color">
                <div style={{ display: "flex", gap: 6 }}>
                  {["#a78bfa", "#f472b6", "#34d399", "#60a5fa", "#fb923c", "#f87171"].map(c => (
                    <button
                      key={c}
                      onClick={() => onChange("accentColor", c)}
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: c, border: settings.accentColor === c ? "2px solid white" : "2px solid transparent",
                        cursor: "pointer", padding: 0,
                      }}
                    />
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="Compact track rows" sub="Smaller row height for more tracks visible">
                <Toggle value={settings.compact} onChange={v => onChange("compact", v)} />
              </SettingRow>
            </div>
          )}

          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
              <InfoBlock title="How this works">
                This music player streams audio files directly from a <strong style={{ color: "var(--text)" }}>Supabase Storage bucket</strong>. No backend server is needed — the browser fetches public URLs from the bucket and plays them natively using the HTML5 Audio API.
              </InfoBlock>
              <InfoBlock title="File browser">
                The file browser mirrors your Supabase bucket's folder structure. Clicking a folder navigates into it; clicking a track starts playback instantly.
              </InfoBlock>
              <InfoBlock title="Audio visualizer">
                When a track plays, the app taps into the <strong style={{ color: "var(--text)" }}>Web Audio API</strong> to read real-time frequency data from the audio stream, which drives the animated bar visualizer.
              </InfoBlock>
              <InfoBlock title="Keyboard shortcuts">
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px" }}>
                  {[["Space", "Play / Pause"], ["← →", "Prev / Next track"], ["↑ ↓", "Volume up / down"], ["M", "Mute toggle"]].map(([k, v]) => (
                    <>
                      <kbd key={k} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontFamily: "monospace", fontSize: 11, color: "var(--text)", whiteSpace: "nowrap" }}>{k}</kbd>
                      <span key={v}>{v}</span>
                    </>
                  ))}
                </div>
              </InfoBlock>
              <InfoBlock title="Request a song">
                Use the <strong style={{ color: "var(--text)" }}>Request Song</strong> button to submit track requests. Requests go through a form and are reviewed before being added to the library.
              </InfoBlock>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 24px", display: "flex", gap: 10 }}>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <Code size={13} /> View Source
          </a>
          <a
            href={requestUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <MessageSquarePlus size={13} /> Request a Song
          </a>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? "var(--accent)" : "var(--surface2)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: value ? 21 : 3,
        transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

/* ─── MAIN APP ────────────────────────────────────────── */
export default function App() {
  const supabase = useSupabase();
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(REPEAT.NONE);
  const [shuffle, setShuffle] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState("browser"); // browser | queue
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    crossfade: false, autoplay: true, gapless: false,
    normalize: false, defaultVolume: 0.7,
    visualizer: true, showSizes: true, compact: false,
    accentColor: "#a78bfa",
  });

  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const seekBarRef = useRef(null);

  /* accent color CSS var */
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", settings.accentColor);
    document.documentElement.style.setProperty("--accent-dim", settings.accentColor + "33");
  }, [settings.accentColor]);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  /* fetch */
  const fetchItems = useCallback(async (path = "") => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.storage.from(BUCKET).list(path, { limit: 200, sortBy: { column: "name", order: "asc" } });
      if (data) {
        setItems(data.map(item => {
          const isFolder = !item.metadata;
          let url = "";
          if (!isFolder) {
            const fp = path ? `${path}/${item.name}` : item.name;
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fp);
            url = publicUrl;
          }
          return { ...item, isFolder, title: item.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "), url };
        }));
      }
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { fetchItems(currentPath); }, [supabase, currentPath, fetchItems]);

  /* audio ctx */
  const initAudioCtx = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(audioRef.current);
      const an = ctx.createAnalyser(); an.fftSize = 128;
      src.connect(an); an.connect(ctx.destination);
      audioCtxRef.current = ctx; setAnalyser(an);
    } catch (e) { /* safari */ }
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && currentSong?.url) {
      initAudioCtx();
      audioCtxRef.current?.resume();
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else { audioRef.current.pause(); }
  }, [isPlaying, currentSong, initAudioCtx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const songs = items.filter(i => !i.isFolder);

  const playSong = useCallback((song) => { setCurrentSong(song); setIsPlaying(true); }, []);

  const handleNext = useCallback(() => {
    if (repeat === REPEAT.ONE) { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    if (shuffle) { playSong(songs[Math.floor(Math.random() * songs.length)]); return; }
    const ci = songs.findIndex(s => s.name === currentSong?.name);
    const ni = (ci + 1) % songs.length;
    if (ni === 0 && repeat === REPEAT.NONE) { setIsPlaying(false); return; }
    playSong(songs[ni]);
  }, [repeat, shuffle, songs, currentSong, playSong]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const ci = songs.findIndex(s => s.name === currentSong?.name);
    playSong(songs[(ci - 1 + songs.length) % songs.length]);
  }, [currentTime, songs, currentSong, playSong]);

  /* keyboard */
  useEffect(() => {
    const fn = (e) => {
      if (document.activeElement.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === "ArrowRight") handleNext();
      if (e.code === "ArrowLeft") handlePrev();
      if (e.code === "KeyM") setMuted(p => !p);
      if (e.code === "ArrowUp") { e.preventDefault(); setVolume(p => Math.min(1, p + 0.05)); }
      if (e.code === "ArrowDown") { e.preventDefault(); setVolume(p => Math.max(0, p - 0.05)); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleNext, handlePrev]);

  const handleSeek = (e) => {
    if (!seekBarRef.current || !duration) return;
    const r = seekBarRef.current.getBoundingClientRect();
    audioRef.current.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration;
  };

  const settingChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const filtered = search ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())) : items;
  const RepIcon = repeat === REPEAT.ONE ? Repeat1 : Repeat;
  const rowH = settings.compact ? 44 : 56;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --accent: #a78bfa;
          --accent-dim: #a78bfa22;
          --bg: #0a0a0f;
          --surface: #111118;
          --surface2: #1a1a24;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.18);
          --text: #f0f0f8;
          --muted: rgba(240,240,248,0.45);
          --muted2: rgba(240,240,248,0.2);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes slideInLeft { from { opacity:0; transform:translateX(-16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .track-row {
          display: flex; align-items: center; gap: 14px;
          padding: 0 20px; cursor: pointer; position: relative;
          border-radius: 12px; margin: 0 8px;
          transition: background 0.15s;
        }
        .track-row:hover { background: rgba(255,255,255,0.04); }
        .track-row.playing { background: var(--accent-dim); }
        .track-row.playing .tr-num { color: var(--accent); animation: pulse 1.5s infinite; }
        .icon-btn {
          background: none; border: none; cursor: pointer; color: var(--muted);
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px; padding: 8px; transition: all 0.15s;
        }
        .icon-btn:hover { color: var(--text); background: rgba(255,255,255,0.06); }
        .icon-btn.active { color: var(--accent); }
        .ctrl-btn {
          background: none; border: none; cursor: pointer; color: var(--muted);
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; width: 40px; height: 40px; transition: all 0.15s;
        }
        .ctrl-btn:hover { color: var(--text); background: rgba(255,255,255,0.06); }
        .ctrl-btn.active { color: var(--accent); }
        .play-btn {
          width: 52px; height: 52px; border-radius: 50%; border: none;
          background: var(--accent); color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px var(--accent-dim); transition: all 0.15s;
        }
        .play-btn:hover { transform: scale(1.06); box-shadow: 0 0 36px var(--accent-dim); }
        .play-btn:active { transform: scale(0.96); }
        .tab-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 8px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; color: var(--muted); background: transparent;
        }
        .tab-btn.active { background: var(--accent); color: white; }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          height: 3px; border-radius: 2px; cursor: pointer; background: var(--border);
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: white; cursor: pointer;
          box-shadow: 0 0 6px rgba(0,0,0,0.4);
        }
        .seek-track {
          height: 4px; border-radius: 2px; background: var(--border);
          cursor: pointer; position: relative; overflow: hidden;
        }
        .seek-fill {
          position: absolute; left: 0; top: 0; height: 100%;
          background: var(--accent); border-radius: 2px; transition: width 0.1s linear;
          pointer-events: none;
        }
      `}</style>

      {/* Background ambient glow */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 40% at 20% 80%, ${settings.accentColor}12 0%, transparent 70%),
                     radial-gradient(ellipse 40% 30% at 80% 20%, ${settings.accentColor}08 0%, transparent 70%)`,
        transition: "background 0.6s",
      }} />

      <div style={{
        position: "relative", zIndex: 1, height: "100vh",
        display: "flex", flexDirection: "column",
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>

        {/* ── HEADER ── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "rgba(10,10,15,0.8)", backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${settings.accentColor}44`,
            }}>
              <Music size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>My Music</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                {currentPath ? currentPath.replace(/\//g, " / ") : "Library"} · {songs.length} tracks
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <a href={REQUEST_URL} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 10, border: "1px solid var(--border)", background: "transparent",
              color: "var(--muted)", fontSize: 12, fontWeight: 600, textDecoration: "none",
              transition: "all 0.15s", cursor: "pointer",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <MessageSquarePlus size={13} /> Request Song
            </a>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={17} />
            </button>
          </div>
        </header>

        {/* ── BROWSER + NOW PLAYING ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left: file browser */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
            borderRight: "1px solid var(--border)",
          }}>
            {/* Toolbar */}
            <div style={{ padding: "12px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
              {currentPath && (
                <button className="icon-btn" onClick={() => { const p = currentPath.split("/"); p.pop(); setCurrentPath(p.join("/")); }} title="Back">
                  <ChevronLeft size={16} />
                </button>
              )}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", height: 36 }}>
                <Search size={13} color="var(--muted)" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks..."
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
                />
                {search && <button onClick={() => setSearch("")} className="icon-btn" style={{ padding: 2 }}><X size={12} /></button>}
              </div>
              <button className="icon-btn" onClick={() => fetchItems(currentPath)} title="Refresh">
                <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              </button>
              <div style={{ display: "flex", gap: 2 }}>
                {[{ id: "browser", icon: <Folder size={13} />, label: "Browser" }, { id: "queue", icon: <List size={13} />, label: "Queue" }].map(t => (
                  <button key={t.id} className={`tab-btn ${view === t.id ? "active" : ""}`} onClick={() => setView(t.id)}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Track list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {loading ? (
                <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <RefreshCw size={20} color="var(--muted)" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Loading...</span>
                </div>
              ) : (view === "browser" ? filtered : songs).length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  {search ? `No results for "${search}"` : "No tracks found"}
                </div>
              ) : (view === "browser" ? filtered : songs).map((item, idx) => {
                const isCurrentlyPlaying = currentSong?.name === item.name;
                return (
                  <div
                    key={idx}
                    className={`track-row ${isCurrentlyPlaying ? "playing" : ""}`}
                    style={{ height: rowH, animation: `slideInLeft 0.3s ease ${Math.min(idx * 0.03, 0.4)}s both` }}
                    onClick={() => item.isFolder
                      ? setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name)
                      : playSong(item)
                    }
                  >
                    {/* Number / icon */}
                    <div className="tr-num" style={{ width: 28, textAlign: "right", flexShrink: 0, fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono',monospace" }}>
                      {item.isFolder
                        ? <Folder size={16} color="var(--muted)" />
                        : isCurrentlyPlaying && isPlaying
                          ? <span style={{ color: "var(--accent)", fontSize: 16 }}>♪</span>
                          : <span>{idx + 1}</span>
                      }
                    </div>
                    {/* Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isCurrentlyPlaying ? 600 : 400, color: isCurrentlyPlaying ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      {item.isFolder && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Folder</div>
                      )}
                    </div>
                    {/* Size */}
                    {settings.showSizes && !item.isFolder && item.metadata?.size && (
                      <div style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>
                        {(item.metadata.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    )}
                    {item.isFolder && (
                      <ChevronRight size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Now Playing sidebar (hidden on narrow) */}
          {currentSong && (
            <div style={{
              width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
              padding: "24px 20px", gap: 20, overflowY: "auto",
              animation: "slideInLeft 0.3s ease",
            }}>
              {/* Art placeholder */}
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 16,
                background: `linear-gradient(135deg, ${settings.accentColor}33, ${settings.accentColor}11)`,
                border: "1px solid var(--border)", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                {settings.visualizer
                  ? <Visualizer isPlaying={isPlaying} analyser={analyser} bars={24} color={settings.accentColor} />
                  : <Music size={48} color={`${settings.accentColor}88`} />
                }
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {currentPath || "Library"}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 6, fontFamily: "'DM Mono', monospace" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Time</span><span style={{ color: "var(--text)" }}>{fmt(currentTime)} / {fmt(duration)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Shuffle</span><span style={{ color: shuffle ? "var(--accent)" : "var(--text)" }}>{shuffle ? "On" : "Off"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Repeat</span><span style={{ color: repeat !== REPEAT.NONE ? "var(--accent)" : "var(--text)" }}>{repeat}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── PLAYER BAR ── */}
        <footer style={{
          flexShrink: 0, background: "rgba(10,10,15,0.9)", backdropFilter: "blur(24px)",
          borderTop: "1px solid var(--border)", padding: "0 24px",
        }}>
          {/* Seek bar */}
          <div ref={seekBarRef} className="seek-track" style={{ cursor: duration ? "pointer" : "default" }} onClick={handleSeek}>
            <div className="seek-fill" style={{ width: `${progress}%` }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, height: 72 }}>
            {/* Song info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: currentSong ? `linear-gradient(135deg, ${settings.accentColor}44, ${settings.accentColor}11)` : "var(--surface2)",
                border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Music size={16} color={currentSong ? settings.accentColor : "var(--muted)"} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentSong?.title ?? "No track selected"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono',monospace" }}>
                  {currentSong ? `${fmt(currentTime)} / ${fmt(duration)}` : "—"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className={`ctrl-btn ${shuffle ? "active" : ""}`} onClick={() => setShuffle(p => !p)} title="Shuffle">
                <Shuffle size={16} />
              </button>
              <button className="ctrl-btn" onClick={handlePrev} title="Previous"><SkipBack size={20} /></button>
              <button className="play-btn" onClick={() => setIsPlaying(p => !p)} title="Play/Pause">
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: 2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next"><SkipForward size={20} /></button>
              <button className={`ctrl-btn ${repeat !== REPEAT.NONE ? "active" : ""}`} onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)} title="Repeat">
                <RepIcon size={16} />
              </button>
            </div>

            {/* Volume */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, minWidth: 0 }}>
              <button className="icon-btn" onClick={() => setMuted(p => !p)}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01}
                value={muted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                style={{ width: 90, accentColor: settings.accentColor }}
              />
            </div>
          </div>
        </footer>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={settingChange}
          onClose={() => setShowSettings(false)}
          githubUrl={GITHUB_URL}
          requestUrl={REQUEST_URL}
        />
      )}

      <audio
        ref={audioRef}
        src={currentSong?.url}
        onTimeUpdate={() => { const el = audioRef.current; if (!el) return; setCurrentTime(el.currentTime); setProgress((el.currentTime / el.duration) * 100 || 0); }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleNext}
      />
    </>
  );
}
