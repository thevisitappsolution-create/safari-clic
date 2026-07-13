/* Safari Clic ! — rendu canvas : décor savane féérique, animaux, particules */
(function () {
  'use strict';
  window.SC = window.SC || {};

  var TAU = Math.PI * 2;
  var FOV = 55; // ° visibles en largeur d'écran

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── projection monde(°) → écran(px) ── */
  function project(w, h, cam, yaw, yDeg, par) {
    var ppd = w / FOV;
    var hor = h * 0.60 + cam.pitch * ppd;
    return {
      x: w / 2 + (yaw - cam.yaw) * ppd * (par || 1),
      y: hor + yDeg * ppd,
      ppd: ppd,
      hor: hor
    };
  }

  /* ── helpers dessin ── */
  function ell(ctx, x, y, rx, ry, rot, fill) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fillStyle = fill; ctx.fill(); ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function leg(ctx, x, hipY, len, w, ang, fill) {
    ctx.save(); ctx.translate(x, hipY); ctx.rotate(ang);
    rrect(ctx, -w / 2, 0, w, len, w / 2, fill);
    ctx.restore();
  }
  function eye(ctx, x, y, r, t) {
    var blink = ((t % 3.7) < 0.13) ? 0.12 : 1;
    ell(ctx, x, y, r, r, 0, '#fff');
    ctx.save(); ctx.translate(x + r * 0.15, y); ctx.scale(1, blink);
    ell(ctx, 0, 0, r * 0.55, r * 0.55, 0, '#2b2340');
    ell(ctx, r * 0.18, -r * 0.2, r * 0.18, r * 0.18, 0, '#fff');
    ctx.restore();
  }
  function starShape(ctx, x, y, r, fill, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var rr = (i % 2 === 0) ? r : r * 0.4;
      var a = i / 8 * TAU - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
  }

  /* ── animaux (repère local : pattes en (0,0), regard vers la GAUCHE) ── */

  function drawZebra(ctx, t, mode, runPhase) {
    var body = '#f7f3e8', stripe = '#332a52', dark = '#4a3a5e';
    var run = (mode === 'run');
    var amp = run ? 0.65 : 0.06;
    var bob = Math.sin(run ? runPhase * 2 : t * 1.6) * (run ? 3 : 1.5);
    ctx.save(); ctx.translate(0, bob * 0.3);
    // queue
    ctx.strokeStyle = body; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(38, -66); ctx.quadraticCurveTo(48, -52, 44, -38); ctx.stroke();
    ell(ctx, 44, -36, 5, 8, 0.3, stripe);
    // pattes arrière-plan
    leg(ctx, -14, -40, 40, 9, Math.sin(runPhase + Math.PI) * amp, '#e8e2d2');
    leg(ctx, 24, -40, 40, 9, Math.sin(runPhase + Math.PI / 2 + Math.PI) * amp, '#e8e2d2');
    // corps
    ell(ctx, 0, -57, 40, 25, 0, body);
    // rayures du corps
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -57, 40, 25, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = stripe;
    for (var i = 0; i < 6; i++) {
      ctx.save(); ctx.translate(-28 + i * 12, -57); ctx.rotate(0.12 * (i - 3));
      ctx.fillRect(-3, -30, 6 - i * 0.4, 60); ctx.restore();
    }
    ctx.restore();
    // pattes avant-plan
    leg(ctx, -26, -40, 40, 9, Math.sin(runPhase) * amp, body);
    leg(ctx, 12, -40, 40, 9, Math.sin(runPhase + Math.PI / 2) * amp, body);
    // cou
    ctx.beginPath();
    ctx.moveTo(-12, -72); ctx.lineTo(-34, -102); ctx.lineTo(-48, -92); ctx.lineTo(-26, -58);
    ctx.closePath(); ctx.fillStyle = body; ctx.fill();
    // rayures du cou
    ctx.strokeStyle = stripe; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (var j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(-18 - j * 7, -70 - j * 8); ctx.lineTo(-27 - j * 7, -62 - j * 8);
      ctx.stroke();
    }
    // crinière
    for (var k = 0; k < 5; k++) ell(ctx, -13 - k * 5.5, -75 - k * 7.5, 4.5, 6, -0.6, stripe);
    // tête
    ctx.save(); ctx.translate(0, bob * 0.5);
    ell(ctx, -46, -100, 14, 10, -0.35, body);
    ell(ctx, -57, -105, 7, 6, -0.35, dark);
    ell(ctx, -38, -112, 4, 8, -0.3, body);
    ell(ctx, -32, -110, 4, 8, 0.1, body);
    eye(ctx, -44, -103, 4, t);
    ctx.restore();
    ctx.restore();
  }
  drawZebra.localH = 118;

  function drawGirafe(ctx, t, mode, runPhase) {
    var body = '#f6b95a', patch = '#cf7028', belly = '#fbd9a0', dark = '#8a5a30';
    var walk = (mode === 'run');
    var amp = walk ? 0.3 : 0.04;
    var sway = Math.sin(walk ? runPhase : t * 1.2) * 0.03;
    // queue
    ctx.strokeStyle = body; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(42, -110); ctx.quadraticCurveTo(54, -90, 50, -70); ctx.stroke();
    ell(ctx, 50, -67, 5, 8, 0.2, dark);
    // pattes
    leg(ctx, -14, -82, 82, 10, Math.sin(runPhase + Math.PI) * amp, '#e8a94a');
    leg(ctx, 30, -82, 82, 10, Math.sin(runPhase + Math.PI / 2 + Math.PI) * amp, '#e8a94a');
    leg(ctx, -30, -82, 82, 10, Math.sin(runPhase) * amp, body);
    leg(ctx, 14, -82, 82, 10, Math.sin(runPhase + Math.PI / 2) * amp, body);
    // corps
    ell(ctx, 0, -103, 45, 30, 0, body);
    ell(ctx, 6, -92, 30, 16, 0, belly);
    // cou + tête (léger balancement)
    ctx.save(); ctx.rotate(sway);
    ctx.beginPath();
    ctx.moveTo(-8, -122); ctx.lineTo(-38, -200); ctx.lineTo(-58, -193); ctx.lineTo(-30, -108);
    ctx.closePath(); ctx.fillStyle = body; ctx.fill();
    // taches (corps + cou)
    var spots = [[-20, -105], [5, -112], [25, -100], [-2, -90], [-30, -128], [-36, -152], [-44, -175], [22, -118]];
    for (var i = 0; i < spots.length; i++) {
      ell(ctx, spots[i][0], spots[i][1], 8, 6.5, 0.4 * (i % 3 - 1), patch);
    }
    // crinière
    for (var k = 0; k < 6; k++) ell(ctx, -26 - k * 4.2, -122 - k * 12.5, 4, 6, -0.5, patch);
    // tête
    ell(ctx, -52, -206, 15, 11, -0.3, body);
    ell(ctx, -65, -210, 8, 7, -0.3, belly);
    // ossicones
    ctx.strokeStyle = body; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-52, -215); ctx.lineTo(-54, -224); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-45, -215); ctx.lineTo(-45, -224); ctx.stroke();
    ell(ctx, -54, -226, 3, 3, 0, patch);
    ell(ctx, -45, -226, 3, 3, 0, patch);
    // oreilles
    ell(ctx, -40, -212, 7, 4, 0.5, body);
    eye(ctx, -50, -209, 4, t);
    ctx.restore();
  }
  drawGirafe.localH = 232;

  function drawElephant(ctx, t, mode, runPhase) {
    var body = '#8fa0c8', shade = '#7386ad', light = '#a9b8da';
    var walk = (mode === 'run');
    var amp = walk ? 0.22 : 0.03;
    var flap = Math.sin(t * 2.2) * 0.1;
    var swing = Math.sin(walk ? runPhase * 0.8 : t * 1.4) * 7;
    // queue
    ctx.strokeStyle = body; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(56, -80); ctx.quadraticCurveTo(66, -62, 61, -45); ctx.stroke();
    ell(ctx, 61, -43, 4, 6, 0.2, shade);
    // pattes
    leg(ctx, -14, -48, 48, 16, Math.sin(runPhase + Math.PI) * amp, shade);
    leg(ctx, 34, -48, 48, 16, Math.sin(runPhase + Math.PI / 2 + Math.PI) * amp, shade);
    leg(ctx, -32, -48, 48, 16, Math.sin(runPhase) * amp, body);
    leg(ctx, 16, -48, 48, 16, Math.sin(runPhase + Math.PI / 2) * amp, body);
    // corps
    ell(ctx, 6, -76, 53, 37, 0, body);
    ell(ctx, 12, -62, 34, 18, 0, light);
    // tête
    ell(ctx, -44, -88, 27, 25, 0, body);
    // trompe
    ctx.strokeStyle = body; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-60, -84);
    ctx.quadraticCurveTo(-80, -60, -74 + swing * 0.4, -30);
    ctx.quadraticCurveTo(-72 + swing, -18, -64 + swing, -16);
    ctx.stroke();
    // défense
    ctx.strokeStyle = '#fff4d9'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-52, -70); ctx.quadraticCurveTo(-62, -60, -70, -58); ctx.stroke();
    // oreille
    ctx.save(); ctx.translate(-28, -92); ctx.rotate(flap - 0.1);
    ell(ctx, 0, 0, 21, 28, 0, shade);
    ell(ctx, 2, 0, 14, 20, 0, '#c690b4');
    ctx.restore();
    eye(ctx, -52, -96, 4.5, t);
  }
  drawElephant.localH = 140;

  function drawPerroquet(ctx, t, mode, runPhase) {
    var grey = '#b9bcc9', wing = '#9599aa', face = '#f2f2f2', tail = '#e0484f', beak = '#3a3a44';
    if (mode === 'fly') {
      var flap = Math.sin(runPhase * 3.2) * 0.9;
      ctx.save(); ctx.rotate(-0.35);
      // aile arrière
      ctx.save(); ctx.translate(2, -30); ctx.rotate(flap * 0.9 + 0.3);
      ell(ctx, -14, 0, 18, 7, 0, wing); ctx.restore();
      // queue rouge en éventail
      ell(ctx, 14, -12, 7, 13, 0.7, tail);
      ell(ctx, 10, -10, 7, 13, 0.4, tail);
      // corps + tête
      ell(ctx, 0, -26, 15, 19, 0.2, grey);
      ell(ctx, -6, -46, 12, 12, 0, grey);
      ell(ctx, -12, -46, 7.5, 8.5, 0, face);
      ctx.beginPath();
      ctx.moveTo(-17, -45); ctx.quadraticCurveTo(-24, -42, -21, -36);
      ctx.quadraticCurveTo(-17, -34, -15, -38); ctx.closePath();
      ctx.fillStyle = beak; ctx.fill();
      eye(ctx, -10, -47, 3.2, t);
      // aile avant
      ctx.save(); ctx.translate(0, -28); ctx.rotate(-flap * 0.9 - 0.3);
      ell(ctx, -14, 0, 20, 8, 0, grey); ctx.restore();
      ctx.restore();
    } else {
      var tilt = Math.sin(t * 1.3) * 0.06;
      ctx.save(); ctx.rotate(tilt);
      // queue
      ctx.save(); ctx.translate(9, -14); ctx.rotate(0.45);
      rrect(ctx, -4, 0, 9, 24, 4, tail); ctx.restore();
      // corps
      ell(ctx, 0, -26, 15, 20, 0.08, grey);
      // aile
      ell(ctx, 5, -26, 10, 15, 0.15, wing);
      // tête
      ell(ctx, -5, -47, 12, 12, 0, grey);
      ell(ctx, -11, -47, 7.5, 8.5, 0, face);
      ctx.beginPath();
      ctx.moveTo(-16, -46); ctx.quadraticCurveTo(-23, -43, -20, -36);
      ctx.quadraticCurveTo(-16, -34, -14, -39); ctx.closePath();
      ctx.fillStyle = beak; ctx.fill();
      eye(ctx, -9, -48, 3.2, t);
      // pattes
      ctx.strokeStyle = '#8a8a94'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(3, 0); ctx.stroke();
      ctx.restore();
    }
  }
  drawPerroquet.localH = 62;

  var DRAW = { zebre: drawZebra, girafe: drawGirafe, elephant: drawElephant, perroquet: drawPerroquet };

  /* ── décor ── */
  function acacia(ctx, s, trunkColor, canopyColor) {
    ctx.save(); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-10, -40, -3, -60);
    ctx.lineTo(4, -60); ctx.quadraticCurveTo(3, -40, 8, 0);
    ctx.closePath(); ctx.fillStyle = trunkColor; ctx.fill();
    ctx.strokeStyle = trunkColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(-24, -72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(26, -70); ctx.stroke();
    ell(ctx, 0, -80, 55, 15, 0, canopyColor);
    ell(ctx, -30, -71, 30, 10, 0, canopyColor);
    ell(ctx, 30, -72, 27, 9, 0, canopyColor);
    ctx.restore();
  }

  function bush(ctx, s, rng2) {
    ctx.save(); ctx.scale(s, s);
    var g = ctx.createLinearGradient(0, -50, 0, 0);
    g.addColorStop(0, '#35b184'); g.addColorStop(1, '#176a4e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(-20, -16, 18, 0, TAU); ctx.arc(0, -26, 22, 0, TAU);
    ctx.arc(20, -15, 17, 0, TAU); ctx.arc(2, -10, 20, 0, TAU);
    ctx.fill();
    // petites fleurs roses
    var fl = [[-24, -24], [-4, -40], [16, -28], [8, -12]];
    for (var i = 0; i < fl.length; i++) {
      ell(ctx, fl[i][0], fl[i][1], 2.6, 2.6, 0, '#ff9ac2');
    }
    ctx.restore();
  }

  function tuft(ctx, s, color) {
    ctx.save(); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, 0);
      ctx.quadraticCurveTo(i * 6, -12, i * 9, -20);
      ctx.stroke();
    }
    ctx.restore();
  }

  function buildDecor(seed) {
    var rng = mulberry(seed);
    var d = { sunYaw: -14 + rng() * 28, hills: [], farTrees: [], bushes: [], tufts: [], nearTufts: [], clouds: [] };
    for (var i = 0; i < 5; i++) {
      d.hills.push({ yaw: -70 + i * 32 + rng() * 14, rx: 26 + rng() * 16, ry: 5 + rng() * 4, row: (i % 2) });
    }
    for (var j = 0; j < 6; j++) {
      d.farTrees.push({ yaw: -68 + j * 26 + rng() * 12, s: 0.5 + rng() * 0.5 });
    }
    var bYaws = [-38, -16, 10, 34];
    for (var b = 0; b < bYaws.length; b++) {
      d.bushes.push({ yaw: bYaws[b] + rng() * 6 - 3, s: 0.85 + rng() * 0.4 });
    }
    d.perchTree = { yaw: -34 + rng() * 68, s: 1 };
    for (var k = 0; k < 26; k++) {
      d.tufts.push({ yaw: -70 + rng() * 140, yDeg: 3.5 + rng() * 7, s: 0.5 + rng() * 0.7 });
    }
    for (var m = 0; m < 14; m++) {
      d.nearTufts.push({ yaw: -75 + rng() * 150, yDeg: 13 + rng() * 8, s: 1.1 + rng() * 0.9 });
    }
    for (var c = 0; c < 4; c++) {
      d.clouds.push({ yaw: -60 + rng() * 120, elev: 14 + rng() * 22, s: 1 + rng(), speed: 0.15 + rng() * 0.3 });
    }
    return d;
  }

  /* ── particules ── */
  var ambient = [];
  var events = [];

  function resetParticles(w, h) {
    ambient = [];
    for (var i = 0; i < 24; i++) {
      ambient.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: -4 - Math.random() * 7, vy: -2 - Math.random() * 4,
        ph: Math.random() * TAU, r: 1.5 + Math.random() * 2
      });
    }
    events = [];
  }

  function spawn(type, yaw, yDeg, n) {
    for (var i = 0; i < (n || 8); i++) {
      events.push({
        type: type, yaw: yaw + (Math.random() - 0.5) * 4, yDeg: yDeg + (Math.random() - 0.5) * 3,
        vyaw: (Math.random() - 0.5) * 5,
        vy: type === 'dust' ? -(1 + Math.random() * 2) : -(2.5 + Math.random() * 3.5),
        life: 1, r: type === 'dust' ? 4 + Math.random() * 5 : 2.5 + Math.random() * 2.5
      });
    }
  }

  /* ── rendu principal ── */
  function render(o) {
    var ctx = o.ctx, w = o.w, h = o.h, cam = o.cam, d = o.decor, t = o.t, dt = o.dt;
    var ppd = w / FOV;

    ctx.save();
    if (cam.zoom > 1.001) {
      var cx = w / 2, cy = h / 2;
      ctx.translate(cx, cy); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cx, -cy);
      // marge pour que le zoom ne découvre pas les bords
      var pad = (1 - 1 / cam.zoom) / 2;
      ctx.translate(-w * pad * 0, 0);
    }

    var hor = h * 0.60 + cam.pitch * ppd;

    // ciel
    var sky = ctx.createLinearGradient(0, hor - h * 0.95, 0, hor + 6);
    sky.addColorStop(0, '#2c1655');
    sky.addColorStop(0.35, '#7b2d8b');
    sky.addColorStop(0.62, '#d4457e');
    sky.addColorStop(0.85, '#ff7b54');
    sky.addColorStop(1, '#ffc94d');
    ctx.fillStyle = sky;
    ctx.fillRect(-w, -h, w * 3, h * 3);

    // nuages
    for (var c = 0; c < d.clouds.length; c++) {
      var cl = d.clouds[c];
      var cyaw = cl.yaw + t * cl.speed;
      cyaw = ((cyaw + 90) % 180) - 90;
      var cp = project(w, h, cam, cyaw, -cl.elev, 0.2);
      ctx.globalAlpha = 0.22;
      ell(ctx, cp.x, cp.y, 46 * cl.s, 11 * cl.s, 0, '#ffe6f0');
      ell(ctx, cp.x + 28 * cl.s, cp.y + 4, 30 * cl.s, 8 * cl.s, 0, '#ffe6f0');
      ctx.globalAlpha = 1;
    }

    // soleil couchant
    var sp = project(w, h, cam, d.sunYaw, -6.5, 0.25);
    var sr = 9.5 * ppd;
    var sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
    sg.addColorStop(0, '#fff6cf');
    sg.addColorStop(0.42, '#ffd66b');
    sg.addColorStop(0.62, 'rgba(255,214,107,.35)');
    sg.addColorStop(1, 'rgba(255,214,107,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, TAU); ctx.fill();

    // collines
    for (var i = 0; i < d.hills.length; i++) {
      var hl = d.hills[i];
      var par = hl.row === 0 ? 0.42 : 0.58;
      var hp = project(w, h, cam, hl.yaw, 0, par);
      ctx.globalAlpha = hl.row === 0 ? 0.65 : 0.85;
      ell(ctx, hp.x, hp.hor + 2, hl.rx * ppd, hl.ry * ppd, 0, hl.row === 0 ? '#6b3fa0' : '#532a7d');
      ctx.globalAlpha = 1;
    }

    // arbres lointains
    for (var j = 0; j < d.farTrees.length; j++) {
      var ft = d.farTrees[j];
      var tp = project(w, h, cam, ft.yaw, 1.2, 0.75);
      ctx.save(); ctx.translate(tp.x, tp.y);
      acacia(ctx, ft.s * ppd * 0.12, '#451f5a', '#451f5a');
      ctx.restore();
    }

    // sol
    var gg = ctx.createLinearGradient(0, hor, 0, hor + h * 0.7);
    gg.addColorStop(0, '#f0913a');
    gg.addColorStop(0.35, '#cf6a24');
    gg.addColorStop(1, '#8a3c16');
    ctx.fillStyle = gg;
    ctx.fillRect(-w, hor, w * 3, h * 2);

    // herbes moyennes
    for (var k = 0; k < d.tufts.length; k++) {
      var tf = d.tufts[k];
      var fp = project(w, h, cam, tf.yaw, tf.yDeg, 1);
      if (fp.x < -60 || fp.x > w + 60) continue;
      ctx.save(); ctx.translate(fp.x, fp.y);
      tuft(ctx, tf.s * ppd * 0.06, 'rgba(160,80,25,.8)');
      ctx.restore();
    }

    // arbre perchoir (plan monde)
    var pt = project(w, h, cam, d.perchTree.yaw, 3, 1);
    if (pt.x > -w && pt.x < w * 2) {
      ctx.save(); ctx.translate(pt.x, pt.y);
      acacia(ctx, ppd * 0.30, '#5a2a30', '#2e7d5b');
      ctx.restore();
    }

    // buissons
    for (var b = 0; b < d.bushes.length; b++) {
      var bu = d.bushes[b];
      var bp = project(w, h, cam, bu.yaw, 7.5, 1);
      if (bp.x < -120 || bp.x > w + 120) continue;
      ctx.save(); ctx.translate(bp.x, bp.y);
      bush(ctx, bu.s * ppd * 0.075);
      ctx.restore();
    }

    // halo d'aide (3-5 ans)
    if (o.halo) {
      var hp2 = project(w, h, cam, o.halo.yaw, o.halo.yDeg, 1);
      var hr = (5.5 + Math.sin(t * 4) * 1.2) * ppd;
      var hg = ctx.createRadialGradient(hp2.x, hp2.y, hr * 0.4, hp2.x, hp2.y, hr);
      hg.addColorStop(0, 'rgba(255,225,130,0)');
      hg.addColorStop(0.75, 'rgba(255,225,130,.4)');
      hg.addColorStop(1, 'rgba(255,225,130,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hp2.x, hp2.y, hr, 0, TAU); ctx.fill();
    }

    // animaux
    var sprites = o.sprites.slice().sort(function (a, b) { return a.yDeg - b.yDeg; });
    for (var s = 0; s < sprites.length; s++) {
      var sprt = sprites[s];
      var drawFn = DRAW[sprt.species];
      if (!drawFn) continue;
      var ap = project(w, h, cam, sprt.yaw, sprt.yDeg, 1);
      if (ap.x < -w * 0.6 || ap.x > w * 1.6) continue;
      var scale = sprt.heightDeg * ppd / drawFn.localH * (sprt.appearK === undefined ? 1 : sprt.appearK);
      if (scale <= 0.01) continue;
      ctx.save();
      ctx.translate(ap.x, ap.y);
      // ombre douce
      ctx.globalAlpha = 0.25;
      ell(ctx, 0, 2, sprt.heightDeg * ppd * 0.32, sprt.heightDeg * ppd * 0.06, 0, '#5a2210');
      ctx.globalAlpha = 1;
      ctx.scale(sprt.face === -1 ? -scale : scale, scale);
      drawFn(ctx, t + (sprt.seed || 0), sprt.mode, sprt.runPhase || 0);
      ctx.restore();
    }

    // herbes proches
    for (var n = 0; n < d.nearTufts.length; n++) {
      var nt = d.nearTufts[n];
      var np = project(w, h, cam, nt.yaw, nt.yDeg, 1.18);
      if (np.x < -80 || np.x > w + 80) continue;
      ctx.save(); ctx.translate(np.x, np.y);
      tuft(ctx, nt.s * ppd * 0.07, 'rgba(90,34,16,.9)');
      ctx.restore();
    }

    // particules événements (espace monde)
    for (var e = events.length - 1; e >= 0; e--) {
      var ev = events[e];
      ev.life -= dt * 1.1;
      if (ev.life <= 0) { events.splice(e, 1); continue; }
      ev.yaw += ev.vyaw * dt;
      ev.yDeg += ev.vy * dt;
      var ep = project(w, h, cam, ev.yaw, ev.yDeg, 1);
      if (ev.type === 'dust') {
        ctx.globalAlpha = ev.life * 0.4;
        ell(ctx, ep.x, ep.y, ev.r * ppd * 0.14, ev.r * ppd * 0.11, 0, '#d9a05e');
        ctx.globalAlpha = 1;
      } else {
        starShape(ctx, ep.x, ep.y, ev.r * ppd * 0.13, '#ffe9a8', ev.life);
      }
    }

    // pollens ambiants (espace écran)
    for (var p = 0; p < ambient.length; p++) {
      var pa = ambient[p];
      pa.x += pa.vx * dt; pa.y += pa.vy * dt;
      if (pa.x < -10) { pa.x = w + 10; pa.y = Math.random() * h; }
      if (pa.y < -10) { pa.y = h + 10; pa.x = Math.random() * w; }
      var al = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + pa.ph));
      ctx.globalAlpha = al;
      ell(ctx, pa.x, pa.y, pa.r, pa.r, 0, '#ffe9a8');
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // vignette douce
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(30,8,40,0)');
    vg.addColorStop(1, 'rgba(30,8,40,.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  /* ── vignette d'espèce pour le carnet (silhouette ou couleur) ── */
  function speciesCard(species, silhouette) {
    var size = 256;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, size);
    if (silhouette) {
      g.addColorStop(0, '#cdbf9f'); g.addColorStop(1, '#b3a480');
    } else {
      g.addColorStop(0, '#7b2d8b'); g.addColorStop(0.6, '#ff7b54'); g.addColorStop(1, '#ffc94d');
    }
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    var drawFn = DRAW[species];
    if (drawFn) {
      var tmp = document.createElement('canvas');
      tmp.width = size; tmp.height = size;
      var tc = tmp.getContext('2d');
      var sc = (size * 0.72) / drawFn.localH;
      tc.save();
      tc.translate(size / 2 + 10, size / 2 + drawFn.localH * sc / 2);
      tc.scale(sc, sc);
      drawFn(tc, 1.0, 'idle', 0);
      tc.restore();
      if (silhouette) {
        tc.globalCompositeOperation = 'source-in';
        tc.fillStyle = '#4a3b28';
        tc.fillRect(0, 0, size, size);
      }
      c.drawImage(tmp, 0, 0);
    }
    return cv.toDataURL('image/png');
  }

  SC.Art = {
    FOV: FOV,
    project: project,
    drawAnimal: function (ctx, species, t, mode, runPhase) {
      var f = DRAW[species];
      if (f) f(ctx, t, mode, runPhase);
    },
    animalLocalH: function (species) {
      return DRAW[species] ? DRAW[species].localH : 100;
    },
    buildDecor: buildDecor,
    render: render,
    resetParticles: resetParticles,
    spawn: spawn,
    speciesCard: speciesCard
  };
})();
