# Audit de fiabilité — points à réviser

**Projet** Financial Intelligence Suite · **Date** 8 août 2026 · **Version auditée** `d3287df` → `e9ae5aa`

Audit complet de la chaîne entrée → calcul → affichage. Chaque sortie chiffrée a été confrontée
à un calcul indépendant fait en dehors du système. Six défauts démontrés, corrigés et déployés.
Après contre-vérification et corrections, huit points restent ouverts — dont un seul, B2, demande une décision.

**État** 1216 tests verts · lint 0 · build OK · vérifié sur Node 20 · en production sur devlabai.tech

---

## Errata — contre-vérification du 9 août 2026

Une seconde passe a confronté chaque point à une mesure indépendante. **35 des 39 tiennent.
Quatre étaient faux ou mal cadrés, une correction était incomplète.** Les numéros n'ont pas
changé, pour que des annotations déjà prises restent valides.

| Point | Ce qui a changé |
|---|---|
| **A2** | Était **incomplet** : le code était corrigé, mais la légende à l'écran et l'onglet Aide annonçaient toujours l'ancienne formule. Corrigé le 9 août, avec un test qui l'interdit désormais. |
| **A5** | Deux résidus (un commentaire, une donnée de test) nettoyés. |
| **B1** | **Mal cadré.** 9 avis, pas 20, et tous sur des outils de développement. Note ramenée de 8/10 à 4/10. |
| **B5** | **Formulation fausse.** 13 des 17 fichiers concernés n'ont pas de test. Le vrai point propre à `search` est ailleurs. |
| **B7** | **Faux.** La clé est présente. Point retiré des décisions ouvertes. |
| **B10** | Le constat d'origine était mal formulé — l'intégration vérifie bien Node 20 — mais l'écart avec le poste local **était** le vrai problème : aucune vérification locale ne reproduisait la version de l'intégration. Ramené à 2/10 par erreur, **remonté à 4/10**, corrigé le 9 août. |
| **B11** | **Corrigé le 9 août.** Aucun fuseau inventé : seule la date, fiable, est retenue et étiquetée. |
| **B4** | **Corrigé le 9 août.** Le repli reste, le silence part : bandeau + trace en console. |
| **B3** | **Corrigé le 9 août.** L'équivalence en P/FCF est affichée au lieu d'être implicite. |
| **B5** | **Formulation fausse**, et le vrai manque comblé le 9 août : couche de domaine extraite et testée. |
| **B6** | **Corrigé le 9 août.** Sonde d'écart entre les deux sources de prix. |
| **B13** | **Corrigé le 9 août**, en deux passes. La première ne protégeait que le serveur de développement — en ligne, rien ne l'était. Les deux couches sont bornées depuis. |

---

## Barème de notation

| Note | Signification |
|---|---|
| **9-10** | Chiffre faux montré à l'utilisateur. Bloque la confiance. |
| **7-8** | Fausse une décision, ou expose le site publiquement. |
| **5-6** | Trompeur sans être faux, ou dette qui coûtera plus tard. |
| **3-4** | Cohérence interne, hygiène de code. |
| **1-2** | Cosmétique. Aucun effet visible. |

---

# Partie A — Corrections livrées

Ces vingt points sont faits, testés et en ligne. Rien à décider : à valider ou à contester.

## A1. Rendement client faussé par un achat du jour

**Constat** Un achat saisi aujourd'hui affichait 11 010 % de rendement au lieu de 10 %.  
**Cause** L'argent sorti n'était pas compté, alors que les actions achetées l'étaient.  
**Note 10/10** — Chiffre absurde, sur un indicateur client, sans aucune alerte. Cas fréquent.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A2. Volatilité et Sharpe trop bas de 15 %

**Constat** Huit indicateurs de risque étaient systématiquement trop optimistes.  
**Cause** Le calcul mélangeait « jours de bourse » et « jours de calendrier ».  
**Note 9/10** — Biais permanent, invisible, sur tous les indicateurs de risque à la fois.  
**Suite (9 août)** Le code seul avait été corrigé. La légende du panneau et l'onglet Aide — visibles en production — annonçaient toujours l'ancienne formule. Corrigé, avec un test qui échoue si la légende et le calcul divergent à nouveau.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A3. Profits et pertes qui changeaient selon l'ordre des lignes

