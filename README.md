# us.

A countdown to the next time you're in the same place. Plain HTML, CSS and
JavaScript with no build step, so it can be hosted free on GitHub Pages and
installed on both an Android phone and an iPhone.

## Adding memes

1. Drop images into `assets/memes/` (`.jpg` `.png` `.gif` `.webp` `.avif`).
   HEIC will not work - browsers can't display it, convert to JPG first.
2. Run:

   ```
   node tools/refresh-memes.mjs
   ```

   It renames anything with spaces or odd characters to a safe lowercase name,
   rebuilds the list in `memes.js`, and warns about oversized files.
3. Commit and push. Both phones pick up the new memes on their next open.

One meme shows per day, chosen from the date so both of you see the same one,
cycling through the whole folder before anything repeats.

## Adding jokes

Edit `jokes.js`. Lines are grouped by how far away the event is (`imminent`,
`today`, `thisweek`, `soonish`, `faraway`, `eternity`, `past`). Add as many as
you like to any group. The stat cards at the bottom of `STATS` work the same way.

## Sharing events

The Share button packs every event into the link itself. Whoever opens it is
asked whether to merge or replace. Nothing is uploaded anywhere - the data
rides in the part of the URL after `#`, which browsers never send to a server.

Send a fresh link whenever you change something.

## Installing it

**Android (Chrome)** - open the link, tap the three-dot menu, "Add to Home
screen" or "Install app".

**iPhone** - the link must be opened in **Safari**. Chrome on iOS has no Add to
Home Screen option. Tap the Share button, scroll down, "Add to Home Screen".

Either way it opens full screen with no browser bar and works with no signal.

## Hosting

Push to GitHub, then Settings > Pages > Source: Deploy from a branch > `main` /
`root`. The URL is `https://<username>.github.io/<repo>/`.

## Regenerating the icons

Only needed if `assets/icon-source.png` changes:

```
python tools/make-icons.py
```

## Local preview

```
python -m http.server 8000
```

Then open `http://localhost:8000`.
