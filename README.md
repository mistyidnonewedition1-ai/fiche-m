# 🧠 Mes fiches mémoire

Appli web (PWA) de fiches de révision : thème sombre, mode test, cartes mémoire, installable sur téléphone, fonctionne hors-ligne. Aucun build : ce sont de simples fichiers statiques.

## Déployer
1. Pousse ce dossier sur GitHub.
2. Sur vercel.com → *Add New Project* → importe le dépôt → Framework : **Other** → pas de build, pas de dossier de sortie → *Deploy*.
3. Ouvre le site sur ton téléphone → *Installer* (Android/Chrome) ou Partager → *Sur l'écran d'accueil* (iPhone).

## Ajouter des leçons
- **Dans l'appli** : « ＋ Nouvelle fiche » → colle le texte ou importe un fichier. Le bouton « Copier le prompt IA » te donne un prompt pour qu'une IA formate ta leçon. Ces fiches sont gardées **sur ton appareil** (non synchronisées entre appareils).
- **Pour qu'elles soient partout** : mets le texte de la fiche dans `data/ma-fiche.txt` (ou un `.json`), ajoute son nom dans `data/index.json`, puis push. Vercel redéploie tout seul.

Les anciennes fiches restent toujours présentes (fichiers du dépôt + fiches de l'appareil).
