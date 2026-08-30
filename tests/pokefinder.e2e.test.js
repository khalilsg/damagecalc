/**
 * tests/pokefinder.e2e.test.js
 *
 * Drives the real PokéFinder page in a browser, with the three remote data
 * files it fetches (PS Pokédex, PS learnsets, Champions learnsets) served from
 * tests/fixtures/pokefinderData.js. Nothing here touches the network.
 *
 * What it covers: the Champions/all-Pokémon scope switch, which species the
 * full dex contributes (and which formes are dropped), the legality column, the
 * legality-dependent movepool split, the row cap, the fully-evolved and mega
 * filters, row links, and toggle persistence.
 *
 * Run with:  npm run test:e2e
 *
 * Needs Playwright and a Chromium build:
 *   npm install && npx playwright install chromium
 * Without either, every test below is skipped rather than failed — `npm test`
 * stays green on a machine with no browsers.
 */

import { describe, test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import {
  pokedexJs, learnsetsJs, championsLearnsetsTs,
  CHAMPIONS_MODE_NAMES, CHAMPIONS_LEGAL_IN_ALL_MODE, EXCLUDED_FROM_ALL, INCLUDED_IN_ALL,
  NFE_NAMES, MEGA_NAMES, FILLER_TOTAL,
} from './fixtures/pokefinderData.js';

// ── Browser and dev server ────────────────────────────────────────────────────

// A Chromium that Playwright didn't install itself (a preinstalled one in
// PLAYWRIGHT_BROWSERS_PATH, whose build number won't match this Playwright's).
function installedChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !fs.existsSync(root)) return null;
  const candidates = fs.readdirSync(root)
    .filter(d => d.startsWith('chromium-'))
    .sort()
    .reverse()
    .map(d => path.join(root, d, 'chrome-linux', 'chrome'));
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

async function launchChromium(chromium) {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (explicit) return chromium.launch({ executablePath: explicit });
  try {
    return await chromium.launch();
  } catch (err) {
    const fallback = installedChromium();
    if (!fallback) throw err;
    return chromium.launch({ executablePath: fallback });
  }
}

let chromium = null, browser = null, server = null, baseUrl = '', skip = false;

try {
  ({ chromium } = await import('playwright'));
} catch {
  skip = 'playwright is not installed — run `npm install`';
}

if (chromium) {
  try {
    browser = await launchChromium(chromium);
  } catch (err) {
    skip = `no Chromium available (${err.message.split('\n')[0]}) — run \`npx playwright install chromium\``;
  }
}

if (browser) {
  server = await createServer({ server: { port: 0 }, logLevel: 'silent' });
  await server.listen();
  baseUrl = server.resolvedUrls.local[0];
}

// ── Page driver ───────────────────────────────────────────────────────────────

const NAME_SEL  = '#ml-tbody .ml-td-name';
const READY_BTN = () => document.getElementById('find-btn').textContent === 'FIND POKÉMON';

async function openFinder() {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  // Record what a row click would open instead of spawning a tab.
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = url => { window.__opened.push(url); return null; };
  });

  const stub = (glob, body, contentType) =>
    page.route(glob, r => r.fulfill({ status: 200, contentType, body }));
  await stub('**/play.pokemonshowdown.com/data/pokedex.js', pokedexJs, 'application/javascript');
  await stub('**/play.pokemonshowdown.com/data/learnsets.js', learnsetsJs, 'application/javascript');
  await stub('**/champions/learnsets.ts', championsLearnsetsTs, 'text/plain');

  await page.goto(`${baseUrl}moveset.html`);

  const settle = () => page.waitForFunction(READY_BTN);

  const ui = {
    page,
    consoleErrors,
    close: () => context.close(),

    /** Every Pokémon name currently in the table. */
    names: () => page.$$eval(NAME_SEL, els => els.map(e => e.textContent)),
    rowCount: () => page.$$eval('#ml-tbody tr', els => els.length),
    countText: () => page.textContent('#ml-count'),
    /** ✓ / — badges, row-aligned with names(). */
    badges: () => page.$$eval('#ml-tbody .ml-td-champ span', els => els.map(e => e.textContent)),
    champColumnVisible: () => page.$eval('#ml-th-champ', th => getComputedStyle(th).display !== 'none'),

    listAll:  async () => { await page.click('#list-all-btn'); await settle(); },
    find:     async () => { await page.click('#find-btn'); await settle(); },
    toggle:   async (id, on) => { await page.setChecked(`#${id}`, on); await settle(); },

    async addChip(inputId, value) {
      await page.fill(`#${inputId}`, value);
      await page.press(`#${inputId}`, 'Enter');
    },
    clearChips: async () => {
      for (const btn of await page.$$('.ml-chip-remove')) await btn.click();
    },

    /** Click a row by Pokémon name; returns the URL it tried to open. */
    async openRow(name) {
      await page.click(`xpath=//td[contains(@class,"ml-td-name")][text()=${JSON.stringify(name)}]`);
      const opened = await page.evaluate(() => window.__opened);
      return opened.at(-1);
    },

    waitForName:   name => page.waitForFunction(
      n => [...document.querySelectorAll('#ml-tbody .ml-td-name')].some(e => e.textContent === n), name),
    waitForNoName: name => page.waitForFunction(
      n => ![...document.querySelectorAll('#ml-tbody .ml-td-name')].some(e => e.textContent === n), name),
  };

  return ui;
}

