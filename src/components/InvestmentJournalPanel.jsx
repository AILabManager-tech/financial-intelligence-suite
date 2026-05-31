import { useState } from "react";
import { BookMarked, Save, Trash2, CheckCircle2 } from "lucide-react";
import {
  getNote,
  loadJournal,
  removeNote,
  saveJournal,
  upsertNote,
} from "../services/investmentJournalStore";
import { convictionLabel, formatConviction, reviewStatus } from "../utils/investmentJournalFormatters";

// Investment journal (P5.1) — asset-card catalog feature. Records the user's own
// buy thesis, conviction (1-5), target price, stop and review date for the shown
// symbol. Factual user input, not a signal: target/stop are the user's own
// objectives ("pas un conseil"). Self-contained persistence via
// investmentJournalStore (localStorage, keyed by symbol) — like the watchlist,
// no server. All asset panels receive only { asset }; this one loads/saves its
// own note, so IntelligenceCard's uniform propsFor stays untouched.

const today = () => new Date().toISOString().slice(0, 10);

function toForm(note) {
  return {
    thesis: note?.thesis ?? "",
    conviction: note?.conviction != null ? String(note.conviction) : "",
    targetPrice: note?.targetPrice != null ? String(note.targetPrice) : "",
    stopPrice: note?.stopPrice != null ? String(note.stopPrice) : "",
    reviewDate: note?.reviewDate ?? "",
  };
}

const inputClass =
  "mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50";

export default function InvestmentJournalPanel({ asset }) {
  const symbol = asset.symbol;
  const [form, setForm] = useState(() => toForm(null));
  const [savedNote, setSavedNote] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loadedSymbol, setLoadedSymbol] = useState(null);

  // Reload from the store when the displayed symbol changes — React's "adjust
  // state during render" pattern (same idiom as ChartPanel), not an effect: it
  // fires once per symbol switch (loadedSymbol guards re-entry) and avoids the
  // setState-in-effect cascade.
  if (loadedSymbol !== symbol) {
    const note = getNote(loadJournal(), symbol);
    setLoadedSymbol(symbol);
    setSavedNote(note);
    setForm(toForm(note));
    setConfirmed(false);
  }

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setConfirmed(false);
  };

  const handleSave = () => {
    const map = upsertNote(loadJournal(), {
      symbol,
      thesis: form.thesis,
      conviction: form.conviction,
      targetPrice: form.targetPrice,
      stopPrice: form.stopPrice,
      reviewDate: form.reviewDate,
      updatedAt: new Date().toISOString(),
    });
    saveJournal(map);
    const note = getNote(map, symbol);
    setSavedNote(note);
    setForm(toForm(note));
    setConfirmed(true);
  };

  const handleClear = () => {
    const map = removeNote(loadJournal(), symbol);
    saveJournal(map);
    setSavedNote(null);
    setForm(toForm(null));
    setConfirmed(false);
  };

  const status = reviewStatus(form.reviewDate, { today: today() });
  const convLabel = convictionLabel(form.conviction);
  const convValue = formatConviction(form.conviction);

  return (
    <div className="animate-slide-up" role="region" aria-label="Journal d'investissement">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <BookMarked className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Journal d'investissement</h2>
        <span className="ml-auto text-xs font-semibold text-slate-300">{symbol}</span>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] text-slate-500">Thèse d'investissement</span>
          <textarea
            value={form.thesis}
            onChange={(e) => set("thesis", e.target.value)}
            aria-label="Thèse d'investissement"
            rows={4}
            placeholder="Pourquoi détenir cette position : avantage concurrentiel, catalyseurs, risques…"
            className={`${inputClass} resize-y min-h-[88px]`}
          />
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-[11px] text-slate-500">Conviction</span>
            <select
              value={form.conviction}
              onChange={(e) => set("conviction", e.target.value)}
              aria-label="Conviction"
              className={inputClass}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n} — {convictionLabel(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Prix cible</span>
            <input
              type="number"
              min="0"
              step="any"
              value={form.targetPrice}
              onChange={(e) => set("targetPrice", e.target.value)}
              aria-label="Prix cible"
              placeholder="—"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Prix stop</span>
            <input
              type="number"
              min="0"
              step="any"
              value={form.stopPrice}
              onChange={(e) => set("stopPrice", e.target.value)}
              aria-label="Prix stop"
              placeholder="—"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Date de revue</span>
            <input
              type="date"
              value={form.reviewDate}
              onChange={(e) => set("reviewDate", e.target.value)}
              aria-label="Date de revue"
              className={inputClass}
            />
          </label>
        </div>

        {(convValue || status) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {convValue && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 text-violet-300">
                Conviction {convValue} · {convLabel}
              </span>
            )}
            {status && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-900 ${status.tone}`}>
                {status.label} · {form.reviewDate}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            Enregistrer
          </button>
          {savedNote && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-900 text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Effacer
            </button>
          )}
          {confirmed && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Enregistré
            </span>
          )}
          {savedNote?.updatedAt && (
            <span className="ml-auto text-[11px] text-slate-500">
              Mis à jour le {savedNote.updatedAt.slice(0, 10)}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          Tes décisions et convictions, saisies manuellement. Le prix cible et le stop sont tes propres objectifs —
          pas un conseil.
        </p>
      </div>
    </div>
  );
}