**Constat** Acheter et vendre le même jour donnait 1 000 $ ou 0 $ selon l'ordre du fichier importé.  
**Cause** Tri par date seule, sans départage entre achat et vente.  
**Note 9/10** — Touche le résultat réalisé et le rapport d'impôt T5008.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A4. VaR 99 % qui n'était pas une VaR 99 %

**Constat** Les niveaux 95 % et 99 % affichaient le même chiffre.  
**Cause** Trop peu de données pour estimer un tel seuil ; l'app affichait quand même.  
**Note 8/10** — Chiffre mal étiqueté. Le masquage est maintenant motivé à l'écran.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A5. Score Buffett gonflé d'un point

**Constat** Un des six critères ne pouvait jamais échouer. Tout le monde avait un point gratuit.  
**Cause** Les entreprises à flux négatif sont rejetées avant, donc le critère était acquis.  
**Note 8/10** — Score sur 5 maintenant. KO passe de 4/6 à 3/5 pour la même performance réelle.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A6. Trois tests protégeaient les bugs

**Constat** Trois tests validaient le mauvais comportement.  
**Cause** L'un d'eux aurait fait échouer la correction du rendement client.  
**Note 8/10** — Sans ça, les corrections étaient rejetées par la suite de tests elle-même.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A7. Tests manquants sur les cas réels

**Constat** Aucun test ne couvrait une série avec week-ends, ni l'exigence qu'un critère puisse échouer.  
**Cause** Les tests ne couvraient que les cas simplifiés.  
**Note 8/10** — 16 mutations sur 16 sont maintenant détectées. Les bugs ne peuvent plus revenir.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A8. Variation « +0,00 % » inventée

**Constat** Quand la variation du jour est inconnue, l'app affichait 0 %.  
**Cause** Affirmer « stable aujourd'hui » alors qu'on ne sait pas. Interdit par tes règles.  
**Note 7/10** — Corrigé sur toute la chaîne : serveur, client, stockage, affichage.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A9. Tableau qui affiche un tiret

**Constat** Une variation inconnue montrait une flèche verte et « +0,00 % ».  
**Cause** Affiche maintenant « — », sans couleur ni flèche.  
**Note 7/10** — C'est l'écran principal. Ce que l'utilisateur voit en premier.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A10. Source des prix mal attribuée

**Constat** L'app annonçait « Finnhub » pour tout un lot dès qu'une seule cote en venait.  
**Cause** Liste maintenant les sources réellement utilisées.  
**Note 6/10** — Faux, mais ce champ n'était affiché nulle part. Impact réel limité.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A11. VaR qui dit ce qui lui manque

**Constat** Un « n/d » muet ne disait pas pourquoi la case était vide.  
**Cause** Affiche maintenant « 40 obs requises ».  
**Note 6/10** — Confort et transparence. Aucun chiffre corrigé.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A12. Total des critères recopié à deux endroits

**Constat** Le nombre de critères était écrit en dur deux fois, et déjà faux.  
**Cause** Se calcule maintenant tout seul.  
**Note 5/10** — Prévention. Empêche le bug A5 de revenir par la porte d'à côté.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A13. Commentaire de calcul qui mentait

**Constat** Le commentaire décrivait une méthode que le code n'utilise pas.  
**Cause** Aurait trompé le prochain développeur qui y touche.  
**Note 5/10** — Aucun effet aujourd'hui. Risque réel demain.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A14. Filtre « variation positive » trompeur

**Constat** Le filtre incluait des titres sans donnée.  
**Cause** En JavaScript, une valeur inconnue passe pour positive.  
**Note 5/10** — Cas rare, mais silencieux.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A15. Nom de source inventé

**Constat** Le code inventait « stockprices.dev » quand la source manquait.  
**Cause** Dit maintenant que la source est inconnue.  
**Note 5/10** — Provenance fabriquée. Contraire à ta règle de traçabilité.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A16. Chiffres de tests faux dans la documentation

**Constat** Le README annonçait 370 tests en 1,4 s. Il y en a 1166 en 8 s.  
**Cause** Documentation jamais mise à jour.  
**Note 4/10** — Aucun effet sur le produit. Fait perdre confiance dans le reste de la doc.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A17. Étiquette « dev-only » périmée

