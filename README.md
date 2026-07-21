# Birthday Wish Website

## Run locally

Open this folder in VS Code, then launch `index.html` with the **Live Server** extension.

## Personalize a wish

Edit only `js/config.js` for each friend:

- `name` — recipient's name
- `from` — your name
- `birthDate` and `seedYear`
- `passcode.code` — the four-digit password
- `letterLines`, `memory`, `reasons`, `wishes`, `timeline`, and `gift`

Put optional images in `assets/photos/` and optional music in `assets/music/`.

### Make a new wish for another friend

1. Open `js/config.js`.
2. Change `name`, `from`, and the written messages you want to personalize.
3. Keep the rest of the design and code unchanged.
4. Save, check it with Live Server, then upload the same project folder again.

The included `assets/music/happy-birthday-song.mpeg` plays when it is available.
To return to the built-in music, set `music.file` to `null` in `js/config.js` (or remove/rename the music file).

## Host online

Deploy the project folder (not just one file) to GitHub Pages or Vercel. Once it has a public HTTPS URL, the Copy Link, Share, and QR features can be used by friends on other devices.

### Send it on WhatsApp

After GitHub Pages/Vercel gives you the public website URL, copy that URL and send a message such as:

`I made a small birthday surprise for you — open this: YOUR-LINK-HERE`

Every person who opens that same link will see the complete interactive wish on mobile or desktop. For a different friend, edit `js/config.js`, redeploy, then send the new link.
