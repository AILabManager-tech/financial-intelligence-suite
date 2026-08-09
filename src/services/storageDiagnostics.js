// Journal des pannes de lecture du stockage local (B4).
//
// Les stores retombaient sur leurs valeurs par défaut dans un `catch {}` muet :
// si les données du navigateur étaient corrompues, le portefeuille repartait à
// vide sans message ni trace. L'utilisateur croyait avoir tout perdu, et rien
// ne permettait de diagnostiquer à distance.
//
// Ici on ne répare pas la donnée — on rend la panne VISIBLE : une trace en
// console pour le diagnostic, et un message pour l'écran. Le repli lui-même
// reste inchangé : mieux vaut une application qui démarre qu'un écran blanc.

const failures = [];

// Une clé illisible le reste : la signaler à chaque lecture inonderait la
// console et empilerait le même message à l'écran.
export function recordStorageFailure(label, key, error) {
  if (failures.some((failure) => failure.key === key)) return;

  const message = error?.message ?? String(error);
  failures.push({ label, key, message, at: new Date().toISOString() });
  // La trace porte la clé (utile au diagnostic), jamais son contenu.
  console.error(`[stockage local] lecture impossible — ${label} (${key}) : ${message}`);
}

export function getStorageFailures() {
  return [...failures];
}

export function clearStorageFailures() {
  failures.length = 0;
}

// Message destiné à l'utilisateur. Il nomme ce qui n'a pas pu être relu, sans
// recopier la donnée corrompue ni le nom technique de la clé.
export function describeStorageFailures(list) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const labels = [...new Set(list.map((failure) => failure.label))];
  const enumerated = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;

  return `Données locales illisibles : ${enumerated}. Ce qui était enregistré n'a pas pu être relu et l'affichage est reparti à vide. Rien n'a été effacé automatiquement.`;
}
