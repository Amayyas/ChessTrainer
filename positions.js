const CHESS_POSITIONS = {
    0: [
        ['', '', '', '', 'K', '', '', ''],
        ['Q', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', 'p', 'p'],
        ['', '', '', '', '', '', '', 'k']
    ],

    1: [
        ['', '', '', '', 'K', '', '', ''],
        ['', '', '', '', '', '', '', 'Q'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', 'p', 'p', 'p'],
        ['', '', '', '', '', '', 'k', '']
    ],

    2: [
        ['', '', '', '', 'K', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', 'N', '', '', ''],
        ['', '', '', '', '', '', 'p', ''],
        ['', '', '', '', 'N', '', 'p', 'r'],
        ['', '', '', '', '', '', '', 'k']
    ]
};

function setupPredefinedPosition(gameBoard, puzzleIndex) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            gameBoard[row][col] = '';
        }
    }
    if (CHESS_POSITIONS[puzzleIndex]) {
        const position = CHESS_POSITIONS[puzzleIndex];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                gameBoard[row][col] = position[row][col];
            }
        }
    } else {
        console.warn(`Position non trouvée pour le puzzle ${puzzleIndex}`);
    }
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHESS_POSITIONS, setupPredefinedPosition };
}
