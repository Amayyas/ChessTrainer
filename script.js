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
        this.controls = null;
        this.gameLogic = null;

        this.init();
    }

    // Init et gestion puzzles
    init() {
        this.createBoard();
        this.loadPuzzle(0);
        this.createPuzzleSelector();
        this.controls = new ChessPuzzleControls(this);
        this.gameLogic = new ChessGameLogic(this);
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
                
                square.addEventListener('click', (e) => {
                    if (this.gameLogic) {
                        this.gameLogic.handleSquareClick(e);
                    }
                });
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
        if (this.controls) {
            this.controls.hidePanels();
        }
        this.updatePuzzleSelector();
        if (this.gameLogic) {
            this.gameLogic.clearHighlights();
        }
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

    clearSelection() {
        if (this.gameLogic) {
            this.gameLogic.clearSelection();
        }
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
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessPuzzleGenerator();
});
