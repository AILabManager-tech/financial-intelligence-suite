import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function TeX({ tex, display = false }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" }),
    [tex, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Section({ roman, title, children, wide = false }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <h3 className="text-sm font-semibold text-white tracking-wide mb-2">
        <span className="mr-2 text-slate-500">{roman}.</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Block({ children }) {
  return (
    <div className="px-3 py-2 my-1 overflow-x-auto bg-surface-900 border border-white/5 rounded-md text-slate-200">
      {children}
    </div>
  );
}

function Crit({ label, tex }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-white/5 pb-1">
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-200">
        <TeX tex={tex} />
      </span>
    </div>
  );
}

export default function BuffettMathBreakdown({ ticker, fcf, r, g, intrinsicValue, livePrice, mos, years = 10 }) {
  const ivStr = Number.isFinite(intrinsicValue) ? `\\$${intrinsicValue.toFixed(2)}` : "\\infty";
  const mosStr = Number.isFinite(mos) ? `${(mos * 100).toFixed(2)}\\%` : "-";
  const gPct = (g * 100).toFixed(1);
  const rPct = (r * 100).toFixed(1);
  const fcfStr = `\\$${fcf.toFixed(2)}`;
  const pxStr = `\\$${livePrice.toFixed(2)}`;
  const valid = r > g;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Décomposition mathématique Buffett">
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-4">
        Décomposition mathématique
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
        <Section roman="I" title="Discounted Cash Flow — valeur intrinsèque">
          <p className="mb-2 text-slate-400">
            Somme des flux libres futurs actualisés + valeur terminale Gordon. Convergence requiert{" "}
            <TeX tex="r > g" />.
          </p>
          <Block>
            <TeX display tex="IV = \sum_{t=1}^{N} \frac{FCF_0\,(1+g)^t}{(1+r)^t} + \frac{TV}{(1+r)^N}" />
          </Block>
          <Block>
            <TeX display tex="TV = \frac{FCF_N\,(1+g)}{r - g}" />
          </Block>
        </Section>

        <Section roman="II" title={`Appliqué à ${ticker}`}>
          <p className="mb-2 text-slate-400">
            Données extraites du panneau fondamentaux et des curseurs.
          </p>
          <Block>
            <TeX
              display
              tex={`\\begin{aligned} FCF_0 &= ${fcfStr}, \\quad g = ${gPct}\\% \\\\ r &= ${rPct}\\%, \\quad N = ${years} \\end{aligned}`}
            />
          </Block>
          {valid ? (
            <Block>
              <TeX
                display
                tex={`\\begin{aligned} IV &= ${ivStr} \\\\ P_{\\text{marché}} &= ${pxStr} \\end{aligned}`}
              />
            </Block>
          ) : (
            <p className="text-xs text-amber-400">
              ⚠ <TeX tex="r \le g" /> — le modèle diverge, valeur intrinsèque indéfinie.
            </p>
          )}
        </Section>

        <Section roman="III" title="Marge de sécurité">
          <p className="mb-2 text-slate-400">
            Signal d'entrée Buffett : décote du prix de marché par rapport à la valeur intrinsèque.
          </p>
          <Block>
            <TeX display tex="MoS = \dfrac{IV - P_{\text{marché}}}{IV}" />
          </Block>
          {valid && (
            <Block>
              <TeX display tex={`MoS = \\dfrac{${ivStr} - ${pxStr}}{${ivStr}} = ${mosStr}`} />
            </Block>
          )}
        </Section>

        <Section roman="IV" title="Règle de décision">
          <p className="mb-2 text-slate-400">
            Signal calculé en continu. Biais conservateur : favorable seulement si
            tous les critères sont réunis ; défavorable uniquement sur surévaluation matérielle.
          </p>
          <Block>
            <TeX
              display
              tex={String.raw`\text{Signal} = \begin{cases} \text{Favorable}  & \text{si les 6 critères} = \text{PASS} \\ \text{Défavorable} & \text{si } MoS < -10\% \\ \text{Neutre} & \text{sinon} \end{cases}`}
            />
          </Block>
        </Section>

        <Section roman="V" title="Critères quantitatifs" wide>
          <p className="mb-2 text-slate-400">
            Six portes évaluées en continu. L'ensemble doit passer pour autoriser un Achat.
          </p>
          <div className="grid md:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <Crit label="Rentabilité"   tex="ROE > 15\%" />
            <Crit label="Levier"        tex="D/E < 0.5" />
            <Crit label="Qualité cash"  tex="FCF > 0" />
            <Crit label="Croissance"    tex="\Delta EPS_{5y} > 5\%" />
            <Crit label="Moat"          tex="\text{moat} = \text{vrai}" />
            <Crit label="Marge entrée"  tex="MoS > 25\%" />
          </div>
        </Section>
      </div>
    </div>
  );
}
