import { MapPin, Lock } from "lucide-react";
import { describeCanadianListing } from "../utils/canadianListing";

// Canadian listing panel (P5.5). Surfaces the factual, suffix-derivable facts of
// a Canadian-listed asset (venue + usual quote currency) and honestly discloses
// what is blocked-on-data (SEDAR+ filings, CAD gross/net dividends + 15% US
// withholding on registered accounts) rather than fabricating it. Renders
// nothing for non-Canadian symbols (idiom shared with CurrencyExposurePanel).
// Frozen FIS palette only.
export default function CanadianListingPanel({ asset }) {
  const listing = describeCanadianListing(asset?.symbol);
  if (!listing.listed) return null;

  return (
    <div className="animate-slide-up p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-rose-500/10">
          <MapPin className="w-5 h-5 text-rose-400" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-white">Cotation canadienne</h3>
        <span className="ml-auto text-xs text-slate-500">{listing.suffix}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-[11px] text-slate-500">Place</div>
          <div className="font-medium text-slate-200">{listing.exchangeName}</div>
          <div className="text-[11px] text-slate-500">{listing.exchangeCode}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Pays</div>
          <div className="font-medium text-slate-200">{listing.countryLabel}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Devise de cotation usuelle</div>
          <div className="font-medium text-slate-200">{listing.quoteCurrency}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-slate-400">Non disponible (bloqué sur données)</span>
        </div>
        <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
          <li>Dépôts réglementaires SEDAR+ (aucune API publique gratuite équivalente à EDGAR).</li>
          <li>Traitement fiscal des dividendes canadiens déterminés (majoration + crédit d'impôt pour dividendes) — hors périmètre.</li>
        </ul>
        <p className="text-[11px] text-slate-500 mt-1.5">
          La retenue 15 % US sur dividendes (comptes REER/CELI/imposable) est désormais traitée par le panneau « Retenue US sur dividendes » du tableau de bord.
        </p>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Place dérivée du suffixe du symbole. La devise indiquée est celle usuelle de la bourse, pas une donnée par titre. Pas un conseil.
      </p>
    </div>
  );
}
