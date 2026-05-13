import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack,
  Shuffle, Repeat, Repeat1, Search, Settings, X, ChevronLeft,
  Music, Folder, List, Code, MessageSquarePlus,
  RefreshCw, ChevronRight, Info
} from "lucide-react";

/* ─── CONFIG — edit these two before deploying ─────────── */
const GITHUB_URL  = "https://github.com/your-repo/music-player";
const REQUEST_URL = "PLACEHOLDER_REQUEST_URL";

/* ─── SUPABASE ──────────────────────────────────────────── */
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET            = "songs";

const REPEAT = { NONE: "none", ALL: "all", ONE: "one" };

const fmt = (t) => {
  if (!t || isNaN(t) || t === Infinity) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

/* ─── SUPABASE HOOK ─────────────────────────────────────── */
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

/* ─── SIMPLE ANIMATED VISUALIZER (no Web Audio API) ────── */
function Visualizer({ isPlaying, bars = 20, color = "#1a1a1a" }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const heights   = useRef(Array.from({ length: bars }, () => 0.05));
  const targets   = useRef(Array.from({ length: bars }, () => 0.05));

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const bw  = c.width / bars;

    const randomizeTargets = () => {
      for (let i = 0; i < bars; i++) {
        targets.current[i] = isPlaying ? Math.random() * 0.85 + 0.1 : 0.05;
      }
    };
    randomizeTargets();
    const interval = setInterval(randomizeTargets, 200);

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < bars; i++) {
        heights.current[i] += (targets.current[i] - heights.current[i]) * 0.18;
        const h = heights.current[i] * c.height;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12 + heights.current[i] * 0.75;
        ctx.beginPath();
        ctx.roundRect(i * bw + 1.5, c.height - h, bw - 3, h, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(interval); };
  }, [isPlaying, bars, color]);

  return (
    <canvas
      ref={canvasRef}
      width={bars * 12}
      height={56}
      style={{ width: "100%", height: 56 }}
    />
  );
}

/* ─── INFO BLOCK ────────────────────────────────────────── */
function InfoBlock({ title, children }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.03)", borderRadius: 14,
      padding: "14px 16px", border: "2px solid #e8e4dc",
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#aaa", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

