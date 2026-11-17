// ============================================================================
// controles/skatepedia.js — botão "Skatepédia" (meio da tela, lado esquerdo) com o tutorial de todas as manobras
// Mostra o comando de PC e o de Mobile; destaca o do modo escolhido (window.MODO_JOGO, definido por mobile.js).
// Enquanto está aberta: as teclas não chegam no jogo (nada dispara sem querer) e window.JOGO_PAUSADO fica true.
// ============================================================================
(function () {
  'use strict';

  // ---------- CONTEÚDO (edite à vontade). pts = pontos de cada manobra (mantenha igual ao MANOBRAS do index.html) ----------
  const MANOBRAS = [
    { nome: 'Ollie',        pts: 10, pc: ['⬇', '⬆'],       pcExtra: '',                    mobile: 'Arraste pra baixo e depois pra cima.',                          dica: 'A base de tudo: o pulo.' },
    { nome: 'Bonned Ollie', pts: 10, pc: ['⬇', '⬆'],       pcExtra: '(ficar segurado)',    mobile: 'Arraste pra baixo e fique segurado em cima.',                   dica: 'Pulo mais alto e mais longo: o skate é chutado pra frente.' },
    { nome: 'Varial',       pts: 15, pc: ['⬇', '➡'],       pcExtra: '',                    mobile: 'Arraste pra baixo e depois pra direita.',                       dica: 'O shape gira 180° pra frente.' },
    { nome: 'Shove it',     pts: 15, pc: ['⬇', '⬅'],       pcExtra: '',                    mobile: 'Arraste pra baixo e depois pra esquerda.',                      dica: 'O shape gira 180° pra trás.' },
    { nome: 'Flip',         pts: 20, pc: ['⬇', '⬆', '➡'], pcExtra: '',                    mobile: 'Arraste pra baixo, pra cima e depois pra direita.',             dica: 'Faça o ➡ logo depois do ollie, ainda na subida do pulo.' },
    { nome: 'Heelflip',     pts: 20, pc: ['⬇', '⬆', '⬅'], pcExtra: '',                    mobile: 'Arraste pra baixo, pra cima e depois pra esquerda.',            dica: 'Igual ao flip, só que gira pro outro lado.' }
  ];
  const MOVIMENTO = {
    nome: 'Movimento',
    pc: '<span class="sp-k">W</span> remar · <span class="sp-k">S</span> frear · <span class="sp-k">A</span> <span class="sp-k">D</span> virar · <span class="sp-k">Shift</span> esquerdo + <span class="sp-k">W</span> sprint · botão direito do mouse: câmera',
    mobile: 'Analógico esquerdo: cima rema, baixo freia, lados viram. Empurre até a borda pra dar sprint.',
    dica: 'Manobras seguidas (até 3,5 s uma da outra) formam combo e somam os pontos. Faça os movimentos em sequência rápida, em menos de meio segundo.'
  };
  const SOLTAR = [['w', 'KeyW'], ['a', 'KeyA'], ['s', 'KeyS'], ['d', 'KeyD'], ['ArrowUp', 'ArrowUp'], ['ArrowDown', 'ArrowDown'], ['ArrowLeft', 'ArrowLeft'], ['ArrowRight', 'ArrowRight'], ['Shift', 'ShiftLeft']];

  const css = `
.sp-btn{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:60;display:flex;align-items:center;gap:8px;padding:12px 16px 12px calc(env(safe-area-inset-left,0px) + 12px);background:#ffd23f;color:#111;border:0;border-radius:0 14px 14px 0;font:700 15px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);touch-action:manipulation}
.sp-btn:hover{background:#ffe27a}
body.mobile .sp-btn{font-size:14px;padding-top:10px;padding-bottom:10px}
#sp-fundo{position:fixed;inset:0;z-index:950;display:none;place-items:center;background:rgba(10,11,14,.78);font-family:system-ui,sans-serif;color:#fff;padding:12px}
#sp-fundo.aberto{display:grid}
.sp-caixa{width:min(980px,100%);max-height:calc(100vh - 24px);display:flex;flex-direction:column;background:#171a20;border:2px solid #3a3f4b;border-radius:16px;overflow:hidden}
.sp-topo{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #2c313b}
.sp-topo h2{margin:0;font-size:clamp(20px,3.4vw,28px)}
.sp-x{background:#2c313b;color:#fff;border:0;border-radius:10px;width:44px;height:44px;font-size:22px;cursor:pointer}
.sp-corpo{overflow:auto;padding:14px 18px 18px;-webkit-overflow-scrolling:touch}
.sp-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.sp-card{background:#1f2229;border:1px solid #2f343e;border-radius:12px;padding:12px 14px}
.sp-card h3{margin:0 0 8px;font-size:18px;display:flex;justify-content:space-between;gap:8px}
.sp-pts{font-size:12px;color:#ffd23f;font-weight:600;white-space:nowrap;align-self:center}
.sp-linha{margin:6px 0;font-size:14px;line-height:1.7}
.sp-rot{display:inline-block;min-width:64px;font-size:11px;letter-spacing:1px;opacity:.75;font-weight:700}
.sp-k{display:inline-block;min-width:26px;text-align:center;padding:1px 6px;margin:0 1px;background:#2c313b;border:1px solid #4a5160;border-bottom-width:3px;border-radius:6px;font-weight:700}
.sp-mais{opacity:.7;margin:0 2px}
.sp-dica{margin-top:8px;font-size:12px;opacity:.7;line-height:1.45}
.sp-sec{margin:18px 0 8px;font-size:13px;letter-spacing:2px;opacity:.8}
.sp-modo-pc .sp-l-mobile,.sp-modo-mobile .sp-l-pc{opacity:.5}
.sp-modo-pc .sp-l-pc,.sp-modo-mobile .sp-l-mobile{color:#ffd23f}`;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const teclas = ks => ks.map(k => '<span class="sp-k">' + k + '</span>').join('<span class="sp-mais">+</span>');

  function card(m, movimento) {
    const c = el('div', 'sp-card');
    c.appendChild(el('h3', null, '<span>' + m.nome + '</span>' + (m.pts ? '<span class="sp-pts">' + m.pts + ' pontos</span>' : '')));
    c.appendChild(el('div', 'sp-linha sp-l-pc', '<span class="sp-rot">💻 PC</span> ' + (movimento ? m.pc : teclas(m.pc) + (m.pcExtra ? ' ' + m.pcExtra : ''))));
    c.appendChild(el('div', 'sp-linha sp-l-mobile', '<span class="sp-rot">📱 MOBILE</span> ' + m.mobile));
    if (m.dica) c.appendChild(el('div', 'sp-dica', m.dica));
    return c;
  }

  let aberto = false, fundo = null, caixa = null;
  function soltarTeclas() { for (const [k, code] of SOLTAR) window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code, bubbles: true })); }
  function abrir() {
    if (aberto) return;
    soltarTeclas();                                   // solta tudo que estiver apertado, antes de bloquear as teclas
    aberto = true; window.JOGO_PAUSADO = true;
    caixa.classList.remove('sp-modo-pc', 'sp-modo-mobile'); if (window.MODO_JOGO === 'pc' || window.MODO_JOGO === 'mobile') caixa.classList.add('sp-modo-' + window.MODO_JOGO);
    fundo.classList.add('aberto');
  }
  function fechar() { if (!aberto) return; aberto = false; window.JOGO_PAUSADO = false; fundo.classList.remove('aberto'); }
  function bloquear(e) { // com a Skatepédia aberta, as teclas não chegam no jogo (Esc fecha)
    if (!aberto) return;
    if (e.type === 'keydown' && e.key === 'Escape') fechar();
    e.stopImmediatePropagation(); e.preventDefault();
  }

  function iniciar() {
    const st = el('style'); st.textContent = css; document.head.appendChild(st);
    const btn = el('button', 'sp-btn', '🛹 Skatepédia'); btn.type = 'button'; btn.addEventListener('click', abrir); document.body.appendChild(btn);

    fundo = el('div'); fundo.id = 'sp-fundo'; caixa = el('div', 'sp-caixa');
    const topo = el('div', 'sp-topo', '<h2>Skatepédia 🛹</h2>'), x = el('button', 'sp-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.addEventListener('click', fechar); topo.appendChild(x);
    const corpo = el('div', 'sp-corpo'), grade = el('div', 'sp-grade');
    for (const m of MANOBRAS) grade.appendChild(card(m, false));
    corpo.appendChild(el('div', 'sp-sec', 'MANOBRAS')); corpo.appendChild(grade);
    corpo.appendChild(el('div', 'sp-sec', 'COMO SE MOVER')); const g2 = el('div', 'sp-grade'); g2.appendChild(card(MOVIMENTO, true)); corpo.appendChild(g2);
    caixa.appendChild(topo); caixa.appendChild(corpo); fundo.appendChild(caixa); document.body.appendChild(fundo);
    fundo.addEventListener('click', e => { if (e.target === fundo) fechar(); });
    window.addEventListener('keydown', bloquear, true); window.addEventListener('keyup', bloquear, true); // captura: roda antes do jogo
  }

  window.SKATEPEDIA = { abrir, fechar, MANOBRAS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
