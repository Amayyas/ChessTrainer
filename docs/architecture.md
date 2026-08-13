# Architecture

Class diagrams of ChessTrainer AI, derived from the source: the engine layer, the
game modes, the global state and the data model.

> **Read this first.** ChessTrainer is written in functional TypeScript, not in an
> object-oriented style: the codebase holds **exactly one class**,
> `StockfishEngine`. Everything else is built from _interfaces_ (type contracts),
> React _hooks_ (functions that own state and expose an API) and Zustand
> _stores_.
>
> These diagrams reflect that reality through UML stereotypes rather than
> inventing classes the code does not have. A hook plays the part of a factory:
> it owns the state and exposes operations, exactly as an instance would.

| Stereotype        | Meaning                         |
| ----------------- | ------------------------------- |
| `<<class>>`       | A real TypeScript class         |
| `<<interface>>`   | A type contract                 |
| `<<hook>>`        | A React factory that owns state |
| `<<store>>`       | Global state held in Zustand    |
| `<<pure module>>` | A module of pure functions      |

---

## 1. Engine layer

`StockfishEngine` wraps the Web Worker and its lifecycle. It is deliberately the
only class in the project: it is the only place that owns a long-lived resource
to create, drive and destroy. Parsing the protocol stays in a module of pure
functions, which is what makes it testable without ever starting the engine.

```mermaid
classDiagram
    direction LR

    class StockfishEngine {
        <<class>>
        -Worker worker
        -Set listeners
        -Promise readyPromise
        -Promise queue
        -string scriptUrl
        +init() Promise
        +analyze(fen, depth) Promise~Analysis~
        +setOption(name, value) Promise
        +configureLevel(level) Promise
        +dispose() void
        -ensureWorker() Worker
        -send(command) void
    }

    class Worker {
        <<browser>>
        +postMessage(cmd)
        +onmessage
    }

    class uci {
        <<pure module>>
        +parseInfo(line) UciInfo
        +parseBestMove(line) string
        +parseUciMove(uci) MoveParts
    }

    class UciInfo {
        <<interface>>
        +number depth
        +number scoreCp
        +number scoreMate
        +string[] pv
    }

    class Analysis {
        <<interface>>
        +string bestMove
        +number scoreCp
        +number scoreMate
        +number depth
        +string[] pv
    }

    class EngineLevel {
        <<interface>>
        +LevelId id
        +string label
        +number elo
        +number skill
        +number maxError
        +number errorProbability
        +number depth
        +number minDelayMs
        +number maxDelayMs
    }

    class useStockfish {
        <<hook>>
        +boolean isReady
        +boolean isAnalyzing
        +analyze(fen, depth) Promise~Analysis~
        +configureLevel(level) Promise
    }

    useStockfish *-- StockfishEngine : owns and disposes
    StockfishEngine o-- Worker : creates on demand
    StockfishEngine ..> uci : delegates parsing
    uci ..> UciInfo : produces
    StockfishEngine ..> Analysis : produces
    StockfishEngine ..> EngineLevel : applies calibration
```

The class holds almost no decision logic: the reasoning lives in `uci`, pure and
tested on its own.

---

## 2. Game modes

Each mode is a hook composed of smaller pieces. `useBattleGame` is the most
telling one: it aggregates a chess game, a clock and the engine. Note that the
Piece Hunt uses **neither chess.js nor the engine** — its board has no king and
its rules are not those of chess, hence a dedicated movement module.

