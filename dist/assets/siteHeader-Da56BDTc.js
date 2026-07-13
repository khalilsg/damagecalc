var e=`v2.2.0`,t=40,n=[{label:`Hub`,href:`/damagecalc/hub.html`},{label:`K Calc`,href:`/damagecalc/`},{label:`Team Builder`,href:`/damagecalc/teambuilder.html`},{label:`Compare`,href:`/damagecalc/compare.html`},{label:`PokéFinder`,href:`/damagecalc/moveset.html`},{label:`OHKO Calc`,href:`/damagecalc/ohko.html`},{label:`Match History`,href:`/damagecalc/history.html`},{label:`PokéBench`,href:`/damagecalc/pokebench/`}],r=document.createElement(`style`);r.textContent=`
  #site-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: ${t}px;
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
  body { padding-top: ${t+24}px !important; }
`,document.head.append(r);var i=window.location.pathname.replace(/\/+$/,``),a=document.createElement(`nav`);a.id=`site-nav`,a.setAttribute(`aria-label`,`Site navigation`);for(let e of n){let t=e.href.replace(/\/+$/,``),n=i===t||i===t+`/index.html`,r=document.createElement(`a`);r.href=e.href,r.className=`site-nav-link`+(n?` site-nav-active`:``),r.textContent=e.label,a.append(r)}var o=document.createElement(`span`);o.className=`site-nav-spacer`,a.append(o);var s=document.createElement(`span`);s.className=`site-nav-version`,s.textContent=e,a.append(s),document.body.prepend(a);