import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Search, Settings, X, ChevronLeft, Music, Folder, List, Code,
  MessageSquarePlus, RefreshCw, ChevronRight, Info, Download,
  Plus, Trash2, FolderPlus, Heart, Sliders, Moon, Check,
  MoreHorizontal, SortAsc, SortDesc, Eye, EyeOff, Home
} from "lucide-react";

/* ─── CONFIG ─────────────────────────────────────────────── */
const GITHUB_URL        = "https://github.com/NOTAM-bobk/supabase-music/tree/main";
const REQUEST_URL       = "https://docs.google.com/forms/d/e/1FAIpQLSeJZ1qbaUQluhCYTOApX9g7JIDY6AQ4zD3ylS_k31L8NrvhEA/viewform?usp=publish-editor";
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET            = "songs";
const REPEAT            = { NONE: "none", ALL: "all", ONE: "one" };

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
function Visualizer({ isPlaying, bars = 20, color = "#1a1a1a", height = 56 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const ht        = useRef(Array.from({ length: bars }, () => 0.05));
  const tg        = useRef(Array.from({ length: bars }, () => 0.05));

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const bw  = c.width / bars;
    const rand = () => { for (let i = 0; i < bars; i++) tg.current[i] = isPlaying ? Math.random() * 0.85 + 0.1 : 0.05; };
    rand();
    const iv = setInterval(rand, 190);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < bars; i++) {
        ht.current[i] += (tg.current[i] - ht.current[i]) * 0.18;
        const h2 = ht.current[i] * c.height;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12 + ht.current[i] * 0.75;
        ctx.beginPath(); ctx.roundRect(i * bw + 1.5, c.height - h2, bw - 3, h2, 3); ctx.fill();
      }
      ctx.globalAlpha = 1; rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(iv); };
  }, [isPlaying, bars, color]);

  return <canvas ref={canvasRef} width={bars * 12} height={height} style={{ width: "100%", height }} />;
}

