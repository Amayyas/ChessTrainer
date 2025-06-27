class ChessPuzzleControls {
    constructor(puzzleGame) {
        this.game = puzzleGame;
        this.setupEventListeners();
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
        if (this.game.currentPuzzle > 0) {
            this.game.loadPuzzle(this.game.currentPuzzle - 1);
        }
    }

    nextPuzzle() {
        if (this.game.currentPuzzle < this.game.puzzles.length - 1) {
            this.game.loadPuzzle(this.game.currentPuzzle + 1);
        }
    }

    showHint() {
        const puzzle = this.game.puzzles[this.game.currentPuzzle];
        if (this.game.currentHintLevel < puzzle.hints.length) {
            const hintPanel = document.getElementById('hintPanel');
            const hintText = document.getElementById('hintText');
            
            hintText.textContent = puzzle.hints[this.game.currentHintLevel];
            hintPanel.style.display = 'block';
            
            this.game.currentHintLevel++;
        } else {
            this.game.showMessage('Plus d\'indices disponibles pour ce puzzle.', 'info');
        }
    }

    showSolution() {
        const puzzle = this.game.puzzles[this.game.currentPuzzle];
        const solutionPanel = document.getElementById('solutionPanel');
        const solutionSteps = document.getElementById('solutionSteps');
        
        solutionSteps.textContent = puzzle.solution.join(' → ');
        solutionPanel.style.display = 'block';
    }

    resetPuzzle() {
        this.game.loadPuzzle(this.game.currentPuzzle);
    }

    hidePanels() {
        document.getElementById('solutionPanel').style.display = 'none';
        document.getElementById('hintPanel').style.display = 'none';
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
                this.game.clearSelection();
                break;
        }
    }
}
