import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Search, Settings, X, ChevronLeft, Music, Folder, List, Code,
  MessageSquarePlus, RefreshCw, ChevronRight, Info, Download,
  Plus, Trash2, FolderPlus, Heart, Sliders, Moon, Check,
  MoreHorizontal, SortAsc, SortDesc, Home, Type, Upload,
  FileMusic, Gauge, Clock, Keyboard, ListMusic
} from "lucide-react";

/* ─── CONFIG ──────────────────────────────────────────────── */
const GITHUB_URL        = "https://github.com/NOTAM-bobk/supabase-music/tree/main";
const REQUEST_URL       = "https://docs.google.com/forms/d/e/1FAIpQLSeJZ1qbaUQluhCYTOApX9g7JIDY6AQ4zD3ylS_k31L8NrvhEA/viewform?usp=publish-editor";
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET            = "songs";
const REPEAT_M          = { NONE: "none", ALL: "all", ONE: "one" };
const SPEEDS            = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MAX_HISTORY       = 30;

const FONTS = [
  { id: "opendyslexic", label: "OpenDyslexic", stack: "'OpenDyslexic', sans-serif",         google: null },
  { id: "syne",         label: "Syne",          stack: "'Syne', sans-serif",                google: "Syne:wght@400;600;700;800" },
  { id: "dm-mono",      label: "DM Mono",       stack: "'DM Mono', monospace",              google: "DM+Mono:wght@400;500" },
  { id: "fraunces",     label: "Fraunces",      stack: "'Fraunces', serif",                 google: "Fraunces:wght@400;600;700;800" },
  { id: "outfit",       label: "Outfit",        stack: "'Outfit', sans-serif",              google: "Outfit:wght@400;600;700;800" },
  { id: "jetbrains",    label: "JetBrains Mono",stack: "'JetBrains Mono', monospace",      google: "JetBrains+Mono:wght@400;600;700" },
  { id: "playfair",     label: "Playfair",      stack: "'Playfair Display', serif",         google: "Playfair+Display:wght@400;700;800" },
  { id: "bricolage",    label: "Bricolage",     stack: "'Bricolage Grotesque', sans-serif", google: "Bricolage+Grotesque:wght@400;600;700;800" },
];

/* ─── HELPERS ─────────────────────────────────────────────── */
const fmt = (t) => {
  if (!t || isNaN(t) || t === Infinity) return "--:--";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};
const loadLocal = (key, def) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
};
const saveLocal = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

/* ─── SUPABASE HOOK ──────────────────────────────────────── */
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

/* ─── MOBILE DETECTION ───────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

/* ─── VISUALIZER ──────────────────────────────────────────── */
function Visualizer({ isPlaying, bars = 20, color = "#000", height = 56 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const ht        = useRef(Array.from({ length: bars }, () => 0.05));
  const tg        = useRef(Array.from({ length: bars }, () => 0.05));
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"), bw = c.width / bars;
    const rand = () => { for (let i = 0; i < bars; i++) tg.current[i] = isPlaying ? Math.random() * 0.85 + 0.1 : 0.05; };
    rand();
    const iv = setInterval(rand, 190);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < bars; i++) {
        ht.current[i] += (tg.current[i] - ht.current[i]) * 0.18;
        const h2 = ht.current[i] * c.height;
        ctx.fillStyle = color; ctx.globalAlpha = 0.12 + ht.current[i] * 0.75;
        ctx.beginPath(); ctx.roundRect(i * bw + 1.5, c.height - h2, bw - 3, h2, 3); ctx.fill();
      }
      ctx.globalAlpha = 1; rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(iv); };
  }, [isPlaying, bars, color]);
  return <canvas ref={canvasRef} width={bars * 12} height={height} style={{ width: "100%", height }} />;
}

