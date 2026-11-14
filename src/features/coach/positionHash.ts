/**
 * A position's identity for the opening book, as a 32-bit number.
 *
 * Shared by scripts/build-openings.mjs, which hashes every position of every
 * book line, and by the coach, which hashes the positions of the game being
 * played — so it imports nothing and must stay that way: the script reads it
 * under Node's type stripping.
 *
 * The move counters are dropped from the FEN. Two move orders that reach the
 * same position — 1.♘f3 d5 2.d4 and 1.d4 d5 2.♘f3 — are the same opening, and
 * only the counters would tell them apart. Placement, side to move, castling
 * rights and the en passant square are kept: a position that differs in any of
 * them is a different position.
 *
 * Both sides take their FENs from chess.js, so they agree on how it writes the
 * en passant square. A hash rather than the FEN keeps the book small enough to
 * ship: some 8000 positions, where the FENs would weigh several hundred
 * kilobytes. With that many entries among 2^32 values, a stray match is about
 * a one-in-500,000 event per lookup.
 */
export function positionHash(fen: string): number {
  const key = fen.split(' ').slice(0, 4).join(' ')
  // FNV-1a, 32-bit: small, fast, and spreads FENs that differ by one square.
  let hash = 0x811c9dc5
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
