/* Rebuilds memes.js from whatever is sitting in assets/memes/.
 *
 *   node tools/refresh-memes.mjs
 *
 * Filenames are read off the disk rather than typed, so they can't drift out of
 * sync with reality. Anything with spaces or awkward characters gets renamed to
 * a safe lowercase name first, because GitHub Pages is case-sensitive and a
 * mismatch there shows up as a silently broken image on his phone.
 */

import { readdir, rename, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MEME_DIR = join(ROOT, 'assets', 'memes');
const OUT = join(ROOT, 'memes.js');

const USABLE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const BIG = 2 * 1024 * 1024;

function safeName(name) {
  const ext = extname(name).toLowerCase();
  const stem = basename(name, extname(name))
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (stem || 'meme') + (ext === '.jpeg' ? '.jpg' : ext);
}

await mkdir(MEME_DIR, { recursive: true });

const entries = await readdir(MEME_DIR, { withFileTypes: true });
const notes = [];
const taken = new Set();
const files = [];

for (const entry of entries) {
  if (!entry.isFile() || entry.name.startsWith('.')) continue;

  const ext = extname(entry.name).toLowerCase();

  if (ext === '.heic' || ext === '.heif') {
    notes.push(`skipped ${entry.name} - browsers can't display HEIC, convert it to JPG first`);
    continue;
  }

  if (!USABLE.has(ext)) {
    // the readme lives in here too, no need to mention it every run
    if (ext !== '.txt' && ext !== '.md') {
      notes.push(`skipped ${entry.name} - not an image type the web understands`);
    }
    continue;
  }

  let name = safeName(entry.name);

  // two different originals can slug down to the same thing
  if (taken.has(name)) {
    const ext2 = extname(name);
    let n = 2;
    while (taken.has(`${basename(name, ext2)}-${n}${ext2}`)) n++;
    name = `${basename(name, ext2)}-${n}${ext2}`;
  }

  if (name !== entry.name) {
    await rename(join(MEME_DIR, entry.name), join(MEME_DIR, name));
    notes.push(`renamed ${entry.name} -> ${name}`);
  }

  const info = await stat(join(MEME_DIR, name));
  if (info.size > BIG) {
    notes.push(`heads up: ${name} is ${(info.size / 1048576).toFixed(1)}MB - slow to load on mobile data`);
  }

  taken.add(name);
  files.push(name);
}

files.sort();

const body = `/* GENERATED FILE - do not edit by hand.
   Regenerate with:  node tools/refresh-memes.mjs
   It reads the real filenames out of assets/memes/, so typos are impossible. */

window.MEMES = ${JSON.stringify(files, null, 2)};
`;

await writeFile(OUT, body, 'utf8');

for (const note of notes) console.log('  ' + note);
console.log(`\n${files.length} meme${files.length === 1 ? '' : 's'} written to memes.js`);
if (!files.length) console.log('(the meme card just stays hidden until there is at least one)');