```mermaid
classDiagram
    direction TB

    class UseChessGame {
        <<interface>>
        +string fen
        +Color turn
        +Move[] history
        +string[] sanHistory
        +GameStatus status
        +Square checkSquare
        +string pgn
        +move(from, to, promotion) Move
        +getLegalTargets(square) Square[]
        +isPromotion(from, to) boolean
        +undo() void
        +reset(fen) void
        +loadPgn(pgn) boolean
    }

    class UseChessClock {
        <<interface>>
        +boolean enabled
        +number whiteMs
        +number blackMs
        +Color active
        +Color flagged
        +start(color) void
        +stop() void
        +press(mover) void
        +reset() void
    }

    class UseBattleGame {
        <<hook>>
        +BattlePhase phase
        +EngineLevel level
        +Color playerColor
        +boolean isThinking
        +BattleResult result
        +start(config) void
        +playerMove(from, to, promo) boolean
        +resign() void
    }

    class CoachAnalysis {
        <<hook>>
        +WhiteEval currentEval
        +string bestMoveUci
        +MoveQuality[] qualities
        +GameSummary summary
        +analysisAt(fen) PositionInsight
    }

    class PuzzleSession {
        <<hook>>
        +Puzzle current
        +number index
        +boolean solved
        +tryMove(from, to) boolean
        +hint() void
        +next() void
    }

    class HuntGame {
        <<hook>>
        +HuntPhase phase
        +ChampionType champion
        +string championSquare
        +EnemyBoard enemies
        +number timeLeftMs
        +number lives
        +number score
        +number combo
        +string[] threats
        +start(champion) void
        +moveTo(square) boolean
    }

    class board {
        <<pure module>>
        +attackedSquares(type, sq) string[]
        +moveTargets(type, sq, board) string[]
        +spawnEnemy(board, rng) string
    }

    class chessjs {
        <<library>>
        +move()
        +moves()
        +isCheckmate()
    }

    class useStockfish {
        <<hook>>
        +boolean isReady
        +analyze(fen, depth) Promise~Analysis~
    }

    UseChessGame ..> chessjs : delegates the rules
    UseBattleGame *-- UseChessGame : composes
    UseBattleGame *-- UseChessClock : composes
    UseBattleGame ..> useStockfish : makes the engine play
    CoachAnalysis ..> UseChessGame : reads the game
    CoachAnalysis ..> useStockfish : analyses every move
    PuzzleSession ..> UseChessGame : validates the solution
    HuntGame ..> board : Piece Hunt rules
```

The only mode that depends on neither chess.js nor the engine is the Piece Hunt:
it is an arcade game, not a game of chess.

---

## 3. Global state

Two Zustand stores hold the only genuinely global state. `useProgressionSync`
bridges the local progression and the account: it pulls the server snapshot on
sign-in, then writes changes back.

`ownerId` records whose progression the device currently holds — an account id,
or `null` for a guest. Without it the store cannot tell its own data from the
leftovers of whoever used the browser before, which is how one player's XP and
badges once showed up under another's name.

```mermaid
classDiagram
    direction TB

    class ProgressionStore {
        <<store>>
        +number xp
        +ProgressionStats stats
        +DailyCounters daily
        +Activity[] activities
        +string[] unlockedBadges
        +string[] pendingBadges
        +Scoreboard huntScores
        +PuzzleProgress puzzleProgress
        +string ownerId
        +recordBattle(input) void
        +recordPuzzle(input) void
        +recordHunt(input) void
        +recordCoachAnalysis(input) void
        +unlockBadges(ids) void
        +setHuntScores(update) void
        +setPuzzleProgress(update) void
        +hydrate(snapshot) void
        +adoptOwner(ownerId) void
        +reset() void
    }

    class ProgressionStats {
        <<interface>>
        +number gamesPlayed
        +number gamesWon
        +number averageAccuracy
        +number puzzlesSolved
        +number flawlessPuzzles
        +number bestHuntScore
        +number huntCaptures
        +number checkmatesDelivered
        +number bestPuzzleStreak
    }

    class Activity {
        <<interface>>
        +string id
        +ActivityKind kind
        +string label
        +number xp
        +string at
    }

    class ProgressionSnapshot {
        <<interface>>
        +number xp
        +ProgressionStats stats
        +string[] unlockedBadges
        +Scoreboard huntScores
        +PuzzleProgress puzzleProgress
    }

    class AuthStore {
        <<store>>
        +boolean isReady
        +Session session
        +Profile profile
        +string error
        +initialise() Function
        +signUp(input) Promise
        +signIn(input) Promise
        +signInWithGoogle() Promise
        +signOut() Promise
        +updateProfile(patch) Promise
    }

    class Profile {
        <<interface>>
        +string id
        +string username
        +AvatarPiece avatar_piece
        +string created_at
    }

    class useProgressionSync {
        <<hook>>
        -string syncedKey
        -boolean ready
        -pull() Promise
        -write() Promise
    }

    class sync {
        <<pure module>>
        +rowToSnapshot(row) ProgressionSnapshot
        +snapshotToRow(id, snap) ProgressionRow
        +snapshotKey(snap) string
    }

    ProgressionStore *-- ProgressionStats : contains
    ProgressionStore o-- Activity : recent feed
    ProgressionStore ..> ProgressionSnapshot : exposes and hydrates
    AuthStore o-- Profile : signed-in profile
    useProgressionSync ..> ProgressionStore : reads and hydrates
    useProgressionSync ..> AuthStore : watches the session
    useProgressionSync ..> sync : pure conversion
    sync ..> ProgressionSnapshot : translates
```

