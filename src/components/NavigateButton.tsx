import { useState } from "react";

import type { Station } from "@/data/stations";

export function NavigateButton({ station, className }: { station: Station; className: string }) {
  const [open, setOpen] = useState(false);
  const q = encodeURIComponent(`${station.brand} ${station.address}, ${station.city}`);
  const hasCoords = station.lat != null && station.lon != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${station.lat},${station.lon}&navigate=yes`
    : `https://waze.com/ul?q=${q}&navigate=yes`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Vesti navigaciją
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-frost/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-frost px-4 pb-8 pt-4 ring-1 ring-ice/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ice/20" />
            <p className="mb-3 text-center text-sm font-semibold">Kuo vesti navigaciją?</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-ice/5 py-3 text-center text-sm font-semibold ring-1 ring-ice/15"
              >
                🗺️ Google Maps
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-ice/5 py-3 text-center text-sm font-semibold ring-1 ring-ice/15"
              >
                🚙 Waze
              </a>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl py-2.5 text-sm text-ice/60"
            >
              Atšaukti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