/* ─── MODAL ──────────────────────────────────────────────── */
function Modal({ onClose, title, children, width = "min(560px,93vw)" }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(230,227,220,0.65)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.18s ease"
    }} onClick={onClose}>
      <div style={{
        width, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.95)", outline: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 20,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04),0 24px 64px rgba(0,0,0,0.18),4px 4px 0 #000",
        overflow: "hidden", animation: "slideUp 0.24s cubic-bezier(0.34,1.56,0.64,1)",
        maxHeight: "90vh", display: "flex", flexDirection: "column"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="vbtn vbtn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><X size={13} /></button>
        </div>
        <div style={{ padding: "18px 22px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── KEYBOARD SHORTCUTS MODAL ───────────────────────────── */
function KeyboardModal({ onClose }) {
  const shortcuts = [
    ["Space",   "Play / Pause"],
    ["←",       "Previous track (or restart)"],
    ["→",       "Next track"],
    ["S",       "Toggle shuffle"],
    ["R",       "Cycle repeat mode"],
    ["F",       "Toggle favorite"],
    ["D",       "Download current song"],
    ["K",       "Keyboard shortcuts (this panel)"],
  ];
  return (
    <Modal onClose={onClose} title="Keyboard Shortcuts" width="min(420px,93vw)">
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {shortcuts.map(([key, desc]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: "rgba(0,0,0,0.02)", border: "1.5px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>{desc}</span>
            <kbd style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 32, padding: "3px 9px", borderRadius: 7, background: "#000", color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "'DM Mono',monospace", boxShadow: "0 2px 0 rgba(0,0,0,0.3)" }}>{key}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ─── REQUEST / UPLOAD MODAL ─────────────────────────────── */
function RequestUploadModal({ onClose, supabase, onRefresh }) {
  const [mode,         setMode]         = useState(null);
  const [folderName,   setFolderName]   = useState("");
  const [files,        setFiles]        = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadStatus, setUploadStatus] = useState([]);
  const [done,         setDone]         = useState(false);
  const fileRef = useRef(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith(".mp3"));
    setFiles(selected);
    setUploadStatus(selected.map(f => ({ name: f.name, progress: 0, done: false, error: null })));
  };

  const handleUpload = async () => {
    if (!folderName.trim()) return alert("Please enter a folder name.");
    if (!files.length) return alert("Please select at least one MP3 file.");
    if (!supabase) return alert("Not connected.");
    setUploading(true);
    const folder = folderName.trim().replace(/[^a-zA-Z0-9_\- ]/g, "_");
    const results = [...uploadStatus];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; const path = `${folder}/${file.name}`;
      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`);
          xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
          xhr.setRequestHeader("x-upsert", "true");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) { results[i] = { ...results[i], progress: Math.round((e.loaded / e.total) * 100) }; setUploadStatus([...results]); }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) { results[i] = { ...results[i], progress: 100, done: true }; setUploadStatus([...results]); resolve(); }
            else { results[i] = { ...results[i], error: `HTTP ${xhr.status}` }; setUploadStatus([...results]); reject(); }
          };
          xhr.onerror = () => { results[i] = { ...results[i], error: "Network error" }; setUploadStatus([...results]); reject(); };
          xhr.send(file);
        });
      } catch {}
    }
    setUploading(false); setDone(true); onRefresh?.();
  };

  if (mode === "request") { window.open(REQUEST_URL, "_blank"); onClose(); return null; }

  return (
    <Modal onClose={onClose} title="Request / Upload" width="min(480px,93vw)">
      {mode === null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, marginBottom: 4 }}>What would you like to do?</p>
          {[
            { icon: <MessageSquarePlus size={20} />, title: "Request a Song", sub: "Submit a request via Google Form", fn: () => setMode("request") },
            { icon: <Upload size={20} />, title: "Upload Songs", sub: "Upload .mp3 files to a new folder", fn: () => setMode("upload") },
          ].map(item => (
            <button key={item.title} onClick={item.fn} className="vbtn vbtn-ghost" style={{ justifyContent: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14, fontSize: 14, textAlign: "left" }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 400, marginTop: 2 }}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {mode === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!done ? (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Folder name</label>
                <input type="text" value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Summer Mix 2025" disabled={uploading} style={{ fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>MP3 Files only</label>
                <div onClick={() => !uploading && fileRef.current?.click()}
                  style={{ border: "2px dashed rgba(0,0,0,0.12)", borderRadius: 14, padding: "22px 16px", textAlign: "center", cursor: uploading ? "default" : "pointer", background: "rgba(0,0,0,0.02)", transition: "border-color 0.13s" }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#000"; }}
                  onDragLeave={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
                  onDrop={e => {
                    e.preventDefault(); e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
                    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith(".mp3"));
                    setFiles(dropped); setUploadStatus(dropped.map(f => ({ name: f.name, progress: 0, done: false, error: null })));
                  }}>
                  <FileMusic size={26} color="#ccc" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#999" }}>{files.length > 0 ? `${files.length} file(s) selected` : "Click or drag & drop .mp3 files"}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Only .mp3 files are accepted</div>
                </div>
                <input ref={fileRef} type="file" accept=".mp3,audio/mpeg" multiple onChange={handleFiles} style={{ display: "none" }} />
              </div>
              {uploadStatus.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 200, overflowY: "auto" }}>
                  {uploadStatus.map((s, i) => (
                    <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "9px 12px", border: "1.5px solid rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{s.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: s.error ? "#e74c3c" : s.done ? "#27ae60" : "#aaa", flexShrink: 0, marginLeft: 8 }}>{s.error ? "Error" : s.done ? "Done" : uploading ? `${s.progress}%` : "Ready"}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: s.error ? "#e74c3c" : s.done ? "#27ae60" : "#000", width: `${s.progress}%`, transition: "width 0.2s linear" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMode(null)} className="vbtn vbtn-ghost" style={{ flex: 1, justifyContent: "center" }} disabled={uploading}>Back</button>
                <button onClick={handleUpload} className="vbtn vbtn-primary" style={{ flex: 2, justifyContent: "center", gap: 7, padding: "12px", borderRadius: 12, fontSize: 13 }} disabled={uploading || !files.length || !folderName.trim()}>
                  {uploading ? "Uploading…" : <><Upload size={14} /> Upload to Supabase</>}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Upload complete!</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{uploadStatus.filter(s => s.done).length} of {uploadStatus.length} file(s) uploaded to <strong>/{folderName}</strong></div>
              {uploadStatus.some(s => s.error) && (
                <div style={{ background: "rgba(231,76,60,0.07)", border: "1.5px solid rgba(231,76,60,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#c0392b" }}>
                  {uploadStatus.filter(s => s.error).map(s => <div key={s.name}>⚠ {s.name}: {s.error}</div>)}
                </div>
              )}
              <button onClick={onClose} className="vbtn vbtn-primary" style={{ justifyContent: "center", padding: "11px 24px" }}>Done</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ─── THREE-DOT MENU ─────────────────────────────────────── */
function TrackDotMenu({ song, playlists, onPlay, onFavorite, isFav, onAddToPlaylist, onDownload }) {
  const [open, setOpen] = useState(false);
  const btnRef          = useRef(null);
  const menuRef         = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [open]);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button ref={btnRef} className="vbtn vbtn-ghost dot-menu-btn"
        style={{ padding: "4px 6px", borderRadius: 7 }}
        onClick={e => { e.stopPropagation(); setOpen(p => !p); }}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div ref={menuRef} style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 9999,
          minWidth: 200, background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.95)", outline: "1.5px solid rgba(0,0,0,0.09)",
          borderRadius: 14, boxShadow: "0 0 0 1px rgba(0,0,0,0.04),0 16px 48px rgba(0,0,0,0.16),3px 3px 0 #000",
          overflow: "hidden", animation: "popIn 0.16s cubic-bezier(0.34,1.4,0.64,1)"
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: "#000", padding: "8px 13px" }}>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
          </div>
          {[
            { icon: <Play size={12} />,     label: "Play now",                                           fn: () => { onPlay(song); setOpen(false); } },
            { icon: <Heart size={12} />,    label: isFav ? "Remove from Favorites" : "Add to Favorites", fn: () => { onFavorite(song); setOpen(false); } },
            { icon: <Download size={12} />, label: "Download",                                           fn: () => { onDownload(song); setOpen(false); } },
          ].map((item, i) => (
            <button key={i} onClick={item.fn} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 13px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#222", textAlign: "left", fontFamily: "inherit", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ color: "#888", flexShrink: 0, display: "flex" }}>{item.icon}</span>{item.label}
            </button>
          ))}
          {playlists.length > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "3px 0" }} />
              <div style={{ padding: "5px 13px 3px", fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>Add to Playlist</div>
              {playlists.map(pl => (
                <button key={pl.id} onClick={() => { onAddToPlaylist(song, pl.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 13px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#222", textAlign: "left", fontFamily: "inherit", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ color: "#888", display: "flex" }}><Plus size={12} /></span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SETTINGS PANEL ─────────────────────────────────────── */
function SettingsPanel({ settings, onChange, onClose }) {
  const [tab, setTab] = useState("playback");
  const tabs = [
    { id: "playback", label: "Playback",     icon: <Play size={11} /> },
    { id: "library",  label: "Library",      icon: <Folder size={11} /> },
    { id: "display",  label: "Display",      icon: <Sliders size={11} /> },
    { id: "fonts",    label: "Fonts",        icon: <Type size={11} /> },
    { id: "info",     label: "How It Works", icon: <Info size={11} /> },
  ];
  return (
    <Modal onClose={onClose} title="Settings" width="min(620px,95vw)">
      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? "vbtn vbtn-primary" : "vbtn vbtn-ghost"}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === "playback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { key: "autoplay",      label: "Autoplay next track", sub: "Continue playing when a track ends" },
            { key: "crossfade",     label: "Crossfade (visual)",  sub: "Visual smooth transition indicator" },
            { key: "showDurations", label: "Show song durations", sub: "Display track length in the list" },
            { key: "showSizes",     label: "Show file sizes",     sub: "Display file size alongside tracks" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}><Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} /></SRow>
          ))}
          <SRow label="Playback speed" sub="Adjust how fast songs play">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => onChange("playbackSpeed", s)}
                  className={settings.playbackSpeed === s ? "vbtn vbtn-primary" : "vbtn vbtn-ghost"}
                  style={{ fontSize: 11, padding: "4px 9px", borderRadius: 20 }}>
                  {s}×
                </button>
              ))}
            </div>
          </SRow>
          <SRow label="Sleep timer" sub={settings.sleepMins > 0 ? `Stops playback in ${settings.sleepMins} min` : "Off"}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[0, 15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => onChange("sleepMins", m)}
                  className={settings.sleepMins === m ? "vbtn vbtn-primary" : "vbtn vbtn-ghost"}
                  style={{ fontSize: 11, padding: "4px 9px" }}>
                  {m === 0 ? "Off" : `${m}m`}
                </button>
              ))}
            </div>
          </SRow>
        </div>
      )}
      {tab === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { key: "foldersOnly",   label: "Folders only on home",  sub: "Show only folders at the root level" },
            { key: "showTrackNums", label: "Show track numbers",    sub: "Display index numbers in the track list" },
            { key: "compactRows",   label: "Compact track rows",    sub: "Smaller row height to show more tracks" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}><Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} /></SRow>
          ))}
          <SRow label="Sort order" sub="How tracks are sorted">
            <div style={{ display: "flex", gap: 5 }}>
              {[{ val: "asc", label: "A → Z", icon: <SortAsc size={11} /> }, { val: "desc", label: "Z → A", icon: <SortDesc size={11} /> }].map(({ val, label, icon }) => (
                <button key={val} onClick={() => onChange("sortOrder", val)}
                  className={settings.sortOrder === val ? "vbtn vbtn-primary" : "vbtn vbtn-ghost"}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  {icon}{label}
                </button>
              ))}
            </div>
          </SRow>
        </div>
      )}
      {tab === "display" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { key: "visualizer",   label: "Animated visualizer", sub: "Bouncing bars in the now-playing sidebar" },
            { key: "accentBar",    label: "Accent player bar",   sub: "Tint the player bar with the accent color" },
            { key: "showWaveform", label: "Tall seek bar",       sub: "Taller, more prominent seek bar" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}><Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} /></SRow>
          ))}
          <SRow label="Accent color" sub="Highlight color throughout the UI">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {["#000000", "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085", "#e67e22"].map((c, i) => (
                <button key={c + i} onClick={() => onChange("accent", c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", padding: 0, border: "none", outline: "none", boxShadow: settings.accent === c ? `0 0 0 2px white,0 0 0 4px ${c}` : "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
              ))}
              <input type="color" value={settings.accent} onChange={e => onChange("accent", e.target.value)} style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", padding: 0, cursor: "pointer", background: "none" }} />
            </div>
          </SRow>
        </div>
      )}
      {tab === "fonts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "#aaa", marginBottom: 4, lineHeight: 1.6 }}>Choose the font used throughout the app.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FONTS.map(f => (
              <button key={f.id} onClick={() => onChange("fontId", f.id)} style={{ padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: `2px solid ${settings.fontId === f.id ? "#000" : "rgba(0,0,0,0.08)"}`, background: settings.fontId === f.id ? "#000" : "rgba(255,255,255,0.5)", color: settings.fontId === f.id ? "#fff" : "#333", boxShadow: settings.fontId === f.id ? "2px 2px 0 rgba(0,0,0,0.25)" : "none", fontFamily: f.stack, fontSize: 14, fontWeight: 700, transition: "all 0.13s", textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, fontWeight: 400 }}>Aa Bb 123</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["How this works", "Audio files live in a Supabase Storage bucket. The browser fetches public URLs and plays them natively — no backend needed."],
            ["Offline mode", "The service worker caches JS/CSS and audio. Songs cache the first time they play — then work offline."],
            ["Playlists & History", "Playlists and playback history are stored locally in your browser per device."],
            ["Keyboard shortcuts", "Press K anywhere to open the keyboard shortcuts panel."],
          ].map(([title, body]) => (
            <div key={title} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{body}</div>
            </div>
          ))}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="vbtn vbtn-ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, alignSelf: "flex-start" }}>
            <Code size={13} /> View Source
          </a>
        </div>
      )}
    </Modal>
  );
}

function SRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, accent = "#000" }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, border: `2px solid ${value ? accent : "rgba(0,0,0,0.15)"}`, cursor: "pointer", background: value ? accent : "transparent", position: "relative", transition: "background 0.2s,border-color 0.2s", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: value ? "#fff" : accent, position: "absolute", top: 3, left: value ? 22 : 3, transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </button>
  );
}

/* ─── SPEED BADGE ────────────────────────────────────────── */
function SpeedBadge({ speed, accent }) {
  if (!speed || speed === 1) return null;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: accent, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
      <Gauge size={9} />{speed}×
    </div>
  );
}

/* ─── TRACK ROW ──────────────────────────────────────────── */
function TrackRow({ item, idx, active, isPlaying, fav, dur, settings, accent, rowH,
  onPlay, onFolder, onFavorite, onDownload, onAddToPlaylist, onRemoveFromPlaylist,
  playlists, showRemove, delay = 0 }) {
  return (
    <div className={`track-row${active ? " playing" : ""}`}
      style={{ height: rowH, animationDelay: `${delay}s` }}
      onClick={() => item.isFolder ? onFolder() : onPlay(item)}>
      {settings.showTrackNums && !item.isFolder && (
        <div style={{ width: 24, flexShrink: 0, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>
          {active && isPlaying ? <span style={{ color: accent }}>♪</span> : <span>{idx + 1}</span>}
        </div>
      )}
      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: item.isFolder ? "linear-gradient(135deg,#ffd87a,#ffc233)" : active ? "#000" : "rgba(0,0,0,0.05)", border: `1.5px solid ${item.isFolder ? "rgba(184,130,10,0.35)" : active ? "#000" : "rgba(0,0,0,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? "2px 2px 0 rgba(0,0,0,0.15)" : "none", transition: "all 0.15s" }}>
        {item.isFolder ? <Folder size={14} color="#b8820a" /> : <Music size={14} color={active ? "#fff" : "#ccc"} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#000" : "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
        {item.isFolder && <div style={{ fontSize: 10, color: "#bbb", marginTop: 1, fontWeight: 600 }}>Folder</div>}
      </div>
      {!item.isFolder && settings.showDurations && (
        <div style={{ fontSize: 11, color: active ? "#888" : "#ccc", flexShrink: 0, fontFamily: "monospace", minWidth: 34, textAlign: "right" }}>{dur ? fmt(dur) : "—"}</div>
      )}
      {!item.isFolder && settings.showSizes && item.metadata?.size && (
        <div style={{ fontSize: 10, color: "#ccc", flexShrink: 0, fontFamily: "monospace" }}>{(item.metadata.size / 1024 / 1024).toFixed(1)}MB</div>
      )}
      {!item.isFolder && fav && <Heart size={11} fill={accent} color={accent} style={{ flexShrink: 0, opacity: 0.85 }} />}
      {!item.isFolder && (
        <TrackDotMenu song={item} playlists={playlists} isFav={fav}
          onPlay={onPlay} onFavorite={onFavorite} onDownload={onDownload} onAddToPlaylist={onAddToPlaylist} />
      )}
      {!item.isFolder && showRemove && (
        <button onClick={e => { e.stopPropagation(); onRemoveFromPlaylist(item.name); }} className="vbtn vbtn-ghost" style={{ padding: 4, flexShrink: 0 }}><Trash2 size={12} /></button>
      )}
      {item.isFolder && <ChevronRight size={13} color="#ccc" style={{ flexShrink: 0 }} />}
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function App() {
  const supabase = useSupabase();
  const isMobile = useIsMobile();

  const [items,            setItems]            = useState([]);
  const [currentPath,      setCurrentPath]      = useState("");
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState("");
  const [currentSong,      setCurrentSong]      = useState(null);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [progress,         setProgress]         = useState(0);
  const [currentTime,      setCurrentTime]      = useState(0);
  const [duration,         setDuration]         = useState(0);
  const [repeat,           setRepeat]           = useState(REPEAT_M.NONE);
  const [shuffle,          setShuffle]          = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [view,             setView]             = useState("browser");
  const [showSettings,     setShowSettings]     = useState(false);
  const [showSidebar,      setShowSidebar]      = useState(false);
  const [showReqUpload,    setShowReqUpload]    = useState(false);
  const [showKeyboard,     setShowKeyboard]     = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [playlists,        setPlaylists]        = useState(() => loadLocal("playlists", []));
  const [favorites,        setFavorites]        = useState(() => loadLocal("favorites", []));
  const [history,          setHistory]          = useState(() => loadLocal("playHistory", []));
  const [durations,        setDurations]        = useState({});
  const [showNewPL,        setShowNewPL]        = useState(false);
  const [newPLName,        setNewPLName]        = useState("");
  const [seekDragging,     setSeekDragging]     = useState(false);
  const [showNowPlaying,   setShowNowPlaying]   = useState(false);
  const [dlProgress,       setDlProgress]       = useState({});
  const [toast,            setToast]            = useState(null);

  const [settings, setSettings] = useState(() => loadLocal("settings", {
    autoplay: true, crossfade: false, showDurations: true, showSizes: false,
    visualizer: true, compactRows: false, showTrackNums: true,
    sleepMins: 0, accent: "#000000", foldersOnly: false, sortOrder: "asc",
    accentBar: false, showWaveform: false, fontId: "syne", playbackSpeed: 1,
  }));

  const sleepRef   = useRef(null);
  const audioRef   = useRef(null);
  const seekBarRef = useRef(null);
  const durCache   = useRef({});
  const durQueue   = useRef([]);
  const durLoading = useRef(false);
  const toastRef   = useRef(null);

  const activeFont = FONTS.find(f => f.id === settings.fontId) || FONTS[1];
  const accent     = settings.accent || "#000000";

  /* ── Toast ── */
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ── Font loader ── */
  useEffect(() => {
    const id = "dynamic-font-link";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("link"); el.id = id; el.rel = "stylesheet"; document.head.appendChild(el); }
    el.href = activeFont.google
      ? `https://fonts.googleapis.com/css2?family=${activeFont.google}&display=swap`
      : "https://cdn.jsdelivr.net/npm/opendyslexic@latest/opendyslexic.min.css";
  }, [activeFont]);

  /* ── Playback speed sync ── */
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = settings.playbackSpeed || 1;
  }, [settings.playbackSpeed]);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => saveLocal("playlists",   playlists), [playlists]);
  useEffect(() => saveLocal("favorites",   favorites), [favorites]);
  useEffect(() => saveLocal("settings",    settings),  [settings]);
  useEffect(() => saveLocal("playHistory", history),   [history]);

  useEffect(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (settings.sleepMins > 0)
      sleepRef.current = setTimeout(() => setIsPlaying(false), settings.sleepMins * 60 * 1000);
    return () => clearTimeout(sleepRef.current);
  }, [settings.sleepMins, isPlaying]);

  const processDurQueue = useCallback(() => {
    if (durLoading.current || durQueue.current.length === 0) return;
    durLoading.current = true;
    const song = durQueue.current.shift();
    if (!song || durCache.current[song.name]) { durLoading.current = false; processDurQueue(); return; }
    const a = new Audio(); a.preload = "metadata"; a.src = song.url;
    const done = () => { durLoading.current = false; setTimeout(processDurQueue, 60); };
    a.onloadedmetadata = () => { durCache.current[song.name] = a.duration; setDurations(d => ({ ...d, [song.name]: a.duration })); done(); };
    a.onerror = done;
  }, []);

  const fetchItems = useCallback(async (path = "") => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.storage.from(BUCKET).list(path, {
        limit: 200, sortBy: { column: "name", order: settings.sortOrder === "desc" ? "desc" : "asc" }
      });
      if (data) {
        const formatted = data.map(item => {
          const isFolder = !item.metadata;
          let url = "";
          if (!isFolder) {
            const fp = path ? `${path}/${item.name}` : item.name;
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fp);
            url = publicUrl;
          }
          return { ...item, isFolder, title: item.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "), url };
        });
        setItems(formatted);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.active?.postMessage({ type: "CACHE_SONGS", songs: formatted.filter(i => !i.isFolder).map(i => ({ url: i.url, name: i.name })) });
          }).catch(() => {});
        }
        const toLoad = formatted.filter(i => !i.isFolder && !durCache.current[i.name]);
        durQueue.current = [...durQueue.current, ...toLoad];
        processDurQueue();
      }
    } finally { setLoading(false); }
  }, [supabase, settings.sortOrder, processDurQueue]);

  useEffect(() => { fetchItems(currentPath); }, [supabase, currentPath, fetchItems]);

  /* ── Audio playback ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.url) return;
    if (isPlaying) {
      if (audio.src !== currentSong.url) { audio.src = currentSong.url; audio.load(); }
      audio.playbackRate = settings.playbackSpeed || 1;
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong, settings.playbackSpeed]);

  const songs = items.filter(i => !i.isFolder);

  const playSong = useCallback((song) => {
    if (currentSong?.name === song.name) { setIsPlaying(p => !p); return; }
    setCurrentSong(song); setIsPlaying(true);
    if (isMobile) setShowNowPlaying(true);
    setHistory(prev => [song, ...prev.filter(s => s.name !== song.name)].slice(0, MAX_HISTORY));
  }, [currentSong, isMobile]);

  const getQueue = useCallback(() => {
    if (view === "favorites") return favorites;
    if (view === "history")   return history;
    if (view === "playlist" && activePlaylistId != null)
      return playlists.find(p => p.id === activePlaylistId)?.songs || [];
    return songs;
  }, [view, favorites, history, activePlaylistId, playlists, songs]);

  const handleNext = useCallback(() => {
    const q = getQueue(); if (!q.length) return;
    if (repeat === REPEAT_M.ONE) { const a = audioRef.current; a.currentTime = 0; a.play(); return; }
    if (shuffle) { setCurrentSong(q[Math.floor(Math.random() * q.length)]); setIsPlaying(true); return; }
    const ci = q.findIndex(s => s.name === currentSong?.name);
    const ni = (ci + 1) % q.length;
    if (ni === 0 && repeat === REPEAT_M.NONE) { setIsPlaying(false); return; }
    setCurrentSong(q[ni]); setIsPlaying(true);
  }, [repeat, shuffle, getQueue, currentSong]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) { if (audioRef.current) audioRef.current.currentTime = 0; return; }
    const q = getQueue(); if (!q.length) return;
    const ci = q.findIndex(s => s.name === currentSong?.name);
    setCurrentSong(q[(ci - 1 + q.length) % q.length]); setIsPlaying(true);
  }, [currentTime, getQueue, currentSong]);

  /* ── Keyboard shortcuts ── */
  const isFav = useCallback((song) => favorites.some(s => s?.name === song?.name), [favorites]);

  const toggleFav = useCallback((song) => {
    setFavorites(prev => {
      const exists = prev.some(s => s.name === song.name);
      return exists ? prev.filter(s => s.name !== song.name) : [...prev, song];
    });
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (document.activeElement.tagName === "INPUT") return;
      if (e.code === "Space")      { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === "ArrowRight") handleNext();
      if (e.code === "ArrowLeft")  handlePrev();
      if (e.key === "s" || e.key === "S") { setShuffle(p => !p); }
      if (e.key === "r" || e.key === "R") setRepeat(r => r === REPEAT_M.NONE ? REPEAT_M.ALL : r === REPEAT_M.ALL ? REPEAT_M.ONE : REPEAT_M.NONE);
      if (e.key === "k" || e.key === "K") setShowKeyboard(p => !p);
      if ((e.key === "f" || e.key === "F") && currentSong) {
        const was = favorites.some(s => s?.name === currentSong.name);
        toggleFav(currentSong);
        showToast(was ? "Removed from favorites" : "Added to favorites ♥", "success");
      }
      if ((e.key === "d" || e.key === "D") && currentSong) downloadSong(currentSong);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleNext, handlePrev, currentSong, favorites, toggleFav, showToast]);

  const handleSeek = useCallback((clientX) => {
    if (!seekBarRef.current || !duration) return;
    const r = seekBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    if (audioRef.current) audioRef.current.currentTime = pct * duration;
  }, [duration]);

  const createPlaylist = () => {
    if (!newPLName.trim()) return;
    setPlaylists(prev => [...prev, { id: Date.now(), name: newPLName.trim(), songs: [], created: new Date().toLocaleDateString() }]);
    setNewPLName(""); setShowNewPL(false);
    showToast("Playlist created!", "success");
  };
  const addToPlaylist = (song, plId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== plId) return p;
      if (p.songs.some(s => s.name === song.name)) return p;
      return { ...p, songs: [...p.songs, song] };
    }));
    showToast("Added to playlist", "success");
  };
  const removeFromPlaylist = (songName, plId) => setPlaylists(prev => prev.map(p =>
    p.id === plId ? { ...p, songs: p.songs.filter(s => s.name !== songName) } : p
  ));
  const deletePlaylist = (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) { setView("browser"); setActivePlaylistId(null); }
  };

  /* ── Download with progress ── */
  const downloadSong = async (song) => {
    setDlProgress(p => ({ ...p, [song.name]: 0 }));
    showToast("Starting download…", "info");
    try {
      const res = await fetch(song.url);
      if (!res.ok) throw new Error("Fetch failed");
      const total  = parseInt(res.headers.get("content-length") || "0", 10);
      const reader = res.body.getReader();
      const chunks = []; let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); loaded += value.length;
        if (total > 0) setDlProgress(p => ({ ...p, [song.name]: Math.round((loaded / total) * 100) }));
      }
      const blob = new Blob(chunks, { type: "audio/mpeg" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = song.name; a.click();
      URL.revokeObjectURL(a.href);
      setDlProgress(p => ({ ...p, [song.name]: "done" }));
      showToast("Download complete!", "success");
      setTimeout(() => setDlProgress(p => { const n = { ...p }; delete n[song.name]; return n; }), 3000);
    } catch {
      setDlProgress(p => ({ ...p, [song.name]: "error" }));
      showToast("Download failed", "error");
      setTimeout(() => setDlProgress(p => { const n = { ...p }; delete n[song.name]; return n; }), 3000);
      window.open(song.url, "_blank");
    }
  };

  const settingChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const goBack = () => { const p = currentPath.split("/"); p.pop(); setCurrentPath(p.join("/")); };
  const goHome = () => { setCurrentPath(""); setView("browser"); setActivePlaylistId(null); setSearch(""); };

  const getDisplayList = () => {
    if (view === "favorites") return favorites;
    if (view === "history")   return history;
    if (view === "playlist" && activePlaylistId != null) return playlists.find(p => p.id === activePlaylistId)?.songs || [];
    let list = search ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())) : items;
    if (settings.foldersOnly && view === "browser" && currentPath === "") list = list.filter(i => i.isFolder);
    return list;
  };

  const displayList    = getDisplayList();
  const RepIcon        = repeat === REPEAT_M.ONE ? Repeat1 : Repeat;
  const rowH           = settings.compactRows ? 44 : 56;
  const isInsideFolder = view === "browser" && currentPath !== "";
  const isNonBrowser   = view !== "browser";

  const sidebarItems = [
    { id: "browser",   label: "Library",   icon: <Folder size={13} /> },
    { id: "favorites", label: "Favorites", icon: <Heart  size={13} />, count: favorites.length },
    { id: "history",   label: "History",   icon: <Clock  size={13} />, count: history.length },
  ];

  const SidebarContent = () => (
    <>
      {sidebarItems.map(item => (
        <button key={item.id} className={`nav-btn${view === item.id && !activePlaylistId ? " active" : ""}`}
          onClick={() => { setView(item.id); setActivePlaylistId(null); if (isMobile) setShowSidebar(false); }}>
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          {(item.count ?? 0) > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 7px", background: view === item.id && !activePlaylistId ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.07)", flexShrink: 0 }}>
              {item.count}
            </span>
          )}
        </button>
      ))}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>Playlists</span>
          <button className="vbtn vbtn-ghost" style={{ padding: 4, borderRadius: 7 }}
            onClick={() => { setShowNewPL(true); if (isMobile) setShowSidebar(false); }}>
            <Plus size={12} />
          </button>
        </div>
        {playlists.map(pl => (
          <div key={pl.id} style={{ position: "relative" }}>
            <button className={`nav-btn${view === "playlist" && activePlaylistId === pl.id ? " active" : ""}`}
              onClick={() => { setView("playlist"); setActivePlaylistId(pl.id); if (isMobile) setShowSidebar(false); }}
              style={{ paddingRight: 32, fontSize: 12 }}>
              <List size={12} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
              <span style={{ fontSize: 9, color: view === "playlist" && activePlaylistId === pl.id ? "rgba(255,255,255,0.55)" : "#bbb", flexShrink: 0 }}>{pl.songs.length}</span>
            </button>
            <button onClick={() => deletePlaylist(pl.id)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, display: "flex", alignItems: "center", borderRadius: 6, transition: "color 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#e74c3c"}
              onMouseLeave={e => e.currentTarget.style.color = "#ccc"}>
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {playlists.length === 0 && <div style={{ fontSize: 11, color: "#ccc", padding: "4px 12px", fontStyle: "italic" }}>No playlists yet</div>}
      </div>
      {history.length > 0 && (
        <button onClick={() => { setHistory([]); showToast("History cleared", "info"); }} className="vbtn vbtn-ghost" style={{ width: "100%", justifyContent: "center", gap: 5, fontSize: 11, marginTop: 14, padding: "6px", borderRadius: 8 }}>
          <Clock size={10} /> Clear History
        </button>
      )}
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%;overflow:hidden}
        body{
          background:#eceae3;
          background-image:
            radial-gradient(ellipse 80% 60% at 5% 95%, rgba(255,218,80,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 95% 5%,  rgba(140,195,255,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 35% 25% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%);
          color:#1a1a1a; font-family:${activeFont.stack};
        }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:4px}

        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(22px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
        @keyframes slideUpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.88) translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}

        /* ── Vercel button system ── */
        .vbtn{
          display:inline-flex;align-items:center;justify-content:center;
          font-family:inherit;font-size:12px;font-weight:700;
          padding:6px 12px;border-radius:8px;cursor:pointer;
          border:1px solid transparent;transition:all 0.13s;gap:5px;
          white-space:nowrap;user-select:none;-webkit-tap-highlight-color:transparent;
          letter-spacing:-0.01em;
        }
        .vbtn:disabled{opacity:0.45;cursor:not-allowed;pointer-events:none}
        .vbtn-primary{
          background:#000;color:#fff;border-color:#000;
          box-shadow:0 0 0 1px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.2),0 2px 0 #000 inset,2px 2px 0 #000
        }
        .vbtn-primary:hover{background:#111;box-shadow:0 0 0 1px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.22),0 2px 0 #000 inset,3px 3px 0 #000}
        .vbtn-primary:active{transform:translate(1px,1px);box-shadow:0 0 0 1px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.14),1px 1px 0 #000}
        .vbtn-ghost{
          background:rgba(255,255,255,0.62);color:#444;
          border-color:rgba(0,0,0,0.09);
          box-shadow:0 0 0 1px rgba(0,0,0,0.03),0 1px 3px rgba(0,0,0,0.07),1px 1px 0 rgba(0,0,0,0.06);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
        }
        .vbtn-ghost:hover{background:rgba(255,255,255,0.92);color:#000;border-color:rgba(0,0,0,0.16);box-shadow:0 0 0 1px rgba(0,0,0,0.04),0 2px 8px rgba(0,0,0,0.09),2px 2px 0 rgba(0,0,0,0.07)}
        .vbtn-ghost:active{transform:translate(1px,1px)}
        .vbtn-accent{
          background:${accent};color:#fff;border-color:${accent};
          box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 1px 4px ${accent}44,2px 2px 0 ${accent}99
        }
        .vbtn-accent:hover{opacity:0.86;box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 3px 10px ${accent}44,3px 3px 0 ${accent}99}

        /* ── Glass ── */
        .glass{
          background:rgba(255,255,255,0.48);
          backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
          border:1px solid rgba(255,255,255,0.78);
          box-shadow:0 1px 0 rgba(255,255,255,0.6) inset;
        }

        /* ── Track rows ── */
        .track-row{
          display:flex;align-items:center;gap:10px;padding:0 12px;cursor:pointer;
          border-radius:12px;margin:2px 8px;border:1px solid transparent;
          transition:background 0.13s,border-color 0.13s,transform 0.13s,box-shadow 0.13s;
          animation:slideIn 0.22s ease both;
          position:relative;-webkit-tap-highlight-color:transparent;
        }
        .track-row:hover{background:rgba(255,255,255,0.7);border-color:rgba(0,0,0,0.07)}
        @media(hover:hover){
          .track-row:hover{transform:translateX(2px)}
          .track-row.playing:hover{transform:none}
          .track-row .dot-menu-btn{opacity:0;transition:opacity 0.12s}
          .track-row:hover .dot-menu-btn{opacity:1}
        }
        @media(hover:none){.track-row .dot-menu-btn{opacity:1}}
        .track-row.playing{
          background:rgba(255,255,255,0.9);
          border-color:rgba(0,0,0,0.14);
          box-shadow:0 0 0 1px rgba(0,0,0,0.03),0 2px 12px rgba(0,0,0,0.08),3px 3px 0 #000;
          transform:none;
        }

        .icon-btn{background:none;border:none;cursor:pointer;color:#bbb;display:flex;align-items:center;justify-content:center;border-radius:9px;padding:7px;transition:all 0.12s;font-family:inherit;-webkit-tap-highlight-color:transparent}
        .icon-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.06)}

        .ctrl-btn{
          background:none;border:none;cursor:pointer;color:#999;
          display:flex;align-items:center;justify-content:center;
          border-radius:50%;width:40px;height:40px;min-width:40px;
          transition:color 0.13s,background 0.13s,transform 0.1s;flex-shrink:0;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-btn:hover{color:#000;background:rgba(0,0,0,0.07);transform:scale(1.1)}
        .ctrl-btn:active{transform:scale(0.92)}
        .ctrl-btn.active{color:${accent}}

        /* ── Floating pill player ── */
        .player-pill{
          background:rgba(255,255,255,0.84);
          backdrop-filter:blur(44px);-webkit-backdrop-filter:blur(44px);
          border:1px solid rgba(255,255,255,0.97);
          outline:1px solid rgba(0,0,0,0.06);
          border-radius:999px;
          box-shadow:0 0 0 1px rgba(0,0,0,0.04),0 8px 32px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.07),${settings.accentBar ? `0 0 0 2px ${accent}22` : ""};
        }
        .play-btn{
          width:46px;height:46px;min-width:46px;border-radius:50%;
          border:2px solid ${accent};background:${accent};color:#fff;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 1px rgba(0,0,0,0.05),0 2px 10px ${accent}44,2px 2px 0 ${accent}88;
          transition:all 0.13s;flex-shrink:0;-webkit-tap-highlight-color:transparent;
        }
        .play-btn:hover{transform:scale(1.1);box-shadow:0 0 0 1px rgba(0,0,0,0.05),0 4px 18px ${accent}55,4px 4px 0 ${accent}88}
        .play-btn:active{transform:scale(0.92);box-shadow:0 0 0 1px rgba(0,0,0,0.05),0 1px 4px ${accent}33}

        .nav-btn{
          display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
          border-radius:10px;border:none;background:transparent;color:#888;
          font-family:inherit;font-size:12.5px;font-weight:700;
          cursor:pointer;transition:all 0.13s;text-align:left;
          -webkit-tap-highlight-color:transparent;
        }
        .nav-btn:hover{color:#1a1a1a;background:rgba(255,255,255,0.5)}
        .nav-btn.active{color:#fff;background:${accent};box-shadow:0 0 0 1px rgba(0,0,0,0.05),0 1px 4px ${accent}44,2px 2px 0 ${accent}88}

        .seek-wrap{
          cursor:pointer;position:relative;overflow:hidden;
          height:${settings.showWaveform ? "7px" : "4px"};
          background:rgba(0,0,0,0.07);border-radius:999px;
          transition:height 0.15s;
        }
        .seek-wrap:hover{height:${settings.showWaveform ? "9px" : "7px"}}
        .seek-fill{position:absolute;left:0;top:0;height:100%;background:${accent};pointer-events:none;transition:width 0.1s linear;border-radius:999px}

        input[type=text]{
          background:rgba(255,255,255,0.7);border:1.5px solid rgba(0,0,0,0.1);
          border-radius:10px;padding:9px 12px;font-family:inherit;font-size:13px;
          font-weight:600;outline:none;color:#1a1a1a;width:100%;
          backdrop-filter:blur(12px);
        }
        input[type=text]:focus{border-color:#000;box-shadow:0 0 0 3px rgba(0,0,0,0.07)}

        .loading-shimmer{
          background:linear-gradient(90deg,rgba(255,255,255,0.3) 25%,rgba(255,255,255,0.65) 50%,rgba(255,255,255,0.3) 75%);
          background-size:200% 100%;animation:shimmer 1.4s infinite;
        }

        /* ── Mobile bottom sheet ── */
        .bottom-sheet{
          position:fixed;left:0;right:0;bottom:0;z-index:160;
          background:rgba(255,255,255,0.95);
          backdrop-filter:blur(44px);-webkit-backdrop-filter:blur(44px);
          border-top:1px solid rgba(255,255,255,0.9);
          border-radius:22px 22px 0 0;
          box-shadow:0 -2px 40px rgba(0,0,0,0.13),0 -1px 0 rgba(0,0,0,0.06);
          animation:slideUpSheet 0.28s cubic-bezier(0.34,1.2,0.64,1);
          padding:6px 16px env(safe-area-inset-bottom,20px);
          max-height:92vh;overflow-y:auto;
        }
        .sheet-handle{width:36px;height:4px;border-radius:2px;background:rgba(0,0,0,0.12);margin:10px auto 14px;cursor:pointer}

        /* ── Toast notification ── */
        .toast{
          position:fixed;bottom:106px;left:50%;z-index:9999;
          transform:translateX(-50%);
          display:inline-flex;align-items:center;gap:7px;
          padding:9px 18px;border-radius:999px;
          background:rgba(0,0,0,0.88);color:#fff;
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          font-size:13px;font-weight:700;letter-spacing:-0.01em;
          box-shadow:0 4px 24px rgba(0,0,0,0.25);
          animation:toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1);
          white-space:nowrap;max-width:88vw;overflow:hidden;text-overflow:ellipsis;
        }
        .toast.success{background:rgba(15,122,75,0.93)}
        .toast.error{background:rgba(195,36,36,0.93)}

        @media(max-width:767px){
          .ctrl-btn{width:44px;height:44px;min-width:44px}
          .play-btn{width:50px;height:50px;min-width:50px}
          .track-row{margin:2px 4px}
        }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)", transition: "opacity 0.45s ease,transform 0.45s ease" }}>

        {/* ── HEADER ── */}
        <header className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "9px 12px" : "9px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <button onClick={goHome} className="vbtn vbtn-accent" style={{ width: 32, height: 32, padding: 0, borderRadius: 10, flexShrink: 0 }} title="Home">
              <Home size={13} />
            </button>
            {(isInsideFolder || isNonBrowser) && (
              <button onClick={isInsideFolder ? goBack : () => setView("browser")} className="vbtn vbtn-ghost" style={{ gap: 3, fontSize: 12, maxWidth: isMobile ? 80 : 150 }}>
                <ChevronLeft size={12} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isMobile ? "Back" : (isInsideFolder ? currentPath.split("/").at(-1) || "Back" : "Library")}
                </span>
              </button>
            )}
            {/* Vercel-style deployment status badge */}
            {!isMobile && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#000", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", padding: "4px 10px 4px 8px", borderRadius: 8, fontFamily: "'DM Mono',monospace", boxShadow: "1px 1px 0 rgba(0,0,0,0.35)" }}>
                <span style={{ color: "#3ecf8e", fontSize: 9, lineHeight: 1 }}>●</span>
                ▲ MUSIC
              </div>
            )}
            {settings.playbackSpeed !== 1 && <SpeedBadge speed={settings.playbackSpeed} accent={accent} />}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {isMobile && (
              <button className="vbtn vbtn-ghost" style={{ padding: "5px 7px" }} onClick={() => setShowSidebar(true)}>
                <List size={14} />
              </button>
            )}
            {!isMobile && (
              <button onClick={() => setShowKeyboard(true)} className="vbtn vbtn-ghost" style={{ padding: "5px 7px" }} title="Keyboard shortcuts (K)">
                <Keyboard size={13} />
              </button>
            )}
            <button onClick={() => setShowReqUpload(true)} className="vbtn vbtn-ghost" style={{ fontSize: 12, gap: 4 }}>
              <MessageSquarePlus size={12} />
              {!isMobile && "Request / Upload"}
            </button>
            <button className="vbtn vbtn-ghost" style={{ padding: "5px 7px" }} onClick={() => setShowSettings(true)}>
              <Settings size={13} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left sidebar — desktop */}
          {!isMobile && (
            <div className="glass" style={{ width: 192, flexShrink: 0, display: "flex", flexDirection: "column", padding: "12px 9px", gap: 2, borderRight: "1px solid rgba(255,255,255,0.55)", overflowY: "auto" }}>
              <SidebarContent />
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ padding: isMobile ? "7px 10px" : "8px 14px", flexShrink: 0, display: "flex", alignItems: "center", gap: 7, borderBottom: "1px solid rgba(0,0,0,0.05)", minHeight: 48, background: "rgba(255,255,255,0.18)" }}>
              {view === "browser" ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 999, padding: "0 12px", height: 35, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
                  <Search size={12} color="#bbb" style={{ flexShrink: 0 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tracks…"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "#1a1a1a", fontFamily: "inherit", padding: 0, minWidth: 0 }} />
                  {search && <button onClick={() => setSearch("")} className="icon-btn" style={{ padding: 2 }}><X size={11} /></button>}
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {view === "favorites" ? "Favorites" : view === "history" ? "Recently Played" : playlists.find(p => p.id === activePlaylistId)?.name}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(0,0,0,0.07)", padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800, color: "#888", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                    {view === "favorites" ? favorites.length : view === "history" ? history.length : playlists.find(p => p.id === activePlaylistId)?.songs.length ?? 0}
                  </div>
                </div>
              )}
              {view === "browser" && (
                <button className="vbtn vbtn-ghost" style={{ padding: "5px 7px", borderRadius: 999, flexShrink: 0 }} onClick={() => fetchItems(currentPath)}>
                  <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                </button>
              )}
            </div>

            {/* Track list */}
            <div style={{ flex: 1, overflowY: "auto", padding: `6px 0 ${isMobile ? "144px" : "12px"}` }}>
              {loading && view === "browser" ? (
                <div style={{ padding: "8px" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="loading-shimmer" style={{ height: rowH, borderRadius: 12, margin: "2px 8px", animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
              ) : displayList.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 13, color: "#bbb", animation: "fadeIn 0.3s ease" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    {view === "favorites" ? <Heart size={22} color="#d8d3cb" /> : view === "history" ? <Clock size={22} color="#d8d3cb" /> : view === "playlist" ? <List size={22} color="#d8d3cb" /> : <Folder size={22} color="#d8d3cb" />}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#bbb", marginBottom: 4 }}>
                      {view === "favorites" ? "No favorites yet" : view === "history" ? "Nothing played yet" : view === "playlist" ? "This playlist is empty" : search ? `No results for "${search}"` : "No tracks found"}
                    </div>
                    <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600 }}>
                      {(view === "favorites" || view === "playlist") ? "Tap ··· on a track to add it" : ""}
                    </div>
                  </div>
                </div>
              ) : displayList.map((item, idx) => (
                <div key={item.name + idx}>
                  <TrackRow
                    item={item} idx={idx}
                    active={currentSong?.name === item.name}
                    isPlaying={isPlaying} fav={isFav(item)}
                    dur={durations[item.name]}
                    settings={settings} accent={accent} rowH={rowH}
                    delay={Math.min(idx * 0.015, 0.2)}
                    onPlay={playSong}
                    onFolder={() => setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name)}
                    onFavorite={song => { toggleFav(song); showToast(favorites.some(s => s.name === song.name) ? "Removed from favorites" : "Added to favorites ♥", "success"); }}
                    onDownload={downloadSong}
                    onAddToPlaylist={addToPlaylist}
                    onRemoveFromPlaylist={(name) => removeFromPlaylist(name, activePlaylistId)}
                    playlists={playlists}
                    showRemove={view === "playlist" && activePlaylistId != null}
                  />
                  {!item.isFolder && dlProgress[item.name] !== undefined && (
                    <div style={{ margin: "-2px 10px 2px", height: 3, background: "rgba(0,0,0,0.06)", borderRadius: "0 0 5px 5px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: dlProgress[item.name] === "error" ? "#e74c3c" : dlProgress[item.name] === "done" ? "#27ae60" : accent, width: dlProgress[item.name] === "done" || dlProgress[item.name] === "error" ? "100%" : `${dlProgress[item.name]}%`, transition: "width 0.2s linear" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Now Playing sidebar */}
          {!isMobile && currentSong && (
            <div className="glass" style={{ width: 212, flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 14px", gap: 12, overflowY: "auto", borderLeft: "1px solid rgba(255,255,255,0.55)", animation: "slideIn 0.3s ease" }}>
              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, background: "rgba(0,0,0,0.04)", border: `1.5px solid ${accent}44`, boxShadow: `0 0 0 1px rgba(0,0,0,0.03),0 6px 20px ${accent}1a,3px 3px 0 ${accent}55`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {settings.visualizer ? <Visualizer isPlaying={isPlaying} bars={16} color={accent} height={56} /> : <Music size={36} color={accent} />}
              </div>

              {/* Full title — never truncated */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#000", wordBreak: "break-word", lineHeight: 1.4 }}>{currentSong.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#bbb", fontFamily: "'DM Mono',monospace" }}>{currentPath || "Library"}</span>
                    {settings.playbackSpeed !== 1 && <SpeedBadge speed={settings.playbackSpeed} accent={accent} />}
                  </div>
                </div>
                <button onClick={() => { toggleFav(currentSong); showToast(isFav(currentSong) ? "Removed ♥" : "Added to favorites ♥", "success"); }} className="icon-btn" style={{ padding: 4, flexShrink: 0 }}>
                  <Heart size={14} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
                </button>
              </div>

              {/* Stats */}
              <div style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                {[
                  ["Time",    `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}`],
                  ["Shuffle", shuffle ? "On" : "Off"],
                  ["Repeat",  repeat],
                  ...(settings.playbackSpeed !== 1 ? [["Speed", `${settings.playbackSpeed}×`]] : []),
                  ...(settings.sleepMins > 0 ? [["Sleep", `${settings.sleepMins}m`]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "#bbb", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontWeight: 800, fontFamily: "'DM Mono',monospace", color: accent, fontSize: 10 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => downloadSong(currentSong)} className="vbtn vbtn-ghost" style={{ width: "100%", justifyContent: "center", gap: 6, fontSize: 11, borderRadius: 10 }}>
                <Download size={12} />
                {dlProgress[currentSong.name] !== undefined ? (dlProgress[currentSong.name] === "done" ? "Done!" : dlProgress[currentSong.name] === "error" ? "Error" : `${dlProgress[currentSong.name]}%`) : "Download"}
              </button>
              {dlProgress[currentSong.name] !== undefined && typeof dlProgress[currentSong.name] === "number" && (
                <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: -8 }}>
                  <div style={{ height: "100%", background: accent, width: `${dlProgress[currentSong.name]}%`, transition: "width 0.2s linear" }} />
                </div>
              )}

              {playlists.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Add to Playlist</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {playlists.map(pl => {
                      const added = pl.songs.some(s => s.name === currentSong.name);
                      return (
                        <button key={pl.id} onClick={() => !added && addToPlaylist(currentSong, pl.id)} disabled={added}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "7px 10px", borderRadius: 9, border: `1px solid ${added ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.08)"}`, background: added ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, cursor: added ? "default" : "pointer", color: added ? "#bbb" : "#444", fontFamily: "inherit", transition: "all 0.12s" }}
                          onMouseEnter={e => { if (!added) e.currentTarget.style.background = "rgba(255,255,255,0.85)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = added ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.55)"; }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
                          {added ? <Check size={10} color="#bbb" /> : <Plus size={10} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FLOATING PILL PLAYER BAR ── */}
        <div style={{ flexShrink: 0, padding: isMobile ? "0 10px 18px" : "0 14px 14px", background: "transparent" }}>
          {/* Seek bar — above pill */}
          <div ref={seekBarRef} className="seek-wrap"
            style={{ cursor: duration ? "pointer" : "default", margin: "0 6px 8px" }}
            onClick={e => handleSeek(e.clientX)}
            onMouseMove={e => seekDragging && handleSeek(e.clientX)}
            onMouseDown={() => setSeekDragging(true)} onMouseUp={() => setSeekDragging(false)} onMouseLeave={() => setSeekDragging(false)}
            onTouchStart={e => { setSeekDragging(true); handleSeek(e.touches[0].clientX); }}
            onTouchMove={e => seekDragging && handleSeek(e.touches[0].clientX)}
            onTouchEnd={() => setSeekDragging(false)}>
            <div className="seek-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* The pill */}
          <div className="player-pill" style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 10, height: isMobile ? 58 : 62, padding: `0 ${isMobile ? "10px" : "14px"}` }}>

            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: isMobile ? 7 : 9 }}>
              <div onClick={isMobile && currentSong ? () => setShowNowPlaying(p => !p) : undefined}
                style={{ width: isMobile ? 33 : 37, height: isMobile ? 33 : 37, borderRadius: 999, flexShrink: 0, background: currentSong ? accent : "rgba(0,0,0,0.07)", border: `1.5px solid ${currentSong ? accent : "rgba(0,0,0,0.07)"}`, boxShadow: currentSong ? `0 2px 8px ${accent}33` : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: isMobile && currentSong ? "pointer" : "default" }}>
                <Music size={12} color={currentSong ? "#fff" : "#bbb"} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                  {currentSong?.title ?? "Nothing playing"}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
                  {currentSong ? `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}` : "Pick a track"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 2 }}>
              {!isMobile && <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} title="Shuffle (S)"><Shuffle size={14} /></button>}
              <button className="ctrl-btn" onClick={handlePrev} title="Previous (←)"><SkipBack size={isMobile ? 18 : 17} /></button>
              <button className="play-btn" onClick={() => setIsPlaying(p => !p)} title="Play/Pause (Space)">
                {isPlaying ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" style={{ marginLeft: 2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next (→)"><SkipForward size={isMobile ? 18 : 17} /></button>
              {!isMobile && <button className={`ctrl-btn${repeat !== REPEAT_M.NONE ? " active" : ""}`} onClick={() => setRepeat(r => r === REPEAT_M.NONE ? REPEAT_M.ALL : r === REPEAT_M.ALL ? REPEAT_M.ONE : REPEAT_M.NONE)} title="Repeat (R)"><RepIcon size={14} /></button>}
            </div>

            {/* Right */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
              {settings.sleepMins > 0 && !isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#aaa", fontFamily: "'DM Mono',monospace", background: "rgba(0,0,0,0.05)", padding: "3px 8px", borderRadius: 20 }}>
                  <Moon size={9} />{settings.sleepMins}m
                </div>
              )}
              {currentSong && !isMobile && (
                <>
                  <button onClick={() => downloadSong(currentSong)} className="icon-btn" style={{ padding: 5 }} title="Download (D)"><Download size={13} /></button>
                  <button onClick={() => { toggleFav(currentSong); showToast(isFav(currentSong) ? "Removed ♥" : "Added to favorites ♥", "success"); }} className="icon-btn" style={{ padding: 5 }} title="Favorite (F)">
                    <Heart size={13} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#bbb"} />
                  </button>
                </>
              )}
              {isMobile && (
                <>
                  <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} style={{ width: 36, height: 36, minWidth: 36 }}><Shuffle size={13} /></button>
                  <button className={`ctrl-btn${repeat !== REPEAT_M.NONE ? " active" : ""}`} onClick={() => setRepeat(r => r === REPEAT_M.NONE ? REPEAT_M.ALL : r === REPEAT_M.ALL ? REPEAT_M.ONE : REPEAT_M.NONE)} style={{ width: 36, height: 36, minWidth: 36 }}><RepIcon size={13} /></button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM SHEET ── */}
      {isMobile && showNowPlaying && currentSong && (
        <div className="bottom-sheet">
          <div className="sheet-handle" onClick={() => setShowNowPlaying(false)} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#999", letterSpacing: "0.07em", textTransform: "uppercase" }}>Now Playing</span>
              {settings.playbackSpeed !== 1 && <SpeedBadge speed={settings.playbackSpeed} accent={accent} />}
            </div>
            <button onClick={() => setShowNowPlaying(false)} className="icon-btn" style={{ padding: 4 }}><X size={15} /></button>
          </div>

          {/* Art + full title */}
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ width: 70, height: 70, borderRadius: 14, flexShrink: 0, background: "rgba(0,0,0,0.04)", border: `1.5px solid ${accent}44`, boxShadow: `0 4px 16px ${accent}1a,3px 3px 0 ${accent}55`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {settings.visualizer ? <Visualizer isPlaying={isPlaying} bars={8} color={accent} height={40} /> : <Music size={26} color={accent} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Full title — wordBreak, no truncation */}
              <div style={{ fontSize: 15, fontWeight: 800, color: "#000", wordBreak: "break-word", lineHeight: 1.35 }}>{currentSong.title}</div>
              <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{currentPath || "Library"} · {fmt(durations[currentSong.name] || duration)}</div>
            </div>
          </div>

          {/* Playback controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 14 }}>
            <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)}><Shuffle size={16} /></button>
            <button className="ctrl-btn" onClick={handlePrev}><SkipBack size={22} /></button>
            <button className="play-btn" style={{ width: 58, height: 58, minWidth: 58 }} onClick={() => setIsPlaying(p => !p)}>
              {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: 2 }} />}
            </button>
            <button className="ctrl-btn" onClick={handleNext}><SkipForward size={22} /></button>
            <button className={`ctrl-btn${repeat !== REPEAT_M.NONE ? " active" : ""}`} onClick={() => setRepeat(r => r === REPEAT_M.NONE ? REPEAT_M.ALL : r === REPEAT_M.ALL ? REPEAT_M.ONE : REPEAT_M.NONE)}><RepIcon size={16} /></button>
          </div>

          {/* Speed picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>Speed</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => settingChange("playbackSpeed", s)}
                  className={settings.playbackSpeed === s ? "vbtn vbtn-primary" : "vbtn vbtn-ghost"}
                  style={{ fontSize: 11, padding: "4px 9px", borderRadius: 20 }}>
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Favorite + download */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => { toggleFav(currentSong); showToast(isFav(currentSong) ? "Removed ♥" : "Added to favorites ♥", "success"); }} className="vbtn vbtn-ghost" style={{ flex: 2, justifyContent: "center", gap: 6, fontSize: 12, padding: "10px", borderRadius: 999 }}>
              <Heart size={13} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#555"} />
              {isFav(currentSong) ? "Unfavorite" : "Favorite"}
            </button>
            <button onClick={() => downloadSong(currentSong)} className="vbtn vbtn-ghost" style={{ flex: 1, justifyContent: "center", gap: 5, fontSize: 11, padding: "10px 8px", borderRadius: 999 }}>
              <Download size={12} />
              {dlProgress[currentSong.name] !== undefined ? (dlProgress[currentSong.name] === "done" ? "✓" : dlProgress[currentSong.name] === "error" ? "!" : `${dlProgress[currentSong.name]}%`) : "DL"}
            </button>
          </div>
          {dlProgress[currentSong.name] !== undefined && typeof dlProgress[currentSong.name] === "number" && (
            <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", background: accent, width: `${dlProgress[currentSong.name]}%`, transition: "width 0.2s linear" }} />
            </div>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Add to Playlist</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {playlists.map(pl => {
                  const added = pl.songs.some(s => s.name === currentSong.name);
                  return (
                    <button key={pl.id} onClick={() => !added && addToPlaylist(currentSong, pl.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, border: `1px solid ${added ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.08)"}`, background: added ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, cursor: added ? "default" : "pointer", color: added ? "#bbb" : "#333", fontFamily: "inherit" }}>
                      <span>{pl.name}</span>
                      {added ? <Check size={13} color="#bbb" /> : <Plus size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MOBILE SIDEBAR ── */}
      {isMobile && showSidebar && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 178, background: "rgba(0,0,0,0.26)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} onClick={() => setShowSidebar(false)} />
          <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 216, zIndex: 180, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(44px)", WebkitBackdropFilter: "blur(44px)", borderRight: "1px solid rgba(255,255,255,0.9)", boxShadow: "4px 0 32px rgba(0,0,0,0.1)", padding: "12px 10px", overflowY: "auto", animation: "slideInLeft 0.22s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#000", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", padding: "4px 10px 4px 8px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>
                <span style={{ color: "#3ecf8e", fontSize: 9 }}>●</span> ▲ MENU
              </div>
              <button onClick={() => setShowSidebar(false)} className="icon-btn" style={{ padding: 4 }}><X size={14} /></button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {showSettings && <SettingsPanel settings={settings} onChange={settingChange} onClose={() => setShowSettings(false)} />}
      {showReqUpload && <RequestUploadModal onClose={() => setShowReqUpload(false)} supabase={supabase} onRefresh={() => fetchItems(currentPath)} />}
      {showKeyboard  && <KeyboardModal onClose={() => setShowKeyboard(false)} />}

      {showNewPL && (
        <Modal onClose={() => setShowNewPL(false)} title="New Playlist" width="min(380px,93vw)">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Playlist name</label>
              <input type="text" value={newPLName} onChange={e => setNewPLName(e.target.value)} placeholder="e.g. Chill Vibes" autoFocus onKeyDown={e => e.key === "Enter" && createPlaylist()} />
            </div>
            <button onClick={createPlaylist} className="vbtn vbtn-primary" style={{ justifyContent: "center", gap: 7, padding: "12px", borderRadius: 12, fontSize: 13 }}>
              <FolderPlus size={14} /> Create Playlist
            </button>
          </div>
        </Modal>
      )}

      {/* ── TOAST ── */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <audio ref={audioRef} src={currentSong?.url || ""} preload="auto"
        onTimeUpdate={() => { const el = audioRef.current; if (!el) return; setCurrentTime(el.currentTime); setProgress((el.currentTime / el.duration) * 100 || 0); }}
        onLoadedMetadata={() => { const el = audioRef.current; if (!el) return; setDuration(el.duration ?? 0); el.playbackRate = settings.playbackSpeed || 1; }}
        onEnded={handleNext} />
    </>
  );
}
