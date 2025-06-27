class ChessGameLogic {
    constructor(puzzleGame) {
        this.game = puzzleGame;
    }

    handleSquareClick(event) {
        const square = event.target;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.game.gameBoard[row][col];

        if (this.game.selectedSquare) {
            const selectedRow = parseInt(this.game.selectedSquare.dataset.row);
            const selectedCol = parseInt(this.game.selectedSquare.dataset.col);

            if (selectedRow === row && selectedCol === col) {
                this.clearSelection();
                return;
            }

            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
            } else {
                this.clearSelection();
                if (piece && this.isPlayerPiece(piece)) {
                    this.selectSquare(square);
                }
            }
        } else {
            if (piece && this.isPlayerPiece(piece)) {
                this.selectSquare(square);
            }
        }
    }

    isPlayerPiece(piece) {
        const puzzle = this.game.puzzles[this.game.currentPuzzle];
        const isWhitePiece = piece === piece.toUpperCase();
        return (puzzle.turn === 'white' && isWhitePiece) || (puzzle.turn === 'black' && !isWhitePiece);
    }

    selectSquare(square) {
        this.clearSelection();
        this.game.selectedSquare = square;
        square.classList.add('selected');
        this.showPossibleMoves(square);
    }

    clearSelection() {
        if (this.game.selectedSquare) {
            this.game.selectedSquare.classList.remove('selected');
            this.game.selectedSquare = null;
        }
        this.clearPossibleMoves();
    }

    showPossibleMoves(square) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.game.gameBoard[row][col];

        const possibleMoves = calculatePossibleMoves(piece, row, col, this.game.gameBoard);
        
        possibleMoves.forEach(move => {
            const targetSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (targetSquare) {
                targetSquare.classList.add('possible-move');
            }
        });
    }

    calculatePossibleMoves(piece, row, col) {
        return calculatePossibleMoves(piece, row, col, this.game.gameBoard);
    }

    clearPossibleMoves() {
        document.querySelectorAll('.possible-move').forEach(square => {
            square.classList.remove('possible-move');
        });
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.game.gameBoard[fromRow][fromCol];
        const targetPiece = this.game.gameBoard[toRow][toCol];

        if (targetPiece && this.isPlayerPiece(piece) === this.isPlayerPiece(targetPiece)) {
            return false;
        }

        const possibleMoves = calculatePossibleMoves(piece, fromRow, fromCol, this.game.gameBoard);
        return possibleMoves.some(move => move.row === toRow && move.col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.game.gameBoard[fromRow][fromCol];
        const move = this.game.getSquareName(fromRow, fromCol) + this.game.getSquareName(toRow, toCol);

        this.game.gameBoard[toRow][toCol] = piece;
        this.game.gameBoard[fromRow][fromCol] = '';

        this.game.renderBoard();
        this.clearSelection();
        this.highlightLastMove(fromRow, fromCol, toRow, toCol);
    }

    highlightLastMove(fromRow, fromCol, toRow, toCol) {
        document.querySelectorAll('.last-move').forEach(square => {
            square.classList.remove('last-move');
        });

        const fromSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const toSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        
        if (fromSquare) fromSquare.classList.add('last-move');
        if (toSquare) toSquare.classList.add('last-move');

        this.game.lastMove = { fromRow, fromCol, toRow, toCol };
    }

    isCorrectMove(actualMove, expectedMove) {
        return actualMove === expectedMove;
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'last-move', 'in-check');
        });
    }
}
