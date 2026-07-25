import React, { useState, useMemo, useEffect } from "react";
import {
  Leaf,
  MapPin,
  Search,
  AlertTriangle,
  ChefHat,
  Eye,
  X,
  Sparkles,
  Filter,
  ArrowLeftRight,
  ImageOff,
  Loader2,
} from "lucide-react";

// ---------- tokens ----------
const C = {
  bg: "#1C2420",
  panel: "#242F28",
  panelRaised: "#2C3A31",
  ink: "#EDE7D8",
  inkMuted: "#9FAE96",
  gold: "#D4A73D",
  heather: "#8A6B90",
  caution: "#C15A3B",
  line: "rgba(237,231,216,0.12)",
};

const FONT_ID = "wildkeeper-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const REGIONS = [
  { id: "south", label: "Southern England", note: "" },
  { id: "midlands", label: "Midlands & Wales", note: "Seasons often run ~1 week later than the south." },
  { id: "north", label: "Northern England", note: "Seasons often run ~2 weeks later than the south." },
  { id: "scotland", label: "Scotland", note: "Seasons often run ~3 weeks later than the south." },
];

// ---- Sanity connection ----
const SANITY_PROJECT_ID = "xffdw1uq";
const SANITY_DATASET = "production";
const GROQ = `*[_type == "species" && !(_id in path("drafts.**")) && $ts > 0]{
  "id": _id,
  name, latin, type, edible, months, part, habitat, idNotes, hazards, lookalikes, uses,
  "photos": photos[].asset->url,
  "relatedIds": relatedSpecies[]._ref
}`;
const SANITY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(GROQ)}&$ts=${Date.now()}`;

function useSpeciesData() {
  const [state, setState] = useState({ status: "loading", data: [], error: null });

  useEffect(() => {
    let cancelled = false;
fetch(SANITY_URL, {
  cache: "no-store",
  headers: { Authorization: "skpUfV7mIONlJ3LTGVPxeVysgvPOTfxIpqWU3SnqrSYpZHGlXbfAAeuV4TTovbh5q9DmEDwlSqDlLnWqpKz3qhpTba2pM40MU0CuEwj9sBo9RZAQNz3YmUKGfgFp6UzA0ITz5ivq9HruKMrSlxzz2czSZxtpm9uPve5k8mXjZRgvF3GNxGFU" },
})      .then((r) => {
        if (!r.ok) throw new Error(`Sanity returned ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (cancelled) return;
        const rows = (res.result || []).map((d) => ({
          id: d.id,
          name: d.name,
          latin: d.latin || "",
          type: d.type || "Plant",
          edible: d.edible !== false,
          months: d.months || [],
          part: d.part || "",
          habitat: d.habitat || "",
          id_notes: d.idNotes || "",
          hazards: d.hazards || "",
          lookalikes: d.lookalikes || "",
          uses: d.uses || "",
          photos: d.photos || [],
          related_ids: d.relatedIds || [],
        }));
        setState({ status: "ready", data: rows, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", data: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default function WildKeeper() {
  useFonts();
  const { status, data: SPECIES_DATA, error } = useSpeciesData();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [region, setRegion] = useState(REGIONS[0].id);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showHazards, setShowHazards] = useState(false);
  const [allMonths, setAllMonths] = useState(false);
  const [openId, setOpenId] = useState(null);

  const BY_ID = useMemo(() => Object.fromEntries(SPECIES_DATA.map((s) => [s.id, s])), [SPECIES_DATA]);
  const regionInfo = REGIONS.find((r) => r.id === region);

  const filtered = useMemo(() => {
    let list = allMonths ? SPECIES_DATA.slice() : SPECIES_DATA.filter((s) => s.months.includes(selectedMonth));
    if (!showHazards) list = list.filter((s) => s.edible);
    if (typeFilter !== "all") list = list.filter((s) => s.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.latin.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [SPECIES_DATA, selectedMonth, search, typeFilter, showHazards, allMonths]);

  const countsByMonth = useMemo(() => {
    const counts = new Array(13).fill(0);
    SPECIES_DATA.forEach((s) => {
      if (!showHazards && !s.edible) return;
      s.months.forEach((m) => (counts[m] += 1));
    });
    return counts;
  }, [SPECIES_DATA, showHazards]);

  const stats = useMemo(() => {
    const total = SPECIES_DATA.length;
    const plants = SPECIES_DATA.filter((s) => s.type === "Plant").length;
    const fungi = SPECIES_DATA.filter((s) => s.type === "Fungi").length;
    const hazards = SPECIES_DATA.filter((s) => !s.edible).length;
    const withPhotos = SPECIES_DATA.filter((s) => s.photos && s.photos.length > 0).length;
    return { total, plants, fungi, hazards, withPhotos };
  }, [SPECIES_DATA]);

  if (status === "loading") {
    return (
      <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm" style={{ color: C.inkMuted }}>
          <Loader2 size={16} className="animate-spin" /> Loading your species from Sanity...
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="flex items-center justify-center px-6">
        <div className="max-w-sm text-center" style={{ fontFamily: "system-ui, sans-serif" }}>
          <AlertTriangle size={20} style={{ color: C.caution }} className="mx-auto mb-3" />
          <p className="text-sm mb-2">Couldn't load your species from Sanity.</p>
          <p className="text-xs" style={{ color: C.inkMuted }}>
            {error}. Most likely cause: your Sanity dataset is set to "Private." Check under
            sanity.io/manage → your project → Datasets → production, and set visibility to "Public."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* header */}
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ color: C.gold }}>
              <Leaf size={16} />
              <span className="text-[11px] tracking-widest uppercase">Wild Keeper</span>
            </div>
            <h1 style={{ fontFamily: "'Spectral', serif", fontWeight: 600 }} className="text-3xl md:text-4xl leading-tight">
              Your season, at a glance
            </h1>
            <p className="mt-2 text-sm max-w-md" style={{ color: C.inkMuted }}>
              Turn the wheel to any month, set your region, and see exactly what's ready to pick —
              with the safety notes that matter before you do.
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] shrink-0"
            style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.heather, fontFamily: "'Space Mono', monospace" }}
          >
            <Sparkles size={12} /> {stats.total} species · {stats.withPhotos} with photos
          </div>
        </div>

        {/* region selector */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <MapPin size={14} style={{ color: C.inkMuted }} />
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className="text-xs px-3 py-1.5"
              style={{
                background: region === r.id ? C.gold : C.panel,
                color: region === r.id ? C.bg : C.inkMuted,
                fontWeight: region === r.id ? 600 : 400,
                border: `1px solid ${region === r.id ? C.gold : C.line}`,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        {regionInfo.note && (
          <p className="text-[11px] mb-6" style={{ color: C.inkMuted }}>
            {regionInfo.note}
          </p>
        )}

        {/* filter row */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <Filter size={13} style={{ color: C.inkMuted }} />
          {["all", "Plant", "Fungi"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="text-xs px-3 py-1.5"
              style={{
                background: typeFilter === t ? C.panelRaised : "transparent",
                color: typeFilter === t ? C.ink : C.inkMuted,
                border: `1px solid ${C.line}`,
              }}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
          <button
            onClick={() => setShowHazards((v) => !v)}
            className="text-xs px-3 py-1.5 flex items-center gap-1"
            style={{
              background: showHazards ? "rgba(193,90,59,0.2)" : "transparent",
              color: showHazards ? C.caution : C.inkMuted,
              border: `1px solid ${showHazards ? C.caution : C.line}`,
            }}
          >
            <AlertTriangle size={11} /> Include hazards/ID-only
          </button>
          <span className="mx-1" style={{ color: C.line }}>|</span>
          <button
            onClick={() => setAllMonths((v) => !v)}
            className="text-xs px-3 py-1.5 font-semibold"
            style={{
              background: allMonths ? C.gold : "transparent",
              color: allMonths ? C.bg : C.gold,
              border: `1px solid ${C.gold}`,
            }}
          >
            {allMonths ? "Showing all — any month" : "Show all (ignore month)"}
          </button>
        </div>

        {/* season wheel + list */}
        <div className="grid md:grid-cols-[280px_1fr] gap-8 mb-10">
          <SeasonWheel
            selectedMonth={selectedMonth}
            currentMonth={currentMonth}
            onSelect={setSelectedMonth}
            counts={countsByMonth}
          />

          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 style={{ fontFamily: "'Spectral', serif", fontWeight: 600 }} className="text-xl">
                {allMonths ? "All species" : `In season: ${MONTHS[selectedMonth - 1]}`}
                <span className="text-sm ml-2" style={{ color: C.inkMuted, fontFamily: "system-ui, sans-serif" }}>
                  ({filtered.length})
                </span>
              </h2>
              <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
                <Search size={13} style={{ color: C.inkMuted }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search species"
                  className="bg-transparent outline-none text-xs"
                  style={{ color: C.ink, width: "140px" }}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((s) => (
                <SpeciesCard key={s.id} species={s} onOpen={() => setOpenId(s.id)} />
              ))}
              {filtered.length === 0 && (
                <p className="text-xs col-span-2 py-6" style={{ color: C.inkMuted }}>
                  Nothing matching in {MONTHS[selectedMonth - 1]} — try another month, or widen your filters.
                </p>
              )}
            </div>
          </div>
        </div>

        {stats.hazards > 0 && !showHazards && (
          <p className="text-[11px] text-center" style={{ color: C.inkMuted }}>
            {stats.hazards} additional species are held back by default — toxic or dangerous look-alikes kept for
            identification only. Toggle "Include hazards/ID-only" above to see them.
          </p>
        )}
      </div>

      {openId && BY_ID[openId] && (
        <SpeciesDetail species={BY_ID[openId]} byId={BY_ID} onClose={() => setOpenId(null)} onOpenRelated={(id) => setOpenId(id)} />
      )}
    </div>
  );
}

function SeasonWheel({ selectedMonth, currentMonth, onSelect, counts }) {
  const size = 260;
  const center = size / 2;
  const radius = 95;
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={C.line} strokeWidth={1} />
      </svg>
      {MONTHS.map((label, i) => {
        const month = i + 1;
        const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isSelected = month === selectedMonth;
        const isCurrent = month === currentMonth;
        const intensity = counts[month] / maxCount;
        return (
          <button
            key={label}
            onClick={() => onSelect(month)}
            className="absolute flex flex-col items-center justify-center rounded-full transition-transform"
            style={{
              left: x - 20,
              top: y - 20,
              width: 40,
              height: 40,
              background: isSelected ? C.gold : C.panelRaised,
              border: isCurrent ? `1.5px solid ${C.gold}` : `1px solid ${C.line}`,
              color: isSelected ? C.bg : C.ink,
              opacity: 0.45 + intensity * 0.55,
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              fontWeight: isSelected ? 700 : 400,
            }}
          >
            {label}
          </button>
        );
      })}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ left: center - 45, top: center - 30, width: 90, height: 60 }}
      >
        <span style={{ fontFamily: "'Spectral', serif", fontSize: "22px", fontWeight: 600 }}>
          {counts[selectedMonth]}
        </span>
        <span style={{ fontSize: "10px", color: C.inkMuted }}>in season</span>
      </div>
    </div>
  );
}

function SpeciesCard({ species, onOpen }) {
  const thumb = species.photos && species.photos[0];
  return (
    <button
      onClick={onOpen}
      className="text-left flex flex-col gap-1 relative overflow-hidden"
      style={{ background: C.panel, border: `1px solid ${species.edible ? C.line : C.caution}` }}
    >
      <div className="w-full" style={{ height: 110, background: C.panelRaised }}>
        {thumb ? (
          <img src={thumb} alt={species.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={18} style={{ color: C.inkMuted, opacity: 0.5 }} />
          </div>
        )}
      </div>
      <div className="p-3 pt-2">
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "'Spectral', serif", fontWeight: 600 }} className="text-sm">
            {species.name}
          </span>
          {!species.edible && <AlertTriangle size={13} style={{ color: C.caution }} />}
        </div>
        <span className="text-[11px] italic" style={{ color: C.inkMuted }}>
          {species.latin}
        </span>
        {!species.edible && (
          <div className="text-[10px] mt-1" style={{ color: C.caution }}>
            ID only — not for picking
          </div>
        )}
      </div>
    </button>
  );
}

