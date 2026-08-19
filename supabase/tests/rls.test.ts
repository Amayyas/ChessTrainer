import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * The policies in supabase/migrations, executed rather than read.
 *
 * This is the only security in the project that matters and the only one
 * nothing else covers: CodeQL does not read SQL, and the browser tests only
 * exercise code that has already been let through. A policy weakened by a later
 * migration would reach production silently.
 *
 * Every assertion here is written from the attacker's side — what a client
 * *cannot* do — because that is the side that has to hold.
 */

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:test@localhost:55432/chesstrainer'

let db: Client

/** Two players, so "only their own" can mean something. */
const alice = randomUUID()
const bob = randomUUID()

/**
 * Runs a statement as a signed-in player, exactly as PostgREST would: the role
 * carries the privileges, the JWT claim carries the identity that auth.uid()
 * reads. Reset afterwards so one test cannot leak its identity into the next.
 */
async function asUser<T>(userId: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query('set local role authenticated')
  await db.query(`set local request.jwt.claims = '${JSON.stringify({ sub: userId })}'`)
  const result = await db.query(sql, params)
  return result.rows as T[]
}

/** The same, for a visitor who has not signed in. */
async function asAnon<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query('set local role anon')
  await db.query(`set local request.jwt.claims = '{}'`)
  const result = await db.query(sql, params)
  return result.rows as T[]
}

let savepoints = 0

/**
 * Asserts a statement is refused, and hands back the error to inspect.
 *
 * Wrapped in a savepoint because a failed statement aborts the whole
 * transaction: without one, the second refusal in a test reports "transaction
 * is aborted" instead of the reason, and the assertion passes or fails on the
 * wrong message entirely.
 */
async function refused(run: () => Promise<unknown>): Promise<Error> {
  const point = `attempt_${(savepoints += 1)}`
  await db.query(`savepoint ${point}`)
  try {
    await run()
  } catch (error) {
    await db.query(`rollback to savepoint ${point}`)
    return error as Error
  }
  await db.query(`release savepoint ${point}`)
  throw new Error('la requête a été acceptée alors qu’elle devait être refusée')
}

beforeAll(async () => {
  db = new Client({ connectionString })
  await db.connect()
})

afterAll(async () => {
  await db.end()
})

beforeEach(async () => {
  // Every test runs inside a transaction that is rolled back, so the database
  // starts each one identical and the order of tests cannot matter.
  await db.query('begin')
  await db.query('set local role postgres')
  await db.query('delete from auth.users')
  // Inserting a user is what a sign-up does, and the trigger on this table
  // creates the profile from it — so the tests never insert a profile by hand.
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
    alice,
    'alice@example.test',
    bob,
    'bob@example.test',
  ])
})

afterEach(async () => {
  await db.query('rollback')
})

describe('what a visitor without an account can reach', () => {
  it('reads the public profile of a player, since the leaderboard shows it', async () => {
    // Asserted on a named row, not on count(*). An aggregate returns a row even
    // when the policy has filtered every profile away, so the count form passed
    // whatever the policy said — a test that could not fail.
    const rows = await asAnon<{ id: string }>('select id from profiles where id = $1', [alice])
    expect(rows).toHaveLength(1)
  })

  it("cannot read anyone's progression", async () => {
    // Refused outright rather than filtered to nothing: the grant is missing as
    // well as the policy, so this never reaches the row-level check at all.
    const error = await refused(() => asAnon('select * from progression'))
    expect(error.message).toMatch(/permission denied/i)
  })

  it('cannot reach a hunt round', async () => {
    const error = await refused(() => asAnon('select * from hunt_rounds'))
    expect(error.message).toMatch(/permission denied/i)
  })

  it('cannot post a score', async () => {
    const error = await refused(() =>
      asAnon('insert into scores (user_id, piece, score, captures) values ($1, $2, $3, $4)', [
        alice,
        'q',
        999999,
        1,
      ]),
    )
    expect(error.message).toMatch(/permission denied/i)
  })

  it('cannot open a round, submit one, or delete an account', async () => {
    // The three functions that carry SECURITY DEFINER. PostgreSQL grants EXECUTE
    // to PUBLIC by default, so these were reachable until the grants were
    // revoked from PUBLIC rather than from anon — the distinction this checks.
    // Each with its own arguments: Postgres rejects a wrong parameter count
    // before it ever checks privileges, which would pass this test for entirely
    // the wrong reason.
    const calls: [string, unknown[]][] = [
      ['select start_hunt_round()', []],
      ['select submit_hunt_score($1, $2, $3, $4)', [randomUUID(), 'q', 10, 1]],
      ['select delete_my_account()', []],
    ]
    for (const [call, params] of calls) {
      const error = await refused(() => asAnon(call, params))
      expect(error.message).toMatch(/permission denied/i)
    }
  })
})

