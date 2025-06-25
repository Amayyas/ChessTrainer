// Base de données des puzzles d'échecs
const CHESS_PUZZLES = [
    {
        id: 1,  
        title: "Mat du Couloir",
        difficulty: "facile",
        description: "Un mat classique avec la dame. Le roi noir est coincé dans le coin.",
        objective: "Mat en 1",
        turn: "white",
        position: "mat_baiser",
        solution: ["Qa8#"],
        hints: [
            "Le roi noir est coincé dans le coin par ses propres pions.",
            "La dame peut se positionner de façon à attaquer le roi.",
            "Regardez la case a8 - elle contrôle toutes les cases d'évasion du roi."
        ]
    },
    {
        id: 2,
        title: "Mat du Couloir",
        difficulty: "moyen",
        description: "Le roi noir est coincé dans un couloir. La dame peut donner mat directement.",
        objective: "Mat en 1",
        turn: "white",
        position: "mat_couloir",
        solution: ["Qb8#"],
        hints: [
            "Le roi noir est bloqué par ses propres pions sur la rangée du roi.",
            "La dame peut attaquer horizontalement pour donner mat.",
            "La 8ème rangée est la clé - cherchez un coup de dame qui donne mat."
        ]
    },
    {
        id: 3,
        title: "Mat à l'Étouffée",
        difficulty: "difficile",
        description: "Le cavalier seul peut faire mat quand le roi est étouffé par ses propres pièces.",
        objective: "Mat en 1",
        turn: "white",
        position: "mat_etouffe",
        solution: ["Nf7#"],
        hints: [
            "Le roi noir est complètement bloqué par ses propres pièces.",
            "Le cavalier a un mouvement unique qui peut exploiter cette situation.",
            "Cherchez un coup de cavalier qui donne échec au roi sans lui laisser d'échappatoire."
        ]
    }
];

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CHESS_PUZZLES;
}
