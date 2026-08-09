import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileJson, Save, Trash2, Upload, WalletCards, X } from "lucide-react";
import { enrichAssetsWithPositionMetrics } from "../utils/portfolioAnalytics";
import { formatCurrency } from "../utils/scoreTranslator";
import { buildPortfolioCsv, buildPortfolioJson, downloadTextFile } from "../services/portfolioExport";
import { parseBrokerCsv } from "../services/csvImporter";
import { MAX_QUANTITY, MAX_UNIT_PRICE } from "../utils/positionLimits";

// Mêmes bornes que la persistance, pour que le navigateur signale la saisie
// hors limite au lieu de la laisser replier silencieusement au enregistrement.
const FIELD_MAX = {
  quantity: MAX_QUANTITY,
  averageCost: MAX_UNIT_PRICE,
  targetWeight: 100,
};

function toDraft(asset) {
  return {
    quantity: String(asset.position?.quantity ?? 0),
    averageCost: String(asset.position?.averageCost ?? asset.price ?? 0),
    targetWeight: String(asset.position?.targetWeight ?? 0),
  };
}

function parseDraft(draft) {
  return {
    quantity: Number(draft.quantity),
    averageCost: Number(draft.averageCost),
    targetWeight: Number(draft.targetWeight),
  };
}

export default function PortfolioManager({ assets, onSavePosition, onRemoveAsset, onImportPositions }) {
  const positioned = useMemo(() => enrichAssetsWithPositionMetrics(assets), [assets]);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(assets.map((asset) => [asset.symbol, toDraft(asset)])));
  const exportDate = new Date().toISOString().slice(0, 10);
  const fileInputRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");

  const updateDraft = (symbol, field, value) => {
    setDrafts((current) => ({
      ...current,
      [symbol]: {
        ...(current[symbol] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleImportClick = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseBrokerCsv(text);
      setImportPreview({ ...result, fileName: file.name });
    } catch (readError) {
      setImportError(`Lecture impossible: ${readError.message}`);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    setImportError("");
  };

  const confirmImport = () => {
    if (!importPreview) return;
    onImportPositions?.(importPreview.positions);
    setImportPreview(null);
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <WalletCards className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Positions sauvegardées</h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/15 text-violet-200 hover:bg-violet-500/20 cursor-pointer text-xs font-medium"
            aria-label="Importer des positions depuis un CSV broker"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Importer CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Choisir un fichier CSV de courtier à importer"
            tabIndex={-1}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => downloadTextFile(`portfolio-${exportDate}.csv`, "text/csv;charset=utf-8", buildPortfolioCsv(assets))}
            className="p-2 rounded-lg bg-surface-800 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Exporter le portefeuille en CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(`portfolio-${exportDate}.json`, "application/json;charset=utf-8", buildPortfolioJson(assets))}
            className="p-2 rounded-lg bg-surface-800 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Exporter le portefeuille en JSON"
          >
            <FileJson className="w-4 h-4" />
          </button>
        </div>
      </div>

      {importError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          {importError}
        </div>
      )}

      {importPreview && (
        <div className="mb-4 p-4 rounded-xl bg-surface-800 border border-violet-500/20">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-white">
                Aperçu d'import — {importPreview.fileName}
              </div>
              <div className="text-xs text-slate-400">
                {importPreview.positions.length} ligne{importPreview.positions.length > 1 ? "s" : ""} valide{importPreview.positions.length > 1 ? "s" : ""}
                {importPreview.errors.length > 0 && ` · ${importPreview.errors.length} erreur${importPreview.errors.length > 1 ? "s" : ""}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelImport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importPreview.positions.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Importer {importPreview.positions.length} position{importPreview.positions.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>

          {importPreview.positions.length > 0 && (
            <div className="rounded-lg border border-white/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-900/70">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2 text-right">Quantité</th>
                    <th className="px-3 py-2 text-right">Coût moyen</th>
                    <th className="px-3 py-2 text-right">Cible %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importPreview.positions.map((position) => (
                    <tr key={`${position.symbol}-${position.sourceLine}`}>
                      <td className="px-3 py-2 text-slate-500">{position.sourceLine}</td>
                      <td className="px-3 py-2 text-white font-medium">{position.symbol}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{position.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${position.averageCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{position.targetWeight.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {importPreview.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Lignes ignorées
              </div>
              <ul className="space-y-1 text-xs text-amber-200/80 max-h-40 overflow-y-auto">
                {importPreview.errors.map((errorEntry, index) => (
                  <li key={`${errorEntry.line}-${index}`}>
                    Ligne {errorEntry.line}: {errorEntry.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/5 overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="bg-surface-800/80">
              <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Actif</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Quantité</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Coût moyen</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Cible %</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Valeur</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positioned.map((asset) => {
              const draft = drafts[asset.symbol] ?? toDraft(asset);

              return (
                <tr key={asset.symbol}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{asset.symbol}</div>
                    <div className="text-xs text-slate-500">{asset.name}</div>
                  </td>
                  {["quantity", "averageCost", "targetWeight"].map((field) => (
                    <td key={field} className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        max={FIELD_MAX[field]}
                        step={field === "quantity" ? "0.01" : "0.1"}
                        value={draft[field]}
                        onChange={(event) => updateDraft(asset.symbol, field, event.target.value)}
                        className="w-28 px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-right text-sm text-white focus:outline-none focus:border-violet-500/50"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-semibold text-white">{formatCurrency(asset.positionMetrics.marketValue)}</div>
                    <div className="text-[11px] text-slate-500">{asset.positionMetrics.weight.toFixed(1)}%</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSavePosition(asset, parseDraft(draft))}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
                        aria-label={`Sauvegarder ${asset.symbol}`}
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveAsset(asset.symbol)}
                        className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                        aria-label={`Retirer ${asset.symbol}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
