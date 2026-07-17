import { useMemo, useState } from "react";
import { Receipt, Plus, Trash2, AlertTriangle, Upload } from "lucide-react";
import { applyTransactions, summarize } from "../utils/lotEngine";
import { formatCurrency } from "../utils/scoreTranslator";
import { parseTransactionCsv } from "../services/transactionCsvImporter";

// Transaction journal (P3.3b). Full-page route: capture buy/sell/dividend/fee
// entries, list them chronologically, and derive — per symbol — the realized P&L
// and open lots through the pure tax-lot engine (FIFO/LIFO). All values are
// bookkeeping computed from the entered transactions (factual, not a forecast).
// State (the transactions, scoped by mandate) lives in App via transactionStore;
// this panel is presentational over { transactions, onAdd, onRemove }.

const TYPE_LABELS = { buy: "Achat", sell: "Vente", dividend: "Dividende", fee: "Frais" };
const QTY_TYPES = new Set(["buy", "sell"]);

const today = () => new Date().toISOString().slice(0, 10);
const fmtQty = (n) => Number(n).toLocaleString("fr-CA", { maximumFractionDigits: 4 });

function emptyForm() {
  return { type: "buy", symbol: "", date: today(), quantity: "", price: "", fee: "", amount: "" };
}

export default function TransactionJournalPanel({ transactions, onAdd, onRemove, onImport }) {
  const [form, setForm] = useState(emptyForm);
  const [method, setMethod] = useState("fifo");
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  // Import d'un relevé de courtier. On montre TOUJOURS l'aperçu avant d'écrire :
  // un relevé à moitié importé sans le dire fausserait les gains réalisés, qui
  // se calculent sur le journal complet.
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPreview({ ...parseTransactionCsv(await file.text()), fileName: file.name });
      setError(null);
    } catch (readError) {
      setError(`Lecture impossible : ${readError.message}`);
    }
  };

  const confirmImport = () => {
    onImport?.(preview.transactions);
    setPreview(null);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const isQty = QTY_TYPES.has(form.type);

  const summary = useMemo(
    () => summarize(applyTransactions(transactions, { method })),
    [transactions, method],
  );
  const symbols = Object.keys(summary).sort();

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  const submit = () => {
    const symbol = form.symbol.trim().toUpperCase();
    if (!symbol || !form.date) {
      setError("Symbole et date sont requis.");
      return;
    }
    let draft;
    if (isQty) {
      const quantity = Number(form.quantity);
      const price = Number(form.price);
      if (!(quantity > 0) || !Number.isFinite(price) || price < 0) {
        setError("Quantité (> 0) et prix unitaire valides requis.");
        return;
      }
      draft = { type: form.type, symbol, date: form.date, quantity, price, fee: Number(form.fee) || 0 };
    } else {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        setError("Montant valide requis.");
        return;
      }
      draft = { type: form.type, symbol, date: form.date, amount };
    }
    onAdd(draft);
    setError(null);
    // Keep symbol/date for fast successive entries; clear the value fields.
    setForm((f) => ({ ...f, quantity: "", price: "", fee: "", amount: "" }));
  };

  return (
    <div className="animate-slide-up space-y-5" role="region" aria-label="Journal des transactions">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-violet-400" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Journal des transactions</h2>
      </div>
      <p className="text-sm text-slate-400">
        Importe un relevé de courtier, ou saisis tes achats, ventes, dividendes et frais. Le P&amp;L réalisé et les
        lots ouverts sont calculés par appariement de lots (FIFO/LIFO) à partir des transactions du journal.
      </p>

      {/* Import d'un relevé — évite de retaper ce que la plateforme du courtier a déjà */}
      <div className="p-4 rounded-2xl bg-surface-900 border border-white/5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Importer un relevé CSV
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" aria-label="Importer un relevé de transactions CSV" />
          </label>
          <span className="text-[11px] text-slate-500">
            En-têtes FR ou EN reconnus (date, opération, symbole, quantité, prix, frais). Exporte en ISO (AAAA-MM-JJ) si tes dates sont ambiguës.
          </span>
        </div>

        {preview && (
          <div className="rounded-lg bg-surface-800 border border-white/5 p-3 space-y-2">
            <div className="text-sm text-white font-semibold">{preview.fileName}</div>
            <div className="text-sm text-slate-300">
              <span className="text-emerald-400 font-semibold">{preview.transactions.length}</span> transaction(s) lisibles
              {preview.errors.length > 0 && (
                <>
                  {" · "}
                  <span className="text-rose-400 font-semibold">{preview.errors.length}</span> ligne(s) rejetée(s)
                </>
              )}
            </div>
            {preview.errors.length > 0 && (
              <ul className="text-[11px] text-slate-400 space-y-0.5 max-h-32 overflow-y-auto list-disc list-inside">
                {preview.errors.slice(0, 20).map((e, i) => (
                  <li key={`${e.line}-${i}`}>
                    Ligne {e.line} — {e.reason}
                  </li>
                ))}
              </ul>
            )}
            {preview.errors.length > 0 && preview.transactions.length > 0 && (
              <p className="text-[11px] text-amber-300">
                Un journal incomplet fausse les gains réalisés — ils se calculent sur l&apos;historique complet. Corrige les lignes
                rejetées et réimporte plutôt que d&apos;importer partiellement.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmImport}
                disabled={preview.transactions.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                Ajouter au journal
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saisie */}
      <div className="p-4 rounded-2xl bg-surface-900 border border-white/5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-[11px] text-slate-500">Type</span>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              aria-label="Type de transaction"
              className="mt-1 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Symbole</span>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              aria-label="Symbole"
              placeholder="Symbole"
              className="mt-1 w-28 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white uppercase focus:outline-none focus:border-violet-500/50"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Date</span>
            <input
              type="date"
              value={form.date}
              max={today()}
              onChange={(e) => set("date", e.target.value)}
              aria-label="Date"
              className="mt-1 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </label>

          {isQty ? (
            <>
              <label className="block">
                <span className="text-[11px] text-slate-500">Quantité</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  aria-label="Quantité"
                  className="mt-1 w-24 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-slate-500">Prix unitaire</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  aria-label="Prix unitaire"
                  className="mt-1 w-28 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-slate-500">Frais</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.fee}
                  onChange={(e) => set("fee", e.target.value)}
                  aria-label="Frais"
                  className="mt-1 w-24 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="text-[11px] text-slate-500">Montant</span>
              <input
                type="number"
                step="any"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                aria-label="Montant"
                className="mt-1 w-32 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </label>
          )}

          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter la transaction
          </button>
        </div>
        {error && <div className="text-xs text-amber-400">{error}</div>}
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-surface-900 border border-white/5 text-center text-sm text-slate-400">
          Aucune transaction enregistrée. Ajoute une première opération ci-dessus.
        </div>
      ) : (
        <>
          {/* Synthèse réalisé / lots par symbole */}
          <div className="p-4 rounded-2xl bg-surface-900 border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-white">Réalisé &amp; lots ouverts par symbole</h3>
              <div className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-surface-800 p-1" role="group" aria-label="Méthode d'appariement">
                {["fifo", "lifo"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase cursor-pointer ${method === m ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-white"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-slate-500 border-b border-white/5">
                    <th className="py-2">Symbole</th>
                    <th className="py-2 text-right">Quantité ouverte</th>
                    <th className="py-2 text-right">Coût moyen</th>
                    <th className="py-2 text-right">Coût de revient</th>
                    <th className="py-2 text-right">P&amp;L réalisé</th>
                    <th className="py-2 text-right">Dividendes</th>
                    <th className="py-2 text-right">Frais</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((symbol) => {
                    const s = summary[symbol];
                    return (
                      <tr key={symbol} className="border-b border-white/5">
                        <td className="py-2 font-medium text-white">
                          {symbol}
                          {s.oversold > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-400">
                              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                              survente {fmtQty(s.oversold)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-slate-300">{fmtQty(s.openQuantity)}</td>
                        <td className="py-2 text-right text-slate-300">{s.openQuantity > 0 ? formatCurrency(s.averageCost) : "—"}</td>
                        <td className="py-2 text-right text-slate-300">{formatCurrency(s.costBasis)}</td>
                        <td className={`py-2 text-right font-semibold ${s.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {formatCurrency(s.realizedPnl)}
                        </td>
                        <td className="py-2 text-right text-slate-300">{s.dividends ? formatCurrency(s.dividends) : "—"}</td>
                        <td className="py-2 text-right text-slate-300">{s.fees ? formatCurrency(s.fees) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Journal chronologique */}
          <div className="p-4 rounded-2xl bg-surface-900 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-3">Historique ({transactions.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-slate-500 border-b border-white/5">
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Symbole</th>
                    <th className="py-2 text-right">Détail</th>
                    <th className="py-2 text-right">Frais</th>
                    <th className="py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id} className="border-b border-white/5">
                      <td className="py-2 text-slate-300">{t.date}</td>
                      <td className="py-2 text-slate-300">{TYPE_LABELS[t.type]}</td>
                      <td className="py-2 font-medium text-white">{t.symbol}</td>
                      <td className="py-2 text-right text-slate-300">
                        {QTY_TYPES.has(t.type)
                          ? `${fmtQty(t.quantity)} × ${formatCurrency(t.price)}`
                          : formatCurrency(t.amount)}
                      </td>
                      <td className="py-2 text-right text-slate-300">{QTY_TYPES.has(t.type) && t.fee ? formatCurrency(t.fee) : "—"}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(t.id)}
                          aria-label={`Supprimer la transaction ${t.symbol} du ${t.date}`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
