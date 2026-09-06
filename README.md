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

## Adding statuses

Edit `statuses.js`. It's a plain list grouped by mood, and the groups become
headings in the picker. Nothing else depends on the wording, so rewrite freely.

## The shared bits

Clocks, statuses, the "when we're together" list and the events themselves all
sync live through a free Firebase Realtime Database. Each phone publishes its
own timezone every time the app is opened, so travelling fixes the clocks
without anyone changing a setting.

All of it is optional. With no database reachable, no room joined, or no
signal, those sections simply don't appear and the rest of the app carries on
from local storage.

### The room name is the password

`firebase-config.js` is public - it's in this repo - so the room name is
deliberately not in it. The database rules allow exactly one room and deny
everything else, which means the room name is the only thing protecting the
data.

It travels in the share link as `#k=...` and is then kept in each phone's own
storage. To set up a new phone, open a link containing the key once.

The rules, which live only in the Firebase console:

```json
{
  "rules": {
    "rooms": {
      "<room name>": { ".read": true, ".write": true }
    }
  }
}
```

## Sharing events

The Share button packs the room name and every event into the link. Once both
phones are in the same room, events sync on their own and there's no need to
send anything again - the link is only for setting a phone up the first time.

### On an installed iPhone app, paste the link instead of tapping it

iOS gives a home-screen web app its own storage, walled off from Safari, and
tapping a link always opens Safari rather than the app. So events imported in
Safari are invisible to the installed app.

The way round it: copy the link out of your messages, open the app from its
icon, and use "paste a link someone sent you" at the bottom of the screen.
That joins the room and imports the events into the app's own storage. It only
needs doing once - after that the app stays in sync by itself.

Android doesn't have this split - an installed app there shares Chrome's
storage, so tapping the link works normally.

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