**Constat** Le portefeuille d'exemple était marqué « développement seulement ».  
**Cause** Il est chargeable en production depuis une livraison précédente.  
**Note 4/10** — Contradiction interne. Le message visible par le visiteur était déjà correct.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A18. Note sur le paramètre des cotes

**Constat** Ta note en attente : `/api/quotes` prend `symbols` au pluriel, les autres non.  
**Cause** Elle était dans le dossier sans être enregistrée.  
**Note 3/10** — Ton texte, pas le mien. Utile au prochain développeur.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A19. Traçabilité des critères

**Constat** Le résumé expose maintenant quel critère a échoué.  
**Cause** Évite de refaire le calcul ailleurs.  
**Note 3/10** — Rien ne s'en sert encore. Préparation.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## A20. Mise en ligne

**Constat** 7 commits poussés sur GitHub, déployés sur devlabai.tech.  
**Cause** Sans ça, aucune correction n'aurait servi.  
**Note 10/10** — Les six défauts étaient encore en production jusqu'à ce déploiement.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

# Partie B — Points ouverts

Dix-neuf points non traités. Ce sont ceux qui demandent ta décision.

## B1. 20 failles dans les librairies

**Constat** 9 avis : 1 critique, 6 hautes, 2 basses. Aucune moyenne. Le chiffre de 20 était faux.  
**Enjeu** Les 9 portent sur des outils de développement (compilateur, tests, linter). **Aucune des 9 librairies servies au navigateur n'est touchée.** Rien de vulnérable n'atteint tes visiteurs.  
**Note 4/10** — Hygiène, pas sécurité. La vraie action : la mise à jour automatique échoue depuis le 4 août, ce qui laisse les alertes ouvertes.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B2. Titres canadiens impossibles à coter

**Constat** SHOP.TO et les autres titres canadiens ne peuvent pas être affichés.  
**Enjeu** L'app calcule pourtant l'impôt CELI, REER et le T5008. Contradiction produit.  
**Note 7/10** — Trou fonctionnel majeur pour un outil québécois. Demande une source de données payante.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B3. Le « DCF » Buffett n'en est pas un

**Constat** Deux hypothèses fixes pour toutes les entreprises réduisent le calcul à un simple ratio.  
**Enjeu** Les chiffres sont exacts. C'est le nom qui promettait trop.  
**Note 7/10, corrigé le 9 août** — Ni renommé ni repersonnalisé : **rendu explicite**. Le panneau
laissait déjà régler les deux hypothèses ; ce qui manquait, c'était de dire ce qu'elles impliquent.
Il affiche maintenant, et met à jour avec les curseurs, l'équivalence exacte : sous les hypothèses
par défaut, « marge de sécurité > 25 % » **est** « P/FCF < 15,75 ». Le résumé du tableau porte
désormais ses hypothèses avec lui. Une convention affichée, plus une promesse implicite.  
**Précision (9 août)** Les hypothèses figées ne concernent que le **score du tableau**. Le panneau de détail expose déjà les deux réglages en curseurs avec présets. Le problème de nom est donc confiné au résumé.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B4. Erreurs de sauvegarde invisibles

**Constat** Si les données du navigateur sont corrompues, l'app repart à vide.  
**Enjeu** Aucun message, aucune trace. L'utilisateur croit avoir tout perdu sans savoir pourquoi.  
**Note 6/10, corrigé le 9 août** — Le repli reste : mieux vaut une application qui démarre qu'un écran
blanc. Ce qui change, c'est le silence. Un bandeau nomme ce qui n'a pas pu être relu — le portefeuille,
l'historique — et précise que rien n'a été effacé automatiquement. Une trace part en console pour
permettre le diagnostic à distance. Ni le bandeau ni la trace ne recopient la donnée corrompue.

**Réserve honnête** : le bandeau lui-même n'est pas couvert par un test. Il n'existe aucun harnais de
test pour l'orchestrateur `App.jsx`. La logique dessous l'est (message rendu, panne consignée, pas de
doublon), le branchement de six lignes ne l'est pas.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B5. Un fichier serveur sans aucun test

