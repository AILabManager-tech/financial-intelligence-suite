import { useState } from "react";
import { LogIn, UserPlus, ShieldCheck, AlertTriangle, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../core/authContext";

// Login / sign-up page (P7.1). Reachable at /login when auth is enabled. Uses
// the frozen FIS palette. When already signed in it shows the account summary +
// sign-out; when auth is disabled (solo build) it states so plainly rather than
// pretending. Not a tracking surface — only an account boundary for the
// commercial, multi-user product (Phase 7).

const ROLE_LABELS = {
  pm: "Gestionnaire de portefeuille",
  client: "Client (lecture seule)",
  compliance: "Conformité",
  admin: "Administrateur",
};

export default function AuthPanel() {
  const { authEnabled, user, status, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!authEnabled) {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-slide-up" role="region" aria-label="Authentification">
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Mode solo (sans compte)</h2>
            <p className="text-sm text-slate-300">
              L'authentification n'est pas configurée sur cette instance. La suite
              fonctionne en local : tes données restent dans ce navigateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-slide-up" role="region" aria-label="Compte">
        <div className="p-5 rounded-xl bg-surface-800 border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Connecté</h2>
          </div>
          <dl className="text-sm text-slate-300 space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Courriel</dt>
              <dd className="text-white">{user.email}</dd>
            </div>
            {user.fullName && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Nom</dt>
                <dd className="text-white">{user.fullName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Rôle</dt>
              <dd className="text-white">{ROLE_LABELS[user.role] ?? user.role}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-sm font-medium text-white transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await signIn({ email: email.trim(), password })
          : await signUp({ email: email.trim(), password, fullName: fullName.trim() || null });
      if (result?.error) {
        setError(result.error.message);
      } else if (result?.needsConfirmation) {
        setNotice("Compte créé. Vérifie ta boîte courriel pour confirmer l'adresse avant de te connecter.");
      }
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="max-w-md mx-auto space-y-4 animate-slide-up" role="region" aria-label="Authentification">
      <div className="p-5 rounded-xl bg-surface-800 border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          {isSignup ? (
            <UserPlus className="w-5 h-5 text-violet-400" aria-hidden="true" />
          ) : (
            <LogIn className="w-5 h-5 text-violet-400" aria-hidden="true" />
          )}
          <h2 className="text-base font-semibold text-white">
            {isSignup ? "Créer un compte" : "Connexion"}
          </h2>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-rose-200/90">{error}</p>
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20" role="status">
            <p className="text-xs text-emerald-200/90">{notice}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {isSignup && (
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Nom complet (optionnel)</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Courriel</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </label>
          <button
            type="submit"
            disabled={busy || status === "loading"}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isSignup ? "Créer le compte" : "Se connecter"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="w-full text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isSignup ? "J'ai déjà un compte — me connecter" : "Pas de compte ? En créer un"}
        </button>
      </div>
    </div>
  );
}
