# Security policy

## Reporting a vulnerability

Please report security issues privately, through
[GitHub's private vulnerability reporting](https://github.com/Amayyas/ChessTrainer/security/advisories/new)
— the **Report a vulnerability** button under the Security tab. It opens a
discussion visible only to you and the maintainer.

Please do not open a public issue for a vulnerability, and please do not test
against the deployed instance in a way that would affect other players'
accounts or scores.

Expect a first reply within a week. This is a solo project, so a fix may take
longer than an acknowledgement.

## Scope

Reports are most useful about:

- **Row Level Security** — reading or writing data belonging to another
  account, through the REST API or Realtime.
- **Score validation** — submitting a Piece Hunt score to the worldwide
  leaderboard without playing the round it claims, or beyond the plausibility
  limits the server enforces.
- **Authentication** — session handling, the OAuth flow, or the account
  deletion path.
- **Anything that exposes another player's email address**, which is never
  meant to leave the account it belongs to.

## Known and accepted

These are understood, not oversights, and reports about them will be closed as
such:

- **The Supabase anon key is in the browser bundle.** It is designed to be
  public. Row Level Security, column-level grants and server-side validation
  are what actually protect the data; the key alone grants nothing.
- **A fabricated Piece Hunt round remains possible.** The server checks the
  round against its own clock and rejects implausible scores — points per
  capture, captures per second, minimum duration, rounds per hour — but a
  scripted round played out at a believable pace stays within those bounds. The
  design goal is to make cheating expensive, not impossible.
- **Multiple accounts.** Nothing prevents one person from holding several.
- **Stockfish runs client-side**, so its analysis can be manipulated locally.
  It affects only the cheater's own experience: nothing it produces is trusted
  by the server.

## Supported versions

Only the currently deployed version is supported. There are no maintained
release branches.
