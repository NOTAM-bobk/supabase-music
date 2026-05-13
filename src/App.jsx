import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Search, Settings, X, ChevronLeft, Music, Folder, List, Code,
  MessageSquarePlus, RefreshCw, ChevronRight, Info, Download,
  Plus, Trash2, FolderPlus, Heart, Sliders, Moon, Check
} from "lucide-react";

/* ─── CONFIG ─────────────────────────────────────────────── */
const GITHUB_URL  = "https://github.com/your-repo/music-player";
const REQUEST_URL = "PLACEHOLDER_REQUEST_URL";
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET = "songs";
const REPEAT = { NONE: "none", ALL: "all", ONE: "one" };

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
    const rand = () => { for (let i=0;i<bars;i++) tg.current[i] = isPlaying ? Math.random()*0.85+0.1 : 0.05; };
    rand();
    const iv = setInterval(rand, 190);
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      for (let i=0;i<bars;i++) {
        ht.current[i] += (tg.current[i]-ht.current[i])*0.18;
        const h2 = ht.current[i]*c.height;
        ctx.fillStyle = color; ctx.globalAlpha = 0.12+ht.current[i]*0.75;
        ctx.beginPath(); ctx.roundRect(i*bw+1.5, c.height-h2, bw-3, h2, 3); ctx.fill();
      }
      ctx.globalAlpha=1; rafRef.current=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(iv); };
  }, [isPlaying, bars, color]);

  return <canvas ref={canvasRef} width={bars*12} height={height} style={{ width:"100%", height }} />;
}

