// MWR / IRR — rendement pondéré par l'argent (P4.3), pur et factuel.
//
// Contrairement au TWR (effet du gérant, flux neutralisés), le MWR capture
// l'EFFET TIMING du client : un apport juste avant une hausse améliore le MWR.
// On résout le taux r tel que la VAN des flux datés s'annule (IRR), par
// Newton-Raphson avec repli par bisection si Newton ne converge pas.
//
// Flux (point de vue investisseur) : valeur de départ = mise initiale (−V_début),
// achat = apport (−), vente = retrait (+), valeur finale = restitution (+V_fin).
// `computeFlowsByDay` donne buy=+ / sell=− ⇒ flux investisseur = −flow.
//
// Factualité : annualiser quelques semaines en taux annuel serait trompeur ⇒
// l'IRR annualisé n'est exposé qu'à partir de 365 j ; le MWR de PÉRIODE (réel,
// non extrapolé) est toujours donné. Pas de convergence ⇒ valeurs masquées.

import { computeFlowsByDay, daysBetween } from "./timeWeightedReturn";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365;

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

function yearsBetween(fromDay, toDay) {
  const from = new Date(`${fromDay}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDay}T00:00:00.000Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return (to - from) / MS_PER_DAY / YEAR_DAYS;
}

function npv(rate, flows) {
  return flows.reduce((acc, f) => acc + f.cf / (1 + rate) ** f.t, 0);
}

function npvDerivative(rate, flows) {
  return flows.reduce((acc, f) => acc - (f.t * f.cf) / (1 + rate) ** (f.t + 1), 0);
}

// Résout VAN(r)=0. Newton-Raphson puis bisection de secours. null si échec.
function solveIrr(flows) {
  let rate = 0.1;
  for (let i = 0; i < 100; i += 1) {
    const value = npv(rate, flows);
    const slope = npvDerivative(rate, flows);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || slope === 0) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Repli bisection : nécessite un changement de signe sur l'intervalle.
  let lo = -0.9999;
  let hi = 100;
  let flo = npv(lo, flows);
  let fhi = npv(hi, flows);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid, flows);
    if (!Number.isFinite(fmid)) return null;
    if (Math.abs(fmid) < 1e-9 || (hi - lo) / 2 < 1e-9) return mid;
    if (flo * fmid <= 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

export function computeMoneyWeightedReturn(snapshots, transactions = []) {
  const points = (Array.isArray(snapshots) ? snapshots : [])
    .map((s) => ({
      day: dayKey(s?.snapshotDate) ?? dayKey(s?.capturedAt),
      value: Number(s?.totalMarketValue),
    }))
    .filter((p) => p.day && Number.isFinite(p.value))
    .sort((a, b) => a.day.localeCompare(b.day));

  if (points.length < 2) {
    return { hasData: false };
  }

  const startDay = points[0].day;
  const endDay = points[points.length - 1].day;
  const startValue = points[0].value;
  const endValue = points[points.length - 1].value;
  if (!(startValue > 0)) {
    return { hasData: false };
  }

  const spanDays = daysBetween(startDay, endDay);
  if (!spanDays || spanDays <= 0) {
    return { hasData: false };
  }

  // Flux investisseur datés : −V_début à t0, −flow à chaque jour de flux strictement
  // après le départ et avant la fin, +V_fin à la date finale. Les flux du jour de
  // départ/fin sont rattachés au point correspondant (ignorés ici pour ne pas
  // double-compter la valeur de marché qui les contient déjà).
  const flows = [{ t: 0, cf: -startValue }];
  let flowsCount = 0;
  for (const [day, amount] of computeFlowsByDay(transactions)) {
    if (day <= startDay || day >= endDay) continue;
    const t = yearsBetween(startDay, day);
    if (t === null) continue;
    flows.push({ t, cf: -amount });
    flowsCount += 1;
  }
  flows.push({ t: spanDays / YEAR_DAYS, cf: endValue });

  const irr = solveIrr(flows);
  if (irr === null || !Number.isFinite(irr)) {
    return { hasData: true, converged: false, periodMwrPct: null, annualizedIrrPct: null, days: spanDays, flowsCount };
  }

  // MWR de période (non extrapolé) = (1 + IRR)^(années) − 1.
  const years = spanDays / YEAR_DAYS;
  const periodMwrPct = ((1 + irr) ** years - 1) * 100;

  return {
    hasData: true,
    converged: true,
    periodMwrPct,
    annualizedIrrPct: spanDays >= YEAR_DAYS ? irr * 100 : null, // masqué < 1 an
    days: spanDays,
    flowsCount,
  };
}
