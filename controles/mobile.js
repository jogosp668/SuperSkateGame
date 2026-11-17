// ============================================================================
// controles/mobile.js — tela "PC ou Mobile" + analógicos de toque
// Os analógicos só disparam as MESMAS teclas do PC (W A S D, setas e Shift esquerdo),
// então o jogo não precisa saber de nada: as manobras funcionam igual.
//   Analógico esquerdo (andar): cima = remar (W) | baixo = frear (S) | lados = virar (A/D) | até a borda = sprint (Shift)
//   Analógico direito (manobras): arraste como se fossem as setas
//      ↓ ↑ = ollie | ↓ ↑ → = flip | ↓ ↑ ← = heelflip | ↓ → = varial | ↓ ← = shove-it | segurar ↑ depois do ollie = bonked
// ============================================================================
(function () {
  'use strict';
  const T = {
    limEsq: 0.30,      // quanto o analógico esquerdo precisa mexer pra contar como direção (0..1)
    sprint: 0.93,      // a partir daqui (borda) vira sprint
    dirEntra: 0.50,    // analógico direito: quanto precisa arrastar pra contar uma direção
    dirSai: 0.32,      // ...e quanto precisa voltar pra "soltar" a direção (histerese)
    histerese: 1.3     // pra trocar de eixo (ex.: baixo -> direita) o novo eixo precisa passar o atual em 30%
  };

  // ---------- lógica pura (dá pra testar sem tela) ----------
  const horizontal = d => d === 'ArrowLeft' || d === 'ArrowRight';
  function teclasEsquerda(dx, dy, mag) { // analógico esquerdo -> conjunto de teclas
    const s = new Set();
    if (dy < -T.limEsq) s.add('w'); if (dy > T.limEsq) s.add('s'); if (dx < -T.limEsq) s.add('a'); if (dx > T.limEsq) s.add('d');
    if (dy < -T.limEsq && mag > T.sprint) s.add('Shift');
    return s;
  }
  function criarDirecao() { // analógico direito -> uma direção (ou null), com histerese
    let atual = null;
    return function (dx, dy, mag) {
      const ax = Math.abs(dx), ay = Math.abs(dy), nova = ax > ay ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      if (atual) {
        if (mag < T.dirSai) atual = null;
        else if (nova !== atual) {
          const dom = horizontal(atual) ? ax : ay, outro = horizontal(atual) ? ay : ax;
          if (horizontal(nova) === horizontal(atual) || outro > dom * T.histerese) atual = nova; // virou pro lado oposto, ou o outro eixo passou
        }
      } else if (mag >= T.dirEntra) atual = nova;
      return atual;
    };
  }
  function eventos(antes, depois) { // diferença entre dois conjuntos de teclas: soltas primeiro, apertadas depois
    const ev = [];
    for (const k of antes) if (!depois.has(k)) ev.push(['keyup', k]);
    for (const k of depois) if (!antes.has(k)) ev.push(['keydown', k]);
    return ev;
  }
  window.SKATE_MOBILE = { T, teclasEsquerda, criarDirecao, eventos };

  // ---------- teclas virtuais ----------
  const codigo = k => k === 'Shift' ? 'ShiftLeft' : /^Arrow/.test(k) ? k : 'Key' + k.toUpperCase();
  function disparar(tipo, k) { window.dispatchEvent(new KeyboardEvent(tipo, { key: k, code: codigo(k), bubbles: true, cancelable: true })); }
  const estados = [];
  function aplicar(estado, novo) { for (const [tipo, k] of eventos(estado, novo)) disparar(tipo, k); estado.clear(); novo.forEach(k => estado.add(k)); }
  const liberarTudo = () => estados.forEach(e => aplicar(e, new Set()));

  // ---------- visual ----------
  const css = `
#mb-menu{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(15,16,20,.86);font-family:system-ui,sans-serif;color:#fff;padding:16px;overflow:auto}
.mb-card{width:min(760px,100%);text-align:center}
.mb-card h1{margin:0 0 4px;font-size:clamp(30px,6vw,52px);letter-spacing:6px}
.mb-card p{margin:0 0 18px;opacity:.8}
.mb-opcoes{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
.mb-op{flex:1 1 300px;background:#1f2229;border:2px solid #3a3f4b;border-radius:14px;padding:18px;color:#fff;font:inherit;cursor:pointer;text-align:left}
.mb-op b{display:block;font-size:22px;margin-bottom:8px}
.mb-op small{display:block;opacity:.78;line-height:1.5;font-size:13px}
.mb-op:hover,.mb-op.rec{border-color:#ffd23f}
.mb-op.rec b::after{content:' · recomendado';font-size:12px;color:#ffd23f;font-weight:600}
.mb-stick{position:fixed;z-index:50;bottom:calc(env(safe-area-inset-bottom,0px) + 5vmin);width:var(--mb-tam);height:var(--mb-tam);touch-action:none;user-select:none;-webkit-user-select:none}
.mb-stick::before{content:'';position:absolute;inset:-25%}
.mb-esq{left:calc(env(safe-area-inset-left,0px) + 5vmin)} .mb-dir{right:calc(env(safe-area-inset-right,0px) + 5vmin)}
:root{--mb-tam:clamp(120px,36vmin,200px)}
.mb-base{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.6);background:rgba(20,22,28,.35)}
.mb-thumb{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.28)}
.mb-thumb.sprint{background:rgba(255,140,0,.75);border-color:#ffb84d}
.mb-seta{position:absolute;color:#fff;opacity:.3;font-size:calc(var(--mb-tam)*.13);line-height:1;pointer-events:none}
.mb-seta.on{opacity:1;color:#ffd23f}
.mb-rotulo{position:absolute;left:0;right:0;top:-24px;text-align:center;color:#fff;font:600 12px system-ui;letter-spacing:2px;text-shadow:0 1px 3px #000;pointer-events:none}
body.mobile #info{display:none} body.mobile #manobras{bottom:auto;top:60px;right:16px}
#mb-gire{display:none;position:fixed;inset:0;z-index:900;background:rgba(15,16,20,.92);color:#fff;font:600 20px system-ui;text-align:center;align-items:center;justify-content:center;padding:24px}
@media (orientation:portrait){body.mobile #mb-gire{display:flex}}`;

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };

  function criarStick(lado, rotulo, setas, aoMover) {
    const raiz = el('div', 'mb-stick ' + lado), base = el('div', 'mb-base'), thumb = el('div', 'mb-thumb'), setaEls = {};
    for (const [nome, simbolo, estilo] of setas) { const s = el('div', 'mb-seta', simbolo); s.style.cssText = estilo; base.appendChild(s); setaEls[nome] = s; }
    base.appendChild(thumb); raiz.appendChild(el('div', 'mb-rotulo', rotulo)); raiz.appendChild(base);
    let id = null, cx = 0, cy = 0, R = 1;
    const mover = e => {
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const mag = Math.hypot(dx, dy);
      if (mag > 1) { dx /= mag; dy /= mag; }
      const alc = base.offsetWidth * .29; thumb.style.transform = 'translate(' + dx * alc + 'px,' + dy * alc + 'px)';
      aoMover(dx, dy, Math.min(1, mag), thumb, setaEls);
    };
    raiz.addEventListener('pointerdown', e => { if (id !== null) return; id = e.pointerId; try { raiz.setPointerCapture(id); } catch (x) {} const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2; mover(e); e.preventDefault(); });
    raiz.addEventListener('pointermove', e => { if (e.pointerId === id) { mover(e); e.preventDefault(); } });
    const fim = e => { if (e.pointerId !== id) return; id = null; thumb.style.transform = ''; aoMover(0, 0, 0, thumb, setaEls); };
    raiz.addEventListener('pointerup', fim); raiz.addEventListener('pointercancel', fim); raiz.addEventListener('lostpointercapture', fim);
    return raiz;
  }

  function ativarMobile() {
    const vp = document.querySelector('meta[name=viewport]'); if (vp) vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.documentElement.style.cssText += ';touch-action:none;overscroll-behavior:none'; document.body.style.cssText += ';touch-action:none;overscroll-behavior:none';
    try { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || function () {}).call(d); } catch (x) {}
    try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (x) {}

    const gire = el('div', null, 'Vire o celular pra horizontal'); gire.id = 'mb-gire'; document.body.appendChild(gire);
    const esq = new Set(), dir = new Set(), direcao = criarDirecao(); estados.push(esq, dir);
    document.body.appendChild(criarStick('mb-esq', 'ANDAR', [['w', '▲', 'left:50%;top:6%;transform:translateX(-50%)'], ['s', '▼', 'left:50%;bottom:6%;transform:translateX(-50%)'], ['a', '◀', 'left:6%;top:50%;transform:translateY(-50%)'], ['d', '▶', 'right:6%;top:50%;transform:translateY(-50%)']],
      (dx, dy, mag, thumb, setas) => { const t = teclasEsquerda(dx, dy, mag); aplicar(esq, t); thumb.classList.toggle('sprint', t.has('Shift')); for (const k in setas) setas[k].classList.toggle('on', t.has(k)); }));
    document.body.appendChild(criarStick('mb-dir', 'MANOBRAS', [['ArrowUp', '▲', 'left:50%;top:6%;transform:translateX(-50%)'], ['ArrowDown', '▼', 'left:50%;bottom:6%;transform:translateX(-50%)'], ['ArrowLeft', '◀', 'left:6%;top:50%;transform:translateY(-50%)'], ['ArrowRight', '▶', 'right:6%;top:50%;transform:translateY(-50%)']],
      (dx, dy, mag, thumb, setas) => { const d = direcao(dx, dy, mag); aplicar(dir, d ? new Set([d]) : new Set()); for (const k in setas) setas[k].classList.toggle('on', k === d); }));
    window.addEventListener('blur', liberarTudo); document.addEventListener('visibilitychange', () => { if (document.hidden) liberarTudo(); });
  }

  function iniciar() {
    const st = el('style'); st.textContent = css; document.head.appendChild(st);
    const toque = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const menu = el('div'); menu.id = 'mb-menu';
    const card = el('div', 'mb-card'); card.appendChild(el('h1', null, 'SKATE')); card.appendChild(el('p', null, 'Como você vai jogar?'));
    const ops = el('div', 'mb-opcoes');
    const op = (modo, titulo, linhas, rec) => { const b = el('button', 'mb-op' + (rec ? ' rec' : '')); b.appendChild(el('b', null, titulo)); for (const l of linhas) b.appendChild(el('small', null, l)); b.onclick = () => escolher(modo); return b; };
    ops.appendChild(op('pc', '💻 PC', ['Teclado e mouse', 'W A S D: andar · Shift esquerdo: sprint', '↓↑ ollie · ↓↑→ flip · ↓↑← heelflip · ↓→ varial · ↓← shove-it', 'Segurar ↑ depois do ollie: bonked · botão direito do mouse: câmera'], !toque));
    ops.appendChild(op('mobile', '📱 Mobile', ['Toque na tela, com 2 analógicos', 'Esquerdo: andar (na borda = sprint)', 'Direito: arraste ↓↑ ollie · ↓↑→ flip · ↓↑← heelflip', '↓→ varial · ↓← shove-it · segure ↑ depois do ollie: bonked'], toque));
    card.appendChild(ops); menu.appendChild(card); document.body.appendChild(menu);
    function escolher(modo) { window.MODO_JOGO = modo; document.body.classList.add(modo); menu.remove(); if (modo === 'mobile') ativarMobile(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
