import { useMemo, useState } from "react";
import { Download, FileJson, Save, Trash2, WalletCards } from "lucide-react";
import { enrichAssetsWithPositionMetrics } from "../utils/portfolioAnalytics";
import { formatCurrency } from "../utils/scoreTranslator";
import { buildPortfolioCsv, buildPortfolioJson, downloadTextFile } from "../services/portfolioExport";

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

export default function PortfolioManager({ assets, onSavePosition, onRemoveAsset }) {
  const positioned = useMemo(() => enrichAssetsWithPositionMetrics(assets), [assets]);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(assets.map((asset) => [asset.symbol, toDraft(asset)])));
  const exportDate = new Date().toISOString().slice(0, 10);

  const updateDraft = (symbol, field, value) => {
    setDrafts((current) => ({
      ...current,
      [symbol]: {
        ...(current[symbol] ?? {}),
        [field]: value,
      },
    }));
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
