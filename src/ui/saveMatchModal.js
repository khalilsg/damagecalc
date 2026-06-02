/**
 * src/ui/saveMatchModal.js
 * Post-match "Save Match" modal. Returns a Promise<boolean>:
 *   true  = record was saved
 *   false = user skipped
 */

import { addRecord, loadReasons } from '../matchHistory.js';

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/**
 * @param {{ myTeam: {name:string, pokemon:string[]}, theirTeam: {name:string, pokemon:string[]} }} snapshot
 */
export function openSaveMatchModal(snapshot) {
  return new Promise(resolve => {
    const reasons = loadReasons();
    let outcome = null;
    const selectedReasons = new Set();

    // ── backdrop + modal shell ──────────────────────────────────────
    const backdrop = el('div', 'sm-backdrop');
    const modal    = el('div', 'sm-modal');
    backdrop.appendChild(modal);

    // ── header ─────────────────────────────────────────────────────
    const header = el('div', 'sm-header');
    const titleWrap = el('div');
    const title = el('div', 'sm-title');
    title.textContent = 'Save Match';
    titleWrap.appendChild(title);
    const closeBtn = el('button', 'sm-close');
    closeBtn.textContent = '×';
    closeBtn.title = 'Skip';
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // ── body ────────────────────────────────────────────────────────
    const body = el('div', 'sm-body');
    modal.appendChild(body);

    // Outcome
    body.appendChild(makeLabel('Outcome'));
    const outcomeRow = el('div', 'sm-outcome-row');

    function makeOutcomeBtn(emoji, label, type) {
      const btn = el('button', `sm-outcome-btn sm-${type}`);
      const emojiSpan = el('span', 'sm-emoji');
      emojiSpan.textContent = emoji;
      btn.appendChild(emojiSpan);
      btn.appendChild(document.createTextNode(label));
      btn.addEventListener('click', () => {
        outcomeRow.querySelectorAll('.sm-outcome-btn').forEach(b => b.classList.remove('sm-selected'));
        btn.classList.add('sm-selected');
        outcome = type === 'win' ? 'W' : 'L';
        reasonSection.style.display = outcome === 'L' ? 'block' : 'none';
        saveBtn.disabled = false;
      });
      return btn;
    }
    outcomeRow.appendChild(makeOutcomeBtn('🏆', 'Win',  'win'));
    outcomeRow.appendChild(makeOutcomeBtn('💀', 'Loss', 'loss'));
    body.appendChild(outcomeRow);

    // My team
    body.appendChild(makeLabel('My Team'));
    const myTeamRow = el('div', 'sm-team-row');
    const myNameInput = el('input', 'sm-team-name-input');
    myNameInput.type = 'text';
    myNameInput.value = snapshot.myTeam.name;
    myNameInput.placeholder = 'Team name';
    myTeamRow.appendChild(myNameInput);
    if (snapshot.myTeam.pokemon.length > 0) {
      myTeamRow.appendChild(makePokemonChips(snapshot.myTeam.pokemon));
    }
    body.appendChild(myTeamRow);

    // Their team
    body.appendChild(makeLabel('Their Team'));
    const theirTeamRow = el('div', 'sm-team-row');
    const theirNameInput = el('input', 'sm-team-name-input');
    theirNameInput.type = 'text';
    theirNameInput.value = snapshot.theirTeam.name;
    theirNameInput.placeholder = 'Team name or archetype (optional)';
    theirTeamRow.appendChild(theirNameInput);
    if (snapshot.theirTeam.pokemon.length > 0) {
      theirTeamRow.appendChild(makePokemonChips(snapshot.theirTeam.pokemon));
    } else {
      const none = el('div', 'sm-no-tracker');
      none.textContent = 'No Pokémon tracked this match';
      theirTeamRow.appendChild(none);
    }
    body.appendChild(theirTeamRow);

    // Loss reasons (hidden until Loss selected)
    const reasonSection = el('div', 'sm-reason-section');
    reasonSection.style.display = 'none';
    reasonSection.appendChild(makeLabel('Why did you lose?'));
    const chipsWrap = el('div', 'sm-reasons');
    for (const r of reasons) {
      const chip = el('span', 'sm-reason-chip');
      chip.textContent = r;
      chip.addEventListener('click', () => {
        if (selectedReasons.has(r)) {
          selectedReasons.delete(r);
          chip.classList.remove('sm-selected');
        } else {
          selectedReasons.add(r);
          chip.classList.add('sm-selected');
        }
      });
      chipsWrap.appendChild(chip);
    }
    reasonSection.appendChild(chipsWrap);
    body.appendChild(reasonSection);

    // Note
    body.appendChild(makeLabel('Note (optional)'));
    const noteArea = el('textarea', 'sm-note-textarea');
    noteArea.placeholder = "Key turn, what you'd do differently…";
    body.appendChild(noteArea);

    // ── footer ──────────────────────────────────────────────────────
    const footer = el('div', 'sm-footer');
    const skipBtn = el('button', 'sm-btn-secondary');
    skipBtn.textContent = 'Skip';
    const saveBtn = el('button', 'sm-btn-primary');
    saveBtn.textContent = 'Save & Record';
    saveBtn.disabled = true;
    footer.appendChild(skipBtn);
    footer.appendChild(saveBtn);
    modal.appendChild(footer);

    // ── close / save logic ──────────────────────────────────────────
    function close(saved) {
      backdrop.classList.remove('sm-open');
      setTimeout(() => backdrop.remove(), 180);
      resolve(saved);
    }

    closeBtn.addEventListener('click', () => close(false));
    skipBtn.addEventListener('click',  () => close(false));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });

    saveBtn.addEventListener('click', () => {
      if (!outcome) return;
      addRecord({
        id:       Date.now().toString(),
        date:     new Date().toISOString().slice(0, 10),
        outcome,
        myTeam: {
          name:    myNameInput.value.trim()   || snapshot.myTeam.name,
          pokemon: snapshot.myTeam.pokemon,
        },
        theirTeam: {
          name:    theirNameInput.value.trim(),
          pokemon: snapshot.theirTeam.pokemon,
        },
        reasons: [...selectedReasons],
        note:    noteArea.value.trim(),
      });
      close(true);
    });

    // ── mount ───────────────────────────────────────────────────────
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('sm-open'));

    // Trap focus on the first input-like element
    myNameInput.focus();
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makeLabel(text) {
  const lbl = document.createElement('div');
  lbl.className = 'sm-section-label';
  lbl.textContent = text;
  return lbl;
}

function makePokemonChips(names) {
  const wrap = document.createElement('div');
  wrap.className = 'sm-poke-chips';
  for (const n of names) {
    const chip = document.createElement('span');
    chip.className = 'sm-poke-chip';
    chip.textContent = n;
    wrap.appendChild(chip);
  }
  return wrap;
}