/* ─── SETTINGS PANEL ─────────────────────────────────────── */
function SettingsPanel({ onClose }) {
  const [tab, setTab] = useState("info");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(240,237,230,0.6)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(540px, 93vw)",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: "2.5px solid #1a1a1a",
          borderRadius: 20,
          boxShadow: "7px 7px 0 #1a1a1a",
          overflow: "hidden",
          animation: "slideUp 0.24s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 4 }}>
              Configuration
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: 0, letterSpacing: "-0.03em" }}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.05)", border: "2px solid #1a1a1a",
              borderRadius: 10, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0 #1a1a1a", fontFamily: "inherit",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "16px 24px 0" }}>
          {[
            { id: "info",  label: "How It Works", icon: <Info size={12} /> },
            { id: "links", label: "Links",        icon: <Code size={12} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 10,
                border: "2px solid " + (tab === t.id ? "#1a1a1a" : "transparent"),
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: tab === t.id ? "#1a1a1a" : "rgba(0,0,0,0.04)",
                color: tab === t.id ? "#fff" : "#888",
                boxShadow: tab === t.id ? "2px 2px 0 rgba(0,0,0,0.2)" : "none",
                transition: "all 0.12s",
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", maxHeight: "52vh", overflowY: "auto" }}>
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <InfoBlock title="How this works">
                Audio files live in a <strong>Supabase Storage bucket</strong>. The browser fetches public URLs and plays them with the native HTML5 Audio API — no backend needed.
              </InfoBlock>
              <InfoBlock title="File browser">
                Mirrors your bucket's folder structure. Click a folder to navigate, click a track to play.
              </InfoBlock>
              <InfoBlock title="Keyboard shortcuts">
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", marginTop: 4 }}>
                  {[["Space", "Play / Pause"], ["← →", "Previous / Next"]].map(([k, v]) => (
                    <>
                      <kbd key={k} style={{ background: "#f0ede6", border: "1.5px solid #d8d4cc", borderRadius: 6, padding: "2px 9px", fontFamily: "monospace", fontSize: 11, color: "#333", whiteSpace: "nowrap" }}>{k}</kbd>
                      <span key={v} style={{ fontSize: 13, color: "#666" }}>{v}</span>
                    </>
                  ))}
                </div>
              </InfoBlock>
              <InfoBlock title="Request a song">
                Hit <strong>Request Song</strong> to submit a track. Requests are reviewed before being added to the library.
              </InfoBlock>
            </div>
          )}

          {tab === "links" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 4, lineHeight: 1.6 }}>
                This player is open source. View the full code on GitHub, or submit a song request below.
              </p>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={linkBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a1a1a"; }}
              >
                <Code size={15} /> View Source on GitHub
              </a>
              <a href={REQUEST_URL} target="_blank" rel="noreferrer"
                style={{ ...linkBtnStyle, background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <MessageSquarePlus size={15} /> Request a Song
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "2px solid #f0ede6", padding: "14px 24px", display: "flex", gap: 10 }}>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={footerBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; }}
          >
            <Code size={13} /> View Source
          </a>
          <a href={REQUEST_URL} target="_blank" rel="noreferrer"
            style={{ ...footerBtnStyle, background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a", boxShadow: "2px 2px 0 rgba(0,0,0,0.2)" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <MessageSquarePlus size={13} /> Request a Song
          </a>
        </div>
      </div>
    </div>
  );
}

const linkBtnStyle = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "13px 18px", borderRadius: 12,
  border: "2.5px solid #1a1a1a", background: "transparent",
  color: "#1a1a1a", fontSize: 13, fontWeight: 700,
  textDecoration: "none", cursor: "pointer",
  boxShadow: "3px 3px 0 #1a1a1a", transition: "all 0.12s",
};