describe('what one player can reach of another', () => {
  beforeEach(async () => {
    await db.query('set local role postgres')
    await db.query('insert into progression (user_id, xp) values ($1, 500), ($2, 900)', [
      alice,
      bob,
    ])
  })

  it('sees only their own progression', async () => {
    const mine = await asUser<{ xp: number }>(alice, 'select xp from progression')
    expect(mine).toHaveLength(1)
    expect(mine[0]!.xp).toBe(500)
  })

  it("cannot write into another account's progression", async () => {
    await asUser(alice, 'update progression set xp = 99999 where user_id = $1', [bob])
    await db.query('set local role postgres')
    const { rows } = await db.query('select xp from progression where user_id = $1', [bob])
    expect(rows[0].xp).toBe(900)
  })

  it('cannot create a progression row under another account', async () => {
    const error = await refused(() =>
      asUser(alice, 'insert into progression (user_id, xp) values ($1, 1)', [randomUUID()]),
    )
    expect(error.message).toMatch(/row-level security/i)
  })

  it('cannot rename another player', async () => {
    await asUser(alice, 'update profiles set username = $1 where id = $2', ['pirate', bob])
    await db.query('set local role postgres')
    const { rows } = await db.query('select username from profiles where id = $1', [bob])
    expect(rows[0].username).toBe('bob')
  })
})

describe('the columns a player may write', () => {
  it('lets them change their own name and avatar', async () => {
    await asUser(alice, 'update profiles set username = $1, avatar_piece = $2 where id = $3', [
      'alice2',
      'n',
      alice,
    ])
    await db.query('set local role postgres')
    const { rows } = await db.query('select username, avatar_piece from profiles where id = $1', [
      alice,
    ])
    expect(rows[0]).toEqual({ username: 'alice2', avatar_piece: 'n' })
  })

  it('refuses a column outside that grant', async () => {
    // A policy alone would allow this: the row is theirs. Only the column-level
    // grant stops it, which is why this is worth asserting separately.
    const error = await refused(() =>
      asUser(alice, 'update profiles set created_at = now() where id = $1', [alice]),
    )
    expect(error.message).toMatch(/permission denied/i)
  })
})

describe('the leaderboard cannot be written to directly', () => {
  it('refuses an insert from a signed-in player', async () => {
    // The whole anti-cheat rests on this. If a client could insert here, every
    // plausibility check in submit_hunt_score would be decoration.
    const error = await refused(() =>
      asUser(alice, 'insert into scores (user_id, piece, score, captures) values ($1,$2,$3,$4)', [
        alice,
        'q',
        999999,
        1,
      ]),
    )
    expect(error.message).toMatch(/permission denied/i)
  })

  it('refuses an update of a score already recorded', async () => {
    await db.query('set local role postgres')
    await db.query('insert into scores (user_id, piece, score, captures) values ($1,$2,$3,$4)', [
      alice,
      'q',
      100,
      2,
    ])
    const error = await refused(() =>
      asUser(alice, 'update scores set score = 999999 where user_id = $1', [alice]),
    )
    expect(error.message).toMatch(/permission denied/i)
  })
})

