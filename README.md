# Tidy, Clean, Organized

A tiny personal web app that tracks recurring cleaning/tidying tasks.

It has two tabs:

- **Today** (the tab it opens to) — a checklist of only what's due or
  overdue right now, plus anything you've already ticked off today. Tap a
  row to mark it done; tap again to un-mark it.
- **All Tasks** — the complete list, with how often each one repeats and
  when it was last done (an actual date, plus "X days ago" colored by how
  overdue it is: green = fine, amber = due, red = overdue by more than a
  full extra cycle). Tap a row here to rename it, change its interval,
  mark it done, or delete it.

All data is stored only in your iPhone's browser (localStorage) — nothing
is sent anywhere, and there's no login or backend.

## 1. Put this on GitHub Pages

1. Go to [github.com/new](https://github.com/new) and create a new repository
   (e.g. `tidy-clean-organized`). Public or private both work for GitHub
   Pages on a free personal account, but a **public** repo is the simplest.
2. On the new repo's page, click **"uploading an existing file"** (or drag
   the files straight into the browser window).
3. Upload every file from this folder: `index.html`, `styles.css`,
   `app.js`, `manifest.json`, `service-worker.js`, `icon-192.png`,
   `icon-512.png`, `icon-512-maskable.png`. Commit them to the `main`
   branch.
4. In the repo, go to **Settings → Pages**.
5. Under "Build and deployment", set **Source** to "Deploy from a branch",
   branch **main**, folder **/ (root)**, then **Save**.
6. Wait about a minute, then refresh that Pages settings screen — it will
   show your live URL, something like:
   `https://<your-username>.github.io/tidy-clean-organized/`

That URL is your app. Open it in Safari on your iPhone.

## 2. Add it to your iPhone home screen

1. Open the GitHub Pages URL in **Safari** (must be Safari, not Chrome, for
   this to work on iPhone).
2. Tap the **Share** icon (square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm the name ("Tidy") and tap **Add**.

It'll now appear as an app icon on your home screen and open full-screen,
without Safari's address bar.

## 3. Adding, renaming, or deleting tasks

This is all done from the app itself now — no code editing needed for
everyday changes:

All of this happens on the **All Tasks** tab:

- **Add a task**: tap the orange **+** button (top right), enter a name
  and how many days between repeats, and save.
- **Edit a task**: tap anywhere on its row to open it, change the name or
  interval, and save. There's also a **"Mark done today"** button in there
  if you'd rather set that from here than from the Today tab.
- **Delete a task**: open it the same way and tap **Delete**. You get a
  few seconds to tap **Undo** if that was a mistake.

The one exception is the flea bombs task, which is pinned to specific
calendar months (September and January) rather than a day count — you can
still rename or delete it from the app, but changing *which* months it's
pinned to requires editing the code (see below), because that's a rarer,
more fiddly kind of task.

Because tasks now live in your phone's storage rather than in the code,
**heads up: this data does not automatically back up anywhere.** If you
ever clear Safari's site data, reset your phone, or switch phones, your
custom task list and "last done" history will be gone and the app will
start over from its built-in defaults. That's an accepted trade-off for
keeping things simple and local — just worth knowing.

### Changing the built-in starting list (advanced / rarely needed)

`app.js` has a `DEFAULT_TASKS` array near the top, in plain commented
English. This is only used to seed a **brand new install** (i.e. the very
first time the app runs on a given phone/browser with no existing data).
Editing it won't affect a phone that has already used the app — for that,
use the in-app add/edit/delete described above instead.

## 4. If the app looks "stuck" after you push a code update

Because the app installs a small offline cache (a "service worker") so it
still opens without signal, your phone can occasionally keep showing an
older cached version for a bit after you push changes. Force a refresh by
closing the app fully (swipe it away from the app switcher) and reopening
it, or by pulling down to refresh once in Safari before re-adding to the
home screen.
