import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LifeBuoy, Printer } from "lucide-react";
// Documentation regroupée pour le centre d'aide (bundle en un chunk lazy).
import indexMd from "../help/aide-index.md?raw";
import formationMd from "../help/aide-formation.md?raw";
import theorieMd from "../help/aide-theorie.md?raw";

const TABS = [
  { id: "index", label: "À propos & documentation", md: indexMd },
  { id: "formation", label: "Formation", md: formationMd },
  { id: "theorie", label: "Théorie & calculs", md: theorieMd },
];

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-white mt-2 mb-3 pb-2 border-b border-white/10">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-white mt-10 mb-3 pb-1.5 border-b border-white/10">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="text-base font-semibold text-violet-200 mt-6 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-200 mt-4 mb-1.5">{children}</h4>,
  p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-sm text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
  hr: () => <hr className="my-8 border-white/10" />,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-violet-500/40 bg-violet-500/[0.06] rounded-r-lg pl-4 pr-3 py-2 text-sm text-slate-300">
      {children}
    </blockquote>
  ),
  // react-markdown v9 a retiré la prop `inline` : on distingue bloc (fence, avec
  // saut de ligne) et inline (symbole) sur le contenu.
  code: ({ children }) =>
    String(children).includes("\n") ? (
      <code className="block my-3 px-4 py-3 rounded-lg bg-surface-950 border border-white/10 text-emerald-200 text-[0.82em] font-mono whitespace-pre overflow-x-auto">
        {children}
      </code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-surface-800 text-emerald-200 text-[0.85em] font-mono">{children}</code>
    ),
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-200">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-800">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 align-top border-t border-white/5 text-slate-300">{children}</td>,
};

export default function HelpPage() {
  const [tabId, setTabId] = useState("index");
  const active = TABS.find((t) => t.id === tabId) ?? TABS[0];

  return (
    <section aria-label="Centre d'aide" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Centre d'aide</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-surface-900 p-0.5" role="tablist" aria-label="Section de l'aide">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === tabId}
                onClick={() => setTabId(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  t.id === tabId ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Imprimer / PDF
          </button>
        </div>
      </div>

      <article className="rounded-2xl bg-surface-900 border border-white/5 shadow-2xl shadow-black/30 px-5 sm:px-8 py-6 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {active.md}
        </ReactMarkdown>
      </article>
    </section>
  );
}
