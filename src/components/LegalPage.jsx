import { ShieldCheck, Scale, Database, AlertTriangle } from "lucide-react";

// Legal & privacy page (P8.5 — Loi 25, Québec). Content reflects the app's ACTUAL
// behavior (local-first storage, market-data API calls, no accounts/tracking).
// Operator identity is left as explicit [À COMPLÉTER] placeholders — never
// fabricated — to be filled and reviewed by counsel before a commercial launch.
// Not legal advice. Frozen FIS palette.

const TODO = "[À COMPLÉTER avant mise en ligne]";

const MARKET_DATA_PROVIDERS = [
  "Finnhub", "Twelve Data", "Alpha Vantage", "Stooq",
  "FRED (Réserve fédérale de St. Louis)", "Banque centrale européenne / Frankfurter", "exchangerate.host",
];

const LOCAL_KEYS = [
  "portefeuilles et positions", "journal de transactions", "watchlists", "journal d'investissement",
  "commentaires de gestionnaire", "préférences d'agencement et de thème", "alertes et règles de conformité",
];

function Block({ icon, title, children }) {
  return (
    <section className="p-4 sm:p-5 rounded-xl bg-surface-800 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-slate-300">{children}</div>
    </section>
  );
}

const ICON_CLASS = "w-5 h-5 text-violet-400";

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up" role="region" aria-label="Mentions légales et confidentialité">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-amber-200/90">
          Gabarit factuel reflétant le comportement technique actuel de l'application. Les champs {TODO} doivent être
          remplis et l'ensemble validé par un conseiller juridique avant toute mise en ligne commerciale. Ceci n'est pas
          un avis juridique.
        </p>
      </div>

      <Block icon={<Scale className={ICON_CLASS} aria-hidden="true" />} title="Mentions légales">
        <p>Exploitant : {TODO} (dénomination, forme juridique, adresse).</p>
        <p>Responsable de la publication : {TODO}.</p>
        <p>Hébergement : {TODO} (ex. fournisseur d'hébergement et région).</p>
        <p>Contact : {TODO} (courriel).</p>
      </Block>

      <Block icon={<ShieldCheck className={ICON_CLASS} aria-hidden="true" />} title="Politique de confidentialité (Loi 25 — Québec)">
        <p>
          <strong className="text-white">Responsable de la protection des renseignements personnels (RPP)</strong> : {TODO}
          (nom et coordonnées de la personne responsable, tel qu'exigé par la Loi 25).
        </p>
        <p>
          <strong className="text-white">Renseignements traités.</strong> L'application fonctionne « local-first » : les
          données que tu saisis ({LOCAL_KEYS.join(", ")}) sont conservées dans le stockage local de ton navigateur
          (localStorage) et ne sont pas transmises à nos serveurs. Aucun compte utilisateur n'est requis à ce stade ;
          aucun renseignement personnel n'est collecté côté serveur.
        </p>
        <p>
          <strong className="text-white">Communication à des tiers.</strong> Pour afficher les données de marché, les
          symboles boursiers que tu consultes sont transmis aux fournisseurs suivants : {MARKET_DATA_PROVIDERS.join(", ")}.
          Ces requêtes concernent des données de marché publiques, et non des renseignements personnels. Consulte les
          politiques de confidentialité respectives de ces fournisseurs.
        </p>
        <p>
          <strong className="text-white">Témoins (cookies) et pistage.</strong> Aucun cookie de pistage, aucune
          publicité, aucun outil d'analyse d'audience. Seul un stockage local strictement fonctionnel est utilisé.
        </p>
        <p>
          <strong className="text-white">Tes droits.</strong> Conformément à la Loi 25, tu disposes d'un droit d'accès,
          de rectification, de retrait du consentement et de portabilité. Tu peux effacer toutes les données locales en
          vidant le stockage de ton navigateur. Pour toute demande ou plainte, contacte le RPP ({TODO}) ; tu peux aussi
          saisir la Commission d'accès à l'information du Québec (CAI).
        </p>
      </Block>

      <Block icon={<Database className={ICON_CLASS} aria-hidden="true" />} title="Conservation des données">
        <p>
          Données locales : conservées dans ton navigateur jusqu'à ce que tu les supprimes (effacement du stockage local
          ou réinitialisation depuis les Paramètres).
        </p>
        <p>
          Caches serveur : les réponses des fournisseurs de données de marché sont mises en cache temporairement selon
          leur volatilité (de 20 s pour les cotations à 24 h pour les dividendes) afin de limiter les appels.
        </p>
        <p>
          En environnement de développement, une base SQLite locale peut refléter les portefeuilles ; elle reste sur la
          machine de développement et n'est pas exposée publiquement.
        </p>
      </Block>

      <p className="text-[11px] text-slate-600 text-center">Dernière mise à jour : {TODO}.</p>
    </div>
  );
}
