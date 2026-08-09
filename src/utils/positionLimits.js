// Bornes hautes des champs de position, partagées par les deux couches de
// persistance. Pur, sans dépendance.
//
// `quantity × price` alimente la valeur de marché (`portfolioAnalytics.js`).
// Deux champs non bornés produisent Infinity, qui contamine ensuite la valeur
// totale, les poids et l'exposition sectorielle. Borner un seul des deux ne
// suffit pas : 1e9 × 1e308 vaut encore Infinity.
//
// Le produit maximal (1e9 × 1e6 = 1e15) reste sous Number.MAX_SAFE_INTEGER,
// tout en laissant passer n'importe quel portefeuille réel — un milliard de
// titres à un million de dollars pièce.
//
// Constantes partagées volontairement : recopiées, elles se désynchronisent
// (c'est exactement ce qui était arrivé au total des critères Buffett).
// Chaque couche applique la borne selon SA convention : le validateur serveur
// lève, le normaliseur client replie comme sur une valeur non finie.
export const MAX_QUANTITY = 1e9;
export const MAX_UNIT_PRICE = 1e6;
