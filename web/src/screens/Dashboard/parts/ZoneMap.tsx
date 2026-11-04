import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { AreaId, IssueEvent, Severity } from "@/types/analytics";
import { zoneCounts } from "@/lib/analytics";
import { AREA_ROADS, ZONES } from "@/mockData/taxonomy";

export type MapMode = "count" | "heat" | "events";

export const REPEAT_THRESHOLD = 8;

const W = 360;
const H = 420;
const MAX_K = 4;

type View = { k: number; tx: number; ty: number };

type Props = {
  area: AreaId;
  events: IssueEvent[];
  mode: MapMode;
  selectedZone: string | null;
  onSelectZone: (id: string) => void;
  selectedEvent?: string | null;
  onSelectEvent?: (id: string) => void;
  focusZone?: string | null;
  interactive?: boolean;
  compact?: boolean;
  repeatThreshold?: number;
};

const SEV_FILL: Record<Severity, string> = { low: "#fee500", mid: "#f08c00", high: "#e03131" };

function clampView(v: View): View {
  const k = Math.min(MAX_K, Math.max(1, v.k));
  return {
    k,
    tx: Math.min(0, Math.max(W - W * k, v.tx)),
    ty: Math.min(0, Math.max(H - H * k, v.ty)),
  };
}

function jitter(id: string): { dx: number; dy: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 3600) / 3600 * Math.PI * 2;
  const r = 10 + (((h >>> 12) >>> 0) % 100) / 100 * 30;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
}