const footerBtnStyle = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 10,
  border: "2px solid #1a1a1a", background: "transparent",
  color: "#666", fontSize: 12, fontWeight: 700,
  textDecoration: "none", cursor: "pointer",
  boxShadow: "2px 2px 0 rgba(0,0,0,0.15)", transition: "all 0.12s",
  fontFamily: "inherit",
};

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function App() {
  const supabase = useSupabase();

  const [items,       setItems]       = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [repeat,      setRepeat]      = useState(REPEAT.NONE);
  const [shuffle,     setShuffle]     = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [view,        setView]        = useState("browser");
  const [mounted,     setMounted]     = useState(false);

  const audioRef   = useRef(null);
  const seekBarRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  /* ── fetch ── */
  const fetchItems = useCallback(async (path = "") => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.storage.from(BUCKET).list(path, {
        limit: 200, sortBy: { column: "name", order: "asc" },
      });
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

  /* ── audio — plain HTML5, zero Web Audio API ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && currentSong?.url) {
      audio.play().catch(err => { console.warn("Playback blocked:", err); setIsPlaying(false); });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  const songs = items.filter(i => !i.isFolder);

  const playSong = useCallback((song) => {
    if (currentSong?.name === song.name) { setIsPlaying(p => !p); return; }
    setCurrentSong(song);
    setIsPlaying(true);
  }, [currentSong]);

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    if (repeat === REPEAT.ONE) { const a = audioRef.current; a.currentTime = 0; a.play(); return; }
    if (shuffle) { setCurrentSong(songs[Math.floor(Math.random() * songs.length)]); setIsPlaying(true); return; }
    const ci = songs.findIndex(s => s.name === currentSong?.name);
    const ni = (ci + 1) % songs.length;
    if (ni === 0 && repeat === REPEAT.NONE) { setIsPlaying(false); return; }
    setCurrentSong(songs[ni]); setIsPlaying(true);
  }, [repeat, shuffle, songs, currentSong]);

  const handlePrev = useCallback(() => {
    if (!songs.length) return;
    if (currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const ci = songs.findIndex(s => s.name === currentSong?.name);
    setCurrentSong(songs[(ci - 1 + songs.length) % songs.length]);
    setIsPlaying(true);
  }, [currentTime, songs, currentSong]);

  /* keyboard */
  useEffect(() => {
    const fn = (e) => {
      if (document.activeElement.tagName === "INPUT") return;
      if (e.code === "Space")      { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === "ArrowRight") handleNext();
      if (e.code === "ArrowLeft")  handlePrev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleNext, handlePrev]);

  const handleSeek = (e) => {
    if (!seekBarRef.current || !duration) return;
    const r = seekBarRef.current.getBoundingClientRect();
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration;
  };

  const filtered    = search ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())) : items;
  const displayList = view === "queue" ? songs : filtered;
  const RepIcon     = repeat === REPEAT.ONE ? Repeat1 : Repeat;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body {
          background: #f0ede6;
          background-image:
            radial-gradient(ellipse 70% 50% at 10% 90%, rgba(255,210,80,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 10%, rgba(160,200,255,0.14) 0%, transparent 60%);
          color: #1a1a1a;
          font-family: 'Syne', sans-serif;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        .track-row {
          display: flex; align-items: center; gap: 14px;
          padding: 0 16px; cursor: pointer;
          border-radius: 14px; margin: 2px 10px;
          height: 54px;
          border: 2px solid transparent;
          transition: background 0.12s, border-color 0.12s, transform 0.1s, box-shadow 0.1s;
        }
        .track-row:hover {
          background: rgba(255,255,255,0.65);
          border-color: rgba(0,0,0,0.07);
          transform: translateX(3px);
        }
        .track-row.playing {
          background: rgba(255,255,255,0.88);
          border: 2px solid #1a1a1a;
          box-shadow: 3px 3px 0 #1a1a1a;
          transform: none;
        }

        .icon-btn {
          background: none; border: none; cursor: pointer; color: #aaa;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px; padding: 8px; transition: all 0.12s; font-family: inherit;
        }
        .icon-btn:hover { color: #1a1a1a; background: rgba(0,0,0,0.06); }

        .ctrl-btn {
          background: none; border: none; cursor: pointer; color: #aaa;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; width: 40px; height: 40px; transition: all 0.12s;
        }
        .ctrl-btn:hover { color: #1a1a1a; background: rgba(0,0,0,0.06); }
        .ctrl-btn.active { color: #1a1a1a; }

        .play-btn {
          width: 52px; height: 52px; border-radius: 50%;
          border: 2.5px solid #1a1a1a; background: #1a1a1a;
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.18);
          transition: all 0.12s;
        }
        .play-btn:hover { transform: scale(1.07); box-shadow: 6px 6px 0 rgba(0,0,0,0.18); }
        .play-btn:active { transform: scale(0.95); box-shadow: 1px 1px 0 rgba(0,0,0,0.18); }

        .glass {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .tab-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 13px; border-radius: 9px;
          border: 2px solid transparent;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.12s; color: #aaa; background: transparent;
        }
        .tab-btn.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; box-shadow: 2px 2px 0 rgba(0,0,0,0.15); }
        .tab-btn:not(.active):hover { color: #1a1a1a; background: rgba(0,0,0,0.05); }

        .seek-wrap {
          height: 5px; background: rgba(0,0,0,0.08);
          cursor: pointer; position: relative; overflow: hidden;
          transition: height 0.12s;
        }
        .seek-wrap:hover { height: 8px; }
        .seek-fill {
          position: absolute; left:0; top:0; height:100%;
          background: #1a1a1a; pointer-events: none; transition: width 0.1s linear;
        }
      `}</style>

      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>

        {/* ── HEADER ── */}
        <header className="glass" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", flexShrink: 0,
          borderBottom: "2px solid rgba(0,0,0,0.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#1a1a1a",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #1a1a1a", boxShadow: "3px 3px 0 rgba(0,0,0,0.15)",
            }}>
              <Music size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>My Music</div>
              <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                {currentPath ? currentPath.replace(/\//g, " / ") : "Library"} · {songs.length} tracks
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href={REQUEST_URL} target="_blank" rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 15px", borderRadius: 10,
                border: "2px solid #1a1a1a", background: "transparent",
                color: "#1a1a1a", fontSize: 12, fontWeight: 700,
                textDecoration: "none", boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="#1a1a1a"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#1a1a1a"; }}
            >
              <MessageSquarePlus size={13} /> Request Song
            </a>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* File browser */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Toolbar */}
            <div style={{ padding: "12px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
              {currentPath && (
                <button className="icon-btn" onClick={() => { const p = currentPath.split("/"); p.pop(); setCurrentPath(p.join("/")); }}
                  style={{ border: "2px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "6px 8px" }} title="Back">
                  <ChevronLeft size={15} />
                </button>
              )}

              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: "2px solid rgba(0,0,0,0.09)", borderRadius: 12,
                padding: "0 12px", height: 38,
              }}>
                <Search size={13} color="#bbb" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks..."
                  style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, fontWeight:600, color:"#1a1a1a", fontFamily:"'Syne',sans-serif" }}
                />
                {search && <button onClick={() => setSearch("")} className="icon-btn" style={{ padding: 2 }}><X size={12} /></button>}
              </div>

              <button className="icon-btn" onClick={() => fetchItems(currentPath)} title="Refresh"
                style={{ border: "2px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "6px 8px" }}>
                <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              </button>

              <div style={{ display: "flex", gap: 4 }}>
                {[{ id: "browser", icon: <Folder size={12}/>, label:"Files" },
                  { id: "queue",   icon: <List   size={12}/>, label:"Queue"}].map(t => (
                  <button key={t.id} className={`tab-btn ${view===t.id?"active":""}`} onClick={() => setView(t.id)}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, height:"100%", color:"#bbb" }}>
                  <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }} />
                  <span style={{ fontSize:13, fontWeight:700 }}>Loading...</span>
                </div>
              ) : displayList.length === 0 ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#bbb", fontSize:13, fontWeight:700 }}>
                  {search ? `No results for "${search}"` : "No tracks found"}
                </div>
              ) : displayList.map((item, idx) => {
                const active = currentSong?.name === item.name;
                return (
                  <div
                    key={item.name + idx}
                    className={`track-row ${active ? "playing" : ""}`}
                    style={{ animation: `slideIn 0.22s ease ${Math.min(idx*0.022, 0.32)}s both` }}
                    onClick={() => item.isFolder
                      ? setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name)
                      : playSong(item)
                    }
                  >
                    <div style={{ width:30, flexShrink:0, textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#ccc" }}>
                      {item.isFolder
                        ? <Folder size={15} color="#ccc" />
                        : active && isPlaying
                          ? <span style={{ color:"#1a1a1a", fontSize:15 }}>♪</span>
                          : <span>{idx+1}</span>
                      }
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight: active ? 800 : 600, color:"#1a1a1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {item.title}
                      </div>
                      {item.isFolder && <div style={{ fontSize:11, color:"#bbb", marginTop:1 }}>Folder</div>}
                    </div>

                    {!item.isFolder && item.metadata?.size && (
                      <div style={{ fontSize:11, color:"#ccc", flexShrink:0, fontFamily:"'DM Mono',monospace" }}>
                        {(item.metadata.size/1024/1024).toFixed(1)} MB
                      </div>
                    )}

                    {item.isFolder
                      ? <ChevronRight size={14} color="#ccc" style={{ flexShrink:0 }} />
                      : active ? <div style={{ width:7, height:7, borderRadius:"50%", background:"#1a1a1a", flexShrink:0 }} /> : null
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {/* Now Playing sidebar */}
          {currentSong && (
            <div className="glass" style={{
              width: 230, flexShrink:0, display:"flex", flexDirection:"column",
              padding:"22px 18px", gap:18, overflowY:"auto",
              borderLeft:"2px solid rgba(0,0,0,0.07)",
              animation:"slideIn 0.28s ease",
            }}>
              <div style={{
                width:"100%", aspectRatio:"1", borderRadius:16,
                background:"#e8e4dc", border:"2.5px solid #1a1a1a",
                boxShadow:"4px 4px 0 rgba(0,0,0,0.1)",
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"hidden", flexShrink:0,
              }}>
                <Visualizer isPlaying={isPlaying} bars={18} color="#1a1a1a" />
              </div>

              <div>
                <div style={{ fontSize:14, fontWeight:800, letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize:11, color:"#bbb", fontFamily:"'DM Mono',monospace" }}>
                  {currentPath || "Library"}
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[["Time",    `${fmt(currentTime)} / ${fmt(duration)}`],
                  ["Shuffle", shuffle ? "On" : "Off"],
                  ["Repeat",  repeat]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <span style={{ color:"#bbb", fontWeight:600 }}>{k}</span>
                    <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── PLAYER BAR ── */}
        <div className="glass" style={{ flexShrink:0, borderTop:"2px solid rgba(0,0,0,0.07)" }}>
          <div ref={seekBarRef} className="seek-wrap" style={{ cursor: duration?"pointer":"default" }} onClick={handleSeek}>
            <div className="seek-fill" style={{ width:`${progress}%` }} />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:16, height:70, padding:"0 24px" }}>

            {/* Info */}
            <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                background: currentSong ? "#1a1a1a" : "#e8e4dc",
                border:"2px solid "+(currentSong?"#1a1a1a":"rgba(0,0,0,0.1)"),
                boxShadow: currentSong?"3px 3px 0 rgba(0,0,0,0.12)":"none",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Music size={15} color={currentSong?"#fff":"#ccc"} />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-0.01em" }}>
                  {currentSong?.title ?? "Nothing playing"}
                </div>
                <div style={{ fontSize:11, color:"#bbb", fontFamily:"'DM Mono',monospace", marginTop:1 }}>
                  {currentSong ? `${fmt(currentTime)} / ${fmt(duration)}` : "Pick a track to start"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <button className={`ctrl-btn ${shuffle?"active":""}`} onClick={() => setShuffle(p=>!p)} title="Shuffle">
                <Shuffle size={15} />
              </button>
              <button className="ctrl-btn" onClick={handlePrev} title="Previous"><SkipBack size={19} /></button>
              <button className="play-btn" onClick={() => setIsPlaying(p=>!p)} title="Play / Pause">
                {isPlaying ? <Pause size={19} fill="white" /> : <Play size={19} fill="white" style={{ marginLeft:2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next"><SkipForward size={19} /></button>
              <button
                className={`ctrl-btn ${repeat!==REPEAT.NONE?"active":""}`}
                onClick={() => setRepeat(r => r===REPEAT.NONE?REPEAT.ALL:r===REPEAT.ALL?REPEAT.ONE:REPEAT.NONE)}
                title="Repeat"
              >
                <RepIcon size={15} />
              </button>
            </div>

            <div style={{ flex:1 }} />
          </div>
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Plain audio — no Web Audio API wiring at all */}
      <audio
        ref={audioRef}
        src={currentSong?.url || ""}
        preload="auto"
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (!el) return;
          setCurrentTime(el.currentTime);
          setProgress((el.currentTime / el.duration) * 100 || 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleNext}
      />
    </>
  );
}