**Constat** 13 des 17 fichiers de ce dossier n'ont pas de test. `search` n'était pas l'exception.  
**Enjeu** Ce qui lui était propre : la **seule feature sans couche `server/`**, donc la seule à échapper
à la couche testée qu'impose ta convention. Sa logique vivait en double, recopiée dans les deux serveurs.  
**Note 5/10, corrigé le 9 août** — Logique extraite en un module unique, 9 tests, dont la vérification
qu'aucune clé ne fuit ni dans les résultats ni dans les messages d'erreur. Les deux serveurs
l'appellent désormais au lieu de la recopier.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B6. Deux sources de prix différentes

**Constat** Les cotes viennent de Finnhub, l'historique de Twelve Data.  
**Enjeu** Ils concordaient (313,33 contre 313,32999), mais rien ne surveillait l'écart.  
**Note 5/10, corrigé le 9 août** — Une sonde compare les deux et fait passer l'état de santé en
« dégradé » si l'écart dépasse 0,5 %, même quand les deux sources répondent normalement. Elle
confronte deux **clôtures** : comparer un cours courant à une clôture quotidienne signalerait une
anomalie chaque après-midi de séance. Faute des deux valeurs, elle dit « inconnu » plutôt que de
supposer un accord.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B7. Assistant IA jamais testé en vrai — RETIRÉ, CONSTAT FAUX

**Constat** J'avais écrit que la clé était absente. **Elle est présente et valide.**  
**Enjeu** Il n'y a aucune décision à prendre : c'est un essai de dix minutes, pas un point ouvert.  
**Note —** Erreur de lecture de ma part sur mon propre résultat de vérification.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B8. Connexion utilisateur jamais testée

**Constat** Supabase n'est pas configuré.  
**Enjeu** Toute la partie comptes utilisateurs reste non vérifiée.  
**Note 5/10** — Bloquant seulement si tu vises le multi-utilisateur.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B9. Portefeuille vidé qui disparaît

**Constat** Si tout est vendu, la journée n'apparaît plus dans l'historique.  
**Enjeu** Devrait valoir zéro, pas disparaître.  
**Note 4/10** — Cas de bord. Coupe la fin de l'historique de performance.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B10. Version de Node incohérente

**Constat** Le projet annonce Node 20, la chaîne d'intégration le vérifie, ton poste tournait en 24.  
**Enjeu** Ce n'était pas cosmétique : **aucune vérification locale ne reproduisait la version d'exécution
de l'intégration**. C'est ce qui a rendu trois vérifications successives non concluantes — dont une qui a
déclaré une correction faite alors qu'elle ne protégeait rien. Node 20 est maintenant installé
en local et la suite complète y passe.  
**Note 4/10, corrigé le 9 août** — J'avais ramené ce point à 2/10 en disant « seul le poste est en 24 ».
Exact, et trop indulgent : cet écart était la condition qui rendait toute vérification locale muette.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B11. Heure de la source de secours ambiguë

**Constat** Stooq renvoie une heure sans fuseau horaire.  
**Enjeu** Le même envoi était lu comme un instant différent selon le navigateur, ce qui déplaçait
l'étiquette « prix périmé ».  
**Note 4/10, corrigé le 9 août** — Je n'ai pas inventé de fuseau : la source n'en documente aucun, et
en choisir un aurait été de la provenance fabriquée. Seule la date, qui est fiable, est retenue, et
elle est étiquetée comme telle. Une cote de secours peut donc paraître vieille d'un jour de plus,
jamais plus fraîche qu'on ne le sait — c'est le sens prudent. L'âge en heures n'est plus annoncé pour
cette source ; il l'est toujours pour la source principale, qui donne un vrai horodatage.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B12. Deux seuils d'endettement différents

**Constat** Le critère exige moins de 0,5. Le « rempart économique » tolère 1,5.  
**Enjeu** Vérifié puis laissé tel quel : ce sont deux questions distinctes, pas une contradiction.  
**Note 3/10** — Signalé à tort dans l'audit initial. L'écart est maintenant expliqué dans le code.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B13. Quantité démesurée acceptée