/** Names minus the padding species, which exist only to overflow the row cap. */
const real = names => names.filter(n => !n.startsWith('Fillermon'));

// ── Tests ─────────────────────────────────────────────────────────────────────

after(async () => { await browser?.close(); await server?.close(); });

describe('PokéFinder — Champions mode', { skip }, () => {
  test('lists the Champions roster, without the legality column', async () => {
    const ui = await openFinder();
    await ui.listAll();

    assert.deepEqual((await ui.names()).sort(), [...CHAMPIONS_MODE_NAMES].sort());
    assert.equal(await ui.countText(), `${CHAMPIONS_MODE_NAMES.length} Pokémon`);
    assert.equal(await ui.champColumnVisible(), false);
    assert.equal((await ui.badges()).length, 0, 'no legality badges without the column');
    await ui.close();
  });

  test('renders every row — the row cap is an all-Pokémon-mode concern', async () => {
    const ui = await openFinder();
    await ui.listAll();

    assert.equal(await ui.rowCount(), CHAMPIONS_MODE_NAMES.length);
    assert.equal(await ui.page.$('.ml-more'), null);
    await ui.close();
  });

  test('keeps unevolved Pokémon — the curated roster is not filtered', async () => {
    const ui = await openFinder();
    await ui.listAll();

    assert.ok((await ui.names()).includes('Porygon2'));
    assert.equal(await ui.page.isVisible('#fe-only-wrap'), false);
    await ui.close();
  });

  test('matches moves against the Champions movepool, not the base learnsets', async () => {
    const ui = await openFinder();

    // Ho-Oh learns Brave Bird in the base learnsets but not in Champions.
    await ui.addChip('move-input', 'Brave Bird');
    await ui.find();
    assert.deepEqual(await ui.names(), []);

    await ui.clearChips();
    await ui.addChip('move-input', 'Sacred Fire');
    await ui.find();
    assert.deepEqual(await ui.names(), ['Ho-Oh']);
    await ui.close();
  });

  test('links a row to the Serebii Champions dex', async () => {
    const ui = await openFinder();
    await ui.listAll();

    assert.match(await ui.openRow('Venusaur'), /^https:\/\/www\.serebii\.net\/pokedex-champions\/venusaur\//);
    await ui.close();
  });
});

describe('PokéFinder — all-Pokémon mode', { skip }, () => {
  test('adds the rest of the dex and reports the Champions subset', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();

    const names = await ui.names();
    assert.equal(await ui.champColumnVisible(), true);

    const expectedTotal = INCLUDED_IN_ALL.length + FILLER_TOTAL;
    assert.equal(await ui.countText(),
      `${expectedTotal} Pokémon · ${CHAMPIONS_LEGAL_IN_ALL_MODE.length} in Champions`);

    await ui.page.click('.ml-more button');
    assert.deepEqual(real(await ui.names()).sort(), [...INCLUDED_IN_ALL].sort());
    assert.ok(names.length < expectedTotal, 'first render is capped');
    await ui.close();
  });

  test('drops CAP, cosmetic, Gmax, Totem, Tera and Let\'s Go formes', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();
    await ui.page.click('.ml-more button');

    const names = await ui.names();
    for (const dropped of EXCLUDED_FROM_ALL) assert.ok(!names.includes(dropped), `${dropped} should be dropped`);
    // The base species of each dropped forme is still there.
    for (const kept of ['Vivillon', 'Toxtricity', 'Raticate', 'Ogerpon']) assert.ok(names.includes(kept));
    await ui.close();
  });

  test('keeps formes that differ from their base species in stats, types or ability', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();
    await ui.page.click('.ml-more button');

    const names = await ui.names();
    assert.ok(names.includes('Toxtricity-Low-Key'), 'differs only in ability');
    assert.ok(names.includes('Raticate-Alola'), 'differs in types');
    assert.ok(names.includes('Aegislash-Blade'), 'differs in stats');
    await ui.close();
  });

  test('marks legality per row, inheriting it through formes', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();
    await ui.page.click('.ml-more button');

    const [names, badges] = await Promise.all([ui.names(), ui.badges()]);
    const legality = Object.fromEntries(names.map((name, i) => [name, badges[i]]));

    const marked = names.filter(n => legality[n] === '✓');
    assert.deepEqual(marked.sort(), [...CHAMPIONS_LEGAL_IN_ALL_MODE].sort());
    for (const notLegal of ['Zeraora', 'Entei', 'Groudon', 'Toxtricity']) {
      assert.equal(legality[notLegal], '—', `${notLegal} is not in Champions`);
    }
    await ui.close();
  });

  test('caps rendering, then shows everything on request', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();

    const total = INCLUDED_IN_ALL.length + FILLER_TOTAL;
    assert.equal(await ui.rowCount(), 251, '250 rows plus the "show all" row');
    assert.match(await ui.page.textContent('.ml-more'), new RegExp(`Show all ${total}`));

    await ui.page.click('.ml-more button');
    assert.equal(await ui.rowCount(), total);
    await ui.close();
  });

  test('hides unevolved Pokémon by default, and Megas on request', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.listAll();
    await ui.page.click('.ml-more button');

    for (const nfe of NFE_NAMES) assert.ok(!(await ui.names()).includes(nfe), `${nfe} hidden`);

    await ui.toggle('fe-only', false);
    await ui.waitForName('Pikachu');
    await ui.page.click('.ml-more button');
    for (const nfe of NFE_NAMES) assert.ok((await ui.names()).includes(nfe), `${nfe} shown`);

    await ui.toggle('hide-megas', true);
    await ui.waitForNoName('Venusaur-Mega');
    await ui.page.click('.ml-more button');
    const names = await ui.names();
    for (const mega of MEGA_NAMES) assert.ok(!names.includes(mega), `${mega} hidden (Primal counts as a Mega)`);
    await ui.close();
  });

  test('finds Pokémon with no Gen 9 movepool at all', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);

    // Geomancy and Plasma Fists exist only in pre-Gen-9 learnsets.
    await ui.addChip('move-input', 'Geomancy');
    await ui.find();
    assert.deepEqual(await ui.names(), ['Xerneas']);

    await ui.clearChips();
    await ui.addChip('move-input', 'Plasma Fists');
    await ui.find();
    assert.deepEqual(await ui.names(), ['Zeraora']);
    await ui.close();
  });

  test('applies each movepool source in one search', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);

    // Ho-Oh matches through the Champions movepool, Entei through the base one.
    await ui.addChip('move-input', 'Sacred Fire');
    await ui.find();
    assert.deepEqual((await ui.names()).sort(), ['Entei', 'Ho-Oh']);
    assert.deepEqual(await ui.badges(), ['✓', '—']);

    // Brave Bird stays unmatched for Ho-Oh: legal Pokémon never fall back to
    // the base learnsets.
    await ui.clearChips();
    await ui.addChip('move-input', 'Brave Bird');
    await ui.find();
    assert.deepEqual(await ui.names(), []);
    await ui.close();
  });

  test('combines move, type and ability filters', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);

    await ui.addChip('move-input', 'Roost');
    await ui.addChip('type-input', 'Flying');
    await ui.find();
    assert.deepEqual((await ui.names()).sort(), ['Charizard', 'Ho-Oh']);

    await ui.addChip('ability-input', 'Regenerator');
    await ui.find();
    assert.deepEqual(await ui.names(), ['Ho-Oh']);
    await ui.close();
  });

  test('links non-Champions rows to the Showdown dex', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.addChip('move-input', 'Sacred Fire');
    await ui.find();

    assert.match(await ui.openRow('Ho-Oh'), /serebii\.net/);
    assert.equal(await ui.openRow('Entei'), 'https://dex.pokemonshowdown.com/pokemon/entei');
    await ui.close();
  });

  test('remembers the toggles, and logs no console errors along the way', async () => {
    const ui = await openFinder();
    await ui.toggle('include-all', true);
    await ui.toggle('fe-only', false);
    await ui.listAll();

    await ui.page.reload();
    await ui.page.waitForSelector('#include-all');
    assert.equal(await ui.page.isChecked('#include-all'), true);
    assert.equal(await ui.page.isChecked('#fe-only'), false);
    assert.equal(await ui.page.isVisible('#fe-only-wrap'), true);

    assert.deepEqual(ui.consoleErrors, []);
    await ui.close();
  });
});
