import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Search, Settings, X, ChevronLeft, Music, Folder, List, Code,
  MessageSquarePlus, RefreshCw, ChevronRight, Info, Download,
  Plus, Trash2, FolderPlus, Heart, Sliders, Moon, Check,
  MoreHorizontal, SortAsc, SortDesc, EyeOff, Home, Type
} from "lucide-react";

/* ─── CONFIG ──────────────────────────────────────────────── */
const GITHUB_URL        = "https://github.com/NOTAM-bobk/supabase-music/tree/main";
const REQUEST_URL       = "https://docs.google.com/forms/d/e/1FAIpQLSeJZ1qbaUQluhCYTOApX9g7JIDY6AQ4zD3ylS_k31L8NrvhEA/viewform?usp=publish-editor";
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET            = "songs";
const REPEAT            = { NONE: "none", ALL: "all", ONE: "one" };

const FONTS = [
  { id: "syne",         label: "Syne",          stack: "'Syne', sans-serif",               google: "Syne:wght@400;600;700;800" },
  { id: "dm-mono",      label: "DM Mono",       stack: "'DM Mono', monospace",             google: "DM+Mono:wght@400;500" },
  { id: "space",        label: "Space Grotesk", stack: "'Space Grotesk', sans-serif",      google: "Space+Grotesk:wght@400;600;700" },
  { id: "fraunces",     label: "Fraunces",      stack: "'Fraunces', serif",                google: "Fraunces:wght@400;600;700;800" },
  { id: "cabinet",      label: "Outfit",        stack: "'Outfit', sans-serif",             google: "Outfit:wght@400;600;700;800" },
  { id: "jetbrains",    label: "JetBrains Mono",stack: "'JetBrains Mono', monospace",     google: "JetBrains+Mono:wght@400;600;700" },
  { id: "playfair",     label: "Playfair",      stack: "'Playfair Display', serif",        google: "Playfair+Display:wght@400;700;800" },
  { id: "bricolage",    label: "Bricolage",     stack: "'Bricolage Grotesque', sans-serif",google: "Bricolage+Grotesque:wght@400;600;700;800" },
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
    const ctx = c.getContext("2d");
    const bw  = c.width / bars;
    const rand = () => {
      for (let i = 0; i < bars; i++)
        tg.current[i] = isPlaying ? Math.random() * 0.85 + 0.1 : 0.05;
    };
    rand();
    const iv = setInterval(rand, 190);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < bars; i++) {
        ht.current[i] += (tg.current[i] - ht.current[i]) * 0.18;
        const h2 = ht.current[i] * c.height;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12 + ht.current[i] * 0.75;
        ctx.beginPath();
        ctx.roundRect(i * bw + 1.5, c.height - h2, bw - 3, h2, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
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
      background: "rgba(240,237,230,0.7)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.18s ease"
    }} onClick={onClose}>
      <div style={{
        width, background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 16,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 8px 40px rgba(0,0,0,0.18), 4px 4px 0 #000",
        overflow: "hidden",
        animation: "slideUp 0.24s cubic-bezier(0.34,1.56,0.64,1)",
        maxHeight: "90vh", display: "flex", flexDirection: "column"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="vbtn vbtn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: "18px 22px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── THREE-DOT MENU ─────────────────────────────────────── */
function TrackDotMenu({ song, playlists, onPlay, onFavorite, isFav, onAddToPlaylist, onDownload }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef          = useRef(null);
  const menuRef         = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r      = btnRef.current.getBoundingClientRect();
      const menuH  = 160 + playlists.length * 36;
      const top    = r.bottom + 4 + menuH > window.innerHeight ? r.top - menuH - 4 : r.bottom + 4;
      const left   = Math.min(r.right - 200, window.innerWidth - 210);
      setPos({ top, left });
    }
    setOpen(p => !p);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="vbtn vbtn-ghost dot-menu-btn"
        title="More options"
        style={{ padding: "4px 6px", borderRadius: 7, flexShrink: 0 }}
        onClick={openMenu}>
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
          minWidth: 200, background: "rgba(255,255,255,0.99)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 12,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.14), 3px 3px 0 #000",
          overflow: "hidden", animation: "popIn 0.16s cubic-bezier(0.34,1.4,0.64,1)"
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: "#000", padding: "8px 13px" }}>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {song.title}
            </div>
          </div>
          {[
            { icon: <Play size={12} />,     label: "Play now",                                        fn: () => { onPlay(song); setOpen(false); } },
            { icon: <Heart size={12} />,    label: isFav ? "Remove from Favorites" : "Add to Favorites", fn: () => { onFavorite(song); setOpen(false); } },
            { icon: <Download size={12} />, label: "Download",                                        fn: () => { onDownload(song); setOpen(false); } },
          ].map((item, i) => (
            <DotMenuItem key={i} icon={item.icon} label={item.label} onClick={item.fn} />
          ))}
          {playlists.length > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "3px 0" }} />
              <div style={{ padding: "5px 13px 3px", fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Add to Playlist
              </div>
              {playlists.map(pl => (
                <DotMenuItem key={pl.id} icon={<Plus size={12} />} label={pl.name}
                  onClick={() => { onAddToPlaylist(song, pl.id); setOpen(false); }} />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

function DotMenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%",
      padding: "8px 13px", border: "none", background: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 600, color: "#222", textAlign: "left",
      fontFamily: "inherit", transition: "background 0.1s"
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}>
      <span style={{ color: "#888", flexShrink: 0, display: "flex" }}>{icon}</span>
      {label}
    </button>
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
            { key: "autoplay",        label: "Autoplay next track",  sub: "Continue playing when a track ends" },
            { key: "crossfade",       label: "Crossfade (visual)",   sub: "Visual smooth transition indicator between tracks" },
            { key: "gaplessPlayback", label: "Gapless playback",     sub: "Minimize silence between tracks" },
            { key: "showDurations",   label: "Show song durations",  sub: "Display track length in the list" },
            { key: "showSizes",       label: "Show file sizes",      sub: "Display file size alongside tracks" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} />
            </SRow>
          ))}
          <SRow label="Sleep timer" sub={settings.sleepMins > 0 ? `Stops playback in ${settings.sleepMins} min` : "Off"}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
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
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} />
            </SRow>
          ))}
          <SRow label="Sort order" sub="How tracks are sorted in the library view">
            <div style={{ display: "flex", gap: 5 }}>
              {[
                { val: "asc",  label: "A → Z", icon: <SortAsc size={11} /> },
                { val: "desc", label: "Z → A", icon: <SortDesc size={11} /> },
              ].map(({ val, label, icon }) => (
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
            { key: "visualizer",   label: "Animated visualizer",  sub: "Bouncing bars in the now-playing sidebar" },
            { key: "accentBar",    label: "Accent player bar",    sub: "Color the bottom player bar with the accent color" },
            { key: "showWaveform", label: "Tall seek bar",        sub: "Taller, more prominent seek bar" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} />
            </SRow>
          ))}
          <SRow label="Accent color" sub="Highlight color used throughout the UI">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {["#000000", "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085", "#e67e22"].map((c, i) => (
                <button key={c + i} onClick={() => onChange("accent", c)} style={{
                  width: 24, height: 24, borderRadius: "50%", background: c,
                  cursor: "pointer", padding: 0, border: "none", outline: "none",
                  boxShadow: settings.accent === c
                    ? `0 0 0 2px white, 0 0 0 4px ${c}`
                    : "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "transform 0.12s, box-shadow 0.12s"
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
              ))}
              <input type="color" value={settings.accent} onChange={e => onChange("accent", e.target.value)}
                title="Custom color"
                style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", padding: 0, cursor: "pointer", background: "none" }} />
            </div>
          </SRow>
        </div>
      )}

      {tab === "fonts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "#aaa", marginBottom: 4, lineHeight: 1.6 }}>
            Choose the font used throughout the app. Changes apply instantly.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FONTS.map(f => (
              <button key={f.id} onClick={() => onChange("fontId", f.id)}
                style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${settings.fontId === f.id ? "#000" : "rgba(0,0,0,0.1)"}`,
                  background: settings.fontId === f.id ? "#000" : "rgba(0,0,0,0.02)",
                  color: settings.fontId === f.id ? "#fff" : "#333",
                  boxShadow: settings.fontId === f.id ? "2px 2px 0 rgba(0,0,0,0.2)" : "none",
                  fontFamily: f.stack, fontSize: 14, fontWeight: 700,
                  transition: "all 0.13s", textAlign: "left"
                }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, fontWeight: 400 }}>Aa Bb Cc 123</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["How this works", "Audio files live in a Supabase Storage bucket. The browser fetches public URLs and plays them with the native HTML5 Audio API — no backend needed."],
            ["Offline mode", "Once you visit a page, the service worker caches all JS/CSS and audio files. Songs cache the first time they play. After that, everything works offline."],
            ["Playlists", "Playlists are stored locally in your browser. They persist between sessions but are device-specific."],
            ["Download", "Clicking Download fetches the song's public URL and triggers a native browser download."],
            ["Keyboard shortcuts", "Space = Play/Pause · ← → = Prev/Next · ··· = track options"],
          ].map(([title, body]) => (
            <div key={title} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{body}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer"
              className="vbtn vbtn-ghost" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Code size={13} /> View Source
            </a>
            <a href={REQUEST_URL} target="_blank" rel="noreferrer"
              className="vbtn vbtn-primary" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <MessageSquarePlus size={13} /> Request a Song
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, accent = "#000" }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 13,
      border: `2px solid ${value ? accent : "rgba(0,0,0,0.15)"}`,
      cursor: "pointer", background: value ? accent : "transparent",
      position: "relative", transition: "background 0.2s, border-color 0.2s",
      flexShrink: 0, boxShadow: value ? "1px 1px 0 rgba(0,0,0,0.1)" : "none"
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        background: value ? "#fff" : (accent || "#000"),
        position: "absolute", top: 3, left: value ? 22 : 3,
        transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </button>
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

      {/* Track number */}
      {settings.showTrackNums && !item.isFolder && (
        <div style={{ width: 26, flexShrink: 0, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>
          {active && isPlaying
            ? <span style={{ color: accent, fontSize: 13 }}>♪</span>
            : <span>{idx + 1}</span>}
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: item.isFolder
          ? "linear-gradient(135deg,#ffd87a,#ffc233)"
          : active ? "#000" : "rgba(0,0,0,0.05)",
        border: `2px solid ${item.isFolder ? "rgba(184,130,10,0.35)" : active ? "#000" : "rgba(0,0,0,0.08)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? "2px 2px 0 rgba(0,0,0,0.15)" : "none",
        transition: "all 0.15s"
      }}>
        {item.isFolder
          ? <Folder size={14} color="#b8820a" />
          : <Music size={14} color={active ? "#fff" : "#ccc"} />}
      </div>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 800 : 600,
          color: active ? "#000" : "#333",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
        }}>
          {item.title}
        </div>
        {item.isFolder && (
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 1, fontWeight: 600 }}>Folder</div>
        )}
      </div>

      {/* Duration */}
      {!item.isFolder && settings.showDurations && (
        <div style={{ fontSize: 11, color: active ? "#888" : "#ccc", flexShrink: 0, fontFamily: "monospace", minWidth: 36, textAlign: "right" }}>
          {dur ? fmt(dur) : "—"}
        </div>
      )}

      {/* File size */}
      {!item.isFolder && settings.showSizes && item.metadata?.size && (
        <div style={{ fontSize: 10, color: "#ccc", flexShrink: 0, fontFamily: "monospace" }}>
          {(item.metadata.size / 1024 / 1024).toFixed(1)}MB
        </div>
      )}

      {/* Fav dot */}
      {!item.isFolder && fav && (
        <Heart size={11} fill={accent} color={accent} style={{ flexShrink: 0, opacity: 0.85 }} />
      )}

      {/* Three-dot menu */}
      {!item.isFolder && (
        <TrackDotMenu
          song={item} playlists={playlists} isFav={fav}
          onPlay={onPlay} onFavorite={onFavorite}
          onDownload={onDownload} onAddToPlaylist={onAddToPlaylist}
        />
      )}

      {/* Remove from playlist */}
      {!item.isFolder && showRemove && (
        <button onClick={e => { e.stopPropagation(); onRemoveFromPlaylist(item.name); }}
          className="vbtn vbtn-ghost" style={{ padding: 4, flexShrink: 0 }} title="Remove">
          <Trash2 size={12} />
        </button>
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
  const [repeat,           setRepeat]           = useState(REPEAT.NONE);
  const [shuffle,          setShuffle]          = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [view,             setView]             = useState("browser");
  const [showSettings,     setShowSettings]     = useState(false);
  const [showSidebar,      setShowSidebar]      = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [playlists,        setPlaylists]        = useState(() => loadLocal("playlists", []));
  const [favorites,        setFavorites]        = useState(() => loadLocal("favorites", []));
  const [durations,        setDurations]        = useState({});
  const [showNewPL,        setShowNewPL]        = useState(false);
  const [newPLName,        setNewPLName]        = useState("");
  const [seekDragging,     setSeekDragging]     = useState(false);
  const [showNowPlaying,   setShowNowPlaying]   = useState(false);
  const [showAddToPL,      setShowAddToPL]      = useState(false); // mobile add-to-playlist sheet

  const [settings, setSettings] = useState(() => loadLocal("settings", {
    autoplay: true, crossfade: false, gaplessPlayback: false,
    showDurations: true, showSizes: false,
    visualizer: true, compactRows: false, showTrackNums: true,
    sleepMins: 0, accent: "#000000",
    foldersOnly: false, sortOrder: "asc",
    accentBar: false, showWaveform: false,
    fontId: "syne",
  }));

  const sleepRef   = useRef(null);
  const audioRef   = useRef(null);
  const seekBarRef = useRef(null);
  const durCache   = useRef({});
  const durQueue   = useRef([]);
  const durLoading = useRef(false);

  /* Active font */
  const activeFont = FONTS.find(f => f.id === settings.fontId) || FONTS[0];

  /* Load Google Font dynamically */
  useEffect(() => {
    const id   = "dynamic-font-link";
    let el     = document.getElementById(id);
    if (!el) { el = document.createElement("link"); el.id = id; el.rel = "stylesheet"; document.head.appendChild(el); }
    el.href = `https://fonts.googleapis.com/css2?family=${activeFont.google}&display=swap`;
  }, [activeFont.google]);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  useEffect(() => saveLocal("playlists", playlists), [playlists]);
  useEffect(() => saveLocal("favorites", favorites), [favorites]);
  useEffect(() => saveLocal("settings",  settings),  [settings]);

  /* Sleep timer */
  useEffect(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (settings.sleepMins > 0)
      sleepRef.current = setTimeout(() => setIsPlaying(false), settings.sleepMins * 60 * 1000);
    return () => clearTimeout(sleepRef.current);
  }, [settings.sleepMins, isPlaying]);

  /* Batched duration loading */
  const processDurQueue = useCallback(() => {
    if (durLoading.current || durQueue.current.length === 0) return;
    durLoading.current = true;
    const song = durQueue.current.shift();
    if (!song || durCache.current[song.name]) { durLoading.current = false; processDurQueue(); return; }
    const a = new Audio();
    a.preload = "metadata";
    a.src = song.url;
    const done = () => { durLoading.current = false; setTimeout(processDurQueue, 60); };
    a.onloadedmetadata = () => {
      durCache.current[song.name] = a.duration;
      setDurations(d => ({ ...d, [song.name]: a.duration }));
      done();
    };
    a.onerror = done;
  }, []);

  /* Fetch items from Supabase */
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
        /* Tell SW to cache all songs in the background */
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.active?.postMessage({
              type: "CACHE_SONGS",
              songs: formatted.filter(i => !i.isFolder).map(i => ({ url: i.url, name: i.name }))
            });
          });
        }
        /* Queue duration loading */
        const toLoad = formatted.filter(i => !i.isFolder && !durCache.current[i.name]);
        durQueue.current = [...durQueue.current, ...toLoad];
        processDurQueue();
      }
    } finally { setLoading(false); }
  }, [supabase, settings.sortOrder, processDurQueue]);

  useEffect(() => { fetchItems(currentPath); }, [supabase, currentPath, fetchItems]);

  /* ── Audio playback — always use cached URL via SW ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.url) return;
    if (isPlaying) {
      /* Resume if same src, else let the src change trigger load */
      if (audio.src !== currentSong.url) {
        audio.src = currentSong.url;
        audio.load();
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  const songs = items.filter(i => !i.isFolder);

  const playSong = useCallback((song) => {
    if (currentSong?.name === song.name) { setIsPlaying(p => !p); return; }
    setCurrentSong(song);
    setIsPlaying(true);
    if (isMobile) setShowNowPlaying(true);
  }, [currentSong, isMobile]);

  const getQueue = useCallback(() => {
    if (view === "favorites") return favorites;
    if (view === "playlist" && activePlaylistId != null) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      return pl ? pl.songs : [];
    }
    return songs;
  }, [view, favorites, activePlaylistId, playlists, songs]);

  const handleNext = useCallback(() => {
    const q = getQueue(); if (!q.length) return;
    if (repeat === REPEAT.ONE) { const a = audioRef.current; a.currentTime = 0; a.play(); return; }
    if (shuffle) { setCurrentSong(q[Math.floor(Math.random() * q.length)]); setIsPlaying(true); return; }
    const ci = q.findIndex(s => s.name === currentSong?.name);
    const ni = (ci + 1) % q.length;
    if (ni === 0 && repeat === REPEAT.NONE) { setIsPlaying(false); return; }
    setCurrentSong(q[ni]); setIsPlaying(true);
  }, [repeat, shuffle, getQueue, currentSong]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) { if (audioRef.current) audioRef.current.currentTime = 0; return; }
    const q = getQueue(); if (!q.length) return;
    const ci = q.findIndex(s => s.name === currentSong?.name);
    setCurrentSong(q[(ci - 1 + q.length) % q.length]);
    setIsPlaying(true);
  }, [currentTime, getQueue, currentSong]);

  /* Keyboard */
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

  const handleSeek = useCallback((clientX) => {
    if (!seekBarRef.current || !duration) return;
    const r   = seekBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    if (audioRef.current) audioRef.current.currentTime = pct * duration;
  }, [duration]);

  const toggleFav = (song) => {
    setFavorites(prev => {
      const exists = prev.some(s => s.name === song.name);
      return exists ? prev.filter(s => s.name !== song.name) : [...prev, song];
    });
  };
  const isFav = (song) => favorites.some(s => s?.name === song?.name);

  const createPlaylist = () => {
    if (!newPLName.trim()) return;
    setPlaylists(prev => [...prev, { id: Date.now(), name: newPLName.trim(), songs: [], created: new Date().toLocaleDateString() }]);
    setNewPLName(""); setShowNewPL(false);
  };
  const addToPlaylist = (song, plId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== plId) return p;
      if (p.songs.some(s => s.name === song.name)) return p;
      return { ...p, songs: [...p.songs, song] };
    }));
  };
  const removeFromPlaylist = (songName, plId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === plId ? { ...p, songs: p.songs.filter(s => s.name !== songName) } : p
    ));
  };
  const deletePlaylist = (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) { setView("browser"); setActivePlaylistId(null); }
  };

  const downloadSong = async (song) => {
    try {
      const res  = await fetch(song.url);
      const blob = await res.blob();
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(blob);
      a.download = song.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(song.url, "_blank"); }
  };

  const settingChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const goBack = () => { const p = currentPath.split("/"); p.pop(); setCurrentPath(p.join("/")); };
  const goHome = () => { setCurrentPath(""); setView("browser"); setActivePlaylistId(null); setSearch(""); };

  const getDisplayList = () => {
    if (view === "favorites") return favorites;
    if (view === "playlist" && activePlaylistId != null) {
      return playlists.find(p => p.id === activePlaylistId)?.songs || [];
    }
    let list = search
      ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
      : items;
    if (settings.foldersOnly && view === "browser" && currentPath === "")
      list = list.filter(i => i.isFolder);
    return list;
  };

  const displayList   = getDisplayList();
  const RepIcon       = repeat === REPEAT.ONE ? Repeat1 : Repeat;
  const rowH          = settings.compactRows ? 44 : 56;
  const accent        = settings.accent || "#000000";
  const isInsideFolder = view === "browser" && currentPath !== "";
  const isNonBrowser   = view !== "browser";

  const sidebarItems = [
    { id: "browser",   label: "Library",   icon: <Folder size={14} /> },
    { id: "favorites", label: "Favorites", icon: <Heart  size={14} />, count: favorites.length },
  ];

  /* Sidebar rendered both desktop + mobile drawer */
  const SidebarContent = () => (
    <>
      {sidebarItems.map(item => (
        <button key={item.id} className={`nav-btn${view === item.id && !activePlaylistId ? " active" : ""}`}
          onClick={() => { setView(item.id); setActivePlaylistId(null); if (isMobile) setShowSidebar(false); }}>
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          {(item.count ?? 0) > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "1px 6px",
              background: view === item.id && !activePlaylistId ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)"
            }}>{item.count}</span>
          )}
        </button>
      ))}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1.5px solid rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>Playlists</span>
          <button className="vbtn vbtn-ghost" style={{ padding: 4, borderRadius: 7 }}
            onClick={() => { setShowNewPL(true); if (isMobile) setShowSidebar(false); }} title="New playlist">
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
              <span style={{ fontSize: 9, color: view === "playlist" && activePlaylistId === pl.id ? "rgba(255,255,255,0.55)" : "#bbb" }}>
                {pl.songs.length}
              </span>
            </button>
            <button onClick={() => deletePlaylist(pl.id)} style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#ccc",
              padding: 4, display: "flex", alignItems: "center", borderRadius: 6, transition: "color 0.12s"
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#e74c3c"}
              onMouseLeave={e => e.currentTarget.style.color = "#ccc"}>
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {playlists.length === 0 && (
          <div style={{ fontSize: 11, color: "#ccc", padding: "4px 12px", fontStyle: "italic" }}>No playlists yet</div>
        )}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%;overflow:hidden}
        body{
          background:#f0ede6;
          background-image:
            radial-gradient(ellipse 70% 50% at 10% 90%,rgba(255,210,80,0.1) 0%,transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 10%,rgba(160,200,255,0.1) 0%,transparent 60%);
          color:#1a1a1a;
          font-family:${activeFont.stack};
        }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.18)}

        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.9) translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
        @keyframes slideUpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}

        /* ── Vercel-style button system ── */
        .vbtn{
          display:inline-flex;align-items:center;justify-content:center;
          font-family:inherit;font-size:12px;font-weight:700;
          padding:6px 12px;border-radius:8px;cursor:pointer;
          border:1.5px solid transparent;
          transition:all 0.13s;gap:5px;white-space:nowrap;
          user-select:none;
        }
        .vbtn-primary{
          background:#000;color:#fff;
          border-color:#000;
          box-shadow:0 0 0 1px rgba(0,0,0,0.06),2px 2px 0 #000;
        }
        .vbtn-primary:hover{background:#222;box-shadow:0 0 0 1px rgba(0,0,0,0.06),3px 3px 0 #000}
        .vbtn-primary:active{transform:translate(1px,1px);box-shadow:0 0 0 1px rgba(0,0,0,0.06),1px 1px 0 #000}
        .vbtn-ghost{
          background:rgba(255,255,255,0.6);color:#444;
          border-color:rgba(0,0,0,0.12);
          box-shadow:0 0 0 1px rgba(0,0,0,0.04),1px 1px 0 rgba(0,0,0,0.08);
          backdrop-filter:blur(8px);
        }
        .vbtn-ghost:hover{background:rgba(255,255,255,0.85);color:#000;border-color:rgba(0,0,0,0.2)}
        .vbtn-ghost:active{transform:translate(1px,1px)}
        .vbtn-accent{
          background:${accent};color:#fff;
          border-color:${accent};
          box-shadow:0 0 0 1px rgba(0,0,0,0.06),2px 2px 0 ${accent}88;
        }
        .vbtn-accent:hover{opacity:0.88;box-shadow:0 0 0 1px rgba(0,0,0,0.06),3px 3px 0 ${accent}88}
        .vbtn-accent:active{transform:translate(1px,1px)}

        /* ── Track rows ── */
        .track-row{
          display:flex;align-items:center;gap:10px;padding:0 12px;cursor:pointer;
          border-radius:13px;margin:2px 8px;border:1.5px solid transparent;
          transition:background 0.13s,border-color 0.13s,transform 0.13s,box-shadow 0.13s;
          animation:slideIn 0.25s ease both;
        }
        .track-row:hover{background:rgba(255,255,255,0.72);border-color:rgba(0,0,0,0.08)}
        @media(hover:hover){
          .track-row:hover{transform:translateX(2px)}
          .track-row.playing:hover{transform:none}
          .track-row .dot-menu-btn{opacity:0;transition:opacity 0.12s}
          .track-row:hover .dot-menu-btn{opacity:1}
        }
        @media(hover:none){
          .track-row .dot-menu-btn{opacity:1}
        }
        .track-row.playing{
          background:rgba(255,255,255,0.9);
          border:1.5px solid #000;
          box-shadow:0 0 0 1px rgba(0,0,0,0.04),3px 3px 0 #000;
          transform:none;
        }

        /* ── Nav ── */
        .icon-btn{
          background:none;border:none;cursor:pointer;color:#bbb;
          display:flex;align-items:center;justify-content:center;
          border-radius:9px;padding:7px;transition:all 0.12s;font-family:inherit
        }
        .icon-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.06)}
        .ctrl-btn{
          background:none;border:none;cursor:pointer;color:#999;
          display:flex;align-items:center;justify-content:center;
          border-radius:50%;width:40px;height:40px;min-width:40px;
          transition:color 0.13s,background 0.13s,transform 0.1s;flex-shrink:0
        }
        .ctrl-btn:hover{color:#000;background:rgba(0,0,0,0.06);transform:scale(1.08)}
        .ctrl-btn:active{transform:scale(0.93)}
        .ctrl-btn.active{color:${accent}}
        .play-btn{
          width:52px;height:52px;min-width:52px;border-radius:50%;
          border:2.5px solid ${accent};background:${accent};color:#fff;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 1px rgba(0,0,0,0.06),4px 4px 0 ${accent}88;
          transition:all 0.13s;flex-shrink:0
        }
        .play-btn:hover{transform:scale(1.08);box-shadow:0 0 0 1px rgba(0,0,0,0.06),6px 6px 0 ${accent}88}
        .play-btn:active{transform:scale(0.94);box-shadow:0 0 0 1px rgba(0,0,0,0.06),1px 1px 0 ${accent}88}
        .nav-btn{
          display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;
          border-radius:10px;border:none;background:transparent;color:#999;
          font-family:inherit;font-size:12.5px;font-weight:700;
          cursor:pointer;transition:all 0.13s;text-align:left
        }
        .nav-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.05)}
        .nav-btn.active{color:#fff;background:${accent};box-shadow:0 0 0 1px rgba(0,0,0,0.06),2px 2px 0 ${accent}88}
        .glass{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
        }
        .seek-wrap{
          cursor:pointer;position:relative;overflow:hidden;
          height:${settings.showWaveform ? "8px" : "5px"};
          transition:height 0.15s;background:rgba(0,0,0,0.07)
        }
        .seek-wrap:hover{height:${settings.showWaveform ? "10px" : "8px"}}
        .seek-fill{position:absolute;left:0;top:0;height:100%;background:${accent};pointer-events:none;transition:width 0.1s linear}
        input[type=text]{
          background:rgba(255,255,255,0.7);border:1.5px solid rgba(0,0,0,0.12);
          border-radius:10px;padding:9px 12px;
          font-family:inherit;font-size:13px;font-weight:600;outline:none;color:#1a1a1a;width:100%
        }
        input[type=text]:focus{border-color:#000;box-shadow:0 0 0 3px rgba(0,0,0,0.08)}
        .loading-shimmer{
          background:linear-gradient(90deg,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.09) 50%,rgba(0,0,0,0.04) 75%);
          background-size:200% 100%;animation:shimmer 1.4s infinite
        }
        /* Mobile sheet */
        .bottom-sheet{
          position:fixed;left:0;right:0;bottom:0;z-index:160;
          background:rgba(255,255,255,0.98);
          backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
          border-top:1.5px solid rgba(0,0,0,0.12);
          border-radius:20px 20px 0 0;
          box-shadow:0 -4px 32px rgba(0,0,0,0.14);
          animation:slideUpSheet 0.3s cubic-bezier(0.34,1.2,0.64,1);
          padding:6px 18px 32px;
          max-height:92vh;overflow-y:auto;
        }
        .sheet-handle{
          width:36px;height:4px;border-radius:2px;
          background:rgba(0,0,0,0.15);margin:10px auto 16px;
        }
        @media(max-width:767px){
          .ctrl-btn{width:44px;height:44px;min-width:44px}
          .play-btn{width:56px;height:56px;min-width:56px}
          .track-row{margin:2px 4px}
        }
      `}</style>

      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)",
        transition: "opacity 0.45s ease, transform 0.45s ease"
      }}>

        {/* ── HEADER ── */}
        <header className="glass" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "10px 12px" : "10px 16px", flexShrink: 0,
          borderBottom: "1.5px solid rgba(0,0,0,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={goHome} className="vbtn-accent vbtn"
              style={{ width: 34, height: 34, padding: 0, borderRadius: 10, flexShrink: 0 }}
              title="Home">
              <Home size={14} />
            </button>

            {(isInsideFolder || isNonBrowser) && (
              <button onClick={isInsideFolder ? goBack : () => setView("browser")}
                className="vbtn vbtn-ghost" style={{ gap: 4, fontSize: 12 }}>
                <ChevronLeft size={13} />
                {!isMobile && (isInsideFolder ? currentPath.split("/").at(-1) || "Back" : "Library")}
              </button>
            )}

            {!isMobile && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#000", color: "#fff",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 9px", borderRadius: 6, fontFamily: "'DM Mono', monospace"
              }}>
                ▲ MUSIC
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isMobile && (
              <button className="vbtn vbtn-ghost" style={{ padding: "6px 8px" }}
                onClick={() => setShowSidebar(true)}>
                <List size={15} />
              </button>
            )}
            {!isMobile && (
              <a href={REQUEST_URL} target="_blank" rel="noreferrer"
                className="vbtn vbtn-ghost" style={{ textDecoration: "none", fontSize: 12, gap: 5 }}>
                <MessageSquarePlus size={12} /> Request Song
              </a>
            )}
            <button className="vbtn vbtn-ghost" style={{ padding: "6px 8px" }}
              onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Desktop sidebar */}
          {!isMobile && (
            <div className="glass" style={{
              width: 196, flexShrink: 0, display: "flex", flexDirection: "column",
              padding: "12px 10px", gap: 3,
              borderRight: "1.5px solid rgba(0,0,0,0.07)", overflowY: "auto"
            }}>
              <SidebarContent />
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Toolbar */}
            <div style={{
              padding: isMobile ? "8px 10px" : "9px 14px", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1.5px solid rgba(0,0,0,0.05)", minHeight: 50
            }}>
              {view === "browser" ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                  border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 12,
                  padding: "0 11px", height: 37,
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)"
                }}>
                  <Search size={13} color="#bbb" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search tracks..."
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "#1a1a1a", fontFamily: "inherit", padding: 0 }} />
                  {search && (
                    <button onClick={() => setSearch("")} className="icon-btn" style={{ padding: 2 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>
                    {view === "favorites" ? "Favorites" : playlists.find(p => p.id === activePlaylistId)?.name}
                  </div>
                  <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
                    {view === "favorites"
                      ? `${favorites.length} tracks`
                      : `${playlists.find(p => p.id === activePlaylistId)?.songs.length ?? 0} tracks`}
                  </span>
                </div>
              )}

              {view === "browser" && (
                <button className="vbtn vbtn-ghost" style={{ padding: "6px 8px" }}
                  onClick={() => fetchItems(currentPath)} title="Refresh">
                  <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                </button>
              )}
            </div>

            {/* Track list */}
            <div style={{ flex: 1, overflowY: "auto", padding: `6px 0 ${isMobile ? "140px" : "10px"}` }}>
              {loading && view === "browser" ? (
                <div style={{ padding: "8px" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="loading-shimmer" style={{
                      height: rowH, borderRadius: 13, margin: "2px 8px", animationDelay: `${i * 0.07}s`
                    }} />
                  ))}
                </div>
              ) : displayList.length === 0 ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", gap: 14, color: "#bbb",
                  animation: "fadeIn 0.3s ease"
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, background: "#ece8e0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid #e0dbd4"
                  }}>
                    {view === "favorites" ? <Heart size={24} color="#d8d3cb" />
                      : view === "playlist" ? <List size={24} color="#d8d3cb" />
                      : <Folder size={24} color="#d8d3cb" />}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#bbb", marginBottom: 4 }}>
                      {view === "favorites" ? "No favorites yet"
                        : view === "playlist" ? "This playlist is empty"
                        : search ? `No results for "${search}"`
                        : settings.foldersOnly && currentPath === "" ? "No folders found"
                        : "No tracks found"}
                    </div>
                    <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600 }}>
                      {(view === "favorites" || view === "playlist") ? "Tap ··· on a track to add it" : ""}
                    </div>
                  </div>
                </div>
              ) : displayList.map((item, idx) => (
                <TrackRow
                  key={item.name + idx}
                  item={item} idx={idx}
                  active={currentSong?.name === item.name}
                  isPlaying={isPlaying}
                  fav={isFav(item)}
                  dur={durations[item.name]}
                  settings={settings} accent={accent} rowH={rowH}
                  delay={Math.min(idx * 0.018, 0.28)}
                  onPlay={playSong}
                  onFolder={() => setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name)}
                  onFavorite={toggleFav}
                  onDownload={downloadSong}
                  onAddToPlaylist={addToPlaylist}
                  onRemoveFromPlaylist={(name) => removeFromPlaylist(name, activePlaylistId)}
                  playlists={playlists}
                  showRemove={view === "playlist" && activePlaylistId != null}
                />
              ))}
            </div>
          </div>

          {/* Desktop Now Playing sidebar */}
          {!isMobile && currentSong && (
            <div className="glass" style={{
              width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
              padding: "18px 16px", gap: 14, overflowY: "auto",
              borderLeft: "1.5px solid rgba(0,0,0,0.07)", animation: "slideIn 0.3s ease"
            }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 14,
                background: "#e8e4dc", border: `2px solid ${accent}`,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.04), 4px 4px 0 ${accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0
              }}>
                {settings.visualizer
                  ? <Visualizer isPlaying={isPlaying} bars={16} color={accent} height={56} />
                  : <Music size={40} color={accent} />}
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#000", wordBreak: "break-word", lineHeight: 1.4 }}>
                    {currentSong.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                    {currentPath || "Library"}
                  </div>
                </div>
                <button onClick={() => toggleFav(currentSong)} className="icon-btn" style={{ padding: 4, flexShrink: 0 }}>
                  <Heart size={15} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
                </button>
              </div>

              <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "11px 12px", border: "1.5px solid rgba(0,0,0,0.06)" }}>
                {[
                  ["Time",    `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}`],
                  ["Shuffle", shuffle ? "On" : "Off"],
                  ["Repeat",  repeat],
                  ...(settings.sleepMins > 0 ? [["Sleep", `${settings.sleepMins}m`]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 7 }}>
                    <span style={{ color: "#bbb", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontWeight: 800, fontFamily: "'DM Mono',monospace", color: accent, fontSize: 10 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => downloadSong(currentSong)} className="vbtn vbtn-ghost"
                style={{ width: "100%", justifyContent: "center", gap: 6, fontSize: 12 }}>
                <Download size={13} /> Download
              </button>

              {playlists.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>
                    Add to Playlist
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {playlists.map(pl => {
                      const added = pl.songs.some(s => s.name === currentSong.name);
                      return (
                        <button key={pl.id} onClick={() => addToPlaylist(currentSong, pl.id)} disabled={added}
                          className={added ? "" : ""}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: 6, padding: "7px 10px", borderRadius: 9,
                            border: `1.5px solid ${added ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)"}`,
                            background: added ? "rgba(0,0,0,0.03)" : "transparent",
                            fontSize: 11, fontWeight: 700, cursor: added ? "default" : "pointer",
                            color: added ? "#bbb" : "#444", fontFamily: "inherit", transition: "all 0.12s"
                          }}
                          onMouseEnter={e => { if (!added) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = added ? "rgba(0,0,0,0.03)" : "transparent"; }}>
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

        {/* ── PLAYER BAR ── */}
        <div className="glass" style={{
          flexShrink: 0, borderTop: "1.5px solid rgba(0,0,0,0.08)",
          background: settings.accentBar ? `${accent}12` : undefined, zIndex: 10
        }}>
          <div ref={seekBarRef} className="seek-wrap"
            style={{ cursor: duration ? "pointer" : "default" }}
            onClick={e => handleSeek(e.clientX)}
            onMouseMove={e => seekDragging && handleSeek(e.clientX)}
            onMouseDown={() => setSeekDragging(true)}
            onMouseUp={() => setSeekDragging(false)}
            onMouseLeave={() => setSeekDragging(false)}
            onTouchStart={e => { setSeekDragging(true); handleSeek(e.touches[0].clientX); }}
            onTouchMove={e => seekDragging && handleSeek(e.touches[0].clientX)}
            onTouchEnd={() => setSeekDragging(false)}>
            <div className="seek-fill" style={{ width: `${progress}%` }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 12, height: isMobile ? 66 : 70, padding: `0 ${isMobile ? "10px" : "18px"}` }}>
            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: isMobile ? 8 : 11 }}>
              <div
                onClick={isMobile && currentSong ? () => setShowNowPlaying(p => !p) : undefined}
                style={{
                  width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
                  borderRadius: 10, flexShrink: 0,
                  background: currentSong ? accent : "#e8e4dc",
                  border: `2px solid ${currentSong ? accent : "rgba(0,0,0,0.1)"}`,
                  boxShadow: currentSong ? `0 0 0 1px rgba(0,0,0,0.04),3px 3px 0 ${accent}55` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", cursor: isMobile && currentSong ? "pointer" : "default"
                }}>
                <Music size={13} color={currentSong ? "#fff" : "#ccc"} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentSong?.title ?? "Nothing playing"}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", fontFamily: "'DM Mono',monospace", marginTop: 1 }}>
                  {currentSong ? `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}` : "Pick a track"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 1 : 3 }}>
              {!isMobile && (
                <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} title="Shuffle">
                  <Shuffle size={15} />
                </button>
              )}
              <button className="ctrl-btn" onClick={handlePrev} title="Previous">
                <SkipBack size={isMobile ? 20 : 19} />
              </button>
              <button className="play-btn" onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? <Pause size={19} fill="white" /> : <Play size={19} fill="white" style={{ marginLeft: 2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next">
                <SkipForward size={isMobile ? 20 : 19} />
              </button>
              {!isMobile && (
                <button className={`ctrl-btn${repeat !== REPEAT.NONE ? " active" : ""}`}
                  onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)}>
                  <RepIcon size={15} />
                </button>
              )}
            </div>

            {/* Right */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
              {settings.sleepMins > 0 && !isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#bbb", fontFamily: "'DM Mono',monospace" }}>
                  <Moon size={11} />{settings.sleepMins}m
                </div>
              )}
              {currentSong && !isMobile && (
                <>
                  <button onClick={() => downloadSong(currentSong)} className="icon-btn" title="Download">
                    <Download size={15} />
                  </button>
                  <button onClick={() => toggleFav(currentSong)} className="icon-btn" title="Favorite">
                    <Heart size={15} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
                  </button>
                </>
              )}
              {isMobile && (
                <>
                  <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} style={{ width: 36, height: 36, minWidth: 36 }}>
                    <Shuffle size={14} />
                  </button>
                  <button className={`ctrl-btn${repeat !== REPEAT.NONE ? " active" : ""}`}
                    onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)}
                    style={{ width: 36, height: 36, minWidth: 36 }}>
                    <RepIcon size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE NOW PLAYING SHEET ── */}
      {isMobile && showNowPlaying && currentSong && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 155, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowNowPlaying(false)} />
          <div className="bottom-sheet" style={{ zIndex: 160 }}>
            <div className="sheet-handle" />

            {/* Art + title */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 14, flexShrink: 0,
                background: "#e8e4dc", border: `2px solid ${accent}`,
                boxShadow: `3px 3px 0 ${accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
              }}>
                {settings.visualizer
                  ? <Visualizer isPlaying={isPlaying} bars={8} color={accent} height={38} />
                  : <Music size={26} color={accent} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#000", wordBreak: "break-word", lineHeight: 1.35 }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                  {currentPath || "Library"} · {fmt(durations[currentSong.name] || duration)}
                </div>
              </div>
            </div>

            {/* Full playback controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 18 }}>
              <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)}><Shuffle size={17} /></button>
              <button className="ctrl-btn" onClick={handlePrev}><SkipBack size={22} /></button>
              <button className="play-btn" style={{ width: 60, height: 60, minWidth: 60 }} onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" style={{ marginLeft: 2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext}><SkipForward size={22} /></button>
              <button className={`ctrl-btn${repeat !== REPEAT.NONE ? " active" : ""}`}
                onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)}>
                <RepIcon size={17} />
              </button>
            </div>

            {/* Action row */}
            <div style={{ display: "flex", gap: 8, marginBottom: playlists.length > 0 ? 16 : 0 }}>
              <button onClick={() => toggleFav(currentSong)} className="vbtn vbtn-ghost"
                style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: 12, padding: "9px" }}>
                <Heart size={13} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#555"} />
                {isFav(currentSong) ? "Unfavorite" : "Favorite"}
              </button>
              <button onClick={() => downloadSong(currentSong)} className="vbtn vbtn-ghost"
                style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: 12, padding: "9px" }}>
                <Download size={13} /> Download
              </button>
            </div>

            {/* Add to playlist */}
            {playlists.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Add to Playlist
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {playlists.map(pl => {
                    const added = pl.songs.some(s => s.name === currentSong.name);
                    return (
                      <button key={pl.id} onClick={() => !added && addToPlaylist(currentSong, pl.id)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 13px", borderRadius: 10,
                          border: `1.5px solid ${added ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)"}`,
                          background: added ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.8)",
                          fontSize: 13, fontWeight: 700, cursor: added ? "default" : "pointer",
                          color: added ? "#bbb" : "#333", fontFamily: "inherit"
                        }}>
                        <span>{pl.name}</span>
                        {added ? <Check size={13} color="#bbb" /> : <Plus size={13} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MOBILE SIDEBAR DRAWER ── */}
      {isMobile && showSidebar && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 178, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowSidebar(false)} />
          <div style={{
            position: "fixed", left: 0, top: 0, bottom: 0, width: 220, zIndex: 180,
            background: "rgba(255,255,255,0.97)", backdropFilter: "blur(22px)",
            borderRight: "1.5px solid rgba(0,0,0,0.12)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 4px 0 0 rgba(0,0,0,0.06)",
            padding: "12px 10px", overflowY: "auto",
            animation: "slideInLeft 0.22s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#000", color: "#fff",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 9px", borderRadius: 6, fontFamily: "'DM Mono',monospace"
              }}>▲ MENU</span>
              <button onClick={() => setShowSidebar(false)} className="icon-btn" style={{ padding: 4 }}>
                <X size={15} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {showSettings && (
        <SettingsPanel settings={settings} onChange={settingChange} onClose={() => setShowSettings(false)} />
      )}

      {showNewPL && (
        <Modal onClose={() => setShowNewPL(false)} title="New Playlist" width="min(380px,93vw)">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Playlist name
              </label>
              <input type="text" value={newPLName} onChange={e => setNewPLName(e.target.value)}
                placeholder="e.g. Chill Vibes" autoFocus
                onKeyDown={e => e.key === "Enter" && createPlaylist()} />
            </div>
            <button onClick={createPlaylist} className="vbtn vbtn-primary"
              style={{ justifyContent: "center", gap: 7, padding: "12px", borderRadius: 12, fontSize: 13 }}>
              <FolderPlus size={14} /> Create Playlist
            </button>
          </div>
        </Modal>
      )}

      <audio
        ref={audioRef}
        src={currentSong?.url || ""}
        preload="auto"
        onTimeUpdate={() => {
          const el = audioRef.current; if (!el) return;
          setCurrentTime(el.currentTime);
          setProgress((el.currentTime / el.duration) * 100 || 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleNext}
      />
    </>
  );
}