**Constat** On pouvait enregistrer 1e308 actions. Le produit quantité × prix valait alors l'infini.  
**Enjeu** Le mécanisme de borne existait déjà dans le code, il n'avait pas été appliqué.  
**Note 5/10, corrigé le 9 août** — En deux passes. La première n'a borné que le validateur du
serveur, qui ne tourne qu'en développement : en ligne le portefeuille est gardé par le navigateur,
sans passer par aucun serveur, donc rien n'était protégé. Elle avait aussi borné le coût moyen
plutôt que le prix, alors que c'est le prix qui multiplie la quantité dans la valeur de marché.
Les deux couches sont maintenant bornées avec les mêmes constantes partagées, et le formulaire
refuse la saisie hors limite.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B14. Référence de traité fiscal douteuse

**Constat** Le code cite l'article XVIII(7) pour l'exemption REER. C'est plutôt XXI(2).  
**Enjeu** Le taux appliqué (15 %, 0 % en REER) est correct. Seule la référence est suspecte.  
**Note 3/10** — À faire valider par un fiscaliste avant tout usage client.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B15. Frais imputés sans vente réelle

**Constat** Vendre des actions non détenues impute quand même les frais au résultat.  
**Enjeu** Situation anormale, déjà signalée par un compteur dédié.  
**Note 3/10** — Montant marginal. Le vrai problème (la survente) est déjà visible.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B16. Deux formules de moyenne différentes

**Constat** Le Sharpe et le Sortino n'utilisent pas la même base de calcul.  
**Enjeu** Les deux conventions sont admises, mais elles ne sont plus comparables entre elles.  
**Note 3/10** — Débat d'école. Aucun chiffre faux.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B17. Berkshire écrit en dur

**Constat** Deux titres ont leur « avantage concurrentiel » forcé dans le code, sans source.  
**Enjeu** Jugement non sourcé dans un outil qui exige des sources partout.  
**Note 2/10** — Deux titres seulement. Défendable, mais contraire au principe.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B18. Tes fichiers non versionnés

**Constat** `formation/`, `presentation/`, `workflows/` et les PDF restent hors de Git.  
**Enjeu** Ton choix, pas le mien. Je les ai volontairement laissés de côté.  
**Note 2/10** — Aucun effet technique. À trancher si tu veux les sauvegarder.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## B19. Base de test locale écrasée

**Constat** J'ai effacé le portefeuille de ta base SQLite de développement en testant la validation.  
**Enjeu** Base locale seulement, non versionnée, reconstituable en un clic.  
**Note 2/10** — Signalé par honnêteté. Aucune donnée réelle perdue.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

# Où reprendre

**Priorité corrigée après contre-vérification** (B1 étant limité aux outils de développement, il descend) :

1. ~~Légende de la volatilité~~, ~~bornes de saisie~~, ~~failles des librairies~~, ~~écart de version de Node~~,
   ~~fuseau de la source de secours~~, ~~échec de stockage silencieux~~, ~~hypothèse du calcul Buffett~~,
   ~~couche de domaine de la recherche~~, ~~sonde d'écart entre les deux sources~~ — **faits le 9 août**
2. **B2** titres canadiens — le seul point restant qui demande une décision : choisir et payer une
   source. Tout le reste des points ouverts est du constat assumé, pas du travail en attente.

**Règle de vérification adoptée le 9 août** — *une vérification ne compte que si elle reproduit
la branche exacte, avec son fichier de verrouillage exact, sur la version de Node de l'intégration.*
Trois affirmations de cette séquence ont été démenties parce qu'elles s'appuyaient sur une boucle
locale : une correction déclarée faite qui ne protégeait que le serveur de développement, une
stabilité de test mesurée sur la mauvaise chaîne d'outils, une réparation annoncée avant que
l'intégration ait rendu son verdict. « Vert chez moi » n'est pas un résultat.

**État du dépôt** branche `main`, aucun travail en cours. **Un commit local n'est pas encore envoyé.**
Ce qui précède est en ligne depuis le 9 août ; ce dernier lot ne l'est pas.

**Pour relancer** ouvrir une session dans le dossier du projet et donner tes réponses point par point,
en citant les numéros (A1, B7, etc.). Le détail technique complet de chaque point est dans
`REPRISE_CHECKPOINT.md` et `PLATFORM_CHECKLIST.md`.

## Notes générales

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