describe('the score a round is allowed to claim', () => {
  /** Opens a round and backdates it, so a plausible duration can be tested. */
  async function openRound(secondsAgo: number): Promise<string> {
    const [{ start_hunt_round: id }] = await asUser<{ start_hunt_round: string }>(
      alice,
      'select start_hunt_round()',
    )
    await db.query('set local role postgres')
    await db.query(
      `update hunt_rounds set started_at = now() - ($1 || ' seconds')::interval where id = $2`,
      [secondsAgo, id],
    )
    return id
  }

  it('accepts a round that was actually played', async () => {
    const round = await openRound(60)
    const rows = await asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [
      round,
      'q',
      600,
      5,
    ])
    expect(rows).toHaveLength(1)
    await db.query('set local role postgres')
    const { rows: scores } = await db.query('select score from scores where user_id = $1', [alice])
    expect(scores[0].score).toBe(600)
  })

  it('refuses more points than the captures could have earned', async () => {
    const round = await openRound(60)
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 999999, 1]),
    )
    expect(error.message).toMatch(/not reachable with/i)
  })

  it('refuses a round finished too fast to have been played', async () => {
    const round = await openRound(1)
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 600, 5]),
    )
    expect(error.message).toMatch(/faster than it can be played/i)
  })

  it('refuses a round belonging to someone else', async () => {
    const round = await openRound(60)
    const error = await refused(() =>
      asUser(bob, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 100, 2]),
    )
    expect(error.message).toMatch(/no open round of yours/i)
  })

  it('refuses a champion that is not one of the four', async () => {
    const round = await openRound(60)
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'k', 100, 2]),
    )
    expect(error.message).toMatch(/unknown champion/i)
  })

  it('refuses a negative score or a negative capture count', async () => {
    for (const [score, captures] of [
      [-1, 2],
      [100, -2],
    ]) {
      const round = await openRound(60)
      const error = await refused(() =>
        asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', score, captures]),
      )
      expect(error.message).toMatch(/negative score or capture count/i)
    }
  })

  it('refuses more captures than a sixty-second round can hold', async () => {
    const round = await openRound(60)
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 100, 151]),
    )
    expect(error.message).toMatch(/sixty-second round allows/i)
  })

  it('refuses more captures than the elapsed seconds allow', async () => {
    // Distinct from the cap above: a round open for ten seconds cannot have
    // produced a hundred captures, even though a hundred is under the ceiling.
    const round = await openRound(10)
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 100, 100]),
    )
    expect(error.message).toMatch(/seconds allow/i)
  })

  it('refuses to bank the same round twice', async () => {
    const round = await openRound(60)
    await asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 300, 3])
    const error = await refused(() =>
      asUser(alice, 'select submit_hunt_score($1, $2, $3, $4)', [round, 'q', 300, 3]),
    )
    expect(error.message).toMatch(/no open round of yours/i)
  })
})

describe('badges', () => {
  it('lets a player unlock one for themselves', async () => {
    await asUser(alice, 'insert into achievements (user_id, badge_id) values ($1, $2)', [
      alice,
      'first-mate',
    ])
    await db.query('set local role postgres')
    const { rows } = await db.query(
      'select count(*)::int as n from achievements where user_id=$1',
      [alice],
    )
    expect(rows[0].n).toBe(1)
  })

  it('refuses to award one to somebody else', async () => {
    // An entire RLS-protected table was outside this suite: weakening its
    // owner-only check would have let one player decorate another's profile
    // without a single test noticing.
    const error = await refused(() =>
      asUser(alice, 'insert into achievements (user_id, badge_id) values ($1, $2)', [
        bob,
        'first-mate',
      ]),
    )
    expect(error.message).toMatch(/row-level security/i)
  })

  it('refuses one from a visitor with no account', async () => {
    const error = await refused(() =>
      asAnon('insert into achievements (user_id, badge_id) values ($1, $2)', [alice, 'first-mate']),
    )
    expect(error.message).toMatch(/permission denied/i)
  })
})

describe('deleting an account', () => {
  it('removes the caller and nobody else', async () => {
    await asUser(alice, 'select delete_my_account()')
    await db.query('set local role postgres')
    const { rows } = await db.query('select id from auth.users order by id')
    expect(rows.map((row) => row.id)).toEqual([bob])
  })

  it('takes the profile with it, so nothing is left orphaned', async () => {
    await asUser(alice, 'select delete_my_account()')
    await db.query('set local role postgres')
    const { rows } = await db.query('select count(*)::int as n from profiles where id = $1', [
      alice,
    ])
    expect(rows[0].n).toBe(0)
  })
})
