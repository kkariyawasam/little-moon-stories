import { useEffect, useState } from "react";
import {
  getMarketingConsent,
  loadMetaPixel,
  setMarketingConsent,
} from "../metaPixel";

export default function MarketingConsent() {
  const [choice, setChoice] = useState<string | null>(() =>
    getMarketingConsent(),
  );

  useEffect(() => {
    if (choice === "granted") loadMetaPixel();
  }, [choice]);

  if (choice) return null;

  const choose = (allowed: boolean) => {
    setMarketingConsent(allowed);
    setChoice(allowed ? "granted" : "denied");
    if (allowed) loadMetaPixel();
  };

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-2xl border border-indigo-300/30 bg-[#070b22]/95 p-4 text-left shadow-2xl backdrop-blur-md sm:flex sm:items-center sm:gap-5"
      aria-label="Marketing cookie choice"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Optional advertising cookies</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          Allow Meta Pixel to measure whether our Facebook ads lead to free
          story requests or purchases. We never send children’s names or parent
          email addresses to Meta.
        </p>
      </div>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          onClick={() => choose(false)}
          className="min-h-10 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-slate-400"
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          className="min-h-10 rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-200"
        >
          Allow
        </button>
      </div>
    </aside>
  );
}
