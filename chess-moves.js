function isOpponentPiece(piece, isCurrentWhite) {
    if (!piece) return false;
    const isPieceWhite = piece === piece.toUpperCase();
    return isCurrentWhite !== isPieceWhite;
}

function getPawnMoves(row, col, isWhite, gameBoard) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    const newRow = row + direction;

    // Mouvement vers l'avant
    if (newRow >= 0 && newRow < 8 && gameBoard[newRow][col] === '') {
        moves.push({ row: newRow, col: col });

        // Avancée de deux cases
        if (row === startRow) {
            const doubleRow = row + (2 * direction);
            if (doubleRow >= 0 && doubleRow < 8 && gameBoard[doubleRow][col] === '') {
                moves.push({ row: doubleRow, col: col });
            }
        }
    }

    // Captures diagonales
    for (const dc of [-1, 1]) {
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = gameBoard[newRow][newCol];
            if (targetPiece && isOpponentPiece(targetPiece, isWhite)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }

    return moves;
}

function getRookMoves(row, col, gameBoard) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // horizontal et vertical

    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;

            if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;

            const targetPiece = gameBoard[newRow][newCol];
            if (targetPiece === '') {
                moves.push({ row: newRow, col: newCol });
            } else {
                const currentPiece = gameBoard[row][col];
                if (isOpponentPiece(targetPiece, currentPiece === currentPiece.toUpperCase())) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }
    return moves;
}

function getKnightMoves(row, col, gameBoard) {
    const moves = [];
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = gameBoard[newRow][newCol];
            const currentPiece = gameBoard[row][col];
            
            if (targetPiece === '' || isOpponentPiece(targetPiece, currentPiece === currentPiece.toUpperCase())) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }

    return moves;
}

function getBishopMoves(row, col, gameBoard) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonales

    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;

            if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;

            const targetPiece = gameBoard[newRow][newCol];
            if (targetPiece === '') {
                moves.push({ row: newRow, col: newCol });
            } else {
                const currentPiece = gameBoard[row][col];
                if (isOpponentPiece(targetPiece, currentPiece === currentPiece.toUpperCase())) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }

    return moves;
}

function getQueenMoves(row, col, gameBoard) {
    const rookMoves = getRookMoves(row, col, gameBoard);
    const bishopMoves = getBishopMoves(row, col, gameBoard);
    return [...rookMoves, ...bishopMoves];
}

function getKingMoves(row, col, gameBoard) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = gameBoard[newRow][newCol];
            const currentPiece = gameBoard[row][col];
            
            if (targetPiece === '' || isOpponentPiece(targetPiece, currentPiece === currentPiece.toUpperCase())) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }

    return moves;
}

function calculatePossibleMoves(piece, row, col, gameBoard) {
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    switch (pieceType) {
        case 'p': // Pion
            return getPawnMoves(row, col, isWhite, gameBoard);
        case 'r': // Tour
            return getRookMoves(row, col, gameBoard);
        case 'n': // Cavalier
            return getKnightMoves(row, col, gameBoard);
        case 'b': // Fou
            return getBishopMoves(row, col, gameBoard);
        case 'q': // Dame
            return getQueenMoves(row, col, gameBoard);
        case 'k': // Roi
            return getKingMoves(row, col, gameBoard);
        default:
            return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isOpponentPiece,
        getPawnMoves,
        getRookMoves,
        getKnightMoves,
        getBishopMoves,
        getQueenMoves,
        getKingMoves,
        calculatePossibleMoves
    };
}
