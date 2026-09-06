---
name: deploy-budget
description: Check the Netlify credit position before merging or deploying — what the cycle has spent, days until it resets (the 16th, not the 1st), and whether builds are stopped. Use when asked about the deploy budget, Netlify credits, whether there is room to deploy, or when planning a deploy or a batch of merges.
allowed-tools: Bash(curl:*) Bash(date:*) Bash(echo:*) Bash(jq:*)
---

# Where the Netlify budget stands

!`echo "today: $(date +%Y-%m-%d) | day-of-month: $(date +%-d) | NETLIFY_AUTH_TOKEN: ${NETLIFY_AUTH_TOKEN:+set}${NETLIFY_AUTH_TOKEN:-MISSING}"`

## Why this skill exists

CLAUDE.md states the budget in prose — 300 credits a month, a production deploy
15, bandwidth 20 per GB, web requests 2 per 10,000, reset on the **16th**. Prose
drifts, and the reset date is the part people get wrong (they assume the 1st).
Measure instead.

On the free plan, when the credits run out the project is **paused**: visitors
get a "Site not available" page until the cycle resets, and the plan can neither
buy credits nor auto-recharge. So this is a check to run before a deploy, not
after one.

## Auth

Needs a Netlify personal access token in `NETLIFY_AUTH_TOKEN` (Netlify → User
settings → Applications → Personal access tokens). If the header line above says
`MISSING`, do steps 1 and 4 only — they need nothing — and tell the user the
rest is a UI read at `https://app.netlify.com/teams/<team>/usage`.

```bash
api() { curl -sf -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" "https://api.netlify.com/api/v1/$1"; }
```

## 1. Days until the reset — pure date math, always works

The cycle resets on the 16th. If today's day-of-month (in the header line) is
below 16, the next reset is the 16th of this month; otherwise the 16th of next
month. Report the date and the number of days away.

## 2. Find the team and the site

```bash
api 'accounts' | jq '.[] | {id, slug, name, type_name}'
api 'sites?name=chesstrainer' | jq '.[] | {id, name, ssl_url, account_slug}'
```

Keep the account `id`/`slug` and the site `id`.

## 3. What the API can show

- **Bandwidth** (20 credits/GB): try `api "accounts/<id>/bandwidth"` (and
  `<slug>` if that 404s). It returns bytes `used` vs `included` and the period
  dates — check those dates line up with a 16th-to-16th cycle.
- **Production deploys this cycle** (15 credits each):
  `api "sites/<id>/deploys?per_page=100"`, count entries with
  `context == "production"` and `state == "ready"` dated on or after the last
  16th.
- **Are builds stopped?** `api "sites/<id>" | jq '.build_settings.stop_builds'`.
  CLAUDE.md notes builds may be stopped in the project settings so `main` can
  move without spending; if this is `true`, merging costs nothing and one manual
  deploy later publishes the backlog.

Do **not** invent an endpoint for a single "credits remaining" figure — the API
does not expose one cleanly. Report the components measured and send the user to
the usage page for the headline number.

## 4. Answer

Report: days until reset with the date; bandwidth used vs included (if measured);
production deploys counted this cycle and their credit cost; whether builds are
stopped. For anything the token was missing for or a call failed on, say it is a
UI read — never present a guess as a measurement.