export default function ZoneMap({
  area,
  events,
  mode,
  selectedZone,
  onSelectZone,
  selectedEvent,
  onSelectEvent,
  focusZone,
  interactive = true,
  compact = false,
  repeatThreshold = REPEAT_THRESHOLD,
}: Props) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const moved = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const zones = useMemo(() => ZONES.filter((z) => z.area === area), [area]);
  const counts = useMemo(() => zoneCounts(events), [events]);
  const roads = AREA_ROADS[area];

  const toBox = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, s: 1 };
    const s = W / rect.width;
    return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s, s };
  }, []);

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(1, v.k * factor));
      const ratio = k / v.k;
      return clampView({ k, tx: cx - (cx - v.tx) * ratio, ty: cy - (cy - v.ty) * ratio });
    });
  }, []);

  useEffect(() => {
    setView({ k: 1, tx: 0, ty: 0 });
  }, [area]);

  useEffect(() => {
    if (!focusZone) return;
    const zone = ZONES.find((z) => z.id === focusZone);
    if (!zone || zone.area !== area) return;
    const from = viewRef.current;
    const k = Math.max(from.k, 2);
    const to = clampView({ k, tx: W / 2 - zone.x * k, ty: H / 2 - zone.y * k });
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 260);
      const e = 1 - (1 - p) ** 3;
      setView({ k: from.k + (to.k - from.k) * e, tx: from.tx + (to.tx - from.tx) * e, ty: from.ty + (to.ty - from.ty) * e });
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [focusZone, area]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && viewRef.current.k === 1 && e.deltaY > 0) return;
      e.preventDefault();
      const p = toBox(e.clientX, e.clientY);
      zoomAt(p.x, p.y, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, toBox, zoomAt]);

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!interactive) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    pinch.current = null;

    const onMove = (ev: PointerEvent) => {
      const prev = pointers.current.get(ev.pointerId);
      if (!prev) return;
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) {
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinch.current !== null && pinch.current > 0) {
          const mid = toBox((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
          zoomAt(mid.x, mid.y, d / pinch.current);
        }
        pinch.current = d;
        moved.current = true;
        return;
      }
      const s = toBox(0, 0).s;
      const dx = (ev.clientX - prev.x) * s;
      const dy = (ev.clientY - prev.y) * s;
      if (Math.abs(ev.clientX - prev.x) + Math.abs(ev.clientY - prev.y) > 0) {
        if (viewRef.current.k > 1) moved.current = moved.current || Math.hypot(dx, dy) > 1.5;
        setView((v) => clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
      }
    };
    const onUp = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId);
      pinch.current = null;
      if (pointers.current.size === 0) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.setTimeout(() => {
          moved.current = false;
        }, 0);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const { k, tx, ty } = view;
  const sx = (x: number) => x * k + tx;
  const sy = (y: number) => y * k + ty;
  const grow = 1 + (k - 1) * 0.22;

  function select(id: string) {
    if (moved.current) return;
    onSelectZone(id);
  }

  return (
    <div className="relative overflow-hidden rounded-panel border border-line">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={onPointerDown}
        className={`block w-full select-none bg-map-land ${compact ? "h-[240px]" : ""}`}
        preserveAspectRatio={compact ? "xMidYMid slice" : "xMidYMid meet"}
        style={{ touchAction: interactive && k > 1 ? "none" : "pan-y" }}
        role="group"
        aria-label="이벤트 발생 지도"
      >
        <defs>
          <radialGradient id={`${gradId}-heat`}>
            <stop offset="0%" stopColor="#ff5a00" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ff9d00" stopOpacity="0.62" />
            <stop offset="70%" stopColor="#ffd400" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffe94d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {roads.parks.map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={10} className="fill-map-park" />
          ))}
          {roads.water && <path d={roads.water} fill="none" strokeWidth={22} strokeLinecap="round" className="stroke-map-water" />}
          {roads.minor.map((d, i) => (
            <path key={i} d={d} fill="none" strokeWidth={5} className="stroke-map-road" />
          ))}
          {roads.arterial.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" strokeWidth={13} className="stroke-white" />
              <path d={d} fill="none" strokeWidth={9} className="stroke-map-arterial" />
            </g>
          ))}
        </g>

        {mode === "heat" &&
          zones.map((z) => {
            const n = counts.get(z.id)?.length ?? 0;
            if (n === 0) return null;
            const r = (24 + Math.sqrt(n) * 9) * (1 + (k - 1) * 0.55);
            return (
              <circle
                key={`h-${z.id}`}
                cx={sx(z.x)}
                cy={sy(z.y)}
                r={r}
                fill={`url(#${gradId}-heat)`}
                opacity={Math.min(1, 0.4 + n / 14)}
              />
            );
          })}

        {mode === "events" &&
          zones.flatMap((z) =>
            (counts.get(z.id) ?? []).map((e) => {
              const j = jitter(e.id);
              const active = e.id === selectedEvent;
              return (
                <g
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  aria-label={e.title}
                  onClick={() => !moved.current && onSelectEvent?.(e.id)}
                  onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelectEvent?.(e.id)}
                  className="cursor-pointer outline-none"
                >
                  <circle cx={sx(z.x + j.dx)} cy={sy(z.y + j.dy)} r={14} fill="transparent" />
                  {active && <circle cx={sx(z.x + j.dx)} cy={sy(z.y + j.dy)} r={11} fill="none" stroke="#191919" strokeWidth={2} />}
                  <circle
                    cx={sx(z.x + j.dx)}
                    cy={sy(z.y + j.dy)}
                    r={active ? 6.5 : 5}
                    fill={SEV_FILL[e.severity]}
                    stroke="#191919"
                    strokeWidth={1.4}
                  />
                </g>
              );
            }),
          )}

        {zones.map((z) => {
          const n = counts.get(z.id)?.length ?? 0;
          const base = 12 + Math.sqrt(n) * 4.6;
          const r = (mode === "count" ? base : mode === "heat" ? 11 : 8) * (mode === "count" ? grow : 1);
          const active = z.id === selectedZone;
          const repeated = n >= repeatThreshold;
          const cx = sx(z.x);
          const cy = sy(z.y);
          if (mode === "events" && n === 0 && !active) return null;
          return (
            <g
              key={z.id}
              role="button"
              tabIndex={0}
              aria-label={`${z.name} ${n}건`}
              aria-pressed={active}
              onClick={() => select(z.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectZone(z.id)}
              className="cursor-pointer outline-none"
            >
              {mode === "count" && repeated && (
                <circle cx={cx} cy={cy} r={r + 7} fill="none" strokeWidth={2} strokeDasharray="4 4" className="stroke-ink/60" />
              )}
              {mode === "events" ? (
                <>
                  <circle cx={cx} cy={cy} r={34 * k} fill={active ? "rgba(25,25,25,0.06)" : "transparent"} stroke={active ? "#191919" : "rgba(25,25,25,0.12)"} strokeDasharray="3 4" strokeWidth={1.2} />
                </>
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  className={active ? "fill-navy" : mode === "heat" ? "fill-white" : "fill-kakao"}
                  stroke={mode === "heat" && !active ? "#191919" : "#fff"}
                  strokeWidth={mode === "heat" && !active ? 1.6 : 3}
                  opacity={mode === "count" && !active ? 0.93 : 1}
                />
              )}
              {mode !== "events" && (
                <text
                  x={cx}
                  y={cy + (mode === "count" ? 6 : 4.5)}
                  textAnchor="middle"
                  fontSize={mode === "count" ? (n >= 10 ? 18 : 15) : 11}
                  fontWeight={800}
                  className={active ? "fill-kakao" : "fill-ink"}
                >
                  {n}
                </text>
              )}
              <text
                x={cx}
                y={cy + (mode === "events" ? 34 * k + 12 : r + 15)}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                className="fill-ink-sub"
                stroke="#f1f2f4"
                strokeWidth={3.5}
                paintOrder="stroke"
              >
                {z.name}
                {mode === "events" ? ` · ${n}` : ""}
              </text>
            </g>
          );
        })}
      </svg>

      {interactive && (
        <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-[16px] bg-white shadow-card shadow-sm">
          <button
            type="button"
            aria-label="확대"
            onClick={() => zoomAt(W / 2, H / 2, 1.5)}
            disabled={k >= MAX_K}
            className="flex size-11 items-center justify-center active:bg-surface disabled:opacity-35"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="축소"
            onClick={() => zoomAt(W / 2, H / 2, 1 / 1.5)}
            disabled={k <= 1}
            className="flex size-11 items-center justify-center border-t border-line active:bg-surface disabled:opacity-35"
          >
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="처음 위치로"
            onClick={() => setView({ k: 1, tx: 0, ty: 0 })}
            disabled={k === 1}
            className="flex size-11 items-center justify-center border-t border-line active:bg-surface disabled:opacity-35"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
