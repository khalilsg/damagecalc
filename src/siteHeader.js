import { VERSION } from './version.js';

const NAV_HEIGHT = 40;

const PAGES = [
  { label: 'K Calc',        href: '/damagecalc/' },
  { label: 'Team Builder',  href: '/damagecalc/teambuilder.html' },
  { label: 'Compare',       href: '/damagecalc/compare.html' },
  { label: 'Move Lookup',   href: '/damagecalc/moveset.html' },
  { label: 'Match History', href: '/damagecalc/history.html' },
  { label: 'PokéBench',     href: '/damagecalc/pokebench/' },
];

const style = document.createElement('style');
style.textContent = `
  #site-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: ${NAV_HEIGHT}px;
    z-index: 999;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 2px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06);
  }
  .site-nav-link {
    color: rgba(255,255,255,0.5);
    text-decoration: none;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    padding: 4px 9px;
    border-radius: 4px;
    white-space: nowrap;
    transition: color 0.12s;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  .site-nav-link:hover { color: rgba(255,255,255,0.85); }
  .site-nav-link.site-nav-active {
    color: #fff;
    background: rgba(255,255,255,0.1);
  }
  .site-nav-spacer { flex: 1; }
  .site-nav-version {
    font-size: 0.6rem;
    font-weight: 600;
    color: rgba(255,255,255,0.22);
    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
    letter-spacing: 0.3px;
    user-select: none;
  }
  body { padding-top: ${NAV_HEIGHT + 24}px !important; }
`;
document.head.append(style);

const path = window.location.pathname.replace(/\/+$/, '');

const nav = document.createElement('nav');
nav.id = 'site-nav';
nav.setAttribute('aria-label', 'Site navigation');

for (const page of PAGES) {
  const href = page.href.replace(/\/+$/, '');
  const isActive = path === href || path === href + '/index.html';
  const a = document.createElement('a');
  a.href = page.href;
  a.className = 'site-nav-link' + (isActive ? ' site-nav-active' : '');
  a.textContent = page.label;
  nav.append(a);
}

const spacer = document.createElement('span');
spacer.className = 'site-nav-spacer';
nav.append(spacer);

const ver = document.createElement('span');
ver.className = 'site-nav-version';
ver.textContent = VERSION;
nav.append(ver);

document.body.prepend(nav);
