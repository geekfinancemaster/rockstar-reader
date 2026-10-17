# Ember Reader

A book reader app (PDF) with a fiery opening animation, a rider that tracks your reading progress
along a road at the bottom, night / sun modes, a warm "reading mode", and a page slider on the right.
It works offline and can be added to your phone's home screen.

## 1. Add your book
1. Rename your PDF to **book.pdf** (no spaces).
2. Put it inside the **assets** folder, replacing the sample book that is there.

## 2. Try it on your computer (optional)
Double-clicking index.html will not work. Instead, open a terminal in this folder and run:

    python -m http.server 8000

then open http://localhost:8000 in Chrome or Edge.

## 3. Put it on GitHub (free)
1. Make a free account at github.com and click **New repository**. Name it `ember-reader`, set it to **Public**, tick "Add a README", create it.
2. Unzip this folder on your computer. Open the unzipped `ember-reader` folder.
3. In your repository click **Add file > Upload files**. Drag in **everything inside** the folder
   (index.html, sw.js, manifest.json, and the assets, css, js and lib folders). Click **Commit changes**.
   - GitHub's website refuses single files over 25 MB. If your book is bigger, use GitHub Desktop (free) instead.
4. Go to **Settings > Pages**. Under "Branch" choose **main** and **/(root)**, then **Save**.
5. After about 2 minutes, your link appears: `https://YOUR-NAME.github.io/ember-reader/`

Note: a public repository means anyone with the link can download the PDF.

## 4. Put it on your phone
- **Android (Chrome):** open the link, tap the menu (three dots), then **Add to Home Screen** / **Install app**.
- **iPhone (Safari):** open the link, tap the Share button, then **Add to Home Screen**.

Open it once with internet so it can save itself, and after that it works offline.

## 5. Customise
- `js/config.js`: change the title, or turn the opening animation off.
- `assets/rider.svg`: replace this one file with your own picture (same name) to change the rider.
- After changing files, open `sw.js` and change `ember-v1` to `ember-v2` so phones pick up the update.

## Using the app
- Swipe left / right, or tap the left / right side of the page, to turn pages.
- Drag the glowing slider on the right, or drag along the road at the bottom, to jump to any page.
- Light bulb button = reading mode (warm yellow light). Moon / sun button = night or sun mode.
- Zoom buttons enlarge the page; scroll to move around.
- Tap "Page 3 / 120" to type a page number.

Uses PDF.js (Apache 2.0 licence) from Mozilla, included in the lib folder.
