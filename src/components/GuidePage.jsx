import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Printer } from "lucide-react";
// Guides live at the repo root; bundled as raw strings (one lazy chunk with
// react-markdown). Single source of truth = the same .md files shipped/printed.
import detailedMd from "../../USER_GUIDE_DETAILED.md?raw";
import standardMd from "../../USER_GUIDE.md?raw";
import cheatsheetMd from "../../USER_GUIDE_CHEATSHEET.md?raw";

const LEVELS = [
  { id: "detailed", label: "Détaillé", hint: "Pas-à-pas", md: detailedMd, file: "USER_GUIDE_DETAILED.md" },
  { id: "standard", label: "Intermédiaire", hint: "Chaque fonction", md: standardMd, file: "USER_GUIDE.md" },
  { id: "cheatsheet", label: "Aide-mémoire", hint: "Tables", md: cheatsheetMd, file: "USER_GUIDE_CHEATSHEET.md" },
];

// Map a cross-file .md link to the level it represents (the guides link to each
// other at the top) so clicks switch level in-app instead of 404-ing.
const FILE_TO_LEVEL = {
  "USER_GUIDE_DETAILED.md": "detailed",
  "USER_GUIDE.md": "standard",
  "USER_GUIDE_CHEATSHEET.md": "cheatsheet",
};

function markdownComponents(setLevel) {
  return {
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
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 rounded bg-surface-800 text-emerald-200 text-[0.85em] font-mono">{children}</code>
    ),
    a: ({ href, children }) => {
      const level = href && FILE_TO_LEVEL[href.replace("./", "")];
      if (level) {
        return (
          <button
            type="button"
            onClick={() => setLevel(level)}
            className="text-blue-300 underline hover:text-blue-200 cursor-pointer"
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-200">
          {children}
        </a>
      );
    },
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
}

export default function GuidePage() {
  const [levelId, setLevelId] = useState("standard");
  const active = LEVELS.find((l) => l.id === levelId) ?? LEVELS[1];

  return (
    <section aria-label="Guide d'utilisation" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Guide d'utilisation</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-surface-900 p-0.5" role="tablist" aria-label="Niveau de détail">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={l.id === levelId}
                onClick={() => setLevelId(l.id)}
                title={l.hint}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  l.id === levelId ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {l.label}
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
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(setLevelId)}>
          {active.md}
        </ReactMarkdown>
      </article>
    </section>
  );
}
