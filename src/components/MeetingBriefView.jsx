// Vue du brief de préparation de rencontre (P6.5), route /brief.
//
// Le markdown produit par `renderMeetingBriefMarkdown` est la SOURCE UNIQUE :
// on le rend via react-markdown plutôt que de re-décliner les sections en JSX,
// sinon la mise en forme existerait en deux exemplaires divergents. Le bouton
// « Copier » copie ce même markdown brut — c'est le livrable (collable dans un
// courriel, un CRM, des notes de rencontre).
//
// Lazy-loadé par App (comme GuidePage) : react-markdown est lourd et n'a rien à
// faire dans le bundle principal.
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardCheck, ClipboardCopy, NotebookPen } from "lucide-react";
import { buildMeetingBrief, renderMeetingBriefMarkdown } from "../utils/meetingBrief";
import { fetchMeetingTopics } from "../services/meetingTopics";

// Mapping local — volontairement distinct de celui de GuidePage, dont le handler
// `a` est spécifique aux guides. Ici `a` sort vers les articles sources cités
// par les sujets (P6.6), donc en nouvel onglet.
const MD = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-200">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-3 pb-2 border-b border-white/10">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-white mt-8 mb-3 pb-1.5 border-b border-white/10">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-violet-200 mt-5 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-slate-300">{children}</ul>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-400">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-amber-500/40 bg-amber-500/[0.06] rounded-r-lg pl-4 pr-3 py-2 text-sm text-slate-300">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-800">{children}</thead>,
  th: ({ children }) => <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top border-t border-white/5 text-slate-300">{children}</td>,
};

export default function MeetingBriefView({ mandate = {}, assets = [], snapshots = [], transactions = [] }) {
  const asOf = useMemo(() => new Date().toISOString(), []);
  const [since, setSince] = useState("");
  const [copied, setCopied] = useState(false);
  const [topics, setTopics] = useState(null);

  // Les symboles réellement détenus — clé stable pour ne pas refetch à chaque tick.
  const heldKey = useMemo(
    () =>
      assets
        .filter((a) => Number(a?.position?.quantity) > 0)
        .map((a) => a.symbol)
        .sort()
        .join(","),
    [assets],
  );

  // La sélection des sujets exige un appel réseau → elle vit dans la vue, et le
  // résultat est injecté dans le builder (qui reste pur).
  useEffect(() => {
    if (!heldKey) return undefined; // rien à demander — `effectiveTopics` gère l'affichage
    const controller = new AbortController();
    fetchMeetingTopics(heldKey.split(","), { signal: controller.signal })
      .then((payload) => {
        if (!controller.signal.aborted) setTopics(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setTopics({ hasData: false, reason: "Le service de sélection des sujets est indisponible.", topics: [] });
      });
    return () => controller.abort();
  }, [heldKey]);

  // Dérivé plutôt que remis à null dans l'effet (lint react-hooks/set-state-in-effect) :
  // sans position détenue, il n'y a rien à sélectionner, donc pas de section.
  const effectiveTopics = heldKey ? topics : null;

  const markdown = useMemo(
    () =>
      renderMeetingBriefMarkdown(
        buildMeetingBrief({ mandate, assets, snapshots, transactions, asOf, since: since || null, topics: effectiveTopics }),
      ),
    [mandate, assets, snapshots, transactions, asOf, since, effectiveTopics],
  );

  const copy = () => {
    navigator.clipboard
      ?.writeText(markdown)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopied(false));
  };

  return (
    <section className="space-y-5 animate-slide-up" aria-label="Brief de préparation de rencontre">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <label htmlFor="brief-since" className="text-sm text-slate-400">
            Dernière rencontre le
          </label>
          <input
            id="brief-since"
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="px-2 py-1 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-xs font-semibold cursor-pointer"
          aria-label="Copier le brief en markdown"
        >
          {copied ? <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" /> : <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />}
          {copied ? "Copié" : "Copier le brief"}
        </button>
      </div>

      <div className="p-5 rounded-xl bg-surface-800 border border-white/5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
          {markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}
