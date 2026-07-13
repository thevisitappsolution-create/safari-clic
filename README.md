# 📸 Safari Clic !

Prototype jouable (MVP savane, étape 1 de la roadmap) du jeu de photo animalière
pour enfants. Le document de conception (PRD) reste privé, hors du dépôt.

> Tu es un petit photographe animalier : **écoute** le cri, **tourne-toi** vers le son,
> **cadre**… et **CLIC !** avant que l'animal ne s'enfuie.

## 🎮 Jouer

**➡️ https://thevisitappsolution-create.github.io/safari-clic/**

Sur **iPhone / iPad** (recommandé — gyroscope) :
1. Ouvre le lien dans **Safari**.
2. Touche **Sortie photo** → **C'est parti !** → autorise *« Mouvement et orientation »*.
3. Tiens le téléphone devant toi comme un appareil photo et tourne-toi (fenêtre de 110°).
4. 🎧 Casque conseillé : le son est spatialisé en binaural (HRTF).
5. Astuce : Partager → **« Sur l'écran d'accueil »** pour l'installer en plein écran (PWA).

Sur ordinateur : glisser à la souris (ou flèches ← → ↑ ↓), **Espace** ou clic sur le
déclencheur pour photographier.

## ✨ Contenu du prototype (PRD §14, étape 1)

- 1 biome : **savane au coucher du soleil** (décor peint procédural, parallaxe, particules).
- 4 espèces : 🦓 zèbre (surgit d'un buisson, fuit sur le côté), 🦒 girafe et 🐘 éléphant
  (traversent, lents et majestueux), 🦜 perroquet (perché, s'envole).
- **Audio 100 % synthétisé** (Web Audio API) : cris spatialisés HRTF, ambiance kalimba,
  vent, récompenses — aucune banque de sons, aucun droit tiers.
- Boucle complète : indice sonore → cadrage → **CLIC** → étoiles (★–★★★) →
  développement des photos → **carnet** (fiche, anecdote, cri à réécouter) → tampons.
- **Adaptation d'âge** (3-5 / 6-8 / 9-12) : temps d'apparition, vitesse de fuite,
  flèche + halo d'aide, retour de l'animal, feintes, zoom ×1,5 (appui maintenu, 6 ans et +).
- Repli tactile complet si le gyroscope est refusé ou absent.
- PWA hors-ligne, zéro réseau en jeu, sauvegarde 100 % locale (conformité « enfants » du PRD).

## 🛠 Dév local

Servir le dossier en HTTP : `python -m http.server 8000` puis http://localhost:8000.
(Le gyroscope nécessite HTTPS → tester sur GitHub Pages depuis l'iPhone.)