function SpeciesDetail({ species, byId, onClose, onOpenRelated }) {
  if (!species) return null;
  const photos = species.photos || [];
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 py-8 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="max-w-md w-full relative my-auto"
        style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.ink }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10" style={{ color: C.ink }}>
          <X size={16} />
        </button>

        {photos.length > 0 ? (
          <div className="flex overflow-x-auto" style={{ height: 200 }}>
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`${species.name} ${i + 1}`} className="h-full flex-shrink-0 object-cover" style={{ width: photos.length === 1 ? "100%" : "80%" }} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height: 100, background: C.panelRaised }}>
            <ImageOff size={20} style={{ color: C.inkMuted, opacity: 0.5 }} />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-1" style={{ color: C.gold }}>
            <Leaf size={14} />
            <span className="text-[11px] uppercase tracking-wide">
              {species.months.map((m) => MONTHS[m - 1]).join(" · ")}
            </span>
          </div>
          <h3 style={{ fontFamily: "'Spectral', serif", fontWeight: 600 }} className="text-2xl mb-0.5">
            {species.name}
          </h3>
          <p className="text-xs italic mb-4" style={{ color: C.inkMuted }}>
            {species.latin}
          </p>

          {!species.edible && (
            <div
              className="flex items-center gap-2 mb-4 p-2 text-xs font-semibold"
              style={{ background: "rgba(193,90,59,0.2)", color: C.caution, border: `1px solid ${C.caution}` }}
            >
              <AlertTriangle size={14} /> Identification only — not for picking or eating
            </div>
          )}

          {species.habitat && (
            <div className="flex items-start gap-2 mb-3">
              <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: C.inkMuted }} />
              <p className="text-sm">{species.habitat}</p>
            </div>
          )}

          {species.id_notes && (
            <div className="flex items-start gap-2 mb-3">
              <Eye size={14} className="mt-0.5 shrink-0" style={{ color: C.inkMuted }} />
              <p className="text-sm">{species.id_notes}</p>
            </div>
          )}

          {species.hazards && (
            <div
              className="flex items-start gap-2 mb-3 p-3"
              style={{
                background: species.edible ? C.panelRaised : "rgba(193,90,59,0.15)",
                border: `1px solid ${species.edible ? C.line : C.caution}`,
              }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: species.edible ? C.inkMuted : C.caution }} />
              <p className="text-xs">{species.hazards}</p>
            </div>
          )}

          {species.lookalikes && (
            <div className="flex items-start gap-2 mb-3 p-3" style={{ background: C.panelRaised, border: `1px solid ${C.line}` }}>
              <ArrowLeftRight size={14} className="mt-0.5 shrink-0" style={{ color: C.inkMuted }} />
              <p className="text-xs">{species.lookalikes}</p>
            </div>
          )}

          {species.uses && (
            <div className="flex items-start gap-2 mb-1">
              <ChefHat size={14} className="mt-0.5 shrink-0" style={{ color: C.inkMuted }} />
              <p className="text-sm" style={{ color: C.inkMuted }}>
                {species.uses}
              </p>
            </div>
          )}

          {species.related_ids && species.related_ids.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: C.inkMuted }}>
                Compare with
              </span>
              <div className="flex gap-2 mt-2 flex-wrap">
                {species.related_ids.map((rid) => {
                  const rel = byId[rid];
                  if (!rel) return null;
                  return (
                    <button
                      key={rid}
                      onClick={() => onOpenRelated(rid)}
                      className="text-xs px-2.5 py-1.5 flex items-center gap-1"
                      style={{ background: C.panelRaised, border: `1px solid ${C.line}`, color: C.ink }}
                    >
                      {!rel.edible && <AlertTriangle size={11} style={{ color: C.caution }} />}
                      {rel.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
