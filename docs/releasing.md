# Releasing and deploying

How a change gets from a merged pull request to chesstrainer.fr, what that
costs, and what to do when it goes wrong. The short version: **merging is free
and publishes nothing; merging the release PR is the deploy.**

## From merge to release

Releases are cut by [release-please](https://github.com/googleapis/release-please),
configured in [`release-please-config.json`](../release-please-config.json) and
run by [`release-please.yml`](../.github/workflows/release-please.yml) on every
push to `main`.

It keeps one open pull request, the **release PR**, that collects every change
since the last release. It bumps `package.json` and
[`.release-please-manifest.json`](../.release-please-manifest.json) and writes
the next section of [`CHANGELOG.md`](../CHANGELOG.md). Merging it tags the
commit `vX.Y.Z` and publishes a GitHub release.

The version is read from the commit subjects, which is why they follow
Conventional Commits:

| Type                                   | Version     | Changelog |
| -------------------------------------- | ----------- | --------- |
| `feat`                                 | minor       | shown     |
| `fix`, `perf`                          | patch       | shown     |
| `refactor`                             | rides along | shown     |
| `docs`, `test`, `build`, `ci`, `chore` | rides along | hidden    |

A batch of tooling work alone opens no release PR. `CHANGELOG.md` belongs to
release-please: it is excluded from Prettier, and editing it by hand fights the
next release.

The workflow needs a `RELEASE_PLEASE_TOKEN` secret — a fine-grained personal
access token with Contents and Pull requests write. Without it the action falls
back to the Actions token, which still opens the release PR, but GitHub does not
run CI on a pull request that token created, so the release PR sits unmergeable
until someone approves the run by hand.

## One release, one deploy

Netlify builds `main` with `npm run build` and serves `dist/`. Its
[`netlify.toml`](../netlify.toml) carries an `ignore` command that cancels every
production build except the one for a merge that changed
`.release-please-manifest.json`. Only release-please touches that file, and only
in its release PR.

So:

- Merging a `fix`, a docs change or a Dependabot bump into `main` costs nothing
  and publishes nothing. It goes live with the next release.
- **Merging the release PR is the deploy.**
- Deploy previews on pull requests are unaffected and still build on every PR,
  for free.
- A doubt publishes rather than skips: anything git cannot answer — a clone too
  shallow to have `HEAD^` — is treated as "build".

To publish outside a release, trigger a Netlify **build hook**. Netlify
documents that the ignore command never cancels a build a hook triggered.

A merged change is therefore not live until the release that carries it. Check
production after merging the release PR, not after merging the change.

## The credit budget

Netlify's free plan runs on credits, reset each month on the **16th**, not the
1st. **When they run out, every project on the account is paused** — visitors
get a "Site not available" page until the cycle resets — and the free plan can
neither buy more nor recharge automatically. Running out means waiting.

The figures below were Netlify's pricing when this was written; the usage page
of the Netlify team is the source of truth, and Claude Code's `/deploy-budget`
measures it rather than trusting this table.

| What                                                      | Credits      |
| --------------------------------------------------------- | ------------ |
| Monthly allowance                                         | 300          |
| A production deploy                                       | 15           |
| Bandwidth                                                 | 20 per GB    |
| Web requests                                              | 2 per 10,000 |
| Deploy previews, branch deploys, failed builds, rollbacks | free         |

Deploys are not the only spend. Traffic drains the balance while nobody deploys
at all, so read the balance against the traffic as much as against the deploys.
The scheduled site check below costs about one credit a month.

## Before merging the release PR

1. **`main` is green.** The CI run for its current tip passed, and the scheduled
   workflows are not red for a reason of their own.
2. **The release PR is ready** by all four conditions: checks, review, branch
   current with `main`, every thread resolved.
3. **There is room in the budget** for 15 credits, with margin for the rest of
   the cycle's traffic.
4. **The owner has said go.** Merging the release PR spends money; it is never
   done on an agent's own initiative.

## After merging it

Watch the Netlify deploy finish, then check what production actually serves:

```bash
node scripts/check-deployed.mjs            # https://chesstrainer.fr by default
node scripts/check-deployed.mjs <base-url> # a deploy preview, say
```

[`check-deployed.mjs`](../scripts/check-deployed.mjs) checks the SPA rewrite,
the sitemap and each page it lists, `robots.txt`, `llms.txt`, the `/.well-known/`
404, the cache headers on fingerprinted assets, and that the
Content-Security-Policy is served enforced and identical, character for
character, to the one `netlify.toml` declares — on the page and on the engine's
worker.

The same script runs every six hours as the
[Site check](../.github/workflows/site-check.yml) workflow, which catches what no
deploy causes: a setting changed in the Netlify UI, a certificate, the domain.
A Site check that goes red right after a merge to `main` is usually not an
incident: production is still on the previous release, and the check already
expects what the next one ships.

## When the release build fails

Nothing later catches up on its own. The ignore command compares each merge with
the one before it, not with what production serves, so the next ordinary merge
is cancelled too. Production stays on the previous version while GitHub has
already tagged the new one.

Retry the failed deploy in the Netlify UI. It rebuilds the release commit, which
still changes the manifest, so it is not cancelled — and failed builds cost
nothing.

## When a release breaks production

Roll back to the previous deploy in the Netlify UI: it is free and needs no
build. Then fix forward, in a new release.

If the enforced CSP is what broke a mode, the comment above the headers in
`netlify.toml` gives the stopgap: rename the key to
`Content-Security-Policy-Report-Only` and release, which keeps the policy
reporting without blocking. Either way the Site check fails until the policy is
enforced again. That red is the expected consequence of the rollback, not a new
incident.

## The backend stays awake

A free Supabase project is paused after about seven days without activity.
[`keepalive.yml`](../.github/workflows/keepalive.yml) reads one row through
PostgREST every day, which counts as activity and doubles as an uptime alert. A
failure means "look", not "outage": a rotated key or a missing secret fails it
too.

GitHub disables scheduled workflows in a public repository after 60 days with no
repository activity, so the keep-alive protects the project only while the
repository is being worked on.

## Settings that live outside the repository

- **Netlify:** the build environment variables (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_SENTRY_DSN`,
  `SENTRY_AUTH_TOKEN`), the build hook, Force HTTPS, and the domain. The `VITE_`
  ones are written into the bundle at build time, so changing one means
  rebuilding — which is a deploy.
- **Supabase:** the Site URL and the Redirect URLs, matched exactly — a deployed
  address missing from them fails every sign-in.
- **GitHub:** branch protection on `main` and its required checks, matched by
  name; the `RELEASE_PLEASE_TOKEN`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`
  secrets.