/* ─── MODAL WRAPPER ──────────────────────────────────────── */
function Modal({ onClose, title, children, width = "min(560px,93vw)" }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(240,237,230,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.18s ease"
    }} onClick={onClose}>
      <div style={{
        width, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: "2px solid #000", borderRadius: 18, boxShadow: "6px 6px 0 #000",
        overflow: "hidden", animation: "slideUp 0.24s cubic-bezier(0.34,1.56,0.64,1)", maxHeight: "90vh",
        display: "flex", flexDirection: "column"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.06)", border: "2px solid #000", borderRadius: 9,
            width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "2px 2px 0 #000", transition: "all 0.12s"
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#000"; }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: "18px 24px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── THREE-DOT TRACK MENU ───────────────────────────────── */
function TrackDotMenu({ song, playlists, onPlay, onFavorite, isFav, onAddToPlaylist, onDownload }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef          = useRef(null);
  const menuRef         = useRef(null);

  useEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      const menuH = 48 + playlists.length * 38 + 60;
      const top = r.bottom + 4 + menuH > window.innerHeight ? r.top - menuH - 4 : r.bottom + 4;
      const left = Math.min(r.left, window.innerWidth - 210);
      setPos({ top, left });
    }
    const close = (e) => { if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open, playlists.length]);

  return (
    <>
      {/* Always visible dot menu button — black color */}
      <button
        ref={btnRef}
        className="dot-menu-btn"
        title="More options"
        style={{
          padding: "6px 7px",
          background: "rgba(0,0,0,0.08)",
          border: "1.5px solid rgba(0,0,0,0.18)",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#1a1a1a",
          transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.08)"; e.currentTarget.style.color = "#1a1a1a"; }}
        onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
          minWidth: 200, background: "rgba(255,255,255,0.99)", backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)", border: "2px solid #000", borderRadius: 12,
          boxShadow: "5px 5px 0 #000", overflow: "hidden", animation: "popIn 0.16s cubic-bezier(0.34,1.56,0.64,1)"
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: "#000", padding: "9px 14px" }}>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
              {song.title}
            </div>
          </div>
          {[
            { icon: <Play size={13} />,     label: "Play now",                                   fn: () => { onPlay(song); setOpen(false); } },
            { icon: <Heart size={13} />,    label: isFav ? "Remove from Favorites" : "Add to Favorites", fn: () => { onFavorite(song); setOpen(false); } },
            { icon: <Download size={13} />, label: "Download",                                   fn: () => { onDownload(song); setOpen(false); } },
          ].map((item, i) => (
            <MenuItem key={i} icon={item.icon} label={item.label} onClick={item.fn} />
          ))}
          {playlists.length > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "3px 0" }} />
              <div style={{ padding: "5px 14px 3px", fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Add to Playlist
              </div>
              {playlists.map(pl => (
                <MenuItem key={pl.id} icon={<Plus size={13} />} label={pl.name}
                  onClick={() => { onAddToPlaylist(song, pl.id); setOpen(false); }} />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%",
      padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 600, color: "#222", textAlign: "left", fontFamily: "inherit", transition: "background 0.1s"
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}>
      <span style={{ color: "#666", flexShrink: 0 }}>{icon}</span>{label}
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
    { id: "info",     label: "How It Works", icon: <Info size={11} /> },
  ];

  return (
    <Modal onClose={onClose} title="Settings" width="min(620px,95vw)">
      <div style={{ display: "flex", gap: 5, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9,
            border: "2px solid " + (tab === t.id ? "#000" : "rgba(0,0,0,0.1)"),
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: tab === t.id ? "#000" : "rgba(0,0,0,0.03)",
            color: tab === t.id ? "#fff" : "#999",
            boxShadow: tab === t.id ? "2px 2px 0 rgba(0,0,0,0.2)" : "none", transition: "all 0.13s"
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "playback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { key: "autoplay",        label: "Autoplay next track",       sub: "Continue playing when a track ends" },
            { key: "crossfade",       label: "Crossfade (visual)",         sub: "Visual smooth transition indicator between tracks" },
            { key: "gaplessPlayback", label: "Gapless playback",           sub: "Minimize silence between tracks" },
            { key: "showDurations",   label: "Show song durations",        sub: "Display track length in the list" },
            { key: "showSizes",       label: "Show file sizes",            sub: "Display file size alongside tracks" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} />
            </SRow>
          ))}
          <SRow label="Sleep timer" sub={settings.sleepMins > 0 ? `Stops playback in ${settings.sleepMins} min` : "Off"}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[0, 15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => onChange("sleepMins", m)} style={{
                  padding: "5px 9px", borderRadius: 8,
                  border: "2px solid " + (settings.sleepMins === m ? "#000" : "rgba(0,0,0,0.1)"),
                  background: settings.sleepMins === m ? "#000" : "transparent",
                  color: settings.sleepMins === m ? "#fff" : "#777",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s"
                }}>
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
            { key: "foldersOnly",    label: "Folders only on home",       sub: "Show only folders on the main page — songs still appear inside folders" },
            { key: "showTrackNums",  label: "Show track numbers",         sub: "Display index numbers in the track list" },
            { key: "compactRows",    label: "Compact track rows",         sub: "Smaller row height to show more tracks at once" },
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
                <button key={val} onClick={() => onChange("sortOrder", val)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
                  border: "2px solid " + (settings.sortOrder === val ? "#000" : "rgba(0,0,0,0.1)"),
                  background: settings.sortOrder === val ? "#000" : "transparent",
                  color: settings.sortOrder === val ? "#fff" : "#777",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s"
                }}>
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
            { key: "visualizer",    label: "Animated visualizer",      sub: "Bouncing bars in the now-playing sidebar" },
            { key: "accentBar",     label: "Accent player bar",        sub: "Color the bottom player bar with the accent color" },
            { key: "showWaveform",  label: "Show waveform seeker",     sub: "Taller, more prominent seek bar" },
          ].map(({ key, label, sub }) => (
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v => onChange(key, v)} accent={settings.accent} />
            </SRow>
          ))}
          <SRow label="Accent color" sub="Highlight color used throughout the UI">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {["#000000", "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085"].map((c, i) => (
                <button key={c + i} onClick={() => onChange("accent", c)} style={{
                  width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", padding: 0,
                  border: settings.accent === c ? "3px solid #000" : "3px solid transparent",
                  boxShadow: settings.accent === c ? "0 0 0 2px white inset, 2px 2px 0 rgba(0,0,0,0.15)" : "none", outline: "none",
                  transition: "transform 0.12s, box-shadow 0.12s"
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
              ))}
              <input type="color" value={settings.accent} onChange={e => onChange("accent", e.target.value)}
                title="Custom color"
                style={{ width: 26, height: 26, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: "none", outline: "none" }} />
            </div>
          </SRow>
        </div>
      )}

      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["How this works", "Audio files live in a Supabase Storage bucket. The browser fetches public URLs and plays them with the native HTML5 Audio API — no backend needed."],
            ["Playlists", "Playlists are stored locally in your browser. They persist between sessions but are device-specific."],
            ["Song durations", "Durations are fetched by loading each track's metadata in a hidden audio element — this happens automatically as you browse."],
            ["Download", "Clicking Download fetches the song's public URL and triggers a native browser download."],
            ["Keyboard shortcuts", "Space = Play/Pause · ← → = Prev/Next · ··· = track options"],
          ].map(([title, body]) => (
            <div key={title} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "13px 15px", border: "2px solid #ece8e0" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{body}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={lnkStyle}
              onMouseEnter={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#000"; }}>
              <Code size={13} /> View Source
            </a>
            <a href={REQUEST_URL} target="_blank" rel="noreferrer"
              style={{ ...lnkStyle, background: "#000", color: "#fff", borderColor: "#000" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <MessageSquarePlus size={13} /> Request a Song
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

const lnkStyle = {
  display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
  borderRadius: 10, border: "2px solid #000", background: "transparent",
  color: "#000", fontSize: 12, fontWeight: 700, textDecoration: "none",
  cursor: "pointer", boxShadow: "2px 2px 0 rgba(0,0,0,0.12)", transition: "all 0.12s", fontFamily: "inherit"
};

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
      width: 44, height: 26, borderRadius: 13, border: "2px solid " + (value ? accent : "rgba(0,0,0,0.15)"),
      cursor: "pointer", background: value ? accent : "transparent", position: "relative",
      transition: "background 0.2s, border-color 0.2s", flexShrink: 0,
      boxShadow: value ? "1px 1px 0 rgba(0,0,0,0.1)" : "none"
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: value ? "#fff" : (accent || "#000"),
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
      onClick={() => item.isFolder ? onFolder() : onPlay(item)}
      onContextMenu={e => { if (!item.isFolder) { e.preventDefault(); onPlay(item); } }}>

      {settings.showTrackNums && (
        <div style={{ width: 26, flexShrink: 0, textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#ccc" }}>
          {item.isFolder ? null : active && isPlaying
            ? <span style={{ color: accent, fontSize: 13 }}>♪</span>
            : <span>{idx + 1}</span>}
        </div>
      )}

      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: item.isFolder ? "linear-gradient(135deg,#ffd87a,#ffc233)" : (active ? "#000" : "rgba(0,0,0,0.05)"),
        border: "2px solid " + (item.isFolder ? "rgba(184,130,10,0.35)" : active ? "#000" : "rgba(0,0,0,0.08)"),
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? "2px 2px 0 rgba(0,0,0,0.15)" : "none", transition: "all 0.15s", flexShrink: 0
      }}>
        {item.isFolder
          ? <Folder size={14} color="#b8820a" />
          : <Music size={14} color={active ? "#fff" : "#ccc"} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 800 : 600,
          color: active ? "#000" : "#333",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          letterSpacing: active ? "-0.01em" : "normal"
        }}>
          {item.title}
        </div>
        {item.isFolder && <div style={{ fontSize: 10, color: "#bbb", marginTop: 1, fontWeight: 600 }}>Folder</div>}
      </div>

      {!item.isFolder && settings.showDurations && (
        <div style={{ fontSize: 11, color: active ? "#888" : "#ccc", flexShrink: 0, fontFamily: "'DM Mono',monospace", minWidth: 38, textAlign: "right" }}>
          {dur ? fmt(dur) : "—"}
        </div>
      )}

      {!item.isFolder && settings.showSizes && item.metadata?.size && (
        <div style={{ fontSize: 10, color: "#d0ccc6", flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>
          {(item.metadata.size / 1024 / 1024).toFixed(1)}MB
        </div>
      )}

      {!item.isFolder && fav && (
        <Heart size={11} fill={accent} color={accent} style={{ flexShrink: 0, opacity: 0.85 }} />
      )}

      {!item.isFolder && (
        <TrackDotMenu
          song={item} playlists={playlists} isFav={fav}
          onPlay={onPlay} onFavorite={onFavorite} onDownload={onDownload} onAddToPlaylist={onAddToPlaylist}
        />
      )}

      {!item.isFolder && showRemove && (
        <button onClick={e => { e.stopPropagation(); onRemoveFromPlaylist(item.name); }}
          className="icon-btn" style={{ padding: 4, flexShrink: 0 }} title="Remove from playlist">
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

  const [items,        setItems]        = useState([]);
  const [currentPath,  setCurrentPath]  = useState("");
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [currentSong,  setCurrentSong]  = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [repeat,       setRepeat]       = useState(REPEAT.NONE);
  const [shuffle,      setShuffle]      = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [view,         setView]         = useState("browser");
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar,  setShowSidebar]  = useState(false); // mobile sidebar toggle
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [playlists,    setPlaylists]    = useState(() => loadLocal("playlists", []));
  const [favorites,    setFavorites]    = useState(() => loadLocal("favorites", []));
  const [durations,    setDurations]    = useState({});
  const [showNewPL,    setShowNewPL]    = useState(false);
  const [newPLName,    setNewPLName]    = useState("");
  const [seekDragging, setSeekDragging] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false); // mobile now-playing panel

  const [settings, setSettings] = useState(() => loadLocal("settings", {
    autoplay: true, crossfade: false, gaplessPlayback: false,
    showDurations: true, showSizes: false,
    visualizer: true, compactRows: false, showTrackNums: true,
    sleepMins: 0, accent: "#000000",
    foldersOnly: false, sortOrder: "asc",
    accentBar: false, showWaveform: false,
  }));

  const sleepRef    = useRef(null);
  const audioRef    = useRef(null);
  const seekBarRef  = useRef(null);
  const durCache    = useRef({});
  // Batch duration loading queue
  const durQueue    = useRef([]);
  const durLoading  = useRef(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  useEffect(() => saveLocal("playlists", playlists), [playlists]);
  useEffect(() => saveLocal("favorites", favorites), [favorites]);
  useEffect(() => saveLocal("settings",  settings),  [settings]);

  useEffect(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (settings.sleepMins > 0)
      sleepRef.current = setTimeout(() => setIsPlaying(false), settings.sleepMins * 60 * 1000);
    return () => clearTimeout(sleepRef.current);
  }, [settings.sleepMins, isPlaying]);

  /* ── Batched duration loading for performance ── */
  const processDurQueue = useCallback(() => {
    if (durLoading.current || durQueue.current.length === 0) return;
    durLoading.current = true;
    const song = durQueue.current.shift();
    if (!song || durCache.current[song.name]) {
      durLoading.current = false;
      processDurQueue();
      return;
    }
    const a = new Audio();
    a.preload = "metadata";
    a.src = song.url;
    const cleanup = () => {
      durLoading.current = false;
      // small stagger to avoid too many concurrent requests
      setTimeout(processDurQueue, 50);
    };
    a.onloadedmetadata = () => {
      durCache.current[song.name] = a.duration;
      setDurations(d => ({ ...d, [song.name]: a.duration }));
      cleanup();
    };
    a.onerror = cleanup;
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
        // Queue durations in batches (only songs not yet cached)
        const toLoad = formatted.filter(i => !i.isFolder && !durCache.current[i.name]);
        durQueue.current = [...durQueue.current, ...toLoad];
        processDurQueue();
      }
    } finally { setLoading(false); }
  }, [supabase, settings.sortOrder, processDurQueue]);

  useEffect(() => { fetchItems(currentPath); }, [supabase, currentPath, fetchItems]);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    if (isPlaying && currentSong?.url)
      audio.play().catch(() => setIsPlaying(false));
    else
      audio.pause();
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
    if (currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const q = getQueue(); if (!q.length) return;
    const ci = q.findIndex(s => s.name === currentSong?.name);
    setCurrentSong(q[(ci - 1 + q.length) % q.length]); setIsPlaying(true);
  }, [currentTime, getQueue, currentSong]);

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
    const r = seekBarRef.current.getBoundingClientRect();
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
    setPlaylists(prev => prev.map(p => p.id === plId ? { ...p, songs: p.songs.filter(s => s.name !== songName) } : p));
  };
  const deletePlaylist = (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) { setView("browser"); setActivePlaylistId(null); }
  };

  const downloadSong = async (song) => {
    try {
      const res = await fetch(song.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = song.name; a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(song.url, "_blank"); }
  };

  const settingChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  /* ── Navigate back one level ── */
  const goBack = () => {
    const p = currentPath.split("/"); p.pop(); setCurrentPath(p.join("/"));
  };

  /* ── Go home (root of browser) ── */
  const goHome = () => {
    setCurrentPath("");
    setView("browser");
    setActivePlaylistId(null);
    setSearch("");
  };

  const getDisplayList = () => {
    if (view === "favorites") return favorites;
    if (view === "playlist" && activePlaylistId != null) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      return pl?.songs || [];
    }
    let list = search
      ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
      : items;
    // foldersOnly: only hide songs on the ROOT level (currentPath === "")
    if (settings.foldersOnly && view === "browser" && currentPath === "")
      list = list.filter(i => i.isFolder);
    return list;
  };

  const displayList = getDisplayList();
  const RepIcon = repeat === REPEAT.ONE ? Repeat1 : Repeat;
  const rowH = settings.compactRows ? 44 : 56;
  const accent = settings.accent || "#000000";

  const isInsideFolder = view === "browser" && currentPath !== "";
  const isNonBrowserView = view !== "browser";

  const sidebarItems = [
    { id: "browser",   label: "Library",   icon: <Folder size={14} /> },
    { id: "favorites", label: "Favorites", icon: <Heart  size={14} />, count: favorites.length },
  ];

  /* ── Sidebar content (shared desktop + mobile) ── */
  const SidebarContent = () => (
    <>
      {sidebarItems.map(item => (
        <button key={item.id} className={`nav-btn${view === item.id && !activePlaylistId ? " active" : ""}`}
          onClick={() => { setView(item.id); setActivePlaylistId(null); if (isMobile) setShowSidebar(false); }}>
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.count > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "1px 6px",
              background: view === item.id && !activePlaylistId ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)"
            }}>
              {item.count}
            </span>
          )}
        </button>
      ))}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "2px solid rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>Playlists</span>
          <button className="icon-btn" style={{ padding: 4, borderRadius: 7 }} onClick={() => { setShowNewPL(true); if (isMobile) setShowSidebar(false); }} title="New playlist">
            <Plus size={12} />
          </button>
        </div>
        {playlists.map(pl => (
          <div key={pl.id} style={{ position: "relative" }}>
            <button className={`nav-btn${view === "playlist" && activePlaylistId === pl.id ? " active" : ""}`}
              onClick={() => { setView("playlist"); setActivePlaylistId(pl.id); if (isMobile) setShowSidebar(false); }}
              style={{ paddingRight: 34, fontSize: 12 }}>
              <List size={12} />{pl.name}
              <span style={{
                fontSize: 9, marginLeft: "auto",
                color: view === "playlist" && activePlaylistId === pl.id ? "rgba(255,255,255,0.55)" : "#bbb"
              }}>{pl.songs.length}</span>
            </button>
            <button onClick={() => deletePlaylist(pl.id)} style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4,
              display: "flex", alignItems: "center", borderRadius: 6, transition: "color 0.12s"
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
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-Regular.otf') format('opentype');
          font-weight: 400; font-display: swap;
        }
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-Bold.otf') format('opentype');
          font-weight: 700 800; font-display: swap;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%;overflow:hidden}
        body{
          background:#f0ede6;
          background-image:
            radial-gradient(ellipse 70% 50% at 10% 90%,rgba(255,210,80,0.1) 0%,transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 10%,rgba(160,200,255,0.1) 0%,transparent 60%);
          color:#1a1a1a;
          font-family:'OpenDyslexic','DM Mono',monospace;
        }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.18)}

        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.92) translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}

        .track-row{
          display:flex;align-items:center;gap:10px;padding:0 12px;cursor:pointer;
          border-radius:13px;margin:2px 8px;border:2px solid transparent;
          transition:background 0.13s,border-color 0.13s,transform 0.13s,box-shadow 0.13s;
          animation:slideIn 0.25s ease both
        }
        .track-row:hover{background:rgba(255,255,255,0.72);border-color:rgba(0,0,0,0.08)}
        .track-row.playing{background:rgba(255,255,255,0.9);border:2px solid #000;box-shadow:3px 3px 0 #000;transform:none}

        /* Touch devices — always show dot menu */
        @media (hover: none) {
          .track-row .dot-menu-btn { opacity: 1 !important; pointer-events: auto !important; }
        }
        /* Desktop — show on hover */
        @media (hover: hover) {
          .track-row:hover{transform:translateX(2px)}
          .track-row.playing:hover{transform:none}
        }

        .icon-btn{
          background:none;border:none;cursor:pointer;color:#bbb;
          display:flex;align-items:center;justify-content:center;
          border-radius:9px;padding:7px;transition:all 0.12s;font-family:inherit
        }
        .icon-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.06)}

        .ctrl-btn{
          background:none;border:none;cursor:pointer;color:#888;
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
          box-shadow:4px 4px 0 rgba(0,0,0,0.18);transition:all 0.13s;flex-shrink:0
        }
        .play-btn:hover{transform:scale(1.08);box-shadow:6px 6px 0 rgba(0,0,0,0.18)}
        .play-btn:active{transform:scale(0.94);box-shadow:1px 1px 0 rgba(0,0,0,0.18)}

        .glass{background:rgba(255,255,255,0.55);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}

        .nav-btn{
          display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;
          border-radius:10px;border:none;background:transparent;color:#999;
          font-family:'OpenDyslexic',sans-serif;font-size:12px;font-weight:700;
          cursor:pointer;transition:all 0.13s;text-align:left
        }
        .nav-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.05)}
        .nav-btn.active{color:#fff;background:${accent};box-shadow:2px 2px 0 rgba(0,0,0,0.15)}

        .seek-wrap{
          cursor:pointer;position:relative;overflow:hidden;
          height:${settings.showWaveform ? "8px" : "5px"};
          transition:height 0.15s;background:rgba(0,0,0,0.07)
        }
        .seek-wrap:hover{height:${settings.showWaveform ? "10px" : "8px"}}
        .seek-fill{position:absolute;left:0;top:0;height:100%;background:${accent};pointer-events:none;transition:width 0.1s linear}

        input[type=text]{
          background:rgba(255,255,255,0.7);border:2px solid rgba(0,0,0,0.1);
          border-radius:10px;padding:9px 12px;
          font-family:'OpenDyslexic',sans-serif;
          font-size:13px;font-weight:600;outline:none;color:#1a1a1a;width:100%
        }
        input[type=text]:focus{border-color:#000;box-shadow:2px 2px 0 rgba(0,0,0,0.1)}

        /* Vercel-inspired chip badge */
        .vercel-chip{
          display:inline-flex;align-items:center;gap:4px;
          background:#000;color:#fff;
          font-size:10px;font-weight:700;letter-spacing:0.05em;
          padding:3px 8px;border-radius:5px;
          font-family:'DM Mono',monospace;
        }

        /* Mobile now-playing panel */
        .now-playing-panel{
          position:fixed;bottom:0;left:0;right:0;z-index:150;
          background:rgba(255,255,255,0.97);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
          border-top:2px solid #000;
          animation:slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1);
          padding:16px;
          box-shadow:0 -4px 24px rgba(0,0,0,0.12);
        }

        /* Mobile sidebar overlay */
        .mobile-sidebar{
          position:fixed;inset:0;z-index:180;
        }
        .mobile-sidebar-overlay{
          position:absolute;inset:0;background:rgba(0,0,0,0.35);
          backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
        }
        .mobile-sidebar-panel{
          position:absolute;left:0;top:0;bottom:0;width:220px;
          background:rgba(255,255,255,0.97);backdrop-filter:blur(22px);
          border-right:2px solid #000;box-shadow:4px 0 0 #000;
          padding:12px 10px;overflow-y:auto;
          animation:slideInLeft 0.22s ease;
        }

        .loading-shimmer{
          background:linear-gradient(90deg,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.09) 50%,rgba(0,0,0,0.04) 75%);
          background-size:200% 100%;animation:shimmer 1.4s infinite
        }

        /* Touch target sizing */
        @media (max-width: 767px) {
          .ctrl-btn { width: 44px; height: 44px; min-width: 44px; }
          .play-btn  { width: 56px; height: 56px; min-width: 56px; }
          .track-row { margin: 2px 4px; }
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
          padding: isMobile ? "10px 12px" : "11px 18px", flexShrink: 0,
          borderBottom: "2px solid rgba(0,0,0,0.07)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Home button */}
            <button
              onClick={goHome}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 10, background: accent,
                border: `2px solid ${accent}`, boxShadow: "3px 3px 0 rgba(0,0,0,0.18)",
                cursor: "pointer", color: "#fff", flexShrink: 0, transition: "all 0.13s"
              }}
              title="Go home"
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <Home size={15} />
            </button>

            {/* Back button (shown when inside folder or non-browser view) */}
            {(isInsideFolder || isNonBrowserView) && (
              <button
                onClick={isInsideFolder ? goBack : () => setView("browser")}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 10px", borderRadius: 9,
                  border: "2px solid rgba(0,0,0,0.12)",
                  background: "rgba(255,255,255,0.6)",
                  color: "#555", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "2px 2px 0 rgba(0,0,0,0.08)", transition: "all 0.12s"
                }}
                title="Back"
                onMouseEnter={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; e.currentTarget.style.color = "#555"; }}
              >
                <ChevronLeft size={14} />
                {!isMobile && (isInsideFolder ? currentPath.split("/").at(-1) || "Back" : "Library")}
              </button>
            )}

            {/* Vercel chip — desktop only */}
            {!isMobile && (
              <span className="vercel-chip">▲ MUSIC</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Mobile: sidebar hamburger */}
            {isMobile && (
              <button className="icon-btn" onClick={() => setShowSidebar(true)}
                style={{ border: "2px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "6px 8px" }}>
                <List size={16} />
              </button>
            )}

            {!isMobile && (
              <a href={REQUEST_URL} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10,
                border: `2px solid ${accent}`, background: "transparent", color: accent,
                fontSize: 11, fontWeight: 700, textDecoration: "none",
                boxShadow: "2px 2px 0 rgba(0,0,0,0.1)", transition: "all 0.12s"
              }}
                onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}>
                <MessageSquarePlus size={12} /> Request Song
              </a>
            )}

            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings"
              style={{ border: "2px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "6px 8px" }}>
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT NAV — desktop only */}
          {!isMobile && (
            <div className="glass" style={{
              width: 196, flexShrink: 0, display: "flex", flexDirection: "column",
              padding: "12px 10px", gap: 3, borderRight: "2px solid rgba(0,0,0,0.07)", overflowY: "auto"
            }}>
              <SidebarContent />
            </div>
          )}

          {/* MAIN CONTENT */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Toolbar */}
            <div style={{
              padding: isMobile ? "8px 10px" : "10px 14px", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "2px solid rgba(0,0,0,0.05)", minHeight: 52
            }}>
              {view === "browser" ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                  border: "2px solid rgba(0,0,0,0.09)", borderRadius: 12, padding: "0 11px", height: 38
                }}>
                  <Search size={13} color="#bbb" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tracks..."
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "#1a1a1a", fontFamily: "'OpenDyslexic',sans-serif" }} />
                  {search && <button onClick={() => setSearch("")} className="icon-btn" style={{ padding: 2 }}><X size={12} /></button>}
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {view === "favorites" ? "Favorites"
                      : playlists.find(p => p.id === activePlaylistId)?.name}
                  </div>
                  <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
                    {view === "favorites"
                      ? `${favorites.length} tracks`
                      : `${playlists.find(p => p.id === activePlaylistId)?.songs.length ?? 0} tracks`}
                  </span>
                </div>
              )}

              {view === "browser" && (
                <button className="icon-btn" onClick={() => fetchItems(currentPath)} title="Refresh"
                  style={{ border: "2px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "5px 7px", flexShrink: 0 }}>
                  <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                </button>
              )}
            </div>

            {/* Track list */}
            <div style={{ flex: 1, overflowY: "auto", padding: `6px 0 ${isMobile ? "130px" : "10px"}` }}>
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
                    width: 60, height: 60, borderRadius: 18, background: "#ece8e0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #e0dbd4"
                  }}>
                    {view === "favorites" ? <Heart size={26} color="#d8d3cb" />
                      : view === "playlist" ? <List size={26} color="#d8d3cb" />
                      : <Folder size={26} color="#d8d3cb" />}
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
                      {view === "favorites" ? "Tap ··· on a track to add it"
                        : view === "playlist" ? "Tap ··· on a track to add it"
                        : ""}
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

          {/* NOW PLAYING SIDEBAR — desktop only */}
          {!isMobile && currentSong && (
            <div className="glass" style={{
              width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
              padding: "18px 16px", gap: 14, overflowY: "auto",
              borderLeft: "2px solid rgba(0,0,0,0.07)", animation: "slideIn 0.3s ease"
            }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 14,
                background: "#e8e4dc", border: `2.5px solid ${accent}`,
                boxShadow: `4px 4px 0 rgba(0,0,0,0.12)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0
              }}>
                {settings.visualizer
                  ? <Visualizer isPlaying={isPlaying} bars={16} color={accent} height={56} />
                  : <Music size={40} color={accent} />}
              </div>

              {/* Full title — no truncation */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 800,
                    color: "#000",
                    wordBreak: "break-word",
                    lineHeight: 1.4,
                    whiteSpace: "normal", // never truncate
                  }}>
                    {currentSong.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                    {currentPath || "Library"}
                  </div>
                </div>
                <button onClick={() => toggleFav(currentSong)} className="icon-btn" style={{ padding: 4, flexShrink: 0 }} title="Favorite">
                  <Heart size={15} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "11px 12px", border: "1.5px solid rgba(0,0,0,0.05)" }}>
                {[
                  ["Time",    `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}`],
                  ["Shuffle", shuffle ? "On" : "Off"],
                  ["Repeat",  repeat],
                  ...(settings.sleepMins > 0 ? [["Sleep", `${settings.sleepMins}m`]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                    <span style={{ color: "#bbb", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontWeight: 800, fontFamily: "'DM Mono',monospace", color: accent, fontSize: 10 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => downloadSong(currentSong)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "9px", borderRadius: 11, border: `2px solid ${accent}`,
                background: "transparent", color: accent, fontSize: 11, fontWeight: 700,
                cursor: "pointer", boxShadow: "2px 2px 0 rgba(0,0,0,0.1)", transition: "all 0.12s", fontFamily: "inherit"
              }}
                onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}>
                <Download size={13} /> Download
              </button>

              {playlists.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Add to Playlist</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {playlists.map(pl => {
                      const added = pl.songs.some(s => s.name === currentSong.name);
                      return (
                        <button key={pl.id} onClick={() => addToPlaylist(currentSong, pl.id)} disabled={added}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: 6, padding: "7px 10px", borderRadius: 9,
                            border: "1.5px solid " + (added ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)"),
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
          flexShrink: 0, borderTop: "2px solid rgba(0,0,0,0.07)",
          background: settings.accentBar ? `${accent}18` : undefined,
          zIndex: 10,
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
            onTouchEnd={() => setSeekDragging(false)}
          >
            <div className="seek-fill" style={{ width: `${progress}%` }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 12, height: isMobile ? 66 : 72, padding: `0 ${isMobile ? "10px" : "20px"}` }}>

            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
              {/* On mobile, tapping the art opens now-playing panel */}
              <div
                onClick={isMobile && currentSong ? () => setShowNowPlaying(true) : undefined}
                style={{
                  width: isMobile ? 38 : 42, height: isMobile ? 38 : 42,
                  borderRadius: 10, flexShrink: 0,
                  background: currentSong ? accent : "#e8e4dc",
                  border: `2px solid ${currentSong ? accent : "rgba(0,0,0,0.1)"}`,
                  boxShadow: currentSong ? "3px 3px 0 rgba(0,0,0,0.12)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  cursor: isMobile && currentSong ? "pointer" : "default",
                }}>
                <Music size={14} color={currentSong ? "#fff" : "#ccc"} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentSong?.title ?? "Nothing playing"}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", fontFamily: "'DM Mono',monospace", marginTop: 1 }}>
                  {currentSong
                    ? `${fmt(currentTime)} / ${fmt(durations[currentSong.name] || duration)}`
                    : "Pick a track to start"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 4 }}>
              {!isMobile && (
                <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} title="Shuffle">
                  <Shuffle size={16} />
                </button>
              )}
              <button className="ctrl-btn" onClick={handlePrev} title="Previous">
                <SkipBack size={isMobile ? 22 : 20} />
              </button>
              <button className="play-btn" onClick={() => setIsPlaying(p => !p)} title={isPlaying ? "Pause" : "Play"}>
                {isPlaying
                  ? <Pause size={20} fill="white" />
                  : <Play size={20} fill="white" style={{ marginLeft: 2 }} />}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next">
                <SkipForward size={isMobile ? 22 : 20} />
              </button>
              {!isMobile && (
                <button className={`ctrl-btn${repeat !== REPEAT.NONE ? " active" : ""}`}
                  onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)}
                  title={`Repeat: ${repeat}`}>
                  <RepIcon size={16} />
                </button>
              )}
            </div>

            {/* Right controls */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
              {settings.sleepMins > 0 && !isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#bbb", fontFamily: "'DM Mono',monospace" }}>
                  <Moon size={11} />{settings.sleepMins}m
                </div>
              )}
              {currentSong && !isMobile && (
                <button onClick={() => downloadSong(currentSong)} className="icon-btn" title="Download">
                  <Download size={16} />
                </button>
              )}
              {currentSong && !isMobile && (
                <button onClick={() => toggleFav(currentSong)} className="icon-btn" title="Favorite">
                  <Heart size={16} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
                </button>
              )}
              {/* Mobile: shuffle + repeat condensed */}
              {isMobile && (
                <>
                  <button className={`ctrl-btn${shuffle ? " active" : ""}`} onClick={() => setShuffle(p => !p)} style={{ width: 36, height: 36, minWidth: 36 }}>
                    <Shuffle size={15} />
                  </button>
                  <button className={`ctrl-btn${repeat !== REPEAT.NONE ? " active" : ""}`}
                    onClick={() => setRepeat(r => r === REPEAT.NONE ? REPEAT.ALL : r === REPEAT.ALL ? REPEAT.ONE : REPEAT.NONE)}
                    style={{ width: 36, height: 36, minWidth: 36 }}>
                    <RepIcon size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE NOW PLAYING PANEL ── */}
      {isMobile && showNowPlaying && currentSong && (
        <div className="now-playing-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>Now Playing</div>
            <button onClick={() => setShowNowPlaying(false)} className="icon-btn" style={{ padding: 4 }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12, flexShrink: 0,
              background: "#e8e4dc", border: `2.5px solid ${accent}`,
              boxShadow: `3px 3px 0 rgba(0,0,0,0.12)`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
            }}>
              {settings.visualizer
                ? <Visualizer isPlaying={isPlaying} bars={8} color={accent} height={36} />
                : <Music size={24} color={accent} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Full title on mobile too */}
              <div style={{ fontSize: 14, fontWeight: 800, color: "#000", wordBreak: "break-word", lineHeight: 1.4 }}>
                {currentSong.title}
              </div>
              <div style={{ fontSize: 10, color: "#bbb", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                {currentPath || "Library"} · {fmt(durations[currentSong.name] || duration)}
              </div>
            </div>
            <button onClick={() => toggleFav(currentSong)} className="icon-btn" style={{ padding: 6, flexShrink: 0 }}>
              <Heart size={18} fill={isFav(currentSong) ? accent : "none"} color={isFav(currentSong) ? accent : "#ccc"} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => downloadSong(currentSong)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", borderRadius: 10, border: `2px solid ${accent}`,
              background: "transparent", color: accent, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s"
            }}>
              <Download size={13} /> Download
            </button>
            {playlists.length > 0 && (
              <button onClick={() => { setShowNowPlaying(false); }} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)",
                background: "transparent", color: "#555", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit"
              }}>
                <Plus size={13} /> Playlist
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE SIDEBAR ── */}
      {isMobile && showSidebar && (
        <div className="mobile-sidebar">
          <div className="mobile-sidebar-overlay" onClick={() => setShowSidebar(false)} />
          <div className="mobile-sidebar-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <span className="vercel-chip">▲ MENU</span>
              <button onClick={() => setShowSidebar(false)} className="icon-btn" style={{ padding: 4 }}>
                <X size={15} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showSettings && (
        <SettingsPanel settings={settings} onChange={settingChange} onClose={() => setShowSettings(false)} />
      )}

      {showNewPL && (
        <Modal onClose={() => setShowNewPL(false)} title="New Playlist" width="min(380px,93vw)">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Playlist name</label>
              <input type="text" value={newPLName} onChange={e => setNewPLName(e.target.value)}
                placeholder="e.g. Chill Vibes" autoFocus
                onKeyDown={e => e.key === "Enter" && createPlaylist()} />
            </div>
            <button onClick={createPlaylist} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px",
              borderRadius: 12, border: `2px solid ${accent}`, background: accent, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "3px 3px 0 rgba(0,0,0,0.15)", fontFamily: "inherit",
              transition: "all 0.12s"
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              <FolderPlus size={14} /> Create Playlist
            </button>
          </div>
        </Modal>
      )}

      <audio ref={audioRef} src={currentSong?.url || ""} preload="auto"
        onTimeUpdate={() => {
          const el = audioRef.current; if (!el) return;
          setCurrentTime(el.currentTime);
          setProgress((el.currentTime / el.duration) * 100 || 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleNext} />
    </>
  );
}
