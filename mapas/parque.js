// ============================================================================
// mapas/parque.js  —  pista de skate baseada na imagem de referência (vista de cima)
// Tudo está em PIXELS da imagem de referência (1706 x 922). ESC converte pixel -> metros.
// O chão usa o recorte da própria imagem (mapas/parque_textura.js), então o visual é o da referência.
// Pra mexer no mapa, é só mudar os números da seção DADOS.
// ============================================================================
document.write('<script src="mapas/parque_textura.js"><\/script>'); // textura do chão (base64, funciona sem servidor)

(function () {
  'use strict';
  const ESC = 0.034;                       // metros por pixel (a pista fica com uns 55 x 23 m)

  // ---------- DADOS (pixels da imagem) ----------
  const RET = [48, 101, 1656, 783];        // área de concreto [x1, y1, x2, y2] (centro = centro do mundo)
  const BOWL = [[505,390],[517,353],[533,323],[560,297],[600,275],[640,270],[680,280],[713,293],[747,302],[773,297],[800,277],[827,250],[860,227],[900,213],[947,210],[1000,215],[1053,233],[1100,257],[1147,290],[1187,333],[1213,383],[1233,437],[1241,477],[1237,523],[1220,570],[1193,610],[1153,647],[1107,667],[1053,678],[1000,679],[947,670],[917,660],[900,650],[853,640],[800,623],[760,600],[727,577],[693,553],[660,533],[613,523],[580,513],[547,493],[523,467],[508,437]];
  const BOWL_FUNDO = 1.8, BOWL_BORDA = 4.0;                 // profundidade (m) e largura da parede do bowl (m)
  const CAIXAS = [{ r: [151, 270, 335, 465], h: 0.45 },     // caixote da coroa
                  { r: [113, 664, 880, 709], h: 0.40 }];    // borda longa de baixo (ledge). Sobe pulando
  const PLATAFORMAS = [{ p: [[1275,137],[1565,137],[1565,324],[1275,324]], h: 0.5, lado: 1.5 },        // plataforma SK8 (sobe nas bordas)
                       { p: [[306,153],[698,168],[698,196],[400,196],[306,160]], h: 0.2, lado: 0.5 }]; // base do corrimão
  const CORRIMAO = { a: [312, 155], b: [692, 170], h: 0.9, postes: [330, 440, 545, 670] };           // tubo do corrimão (bloqueia) e postes (x em px)
  const ARCO = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  const BANCO_H = 1.0;                                      // altura do banco em U (a "curva"): sobe do lado de dentro pro de fora
  const BANCO_FORA = [[1315,340],[1500,340]].concat(ARCO(1500,480,140,-90,0,10).slice(1), [[1640,595]], ARCO(1500,595,140,0,90,10).slice(1), [[1327,735]]); // borda alta (de fora)
  const BANCO_DENTRO = [[1327,617],[1474,617]].concat(ARCO(1474,511,106,90,-90,14).slice(1), [[1347,405],[1315,340]]);                              // borda baixa (de dentro + pontas)
  const LATAS = [[75,128],[1630,128],[75,758],[1630,758]];  // lixeiras nos cantos
  const INICIO = { px: [300, 570], rumo: Math.PI / 2 };     // onde o skatista começa (pixel) e pra onde olha (rad; π/2 = leste)
  // enfeites fora da pista (só visual): arbustos [x, y, raio], bancos [x1, y1, x2, y2], pedras [x, y, raio]
  const ARBUSTOS = [[45,35,75],[850,30,62],[1650,40,82],[40,850,78],[870,860,72],[1640,845,88],[1105,25,34],[1335,18,40],[395,832,28],[1138,826,28],[1295,822,18],[215,805,20],[25,370,22],[1690,520,24]];
  const BANCOS = [[431,20,553,62],[1155,20,1274,62],[412,815,533,860],[1169,815,1291,859]];
  const PEDRAS = [[330,42,10],[1470,42,12],[1440,848,11],[1245,872,8]];

  // ---------- LÓGICA (sem gráficos: dá pra testar sozinha) ----------
  const C0 = [(RET[0] + RET[2]) / 2, (RET[1] + RET[3]) / 2];
  const px2m = p => [(p[0] - C0[0]) * ESC, (p[1] - C0[1]) * ESC];
  const ease = t => t * t * (3 - 2 * t), cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const ret = r => { const a = px2m([r[0], r[1]]), b = px2m([r[2], r[3]]); return { x1: a[0], z1: a[1], x2: b[0], z2: b[1] }; };
  const caixaBB = pts => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; };

  function criarLogica() {
    const R = ret(RET), HX = (R.x2 - R.x1) / 2, HZ = (R.z2 - R.z1) / 2;
    function distSeg(x, z, ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = cl(L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0, 0, 1);
      return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
    }
    const distLinha = (p, x, z, fechada) => { let d = 1e9; const n = p.length - (fechada ? 0 : 1); for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length]; d = Math.min(d, distSeg(x, z, a[0], a[1], b[0], b[1])); } return d; };
    function dentro(p, x, z) {
      let c = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
      return c;
    }
    const forma = p => { const pm = p.map(px2m); return { p: pm, bb: caixaBB(pm) }; };
    const noBB = (f, x, z, m) => x >= f.bb[0] - m && x <= f.bb[2] + m && z >= f.bb[1] - m && z <= f.bb[3] + m;

    const bowlF = forma(BOWL);
    function bowl(x, z) { // depressão suave: borda plana, fundo a BOWL_FUNDO
      if (!noBB(bowlF, x, z, 0) || !dentro(bowlF.p, x, z)) return 0;
      return -BOWL_FUNDO * ease(Math.min(1, distLinha(bowlF.p, x, z, true) / BOWL_BORDA));
    }
    const plats = PLATAFORMAS.map(o => Object.assign(forma(o.p), { h: o.h, lado: o.lado }));
    function plat(o, x, z) { // plataforma: sobe suave pelas bordas até a altura h
      if (!noBB(o, x, z, 0) || !dentro(o.p, x, z)) return 0;
      return o.h * ease(Math.min(1, distLinha(o.p, x, z, true) / o.lado));
    }
    const fora = BANCO_FORA.map(px2m), dentroL = BANCO_DENTRO.map(px2m), bancoF = forma(BANCO_FORA.concat(BANCO_DENTRO)), linhaBaixa = [fora[fora.length - 1]].concat(dentroL, [fora[0]]);
    function banco(x, z) { // faixa inclinada em U: borda de dentro (e pontas) = 0, borda de fora = BANCO_H
      if (!noBB(bancoF, x, z, 0) || !dentro(bancoF.p, x, z)) return 0;
      const di = distLinha(linhaBaixa, x, z, false), df = distLinha(fora, x, z, false);
      return BANCO_H * ease(di / (di + df + 1e-6));
    }
    const caixas = CAIXAS.map(c => Object.assign(ret(c.r), { h: c.h }));
    const corr = { a: px2m(CORRIMAO.a), b: px2m(CORRIMAO.b), h: CORRIMAO.h }, latas = LATAS.map(px2m);

    const terreno = (x, z) => { let h = banco(x, z); for (const o of plats) h = Math.max(h, plat(o, x, z)); return h + bowl(x, z); };
    const topo = (x, z) => { let h = 0; for (const c of caixas) if (x > c.x1 && x < c.x2 && z > c.z1 && z < c.z2) h = Math.max(h, c.h); return h; };
    const solo = (x, z) => { const t = topo(x, z), h = terreno(x, z); return t > 0 ? Math.max(h, t) : h; }; // altura do chão (inclui o topo dos blocos; no bowl fica abaixo de 0)

    function bloqueia(x, z, yAbs) { // true se o skate não pode ir pra (x, z) na altura yAbs
      if (x < R.x1 + .6 || x > R.x2 - .6 || z < R.z1 + .6 || z > R.z2 - .6) return true;                    // cerca
      if (yAbs < corr.h - .05 && distSeg(x, z, corr.a[0], corr.a[1], corr.b[0], corr.b[1]) < .45) return true; // corrimão
      for (const l of latas) if (yAbs < .9 && Math.hypot(x - l[0], z - l[1]) < 1.0) return true;               // lixeiras
      return solo(x, z) - yAbs > .3;                                                                           // degrau alto demais (bloco, borda do banco): só subindo pulando
    }
    function inclinacao(x, z, rumo) { // quanto o chão está inclinado pra frente e pro lado (rad)
      const e = .35, fx = Math.sin(rumo), fz = Math.cos(rumo), rx = -Math.cos(rumo), rz = Math.sin(rumo);
      const sf = (terreno(x + fx * e, z + fz * e) - terreno(x - fx * e, z - fz * e)) / (2 * e), sr = (terreno(x + rx * e, z + rz * e) - terreno(x - rx * e, z - rz * e)) / (2 * e);
      return { pitch: Math.atan(sf), roll: Math.atan(sr) };
    }
    const ini = px2m(INICIO.px);
    return { HX, HZ, R, bowlF, plats, caixas, corr, latas, terreno, solo, bloqueia, inclinacao, bowl, banco, plat, inicio: { x: ini[0], z: ini[1], rumo: INICIO.rumo } };
  }

  // ---------- GRÁFICOS (three.js) ----------
  function construir(THREE, scene, renderer) {
    const L = criarLogica(), { HX, HZ } = L, grupo = new THREE.Group(); scene.add(grupo);
    const aniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    const mat = (cor, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: .85, metalness: 0 }, extra || {}));
    const caixa = (w, h, d, x, y, z, m, sombra) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = !!sombra; o.receiveShadow = true; grupo.add(o); return o; };
    const tubo = (ax, ay, az, bx, by, bz, r, m) => { // cilindro entre dois pontos
      const d = new THREE.Vector3(bx - ax, by - ay, bz - az), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), m);
      o.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = true; grupo.add(o); return o;
    };

    // chão: malha com relevo (bowl, plataformas, banco em U, blocos) e a textura da referência
    let mapaTex;
    if (window.MAPA_TEXTURA) mapaTex = new THREE.TextureLoader().load(window.MAPA_TEXTURA);
    else { console.warn('mapas/parque_textura.js não encontrado: usando chão liso'); const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.fillStyle = '#9a9a96'; g.fillRect(0, 0, 4, 4); mapaTex = new THREE.CanvasTexture(c); }
    mapaTex.encoding = THREE.sRGBEncoding; mapaTex.anisotropy = aniso;
    const PAS = .2, NX = Math.round(2 * HX / PAS), NZ = Math.round(2 * HZ / PAS), geo = new THREE.PlaneGeometry(2 * HX, 2 * HZ, NX, NZ); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, L.solo(x, z)); uv[2 * i] = (x + HX) / (2 * HX); uv[2 * i + 1] = 1 - (z + HZ) / (2 * HZ); }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: mapaTex, roughness: .95, metalness: 0 })); chao.receiveShadow = true; grupo.add(chao);

    // grama em volta
    const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gg = gc.getContext('2d'); gg.fillStyle = '#4a7a2b'; gg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { gg.fillStyle = ['#3e6c24', '#5a8a33', '#487428', '#67953a'][i % 4]; gg.globalAlpha = .55; gg.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6); }
    const grama = new THREE.CanvasTexture(gc); grama.wrapS = grama.wrapT = THREE.RepeatWrapping; grama.encoding = THREE.sRGBEncoding; grama.anisotropy = aniso;
    const S = 300, mg = mat(0xffffff, { map: grama, roughness: 1 }); grama.repeat.set(S / 4, S / 4);
    const gz = HZ + .3, gx = HX + .3; // a grama começa um pouco depois da cerca
    caixa(2 * S, .4, S, 0, -.2, -gz - S / 2, mg); caixa(2 * S, .4, S, 0, -.2, gz + S / 2, mg);
    caixa(S, .4, 2 * gz, -gx - S / 2, -.2, 0, mg); caixa(S, .4, 2 * gz, gx + S / 2, -.2, 0, mg);

    // cerca de arame em volta (postes, travessas e tela)
    const mm = mat(0xc9ced6, { metalness: .7, roughness: .4 }), AL = 2.4;
    const cc = document.createElement('canvas'); cc.width = cc.height = 32; const cx = cc.getContext('2d'); cx.strokeStyle = 'rgba(190,196,204,.85)'; cx.lineWidth = 1.2;
    cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(32, 32); cx.moveTo(32, 0); cx.lineTo(0, 32); cx.moveTo(-16, 16); cx.lineTo(16, 48); cx.moveTo(16, -16); cx.lineTo(48, 16); cx.moveTo(16, 48); cx.lineTo(-16, 16); cx.stroke();
    const tela = new THREE.CanvasTexture(cc); tela.wrapS = tela.wrapT = THREE.RepeatWrapping; tela.anisotropy = aniso;
    const lado = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(2, Math.round(len / 3) + 1), tm = tela.clone(); tm.needsUpdate = true; tm.repeat.set(len / .35, AL / .35);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, AL - .5), new THREE.MeshBasicMaterial({ map: tm, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      p.position.set((x1 + x2) / 2, .5 + (AL - .5) / 2, (z1 + z2) / 2); p.rotation.y = -Math.atan2(z2 - z1, x2 - x1); grupo.add(p);
      tubo(x1, AL, z1, x2, AL, z2, .045, mm); tubo(x1, .5, z1, x2, .5, z2, .035, mm);
      for (let i = 0; i < n; i++) { const t = i / (n - 1), x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; tubo(x, 0, z, x, AL, z, .05, mm); }
    };
    lado(-gx, -gz, gx, -gz); lado(gx, -gz, gx, gz); lado(gx, gz, -gx, gz); lado(-gx, gz, -gx, -gz);

    // corrimão de cima (tubo + postes) e lixeiras
    const c = L.corr; tubo(c.a[0], c.h, c.a[1], c.b[0], c.h, c.b[1], .05, mm);
    for (const px of CORRIMAO.postes) { const t = (px - CORRIMAO.a[0]) / (CORRIMAO.b[0] - CORRIMAO.a[0]), x = c.a[0] + (c.b[0] - c.a[0]) * t, z = c.a[1] + (c.b[1] - c.a[1]) * t; tubo(x, L.solo(x, z), z, x, c.h, z, .04, mm); }
    const ml = mat(0x2b2f35, { roughness: .6 }); for (const l of L.latas) { const o = new THREE.Mesh(new THREE.CylinderGeometry(.62, .5, 1.0, 14), ml); o.position.set(l[0], .5, l[1]); o.castShadow = true; grupo.add(o); }

    // fora da pista: arbustos, bancos e pedras (só visual)
    const verdes = [0x2f6a1f, 0x3d7d24, 0x2a5c1b, 0x4a8a2a];
    ARBUSTOS.forEach((a, i) => { const p = px2m([a[0], a[1]]), r = a[2] * ESC; const o = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat(verdes[i % 4], { flatShading: true, roughness: 1 })); o.scale.set(r, r * .8, r); o.position.set(p[0], r * .5, p[1]); o.castShadow = true; grupo.add(o); });
    const mw = mat(0x8a5a2e, { roughness: .8 }), mf = mat(0x30343a, { roughness: .6 });
    for (const b of BANCOS) { const a = px2m([b[0], b[1]]), d = px2m([b[2], b[3]]), cxm = (a[0] + d[0]) / 2, czm = (a[1] + d[1]) / 2, w = d[0] - a[0], p = d[1] - a[1];
      caixa(w, .08, p, cxm, .5, czm, mw, true); caixa(w, .35, .06, cxm, .75, a[1] + .05, mw, true); caixa(.08, .5, p, a[0] + .15, .25, czm, mf, true); caixa(.08, .5, p, d[0] - .15, .25, czm, mf, true); }
    const mr = mat(0x7d7f82, { flatShading: true, roughness: 1 });
    for (const r of PEDRAS) { const p = px2m([r[0], r[1]]), s = r[2] * ESC; const o = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mr); o.scale.set(s, s * .7, s); o.position.set(p[0], s * .3, p[1]); o.castShadow = true; grupo.add(o); }

    return { inicio: L.inicio, solo: L.solo, bloqueia: L.bloqueia, inclinacao: L.inclinacao, limites: { hx: HX, hz: HZ }, grupo };
  }

  window.MAPA = { construir, logica: criarLogica };
})();
