# Profile photos and their moderation

A player may replace their avatar piece with a photo. The photo is shown
wherever the piece is, including the worldwide leaderboard, which anyone can
read. Nothing reaches it unchecked, and players can take down what the check
missed.

## How a photo gets on a profile

```text
browser                         profile-photo function            database / storage
───────                         ──────────────────────            ──────────────────
crop to a centred square,
256 px, re-encode as JPEG ───▶  verify the token (player id)
                                size ≤ bucket limit, JPEG bytes
                                begin_photo_upload(player) ────▶  rate limit, review block
                                OpenAI moderation (image)
                                  flagged / unreadable → refuse
                                upload <player>/<uuid>.jpg   ────▶  "avatars" bucket (public)
                                set_profile_photo(player, path) ▶ profiles.photo_path
                                delete the photo it replaced
```

- **No client can write a photo.** `profiles.photo_path` has no grant for
  `anon` or `authenticated`, and no policy on `storage.objects` lets a client
  upload. The function, holding the service role key, is the only way in. The
  three functions it calls are executable by `service_role` alone.
- **The browser re-encodes every photo.** A canvas holds pixels and nothing
  else, so the camera's metadata, location included, never leaves the device.
- **It fails closed.** Without `OPENAI_API_KEY`, or when OpenAI errors, times
  out or answers in a shape `readModeration` does not recognise, the photo is
  refused as `unavailable`.
- **The limits live in one place each.** The size limit is the bucket's
  `file_size_limit` in the migration, and `rules.ts` holds the same value, held
  to it by a test. The attempt limit is `max_photo_attempts_per_hour()`.

The function's decisions are in
[`supabase/functions/profile-photo/rules.ts`](../supabase/functions/profile-photo/rules.ts),
tested by Vitest. The Deno entry point beside it is wiring only.

## What the automatic check does not see

OpenAI's `omni-moderation-latest` reads **sexual content, violence and
self-harm** in an image. It reads **hate and harassment in text only**: a
swastika or an insult written on a photo passes. Player reports cover that gap.

## Reports

A signed-in player can report another player's photo from the leaderboard.
`report_photo()` reads the photo the target has _now_, so a client cannot
report a path of its choosing. It counts one report per player per photo.

At `photo_report_threshold()` distinct reporters:

1. `profiles.photo_path` is set to null, and the piece shows again everywhere.
2. A row is added to `hidden_photos` with the path.
3. Until that row is released, `begin_photo_upload()` refuses the player with
   `under_review`. Otherwise the same image would go straight back up and need
   as many reports again.

`hidden_photos` has no foreign key to the player. If they delete their account,
the row stays: it is the only pointer left to a file still in the bucket.

## Reviewing a hidden photo

In the Supabase dashboard:

1. **SQL editor:**
   `select * from hidden_photos where released_at is null order by hidden_at;`
2. **Storage → avatars:** open the file at `photo_path` and look at it.
3. Then do one of two things.
   - **The reports were wrong.** Put the photo back:

     ```sql
     select restore_photo('<user_id>', '<photo_path>');
     ```

     In one step it sets the photo on the profile again, releases the player
     and deletes the reports against that photo. Left behind, those reports
     would still count, and a single new one would take it down again. If the
     photo is reported back to the threshold later, it returns to this queue.

   - **The reports were right, or the account is gone.** `restore_photo`
     refuses a player who has since deleted their account: there is no profile
     to put the photo back on, and the file is still public in the bucket.
     Either way, delete the file in **Storage**, not in SQL: a SQL delete
     leaves the file orphaned in the bucket. Then mark the review done, or,
     for a player who still exists, leave the row unreleased to keep them on
     their piece:

     ```sql
     update hidden_photos set released_at = now()
       where user_id = '<user_id>' and photo_path = '<photo_path>';
     ```

A photo the player removes themselves is deleted by the function. A hidden
photo is not, because it waits for this review.

## Deploying

The function and the migration go to production separately from the Netlify
release, and **before** it:

```bash
npx supabase db push                                  # the migration
npx supabase secrets set OPENAI_API_KEY=sk-...        # once
npx supabase functions deploy profile-photo
```

The order matters. The leaderboard's query names `profiles.photo_path`: a
client released before the migration cannot load the leaderboard at all, since
PostgREST refuses a query that names a column it does not know. Before the
function is deployed, every upload fails with `failed` and nothing else is
affected.

The release also changes `img-src` in the Content-Security-Policy so the site
may load images from Supabase Storage. Between the merge and the release, the
scheduled Site check compares production with `main`'s `netlify.toml` and
reports a CSP difference. That is expected, as with any CSP change, and clears
once the release deploys.
