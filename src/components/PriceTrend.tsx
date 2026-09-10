import { useEffect, useMemo, useRef, useState } from "react";

import { FUEL_LABELS, formatPrice, type FuelType } from "@/data/stations";
import type { TrendPoint } from "@/lib/fuel.functions";

const W = 320;
const H = 120;
const BRUSH_H = 30;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("lt-LT", { day: "numeric", month: "short" });
}

/**
 * Interaktyvus kainų grafikas: numatytai paskutinės 30 d., galima
 * priartinti (pinch / ratukas / dvigubi mygtukai) iki vienos dienos
 * arba atitolinti iki visos sukauptos istorijos (iki 6 mėn.).
 * Po grafiku – slankiklis (brush) laikotarpio langui pasirinkti.
 */
export function PriceTrend({
  fuel,
  title,
  points,
}: {
  fuel: FuelType;
  title: string;
  points: TrendPoint[];
}) {
  const n = points.length;
  const [view, setView] = useState<[number, number]>([0, Math.max(0, n - 1)]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ mode: "pan" | "left" | "right" | "move"; x: number; view: [number, number] } | null>(
    null,
  );
  const pinch = useRef<{ dist: number; view: [number, number] } | null>(null);
  const brushRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    // Numatytasis rodinys – paskutinės 30 dienų.
    setView([Math.max(0, n - 30), Math.max(0, n - 1)]);
    setHover(null);
  }, [n, fuel, title]);

  const clamp = (v: [number, number]): [number, number] => {
    let [a, b] = v;
    if (b - a < 1) {
      const mid = (a + b) / 2;
      a = mid - 0.5;
      b = mid + 0.5;
    }
    const span = Math.min(b - a, n - 1);
    if (a < 0) {
      a = 0;
      b = span;
    }
    if (b > n - 1) {
      b = n - 1;
      a = b - span;
    }
    return [Math.max(0, a), Math.min(n - 1, b)];
  };

  const visible = useMemo(() => {
    const from = Math.floor(view[0]);
    const to = Math.ceil(view[1]);
    return points.slice(from, to + 1).map((p, i) => ({ ...p, index: from + i }));
  }, [points, view]);

  if (n < 2) {
    return (
      <section className="mt-5 rounded-2xl bg-ice/5 p-4 text-sm text-ice/60 ring-1 ring-ice/15">
        Kainų istorijos dar nepakanka – kai susikaups bent kelių dienų duomenys, čia atsiras
        interaktyvus grafikas.
      </section>
    );
  }

  const values = visible.map((p) => p.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 0.02;
  const x = (index: number) => ((index - view[0]) / (view[1] - view[0] || 1)) * W;
  const y = (v: number) => H - 14 - ((v - min) / span) * (H - 28);
  const path = visible.map((p) => `${x(p.index).toFixed(1)},${y(p.avg).toFixed(1)}`);

  const zoom = (factor: number, focusIndex: number) =>
    setView(([a, b]) =>
      clamp([focusIndex - (focusIndex - a) * factor, focusIndex + (b - focusIndex) * factor]),
    );

  const indexFromClientX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return view[0];
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return view[0] + ratio * (view[1] - view[0]);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.25 : 0.8, indexFromClientX(e.clientX));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0]!, e.touches[1]!];
      pinch.current = { dist: Math.abs(t1.clientX - t2.clientX) || 1, view };
    } else if (e.touches.length === 1) {
      setHover(Math.round(indexFromClientX(e.touches[0]!.clientX)));
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const [t1, t2] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.abs(t1.clientX - t2.clientX) || 1;
      const [a, b] = pinch.current.view;
      const mid = (a + b) / 2;
      const half = ((b - a) / 2) * (pinch.current.dist / dist);
      setView(clamp([mid - half, mid + half]));
    } else if (e.touches.length === 1) {
      setHover(Math.round(indexFromClientX(e.touches[0]!.clientX)));
    }
  };

  const onChartPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    drag.current = { mode: "pan", x: e.clientX, view };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onChartPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (drag.current?.mode === "pan") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const [a, b] = drag.current.view;
      const shift = ((drag.current.x - e.clientX) / rect.width) * (b - a);
      setView(clamp([a + shift, b + shift]));
    } else {
      setHover(Math.round(indexFromClientX(e.clientX)));
    }
  };

  const endDrag = () => {
    drag.current = null;
    pinch.current = null;
  };

  // ---- Slankiklis (brush) ----
  const brushRatio = (clientX: number) => {

    const rect = brushRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const startBrush = (mode: "left" | "right" | "move") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, x: e.clientX, view };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const moveBrush = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.mode === "pan") return;
    const idx = brushRatio(e.clientX) * (n - 1);
    if (d.mode === "left") setView(clamp([Math.min(idx, d.view[1] - 1), d.view[1]]));
    else if (d.mode === "right") setView(clamp([d.view[0], Math.max(idx, d.view[0] + 1)]));
    else {
      const rect = brushRef.current?.getBoundingClientRect();
      if (!rect) return;
      const shift = ((e.clientX - d.x) / rect.width) * (n - 1);
      setView(clamp([d.view[0] + shift, d.view[1] + shift]));
    }
  };

  const leftPct = (view[0] / (n - 1)) * 100;
  const widthPct = ((view[1] - view[0]) / (n - 1)) * 100;

  const hoverPoint =
    hover !== null ? points[Math.min(n - 1, Math.max(0, hover))] ?? null : null;
  const first = visible[0]?.avg ?? 0;
  const last = visible[visible.length - 1]?.avg ?? 0;
  const change = last - first;
  const pct = (first ? (change / first) * 100 : 0).toFixed(1).replace(".", ",");
  const days = Math.round(view[1] - view[0]) + 1;

  return (
    <section className="relative mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Kainų tendencija</p>
          <p className="text-[11px] text-ice/50">
            {FUEL_LABELS[fuel]} · {title} · rodoma {days} d.
          </p>
        </div>
        <span className={`text-[11px] ${change > 0 ? "text-rose-300" : "text-mint"}`}>
          {change >= 0 ? "↑" : "↓"} {pct.replace("-", "")} %
        </span>
      </div>

      <p className="mt-1 text-2xl font-bold tracking-tight">
        {formatPrice(hoverPoint?.avg ?? last)}
      </p>
      <p className="text-[11px] text-ice/50">
        {hoverPoint ? fmtDate(hoverPoint.date) : `${fmtDate(points[Math.floor(view[0])]!.date)} – ${fmtDate(points[Math.round(view[1])]!.date)}`}
      </p>

      <svg
        ref={svgRef}
        className="mt-3 h-32 w-full touch-none select-none"
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        preserveAspectRatio="none"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endDrag}
        onPointerDown={onChartPointerDown}
        onPointerMove={onChartPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag();
          setHover(null);
        }}
      >
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fe7c2" stopOpacity="0.35" />
            <stop offset="1" stopColor="#5fe7c2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M${path.join(" L")} L${W},${H} L0,${H} Z`} fill="url(#trendArea)" />
        <path
          d={`M${path.join(" L")}`}
          stroke="#5fe7c2"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hoverPoint && hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={0}
              y2={H}
              stroke="#e8f4ff"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <circle cx={x(hover)} cy={y(hoverPoint.avg)} r="4" fill="#5fe7c2" />
          </>
        )}
      </svg>

      {/* Laikotarpio slankiklis */}
      <div
        ref={brushRef}
        className="relative mt-2 h-8 touch-none select-none rounded-lg bg-ice/5 ring-1 ring-ice/10"
        style={{ height: BRUSH_H }}
        onPointerMove={moveBrush}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${BRUSH_H}`} preserveAspectRatio="none">
          <path
            d={`M${points
              .map((p, i) => {
                const allMin = Math.min(...points.map((q) => q.avg));
                const allMax = Math.max(...points.map((q) => q.avg));
                const s = allMax - allMin || 0.02;
                return `${((i / (n - 1)) * W).toFixed(1)},${(BRUSH_H - 4 - ((p.avg - allMin) / s) * (BRUSH_H - 8)).toFixed(1)}`;
              })
              .join(" L")}`}
            stroke="#e8f4ff"
            strokeOpacity="0.4"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        <div
          className="absolute inset-y-0 rounded-md bg-mint/20 ring-1 ring-mint/50"
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
          onPointerDown={startBrush("move")}
        >
          <span
            className="absolute -left-1.5 inset-y-1 w-3 cursor-ew-resize rounded bg-mint"
            onPointerDown={startBrush("left")}
          />
          <span
            className="absolute -right-1.5 inset-y-1 w-3 cursor-ew-resize rounded bg-mint"
            onPointerDown={startBrush("right")}
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-ice/50">
        Tempk slankiklį, kad pasirinktum laikotarpį (nuo 1 dienos iki 6 mėn.), o grafike – suglausk
        pirštus arba naudok ratuką, kad priartintum.
      </p>
    </section>
  );
}
