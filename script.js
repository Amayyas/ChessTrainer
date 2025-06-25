class ChessPuzzleGenerator {
    constructor() {
        // Pièces
        this.pieces = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };

        this.currentPuzzle = 0;
        this.selectedSquare = null;
        this.currentHintLevel = 0;
        this.gameBoard = [];
        this.lastMove = null;

        this.puzzles = CHESS_PUZZLES;

        this.init();
    }

    // Init et gestion puzzles
    init() {
        this.createBoard();
        this.loadPuzzle(0);
        this.setupEventListeners();
        this.createPuzzleSelector();
    }

    createBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 7; row >= 0; row--) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'dark' : 'light'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                square.dataset.square = this.getSquareName(row, col);
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                chessboard.appendChild(square);
            }
        }
    }

    getSquareName(row, col) {
        return String.fromCharCode(97 + col) + (row + 1);
    }

    getCoordinates(square) {
        const col = square.charCodeAt(0) - 97;
        const row = parseInt(square[1]) - 1;
        return { row, col };
    }

    loadPuzzle(puzzleIndex) {
        if (puzzleIndex < 0 || puzzleIndex >= this.puzzles.length) return;

        this.currentPuzzle = puzzleIndex;
        this.currentHintLevel = 0;
        this.selectedSquare = null;
        this.lastMove = null;

        const puzzle = this.puzzles[puzzleIndex];
        
        this.updatePuzzleInfo(puzzle);
        this.setupPosition(puzzle.position);
        this.hidePanels();
        this.updatePuzzleSelector();
        this.clearHighlights();
    }

    updatePuzzleInfo(puzzle) {
        document.getElementById('puzzleTitle').textContent = `${puzzle.title} #${puzzle.id}`;
        document.getElementById('puzzleDifficulty').textContent = puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1);
        document.getElementById('puzzleDifficulty').className = `difficulty-badge ${puzzle.difficulty}`;
        document.getElementById('puzzleDescription').textContent = puzzle.description;
        document.getElementById('currentTurn').textContent = puzzle.turn === 'white' ? 'Blancs' : 'Noirs';
        document.getElementById('puzzleObjective').textContent = puzzle.objective;
    }

    setupPosition(position) {
        this.gameBoard = Array(8).fill().map(() => Array(8).fill(''));
        setupPredefinedPosition(this.gameBoard, this.currentPuzzle);
        this.renderBoard();
    }

    renderBoard() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.gameBoard[row][col];
            square.textContent = piece ? this.pieces[piece] : '';
        });
    }

    handleSquareClick(event) {
        const square = event.target;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.gameBoard[row][col];

        if (this.selectedSquare) {
            const selectedRow = parseInt(this.selectedSquare.dataset.row);
            const selectedCol = parseInt(this.selectedSquare.dataset.col);

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
        const puzzle = this.puzzles[this.currentPuzzle];
        const isWhitePiece = piece === piece.toUpperCase();
        return (puzzle.turn === 'white' && isWhitePiece) || (puzzle.turn === 'black' && !isWhitePiece);
    }

    selectSquare(square) {
        this.clearSelection();
        this.selectedSquare = square;
        square.classList.add('selected');
        this.showPossibleMoves(square);
    }

    clearSelection() {
        if (this.selectedSquare) {
            this.selectedSquare.classList.remove('selected');
            this.selectedSquare = null;
        }
        this.clearPossibleMoves();
    }

    showPossibleMoves(square) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.gameBoard[row][col];

        const possibleMoves = calculatePossibleMoves(piece, row, col, this.gameBoard);
        
        possibleMoves.forEach(move => {
            const targetSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (targetSquare) {
                targetSquare.classList.add('possible-move');
            }
        });
    }

    calculatePossibleMoves(piece, row, col) {
        return calculatePossibleMoves(piece, row, col, this.gameBoard);
    }

    clearPossibleMoves() {
        document.querySelectorAll('.possible-move').forEach(square => {
            square.classList.remove('possible-move');
        });
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.gameBoard[fromRow][fromCol];
        const targetPiece = this.gameBoard[toRow][toCol];

        if (targetPiece && this.isPlayerPiece(piece) === this.isPlayerPiece(targetPiece)) {
            return false;
        }

        const possibleMoves = calculatePossibleMoves(piece, fromRow, fromCol, this.gameBoard);
        return possibleMoves.some(move => move.row === toRow && move.col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.gameBoard[fromRow][fromCol];
        const move = this.getSquareName(fromRow, fromCol) + this.getSquareName(toRow, toCol);

        this.gameBoard[toRow][toCol] = piece;
        this.gameBoard[fromRow][fromCol] = '';

        this.renderBoard();
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

        this.lastMove = { fromRow, fromCol, toRow, toCol };
    }


    isCorrectMove(actualMove, expectedMove) {
        return actualMove === expectedMove;
    }

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('statusMessage');
        messageEl.textContent = text;
        messageEl.className = `status-message ${type} show`;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'last-move', 'in-check');
        });
    }

    setupEventListeners() {
        document.getElementById('prevPuzzle').addEventListener('click', () => {
            this.previousPuzzle();
        });

        document.getElementById('nextPuzzle').addEventListener('click', () => {
            this.nextPuzzle();
        });

        document.getElementById('showHint').addEventListener('click', () => {
            this.showHint();
        });

        document.getElementById('showSolution').addEventListener('click', () => {
            this.showSolution();
        });

        document.getElementById('resetPuzzle').addEventListener('click', () => {
            this.resetPuzzle();
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
    }

    previousPuzzle() {
        if (this.currentPuzzle > 0) {
            this.loadPuzzle(this.currentPuzzle - 1);
        }
    }

    nextPuzzle() {
        if (this.currentPuzzle < this.puzzles.length - 1) {
            this.loadPuzzle(this.currentPuzzle + 1);
        }
    }

    showHint() {
        const puzzle = this.puzzles[this.currentPuzzle];
        if (this.currentHintLevel < puzzle.hints.length) {
            const hintPanel = document.getElementById('hintPanel');
            const hintText = document.getElementById('hintText');
            
            hintText.textContent = puzzle.hints[this.currentHintLevel];
            hintPanel.style.display = 'block';
            
            this.currentHintLevel++;
        } else {
            this.showMessage('Plus d\'indices disponibles pour ce puzzle.', 'info');
        }
    }

    showSolution() {
        const puzzle = this.puzzles[this.currentPuzzle];
        const solutionPanel = document.getElementById('solutionPanel');
        const solutionSteps = document.getElementById('solutionSteps');
        
        solutionSteps.textContent = puzzle.solution.join(' → ');
        solutionPanel.style.display = 'block';
    }

    resetPuzzle() {
        this.loadPuzzle(this.currentPuzzle);
    }

    hidePanels() {
        document.getElementById('solutionPanel').style.display = 'none';
        document.getElementById('hintPanel').style.display = 'none';
    }

    createPuzzleSelector() {
        const selector = document.getElementById('puzzleSelector');
        selector.innerHTML = '';

        this.puzzles.forEach((puzzle, index) => {
            const card = document.createElement('div');
            card.className = 'puzzle-card';
            card.innerHTML = `
                <h4>${puzzle.title}</h4>
                <div class="puzzle-difficulty">${puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}</div>
            `;
            
            card.addEventListener('click', () => {
                this.loadPuzzle(index);
            });

            selector.appendChild(card);
        });
    }

    updatePuzzleSelector() {
        const cards = document.querySelectorAll('.puzzle-card');
        cards.forEach((card, index) => {
            card.classList.toggle('active', index === this.currentPuzzle);
        });
    }

    handleKeyPress(event) {
        switch (event.key) {
            case 'ArrowLeft':
                this.previousPuzzle();
                break;
            case 'ArrowRight':
                this.nextPuzzle();
                break;
            case 'h':
            case 'H':
                this.showHint();
                break;
            case 's':
            case 'S':
                this.showSolution();
                break;
            case 'r':
            case 'R':
                this.resetPuzzle();
                break;
            case 'Escape':
                this.clearSelection();
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessPuzzleGenerator();
});