/* ─── MODAL WRAPPER ──────────────────────────────────────── */
function Modal({ onClose, title, children, width="min(560px,93vw)" }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200,
      background:"rgba(240,237,230,0.65)", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
      display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.18s ease" }}
      onClick={onClose}>
      <div style={{ width, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
        border:"2.5px solid #1a1a1a", borderRadius:20, boxShadow:"7px 7px 0 #1a1a1a",
        overflow:"hidden", animation:"slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)", maxHeight:"90vh", display:"flex", flexDirection:"column" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"rgba(0,0,0,0.05)", border:"2px solid #1a1a1a", borderRadius:10,
            width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"2px 2px 0 #1a1a1a" }}><X size={14}/></button>
        </div>
        <div style={{ padding:"18px 24px 24px", overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── CONTEXT MENU ───────────────────────────────────────── */
function CtxMenu({ x, y, song, playlists, onPlay, onFavorite, isFav, onAddToPlaylist, onDownload, onClose }) {
  useEffect(() => {
    const fn = () => onClose();
    window.addEventListener("click", fn, { once: true });
    return () => window.removeEventListener("click", fn);
  }, [onClose]);

  const items = [
    { icon:<Play size={13}/>,           label:"Play now",          fn: () => { onPlay(song); onClose(); } },
    { icon:<Heart size={13}/>,          label: isFav?"Unfavorite":"Add to Favorites", fn: () => { onFavorite(song); onClose(); } },
    { icon:<Download size={13}/>,       label:"Download",          fn: () => { onDownload(song); onClose(); } },
    { divider: true },
    ...playlists.map(pl => ({
      icon:<Plus size={13}/>,
      label:`Add to "${pl.name}"`,
      fn: () => { onAddToPlaylist(song, pl.id); onClose(); }
    })),
  ];

  return (
    <div style={{ position:"fixed", top:Math.min(y, window.innerHeight-260), left:Math.min(x, window.innerWidth-200),
      zIndex:9999, minWidth:190, background:"rgba(255,255,255,0.96)",
      backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
      border:"2px solid #1a1a1a", borderRadius:14, boxShadow:"4px 4px 0 #1a1a1a",
      overflow:"hidden", animation:"slideUp 0.15s ease" }}
      onClick={e=>e.stopPropagation()}>
      <div style={{ background:"#1a1a1a", padding:"8px 14px" }}>
        <div style={{ color:"#fff", fontSize:11, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {song.title}
        </div>
      </div>
      {items.map((item,i) => item.divider
        ? <div key={i} style={{ height:1, background:"rgba(0,0,0,0.07)", margin:"3px 0" }} />
        : (
          <button key={i} onClick={item.fn} style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
            padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600,
            color:"#333", textAlign:"left", fontFamily:"inherit", transition:"background 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.05)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            {item.icon}{item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ─── SETTINGS PANEL ─────────────────────────────────────── */
function SettingsPanel({ settings, onChange, onClose }) {
  const [tab, setTab] = useState("playback");
  const tabs = [
    { id:"playback", label:"Playback",    icon:<Play size={12}/> },
    { id:"display",  label:"Display",     icon:<Sliders size={12}/> },
    { id:"info",     label:"How It Works",icon:<Info size={12}/> },
  ];

  return (
    <Modal onClose={onClose} title="Settings" width="min(600px,95vw)">
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:9,
              border:"2px solid "+(tab===t.id?"#1a1a1a":"transparent"),
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              background:tab===t.id?"#1a1a1a":"rgba(0,0,0,0.04)",
              color:tab===t.id?"#fff":"#888",
              boxShadow:tab===t.id?"2px 2px 0 rgba(0,0,0,0.15)":"none", transition:"all 0.12s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab==="playback" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { key:"autoplay",   label:"Autoplay next track",      sub:"Continue playing when a track ends" },
            { key:"crossfade",  label:"Crossfade",                sub:"Smooth transition between tracks (visual only)" },
            { key:"showDurations", label:"Show song durations",   sub:"Display track length in the browser" },
            { key:"showSizes",  label:"Show file sizes",          sub:"Display file size alongside tracks" },
          ].map(({key,label,sub})=>(
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v=>onChange(key,v)}/>
            </SRow>
          ))}
          <SRow label="Sleep timer" sub={settings.sleepMins>0?`Stops in ${settings.sleepMins} min`:"Off"}>
            <div style={{ display:"flex", gap:6 }}>
              {[0,15,30,45,60].map(m=>(
                <button key={m} onClick={()=>onChange("sleepMins",m)}
                  style={{ padding:"5px 10px", borderRadius:8, border:"2px solid "+(settings.sleepMins===m?"#1a1a1a":"rgba(0,0,0,0.1)"),
                    background:settings.sleepMins===m?"#1a1a1a":"transparent",
                    color:settings.sleepMins===m?"#fff":"#666",
                    fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {m===0?"Off":`${m}m`}
                </button>
              ))}
            </div>
          </SRow>
        </div>
      )}

      {tab==="display" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { key:"visualizer",   label:"Animated visualizer",   sub:"Bouncing bars in the now-playing sidebar" },
            { key:"compactRows",  label:"Compact track rows",     sub:"Smaller row height to show more tracks" },
            { key:"showTrackNums",label:"Show track numbers",     sub:"Display index numbers in the track list" },
          ].map(({key,label,sub})=>(
            <SRow key={key} label={label} sub={sub}>
              <Toggle value={settings[key]} onChange={v=>onChange(key,v)}/>
            </SRow>
          ))}
          <SRow label="Accent color" sub="Highlight color used throughout the UI">
            <div style={{ display:"flex", gap:7 }}>
              {["#1a1a1a","#c0392b","#2980b9","#27ae60","#8e44ad","#d35400"].map(c=>(
                <button key={c} onClick={()=>onChange("accent",c)}
                  style={{ width:22, height:22, borderRadius:"50%", background:c, cursor:"pointer", padding:0,
                    border: settings.accent===c?"3px solid #1a1a1a":"3px solid transparent",
                    boxShadow: settings.accent===c?"0 0 0 2px white inset":"none", outline:"none" }}/>
              ))}
            </div>
          </SRow>
        </div>
      )}

      {tab==="info" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["How this works","Audio files live in a Supabase Storage bucket. The browser fetches public URLs and plays them with the native HTML5 Audio API — no backend needed."],
            ["Playlists","Playlists are stored locally in your browser. They persist between sessions but are device-specific."],
            ["Song duration","Durations are fetched by loading each track's metadata in a hidden audio element — this happens automatically as you browse."],
            ["Download","Clicking Download fetches the song's public URL and triggers a native browser download."],
            ["Keyboard shortcuts","Space = Play/Pause · ← → = Prev/Next"],
          ].map(([title,body])=>(
            <div key={title} style={{ background:"rgba(0,0,0,0.03)", borderRadius:12, padding:"13px 15px", border:"2px solid #ece8e0" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#aaa", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{title}</div>
              <div style={{ fontSize:13, color:"#555", lineHeight:1.65 }}>{body}</div>
            </div>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={lnkStyle}
              onMouseEnter={e=>{e.currentTarget.style.background="#1a1a1a";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#1a1a1a";}}>
              <Code size={13}/> View Source
            </a>
            <a href={REQUEST_URL} target="_blank" rel="noreferrer"
              style={{...lnkStyle,background:"#1a1a1a",color:"#fff",borderColor:"#1a1a1a"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <MessageSquarePlus size={13}/> Request a Song
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

const lnkStyle = {
  display:"flex", alignItems:"center", gap:6, padding:"9px 14px",
  borderRadius:10, border:"2px solid #1a1a1a", background:"transparent",
  color:"#1a1a1a", fontSize:12, fontWeight:700, textDecoration:"none",
  cursor:"pointer", boxShadow:"2px 2px 0 rgba(0,0,0,0.12)", transition:"all 0.12s", fontFamily:"inherit"
};

function SRow({ label, sub, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:"#1a1a1a", marginBottom:2 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:"#aaa" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={()=>onChange(!value)} style={{
      width:42, height:24, borderRadius:12, border:"2px solid #1a1a1a", cursor:"pointer",
      background:value?"#1a1a1a":"transparent", position:"relative", transition:"background 0.2s", flexShrink:0,
      boxShadow:"1px 1px 0 rgba(0,0,0,0.1)"
    }}>
      <div style={{ width:16, height:16, borderRadius:"50%", background:value?"#fff":"#1a1a1a",
        position:"absolute", top:2, left:value?22:2,
        transition:"left 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}/>
    </button>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function App() {
  const supabase = useSupabase();

  // Core state
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

  // View
  const [view,         setView]         = useState("browser"); // browser | queue | favorites | playlist
  const [showSettings, setShowSettings] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);

  // Playlists & favorites (persisted)
  const [playlists,    setPlaylists]    = useState(() => loadLocal("playlists", []));
  const [favorites,    setFavorites]    = useState(() => loadLocal("favorites", []));

  // Song durations cache
  const [durations,    setDurations]    = useState({});

  // Playback history
  const [history,      setHistory]      = useState([]);
  const [historyIdx,   setHistoryIdx]   = useState(-1);

  // Context menu
  const [ctxMenu,      setCtxMenu]      = useState(null);

  // Playlist modals
  const [showNewPL,    setShowNewPL]    = useState(false);
  const [newPLName,    setNewPLName]    = useState("");
  const [editingPL,    setEditingPL]    = useState(null);

  // Settings
  const [settings, setSettings] = useState(() => loadLocal("settings", {
    autoplay:true, crossfade:false, showDurations:true, showSizes:false,
    visualizer:true, compactRows:false, showTrackNums:true,
    sleepMins:0, accent:"#1a1a1a",
  }));


  // Sleep timer
  const sleepRef = useRef(null);

  const audioRef   = useRef(null);
  const seekBarRef = useRef(null);
  const durCache   = useRef({});

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  // Persist
  useEffect(()=>saveLocal("playlists", playlists),  [playlists]);
  useEffect(()=>saveLocal("favorites", favorites),  [favorites]);
  useEffect(()=>saveLocal("settings",  settings),   [settings]);

  // Sleep timer
  useEffect(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (settings.sleepMins > 0) {
      sleepRef.current = setTimeout(() => setIsPlaying(false), settings.sleepMins * 60 * 1000);
    }
    return () => clearTimeout(sleepRef.current);
  }, [settings.sleepMins, isPlaying]);

  // Fetch bucket items
  const fetchItems = useCallback(async (path="") => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.storage.from(BUCKET).list(path, {
        limit:200, sortBy:{ column:"name", order:"asc" }
      });
      if (data) {
        const formatted = data.map(item => {
          const isFolder = !item.metadata;
          let url = "";
          if (!isFolder) {
            const fp = path ? `${path}/${item.name}` : item.name;
            const { data:{ publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fp);
            url = publicUrl;
          }
          return { ...item, isFolder, title:item.name.replace(/\.[^/.]+$/,"").replace(/_/g," "), url };
        });
        setItems(formatted);
        // Kick off duration fetching for new songs
        formatted.filter(i=>!i.isFolder && !durCache.current[i.name]).forEach(song => {
          const a = new Audio(); a.preload="metadata"; a.src=song.url;
          a.onloadedmetadata = () => {
            durCache.current[song.name] = a.duration;
            setDurations(d=>({...d,[song.name]:a.duration}));
          };
        });
      }
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(()=>{ fetchItems(currentPath); },[supabase,currentPath,fetchItems]);

  // Audio playback
  useEffect(()=>{
    const audio=audioRef.current; if(!audio) return;
    if(isPlaying && currentSong?.url) {
      audio.play().catch(err=>{ console.warn("Playback blocked:",err); setIsPlaying(false); });
    } else { audio.pause(); }
  },[isPlaying,currentSong]);

  const songs = items.filter(i=>!i.isFolder);

  const playSong = useCallback((song, addHistory=true) => {
    if(currentSong?.name===song.name){ setIsPlaying(p=>!p); return; }
    setCurrentSong(song); setIsPlaying(true);
    if(addHistory) setHistory(h=>[...h.slice(0,historyIdx+1), song]);
    setHistoryIdx(h=>h+1);
  },[currentSong, historyIdx]);

  const getQueue = useCallback(()=>{
    if(view==="favorites") return favorites;
    if(view==="playlist" && activePlaylistId!=null) {
      const pl = playlists.find(p=>p.id===activePlaylistId);
      return pl ? pl.songs : [];
    }
    return songs;
  },[view,favorites,activePlaylistId,playlists,songs]);

  const handleNext = useCallback(()=>{
    const q=getQueue(); if(!q.length) return;
    if(repeat===REPEAT.ONE){ const a=audioRef.current; a.currentTime=0; a.play(); return; }
    if(shuffle){ setCurrentSong(q[Math.floor(Math.random()*q.length)]); setIsPlaying(true); return; }
    const ci=q.findIndex(s=>s.name===currentSong?.name);
    const ni=(ci+1)%q.length;
    if(ni===0 && repeat===REPEAT.NONE){ setIsPlaying(false); return; }
    setCurrentSong(q[ni]); setIsPlaying(true);
  },[repeat,shuffle,getQueue,currentSong]);

  const handlePrev = useCallback(()=>{
    if(currentTime>3){ audioRef.current.currentTime=0; return; }
    const q=getQueue(); if(!q.length) return;
    const ci=q.findIndex(s=>s.name===currentSong?.name);
    setCurrentSong(q[(ci-1+q.length)%q.length]); setIsPlaying(true);
  },[currentTime,getQueue,currentSong]);

  // Keyboard
  useEffect(()=>{
    const fn=(e)=>{
      if(document.activeElement.tagName==="INPUT") return;
      if(e.code==="Space"){ e.preventDefault(); setIsPlaying(p=>!p); }
      if(e.code==="ArrowRight") handleNext();
      if(e.code==="ArrowLeft")  handlePrev();
    };
    window.addEventListener("keydown",fn);
    return ()=>window.removeEventListener("keydown",fn);
  },[handleNext,handlePrev]);

  const handleSeek=(e)=>{
    if(!seekBarRef.current||!duration) return;
    const r=seekBarRef.current.getBoundingClientRect();
    if(audioRef.current) audioRef.current.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*duration;
  };

  // Favorites
  const toggleFav=(song)=>{
    setFavorites(prev=>{
      const exists=prev.some(s=>s.name===song.name);
      return exists ? prev.filter(s=>s.name!==song.name) : [...prev,song];
    });
  };
  const isFav=(song)=>favorites.some(s=>s?.name===song?.name);

  // Playlists
  const createPlaylist=()=>{
    if(!newPLName.trim()) return;
    const pl={ id:Date.now(), name:newPLName.trim(), songs:[], created:new Date().toLocaleDateString() };
    setPlaylists(prev=>[...prev,pl]);
    setNewPLName(""); setShowNewPL(false);
  };

  const addToPlaylist=(song,plId)=>{
    setPlaylists(prev=>prev.map(p=>{
      if(p.id!==plId) return p;
      if(p.songs.some(s=>s.name===song.name)) return p;
      return {...p, songs:[...p.songs,song]};
    }));
  };

  const removeFromPlaylist=(songName,plId)=>{
    setPlaylists(prev=>prev.map(p=>p.id===plId?{...p,songs:p.songs.filter(s=>s.name!==songName)}:p));
  };

  const deletePlaylist=(id)=>{
    setPlaylists(prev=>prev.filter(p=>p.id!==id));
    if(activePlaylistId===id){ setView("browser"); setActivePlaylistId(null); }
  };

  // Download
  const downloadSong=async(song)=>{
    try {
      const res=await fetch(song.url);
      const blob=await res.blob();
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=song.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(e) { window.open(song.url,"_blank"); }
  };

  // Settings change
  const settingChange=(key,val)=>setSettings(s=>({...s,[key]:val}));

  // Build display list
  const getDisplayList=()=>{
    if(view==="favorites") return favorites;
    if(view==="playlist" && activePlaylistId!=null){
      const pl=playlists.find(p=>p.id===activePlaylistId);
      return pl?.songs||[];
    }
    return search ? items.filter(i=>i.title.toLowerCase().includes(search.toLowerCase())) : items;
  };

  const displayList=getDisplayList();
  const RepIcon=repeat===REPEAT.ONE?Repeat1:Repeat;
  const rowH=settings.compactRows?44:54;
  const accent=settings.accent||"#1a1a1a";

  // Sidebar views
  const sidebarItems=[
    { id:"browser",   label:"Library",    icon:<Folder size={14}/> },
    { id:"queue",     label:"Queue",       icon:<List   size={14}/> },
    { id:"favorites", label:"Favorites",  icon:<Heart  size={14}/>, count:favorites.length },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%;overflow:hidden}
        body{background:#f0ede6;background-image:radial-gradient(ellipse 70% 50% at 10% 90%,rgba(255,210,80,0.13) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 90% 10%,rgba(160,200,255,0.13) 0%,transparent 60%);color:#1a1a1a;font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:4px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .track-row{display:flex;align-items:center;gap:12px;padding:0 14px;cursor:pointer;border-radius:13px;margin:2px 8px;border:2px solid transparent;transition:background 0.12s,border-color 0.12s,transform 0.1s,box-shadow 0.1s}
        .track-row:hover{background:rgba(255,255,255,0.65);border-color:rgba(0,0,0,0.07);transform:translateX(2px)}
        .track-row.playing{background:rgba(255,255,255,0.88);border:2px solid #1a1a1a;box-shadow:3px 3px 0 #1a1a1a;transform:none}
        .icon-btn{background:none;border:none;cursor:pointer;color:#aaa;display:flex;align-items:center;justify-content:center;border-radius:10px;padding:7px;transition:all 0.12s;font-family:inherit}
        .icon-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.06)}
        .ctrl-btn{background:none;border:none;cursor:pointer;color:#aaa;display:flex;align-items:center;justify-content:center;border-radius:50%;width:38px;height:38px;transition:all 0.12s}
        .ctrl-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.06)}
        .ctrl-btn.active{color:${accent}}
        .play-btn{width:52px;height:52px;border-radius:50%;border:2.5px solid ${accent};background:${accent};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(0,0,0,0.18);transition:all 0.12s}
        .play-btn:hover{transform:scale(1.07);box-shadow:6px 6px 0 rgba(0,0,0,0.18)}
        .play-btn:active{transform:scale(0.95);box-shadow:1px 1px 0 rgba(0,0,0,0.18)}
        .glass{background:rgba(255,255,255,0.55);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
        .nav-btn{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border-radius:10px;border:none;background:transparent;color:#888;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.12s;text-align:left}
        .nav-btn:hover{color:#1a1a1a;background:rgba(0,0,0,0.05)}
        .nav-btn.active{color:#fff;background:${accent};box-shadow:2px 2px 0 rgba(0,0,0,0.15)}
        .seek-wrap{height:5px;background:rgba(0,0,0,0.08);cursor:pointer;position:relative;overflow:hidden;transition:height 0.12s}
        .seek-wrap:hover{height:8px}
        .seek-fill{position:absolute;left:0;top:0;height:100%;background:${accent};pointer-events:none;transition:width 0.1s linear}
        input[type=text]{background:rgba(255,255,255,0.7);border:2px solid rgba(0,0,0,0.1);border-radius:10px;padding:8px 12px;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;outline:none;color:#1a1a1a;width:100%}
        input[type=text]:focus{border-color:#1a1a1a;box-shadow:2px 2px 0 rgba(0,0,0,0.1)}
      `}</style>

      <div style={{ height:"100vh",display:"flex",flexDirection:"column",opacity:mounted?1:0,transform:mounted?"none":"translateY(10px)",transition:"opacity 0.4s ease,transform 0.4s ease" }}>

        {/* ── HEADER ── */}
        <header className="glass" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",flexShrink:0,borderBottom:"2px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:11 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:accent,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${accent}`,boxShadow:"3px 3px 0 rgba(0,0,0,0.15)" }}>
              <Music size={16} color="#fff"/>
            </div>
            <div>
              <div style={{ fontSize:17,fontWeight:800,letterSpacing:"-0.02em" }}>My Music</div>
              <div style={{ fontSize:11,color:"#aaa",fontFamily:"'DM Mono',monospace",marginTop:1 }}>
                {songs.length} tracks · {favorites.length} favorites · {playlists.length} playlists
              </div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <a href={REQUEST_URL} target="_blank" rel="noreferrer"
              style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,border:`2px solid ${accent}`,background:"transparent",color:accent,fontSize:12,fontWeight:700,textDecoration:"none",boxShadow:"2px 2px 0 rgba(0,0,0,0.1)",transition:"all 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.background=accent;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=accent;}}>
              <MessageSquarePlus size={13}/> Request Song
            </a>
            <button className="icon-btn" onClick={()=>setShowSettings(true)} title="Settings"><Settings size={18}/></button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

          {/* LEFT NAV */}
          <div className="glass" style={{ width:200,flexShrink:0,display:"flex",flexDirection:"column",padding:"14px 10px",gap:4,borderRight:"2px solid rgba(0,0,0,0.07)",overflowY:"auto" }}>
            {sidebarItems.map(item=>(
              <button key={item.id} className={`nav-btn ${view===item.id&&!activePlaylistId?"active":""}`}
                onClick={()=>{ setView(item.id); setActivePlaylistId(null); }}>
                {item.icon}
                <span style={{ flex:1 }}>{item.label}</span>
                {item.count>0 && <span style={{ fontSize:10,fontWeight:800,background:"rgba(255,255,255,0.3)",borderRadius:6,padding:"1px 6px" }}>{item.count}</span>}
              </button>
            ))}

            {/* Playlists section */}
            <div style={{ marginTop:12,paddingTop:12,borderTop:"2px solid rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",marginBottom:6 }}>
                <span style={{ fontSize:10,fontWeight:800,color:"#bbb",letterSpacing:"0.1em",textTransform:"uppercase" }}>Playlists</span>
                <button className="icon-btn" style={{ padding:4 }} onClick={()=>setShowNewPL(true)} title="New playlist"><Plus size={13}/></button>
              </div>
              {playlists.map(pl=>(
                <div key={pl.id} style={{ position:"relative" }}>
                  <button className={`nav-btn ${view==="playlist"&&activePlaylistId===pl.id?"active":""}`}
                    onClick={()=>{ setView("playlist"); setActivePlaylistId(pl.id); }}
                    style={{ paddingRight:32 }}>
                    <List size={13}/>{pl.name}
                    <span style={{ fontSize:10,color:view==="playlist"&&activePlaylistId===pl.id?"rgba(255,255,255,0.6)":"#bbb",marginLeft:"auto" }}>{pl.songs.length}</span>
                  </button>
                  <button onClick={()=>deletePlaylist(pl.id)}
                    style={{ position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#ccc",padding:3,display:"flex",alignItems:"center" }}
                    onMouseEnter={e=>e.currentTarget.style.color="#e74c3c"}
                    onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}
              {playlists.length===0 && (
                <div style={{ fontSize:11,color:"#ccc",padding:"4px 12px",fontStyle:"italic" }}>No playlists yet</div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>

            {/* Toolbar */}
            <div style={{ padding:"11px 14px",flexShrink:0,display:"flex",alignItems:"center",gap:10,borderBottom:"2px solid rgba(0,0,0,0.05)" }}>
              {currentPath && view==="browser" && (
                <button className="icon-btn" onClick={()=>{ const p=currentPath.split("/");p.pop();setCurrentPath(p.join("/")); }}
                  style={{ border:"2px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"5px 7px" }} title="Back">
                  <ChevronLeft size={15}/>
                </button>
              )}

              {view==="browser" && (
                <div style={{ flex:1,display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"2px solid rgba(0,0,0,0.09)",borderRadius:12,padding:"0 12px",height:37 }}>
                  <Search size={13} color="#bbb"/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tracks..."
                    style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,fontWeight:600,color:"#1a1a1a",fontFamily:"'Syne',sans-serif" }}/>
                  {search && <button onClick={()=>setSearch("")} className="icon-btn" style={{ padding:2 }}><X size={12}/></button>}
                </div>
              )}

              {view==="playlist" && activePlaylistId!=null && (
                <div style={{ flex:1,fontSize:15,fontWeight:800,letterSpacing:"-0.01em" }}>
                  {playlists.find(p=>p.id===activePlaylistId)?.name}
                  <span style={{ fontSize:11,color:"#bbb",fontWeight:600,marginLeft:10,fontFamily:"'DM Mono',monospace" }}>
                    {playlists.find(p=>p.id===activePlaylistId)?.songs.length} tracks
                  </span>
                </div>
              )}

              {view==="favorites" && (
                <div style={{ flex:1,fontSize:15,fontWeight:800,letterSpacing:"-0.01em" }}>
                  Favorites <span style={{ fontSize:11,color:"#bbb",fontWeight:600,marginLeft:10,fontFamily:"'DM Mono',monospace" }}>{favorites.length} tracks</span>
                </div>
              )}

              {view==="queue" && (
                <div style={{ flex:1,fontSize:15,fontWeight:800,letterSpacing:"-0.01em" }}>
                  Queue <span style={{ fontSize:11,color:"#bbb",fontWeight:600,marginLeft:10,fontFamily:"'DM Mono',monospace" }}>{songs.length} tracks</span>
                </div>
              )}

              {view==="browser" && (
                <button className="icon-btn" onClick={()=>fetchItems(currentPath)} title="Refresh"
                  style={{ border:"2px solid rgba(0,0,0,0.09)",borderRadius:10,padding:"5px 7px" }}>
                  <RefreshCw size={14} style={{ animation:loading?"spin 1s linear infinite":"none" }}/>
                </button>
              )}
            </div>

            {/* Track list */}
            <div style={{ flex:1,overflowY:"auto",padding:"8px 0" }}>
              {loading && view==="browser" ? (
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,height:"100%",color:"#bbb" }}>
                  <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/>
                  <span style={{ fontSize:13,fontWeight:700 }}>Loading...</span>
                </div>
              ) : displayList.length===0 ? (
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,color:"#bbb" }}>
                  {view==="favorites" ? <Heart size={32} color="#e0d8d0"/> : view==="playlist"?<List size={32} color="#e0d8d0"/>:<Folder size={32} color="#e0d8d0"/>}
                  <span style={{ fontSize:13,fontWeight:700 }}>
                    {view==="favorites"?"No favorites yet — right-click a song to add one":
                     view==="playlist"?"This playlist is empty — right-click a song to add one":
                     search?`No results for "${search}"`:"No tracks found"}
                  </span>
                </div>
              ) : displayList.map((item,idx)=>{
                const active=currentSong?.name===item.name;
                const fav=isFav(item);
                const dur=durations[item.name];
                return (
                  <div key={item.name+idx} className={`track-row ${active?"playing":""}`}
                    style={{ height:rowH, animation:`slideIn 0.2s ease ${Math.min(idx*0.02,0.3)}s both` }}
                    onClick={()=>item.isFolder
                      ?setCurrentPath(currentPath?`${currentPath}/${item.name}`:item.name)
                      :playSong(item)}
                    onContextMenu={e=>{ if(!item.isFolder){e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,song:item}); }}}>

                    {/* Number */}
                    {settings.showTrackNums && (
                      <div style={{ width:26,flexShrink:0,textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#ccc" }}>
                        {item.isFolder
                          ? null
                          : active&&isPlaying
                            ? <span style={{ color:accent,fontSize:14,animation:"fadeIn 0.3s" }}>♪</span>
                            : <span>{idx+1}</span>}
                      </div>
                    )}

                    {/* Icon */}
                    {item.isFolder && (
                      <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,
                        background:"linear-gradient(135deg,#ffd87a,#ffc233)",
                        border:"2px solid rgba(0,0,0,0.12)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow:"2px 2px 0 rgba(0,0,0,0.08)" }}>
                        <Folder size={15} color="#b8820a"/>
                      </div>
                    )}
                    {!item.isFolder && (
                      <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,
                        background:active?"#1a1a1a":"rgba(0,0,0,0.05)",
                        border:"2px solid "+(active?"#1a1a1a":"rgba(0,0,0,0.08)"),
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow:active?"2px 2px 0 rgba(0,0,0,0.15)":"none",
                        transition:"all 0.15s" }}>
                        <Music size={14} color={active?"#fff":"#bbb"}/>
                      </div>
                    )}

                    {/* Title */}
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:active?800:600,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {item.title}
                      </div>
                      {item.isFolder && <div style={{ fontSize:11,color:"#bbb",marginTop:1 }}>Folder</div>}
                    </div>

                    {/* Duration */}
                    {!item.isFolder && settings.showDurations && (
                      <div style={{ fontSize:11,color:"#bbb",flexShrink:0,fontFamily:"'DM Mono',monospace" }}>
                        {dur ? fmt(dur) : "—"}
                      </div>
                    )}

                    {/* File size */}
                    {!item.isFolder && settings.showSizes && item.metadata?.size && (
                      <div style={{ fontSize:10,color:"#d0ccc6",flexShrink:0,fontFamily:"'DM Mono',monospace" }}>
                        {(item.metadata.size/1024/1024).toFixed(1)}MB
                      </div>
                    )}

                    {/* Fav star */}
                    {!item.isFolder && fav && (
                      <Heart size={12} fill={accent} color={accent} style={{ flexShrink:0 }}/>
                    )}

                    {/* Actions on hover */}
                    {!item.isFolder && (
                      <div style={{ display:"flex",gap:2,flexShrink:0 }}>
                        <button onClick={e=>{e.stopPropagation();downloadSong(item);}} className="icon-btn" style={{ padding:4,opacity:0.6 }} title="Download">
                          <Download size={12}/>
                        </button>
                        {view==="playlist" && activePlaylistId!=null && (
                          <button onClick={e=>{e.stopPropagation();removeFromPlaylist(item.name,activePlaylistId);}} className="icon-btn" style={{ padding:4,opacity:0.6 }} title="Remove from playlist">
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    )}

                    {item.isFolder ? <ChevronRight size={13} color="#ccc" style={{ flexShrink:0 }}/> : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* NOW PLAYING SIDEBAR */}
          {currentSong && (
            <div className="glass" style={{ width:220,flexShrink:0,display:"flex",flexDirection:"column",padding:"20px 16px",gap:16,overflowY:"auto",borderLeft:"2px solid rgba(0,0,0,0.07)",animation:"slideIn 0.28s ease" }}>
              {/* Art */}
              <div style={{ width:"100%",aspectRatio:"1",borderRadius:16,background:"#e8e4dc",border:`2.5px solid ${accent}`,boxShadow:`4px 4px 0 rgba(0,0,0,0.12)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0 }}>
                {settings.visualizer
                  ? <Visualizer isPlaying={isPlaying} bars={16} color={accent} height={56}/>
                  : <Music size={40} color={accent}/>}
              </div>

              {/* Title + fav */}
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:800,letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {currentSong.title}
                  </div>
                  <div style={{ fontSize:11,color:"#bbb",fontFamily:"'DM Mono',monospace",marginTop:2 }}>
                    {currentPath||"Library"}
                  </div>
                </div>
                <button onClick={()=>toggleFav(currentSong)} className="icon-btn" style={{ padding:4,flexShrink:0 }} title="Favorite">
                  <Heart size={16} fill={isFav(currentSong)?accent:"none"} color={isFav(currentSong)?accent:"#ccc"}/>
                </button>
              </div>

              {/* Stats */}
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                {[
                  ["Time",    `${fmt(currentTime)} / ${fmt(durations[currentSong.name]||duration)}`],
                  ["Shuffle", shuffle?"On":"Off"],
                  ["Repeat",  repeat],
                  ...(settings.sleepMins>0?[["Sleep",`${settings.sleepMins}m`]]:[]),
                ].map(([k,v])=>(
                  <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#bbb",fontWeight:600 }}>{k}</span>
                    <span style={{ fontWeight:700,fontFamily:"'DM Mono',monospace",color:accent }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Download button */}
              <button onClick={()=>downloadSong(currentSong)}
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px",borderRadius:11,border:`2px solid ${accent}`,background:"transparent",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"2px 2px 0 rgba(0,0,0,0.1)",transition:"all 0.12s",fontFamily:"inherit" }}
                onMouseEnter={e=>{e.currentTarget.style.background=accent;e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=accent;}}>
                <Download size={13}/> Download
              </button>

              {/* Add to playlist quick buttons */}
              {playlists.length>0 && (
                <div>
                  <div style={{ fontSize:10,fontWeight:800,color:"#bbb",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7 }}>Add to Playlist</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    {playlists.map(pl=>{
                      const added=pl.songs.some(s=>s.name===currentSong.name);
                      return (
                        <button key={pl.id} onClick={()=>addToPlaylist(currentSong,pl.id)}
                          style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"6px 10px",borderRadius:8,border:"1.5px solid rgba(0,0,0,0.08)",background:added?"rgba(0,0,0,0.04)":"transparent",fontSize:11,fontWeight:700,cursor:added?"default":"pointer",color:added?"#aaa":"#444",fontFamily:"inherit",transition:"all 0.12s" }}
                          disabled={added}>
                          <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pl.name}</span>
                          {added?<Check size={10} color="#aaa"/>:<Plus size={10}/>}
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
        <div className="glass" style={{ flexShrink:0,borderTop:"2px solid rgba(0,0,0,0.07)" }}>
          <div ref={seekBarRef} className="seek-wrap" style={{ cursor:duration?"pointer":"default" }} onClick={handleSeek}>
            <div className="seek-fill" style={{ width:`${progress}%` }}/>
          </div>

          <div style={{ display:"flex",alignItems:"center",gap:14,height:70,padding:"0 20px" }}>
            {/* Info */}
            <div style={{ flex:1,minWidth:0,display:"flex",alignItems:"center",gap:11 }}>
              <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,
                background:currentSong?accent:"#e8e4dc",
                border:`2px solid ${currentSong?accent:"rgba(0,0,0,0.1)"}`,
                boxShadow:currentSong?"3px 3px 0 rgba(0,0,0,0.12)":"none",
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Music size={15} color={currentSong?"#fff":"#ccc"}/>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em" }}>
                  {currentSong?.title??"Nothing playing"}
                </div>
                <div style={{ fontSize:11,color:"#bbb",fontFamily:"'DM Mono',monospace",marginTop:1 }}>
                  {currentSong?`${fmt(currentTime)} / ${fmt(durations[currentSong.name]||duration)}`:"Pick a track to start"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display:"flex",alignItems:"center",gap:3 }}>
              <button className={`ctrl-btn ${shuffle?"active":""}`} onClick={()=>setShuffle(p=>!p)} title="Shuffle"><Shuffle size={15}/></button>
              <button className="ctrl-btn" onClick={handlePrev} title="Previous"><SkipBack size={19}/></button>
              <button className="play-btn" onClick={()=>setIsPlaying(p=>!p)} title="Play / Pause">
                {isPlaying?<Pause size={19} fill="white"/>:<Play size={19} fill="white" style={{ marginLeft:2 }}/>}
              </button>
              <button className="ctrl-btn" onClick={handleNext} title="Next"><SkipForward size={19}/></button>
              <button className={`ctrl-btn ${repeat!==REPEAT.NONE?"active":""}`}
                onClick={()=>setRepeat(r=>r===REPEAT.NONE?REPEAT.ALL:r===REPEAT.ALL?REPEAT.ONE:REPEAT.NONE)} title="Repeat">
                <RepIcon size={15}/>
              </button>
            </div>

            {/* Right side */}
            <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6 }}>
              {settings.sleepMins>0 && (
                <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#bbb",fontFamily:"'DM Mono',monospace" }}>
                  <Moon size={11}/>{settings.sleepMins}m
                </div>
              )}
              {currentSong && (
                <button onClick={()=>downloadSong(currentSong)} className="icon-btn" title="Download song">
                  <Download size={16}/>
                </button>
              )}
              {currentSong && (
                <button onClick={()=>toggleFav(currentSong)} className="icon-btn" title="Favorite">
                  <Heart size={16} fill={isFav(currentSong)?accent:"none"} color={isFav(currentSong)?accent:"#ccc"}/>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showSettings && (
        <SettingsPanel settings={settings} onChange={settingChange}
          onClose={()=>setShowSettings(false)}/>
      )}

      {showNewPL && (
        <Modal onClose={()=>setShowNewPL(false)} title="New Playlist" width="min(380px,93vw)">
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:"#888",display:"block",marginBottom:6 }}>Playlist name</label>
              <input type="text" value={newPLName} onChange={e=>setNewPLName(e.target.value)}
                placeholder="e.g. Chill Vibes" autoFocus
                onKeyDown={e=>e.key==="Enter"&&createPlaylist()}/>
            </div>
            <button onClick={createPlaylist}
              style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px",borderRadius:11,border:`2px solid ${accent}`,background:accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"3px 3px 0 rgba(0,0,0,0.15)",fontFamily:"inherit" }}>
              <FolderPlus size={14}/> Create Playlist
            </button>
          </div>
        </Modal>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <CtxMenu x={ctxMenu.x} y={ctxMenu.y} song={ctxMenu.song}
          playlists={playlists}
          onPlay={playSong}
          onFavorite={toggleFav}
          isFav={isFav(ctxMenu.song)}
          onAddToPlaylist={addToPlaylist}
          onDownload={downloadSong}
          onClose={()=>setCtxMenu(null)}/>
      )}

      <audio ref={audioRef} src={currentSong?.url||""} preload="auto"
        onTimeUpdate={()=>{ const el=audioRef.current; if(!el) return; setCurrentTime(el.currentTime); setProgress((el.currentTime/el.duration)*100||0); }}
        onLoadedMetadata={()=>setDuration(audioRef.current?.duration??0)}
        onEnded={handleNext}/>
    </>
  );
}