Converting between the store and the server row is isolated in a pure module, so
it is testable without a network.

---

## 4. Data model

Every table is protected by Row Level Security. A SQL trigger creates the profile
on sign-up, so an account can never exist without one.

`progression` carries the whole of a player's personal progress, including the
hunt board and the puzzle streak as JSON documents. Those two used to sit in
localStorage keys of their own, which tied them to the browser rather than to
the player; riding the progression row means they follow the account, under the
same ownership rules as everything else. A `puzzle_progress` table existed in
the first data model but no client code ever used it, so it was dropped rather
than left as a second home for the same thing.

```mermaid
classDiagram
    direction LR

    class auth_users {
        <<Supabase Auth>>
        +uuid id
        +string email
        +jsonb raw_user_meta_data
    }

    class profiles {
        <<table>>
        +uuid id
        +string username
        +AvatarPiece avatar_piece
        +timestamptz created_at
    }

    class scores {
        <<table>>
        +bigint id
        +uuid user_id
        +string piece
        +int score
        +int captures
        +timestamptz played_at
    }

    class progression {
        <<table>>
        +uuid user_id
        +int xp
        +jsonb stats
        +text[] unlocked_badges
        +jsonb hunt_scores
        +jsonb puzzle_progress
        +timestamptz updated_at
    }

    class achievements {
        <<table>>
        +uuid user_id
        +string badge_id
        +timestamptz unlocked_at
    }

    auth_users "1" --> "1" profiles : trigger handle_new_user
    profiles "1" --> "0..*" scores : publishes
    profiles "1" --> "0..1" progression : syncs
    profiles "1" --> "0..*" achievements : unlocks
```

The worldwide leaderboard reads `scores`; personal progression lives in
`progression`, which is private.

### Access rules

| Table          | Read                                     | Write                                                 |
| -------------- | ---------------------------------------- | ----------------------------------------------------- |
| `profiles`     | public — the leaderboard shows usernames | owner, **columns `username` and `avatar_piece` only** |
| `scores`       | public — worldwide leaderboard           | insert under one's own id; **no update, no delete**   |
| `progression`  | **private** to its owner                 | owner only                                            |
| `achievements` | public — badges can be shown off         | insert under one's own id                             |

> **The security point worth remembering.** Row Level Security filters **rows**,
> never **columns**. Checking row ownership is therefore not enough: without a
> column-level privilege, a player could write any field of their own row —
> including their XP. Hence the restricted `GRANT` on `profiles`.

### Trust boundary

All gameplay runs in the browser, so the values a client writes to its own rows
— a hunt `score`, the `xp`, `stats` and `unlocked_badges` in `progression`, an
`achievements` row — are **asserted by the client**, not computed by the server.
RLS draws the line it can draw: a player may only ever write rows keyed to their
own `user_id`, so no one can tamper with **another** account. The `profiles`
column grant goes one step further, keeping XP and level off the one table the
leaderboard joins for display.

Making these values authoritative — proof against a user editing their own
figures — would require moving the scoring to the server behind a validated
`SECURITY DEFINER` RPC, which the specification does not ask for: this is a
single-player training app, and self-inflating one's own dashboard cheats only
oneself. The worldwide leaderboard shares the same bound; its ranking is only as
trustworthy as the client-reported score, which is the accepted trade-off for a
fully client-side engine.

---

## Reading the relationships

| Symbol | Relationship                                                      | Example in this project                           |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------- |
| `*--`  | **Composition** — the whole owns the part and destroys it with it | `useStockfish` creates the engine and disposes it |
| `o--`  | **Aggregation** — the whole references a part it does not own     | `StockfishEngine` and its `Worker`                |
| `..>`  | **Dependency** — uses, without owning                             | `CoachAnalysis` calls the engine to analyse       |
| `-->`  | **Association** — a lasting link, here a foreign key              | `profiles` to `scores`                            |
