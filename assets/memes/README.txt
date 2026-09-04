Drop your meme images in this folder.

Works with: .jpg  .png  .gif  .webp  .avif
Does not work: .heic (iPhone's format - browsers can't show it, convert to JPG)

Then run this from the project folder:

    node tools/refresh-memes.mjs

That renames anything awkward, rebuilds the list in memes.js, and tells you if
a file is too big. Commit and push afterwards and both phones get the new ones.

One meme shows per day, picked from the date, so you and he see the same one.
It cycles through everything in here before repeating.
