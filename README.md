# ♟️ Chess Trainer

Un entraîneur interactif de puzzles d'échecs avec solutions détaillées, conçu pour améliorer vos compétences tactiques aux échecs.

![Chess Trainer](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![CSS3](https://img.shields.io/badge/CSS3-Responsive-green.svg)
![HTML5](https://img.shields.io/badge/HTML5-Semantic-orange.svg)

## 📋 Table des Matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Structure du Projet](#structure-du-projet)
- [Puzzles Inclus](#puzzles-inclus)
- [Raccourcis Clavier](#raccourcis-clavier)
- [Technologies Utilisées](#technologies-utilisées)
- [Personnalisation](#personnalisation)

## 🎯 Aperçu

Chess Trainer est une application web interactive qui présente une collection de puzzles tactiques d'échecs de différents niveaux de difficulté. Chaque puzzle est accompagné d'indices progressifs et de solutions détaillées pour aider les joueurs à comprendre les concepts tactiques.

### Capture d'écran
```
┌─────────────────────────────────────────────────────────────┐
│                    ♟️ Chess Trainer                         │
│         Résolvez des puzzles tactiques et améliorez         │
│                      votre jeu                              │
├─────────────────────────────────────────────────────────────┤
│  Puzzle Info     │    Échiquier Interactif   │   Contrôles  │
│  ┌─────────────┐ │    ┌─────────────────┐    │  ┌─────────┐ │
│  │ Mat du      │ │  8 │ ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜ │    |  | Indice  │ │
│  │ Couloir     │ │  7 │ ♟ ♟ ♟ ♟   ♟ ♟ ♟ │    |  | Solution│ │
│  │ Facile      │ │  6 │       ♞         │    |  | Reset   │ │
│  │             │ │  5 │         ♟       │    |  │ ← →     │ │
│  │ Tour: Blanc │ │  4 │     ♗   ♙       │    |  └─────────┘ │
│  │ Mat en 2    │ │  3 │                 │    │              │
│  └─────────────┘ │  2 │ ♙ ♙ ♙ ♙   ♙ ♙ ♙ │    │              │
│                  │  1 │ ♖ ♘ ♗ ♕ ♔   ♘ ♖ │    │              │
│                  |    └─────────────────┘    │              │
│                  │    a b c d e f g h        │              │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Fonctionnalités

### 🎮 Interface Utilisateur
- **Design moderne et responsive** : Interface élégante qui s'adapte à tous les écrans
- **Échiquier interactif** : Clic pour sélectionner et déplacer les pièces
- **Coordonnées visuelles** : Affichage des lettres et chiffres pour faciliter la navigation
- **Surbrillance intelligente** : Mise en évidence des coups possibles et du dernier coup joué

### 🧩 Système de Puzzles
- **6 puzzles variés** : De facile à difficile, couvrant différentes tactiques
- **Catégories tactiques** :
  - Mat du couloir
  - Attaque à la découverte
  - Sacrifice de dame
  - Attaque double
  - Clouage décisif
  - Mat de l'escalier

### 💡 Aide et Solutions
- **Système d'indices à 3 niveaux** : Aide progressive sans révéler la solution
- **Solutions complètes** : Affichage détaillé de tous les coups gagnants
- **Validation des coups** : Feedback immédiat sur les mouvements

### 🎯 Navigation et Contrôles
- **Navigation intuitive** : Boutons précédent/suivant entre les puzzles
- **Sélecteur de puzzle** : Grille visuelle pour choisir rapidement un puzzle
- **Reset instantané** : Retour à la position initiale en un clic
- **Raccourcis clavier** : Contrôle rapide par le clavier

## 🚀 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Connexion internet pour les icônes Font Awesome et Google Fonts

### Installation Simple
1. **Cloner ou télécharger** le projet :
```bash
git clone git.github.com/Amayyas/chess-trainer.git
cd chess-trainer
```

2. **Ouvrir le fichier** `index.html` dans votre navigateur :
```bash
# Linux/Mac
open index.html

# Windows
start index.html

# Ou double-cliquer sur le fichier dans l'explorateur
```

### Installation avec Serveur Local (Recommandé)
Pour une meilleure expérience, utilisez un serveur local :

```bash
# Avec Python 3
python -m http.server 8000

# Avec Node.js (npx)
npx serve .

# Avec PHP
php -S localhost:8000
```

Puis ouvrez `http://localhost:8000` dans votre navigateur.

## 🎯 Utilisation

### 🎮 Interface Principale

#### Zone d'Information (Gauche)
- **Titre du puzzle** : Nom et numéro du puzzle actuel
- **Badge de difficulté** : Niveau coloré (Facile/Moyen/Difficile)
- **Description** : Objectif et contexte du puzzle
- **Statistiques** : Tour actuel et objectif à atteindre

#### Échiquier Central
- **Clic simple** : Sélectionner une pièce
- **Clic sur destination** : Déplacer la pièce sélectionnée
- **Surbrillance verte** : Coups possibles
- **Surbrillance jaune** : Dernier coup joué
- **Surbrillance bleue** : Pièce sélectionnée

#### Panneau de Contrôle (Droite)
- **Navigation** : Boutons ← → pour changer de puzzle
- **Indice** : Révèle progressivement des conseils
- **Solution** : Affiche la séquence complète de coups
- **Reset** : Remet le puzzle à sa position initiale

### 📝 Guide Étape par Étape

1. **Choisir un puzzle** :
   - Utilisez la grille en bas pour sélectionner
   - Ou naviguez avec les flèches ← →

2. **Analyser la position** :
   - Lisez la description du puzzle
   - Identifiez les pièces et leur placement
   - Cherchez les faiblesses de l'adversaire

3. **Jouer votre coup** :
   - Cliquez sur la pièce à déplacer
   - Cliquez sur la case de destination
   - Observez le feedback

4. **Utiliser l'aide si nécessaire** :
   - Bouton "Indice" pour des conseils
   - Bouton "Solution" pour voir tous les coups

5. **Passer au puzzle suivant** :
   - Automatique après résolution
   - Ou manuellement avec les boutons

## 📁 Structure du Projet

```
chess-trainer/
├── 📄 index.html          # Structure HTML principale
├── 🎨 styles.css          # Styles CSS et design responsive
├── ⚡ script.js           # Logique JavaScript et gestion des puzzles
└── 📖 README.md           # Documentation du projet
```

### Détail des Fichiers

#### `index.html`
- Structure sémantique HTML5
- Intégration des bibliothèques externes
- Définition des zones d'interface
- Éléments interactifs (boutons, panneau)

#### `styles.css`
- Design moderne avec gradients
- Système de grille CSS Grid
- Animations et transitions fluides
- Responsive design pour mobile/tablette
- Variables CSS pour la cohérence

#### `script.js`
- Classe `ChessPuzzleGenerator` principale
- Gestion de l'état du jeu
- Logique de validation des coups
- Système d'indices et solutions
- Base de données des puzzles

## 🧩 Puzzles Inclus

### 1. 🟢 Mat du Couloir (Facile)
- **Objectif** : Mat en 2 coups
- **Concept** : Attaque directe sur le roi
- **Solution** : `Qh5+ g6 Qxf7#`

### 2. 🟡 Attaque à la Découverte (Moyen)
- **Objectif** : Gagner du matériel
- **Concept** : Attaque découverte avec le pion
- **Solution** : `Nxe5 Nxe5 d4`

### 3. 🔴 Sacrifice de Dame (Difficile)
- **Objectif** : Mat en 3 coups
- **Concept** : Sacrifice spectaculaire
- **Solution** : `Qxe5+ Be7 Qxg7 Rf8 Qxf8#`

### 4. 🟡 Attaque Double (Moyen)
- **Objectif** : Gagner la qualité
- **Concept** : Menaces multiples
- **Solution** : `Ng5 Bxg5 Qh5`

### 5. 🟢 Clouage Décisif (Facile)
- **Objectif** : Gagner une pièce
- **Concept** : Utilisation du clouage
- **Solution** : `Bxc6+ bxc6 Nf3`

### 6. 🔴 Mat de l'Escalier (Difficile)
- **Objectif** : Mat en 4 coups
- **Concept** : Coordination des tours
- **Solution** : `Ra8+ Kh7 Rh8+ Kg6 Ra6+ Kf5 Ra5#`

## ⌨️ Raccourcis Clavier

| Touche | Action |
|--------|--------|
| `←` | Puzzle précédent |
| `→` | Puzzle suivant |
| `H` | Afficher un indice |
| `S` | Afficher la solution |
| `R` | Reset du puzzle |
| `Esc` | Désélectionner |

## 💻 Technologies Utilisées

### Frontend
- **HTML5** : Structure sémantique moderne
- **CSS3** : 
  - CSS Grid et Flexbox pour la mise en page
  - Variables CSS pour la cohérence
  - Animations et transitions
  - Media queries pour le responsive
- **JavaScript ES6+** :
  - Classes et modules
  - Arrow functions
  - Template literals
  - Async/await pour les animations

### Bibliothèques Externes
- **Font Awesome 6.0** : Icônes modernes
- **Google Fonts (Inter)** : Typographie élégante

### Caractéristiques Techniques
- **100% Vanilla JavaScript** : Aucune dépendance framework
- **Responsive Design** : Compatible mobile, tablette, desktop
- **Progressive Enhancement** : Fonctionne même sans JavaScript
- **Semantic HTML** : Accessible et SEO-friendly

## 🔧 Personnalisation

### Ajouter de Nouveaux Puzzles

Pour ajouter un puzzle, modifiez le tableau `puzzles` dans `script.js` :

```javascript
{
    id: 7,
    title: "Votre Nouveau Puzzle",
    difficulty: "moyen", // facile, moyen, difficile
    description: "Description du puzzle",
    objective: "Mat en X", // ou "Gagner matériel"
    turn: "white", // white ou black
    position: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", // Position FEN
    solution: ["e4", "e5", "Nf3"], // Notation algébrique
    hints: [
        "Premier indice",
        "Deuxième indice", 
        "Troisième indice"
    ]
}
```

### Modifier l'Apparence

#### Couleurs Principales
Dans `styles.css`, modifiez les variables CSS :

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --light-square: #f0d9b5;
    --dark-square: #b58863;
}
```

#### Taille de l'Échiquier
Modifiez les dimensions dans `.chessboard` :

```css
.chessboard {
    grid-template-columns: repeat(8, 70px); /* Au lieu de 60px */
    grid-template-rows: repeat(8, 70px);
}
```

### Configuration Avancée

#### Vitesse des Animations
Dans `script.js`, modifiez les délais pour les animations restantes :

```javascript
// Exemple pour d'autres animations si nécessaire
setTimeout(() => someFunction(), 1000);
```

#### Symboles des Pièces
Personnalisez les symboles Unicode :

```javascript
this.pieces = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};
```

---

**Développé avec ❤️ pour la communauté des échecs**

*Amusez-vous bien et que les tactiques soient avec vous ! ♟️*
