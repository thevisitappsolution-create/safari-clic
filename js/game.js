/* Safari Clic ! — logique de jeu : caméra (gyro/tactile), rencontres, photo, étoiles */
(function () {
  'use strict';
  window.SC = window.SC || {};

  /* ── bestiaire (prototype savane, cf. PRD §14.1) ── */
  var SPECIES = {
    zebre: {
      name: 'Zèbre de Burchell', short: 'Zèbre', emoji: '🦓',
      behavior: 'pop', heightDeg: 13, yDeg: 8.2,
      habitat: 'Savane herbeuse',
      fact: 'Chaque zèbre a des rayures uniques — comme tes empreintes digitales !'
    },
    girafe: {
      name: 'Girafe', short: 'Girafe', emoji: '🦒',
      behavior: 'traverse', heightDeg: 26, yDeg: 4.8, walkMul: 1.0,
      habitat: 'Savane arborée',
      fact: 'Sa langue bleu-violet mesure jusqu’à 50 cm : parfaite pour attraper les feuilles d’acacia !'
    },
    elephant: {
      name: 'Éléphant de savane', short: 'Éléphant', emoji: '🐘',
      behavior: 'traverse', heightDeg: 20, yDeg: 5.8, walkMul: 0.85,
      habitat: 'Savane et points d’eau',
      fact: 'Il « parle » avec des sons si graves qu’on les sent dans le sol, à des kilomètres !'
    },
    perroquet: {
      name: 'Perroquet du Gabon', short: 'Perroquet', emoji: '🦜',
      behavior: 'perch', heightDeg: 6.5, yDeg: -18.6,
      habitat: 'Les grands arbres',
      fact: 'Il peut imiter ta voix… et vivre plus de 60 ans !'
    }
  };

  /* ── douceur adaptative (PRD §5) ── */
  var AGE_PARAMS = {
    '3-5':  { visible: 9, fleeMul: 0.55, walk: 10, returns: 2, arrow: 'always', halo: true,  centerThresh: 0.55, encounters: 6, cueTime: 3.2, feint: false, minStar: true,  zoom: false },
    '6-8':  { visible: 5, fleeMul: 1.0,  walk: 14, returns: 0, arrow: 'late',   halo: false, centerThresh: 0.38, encounters: 7, cueTime: 2.6, feint: false, minStar: false, zoom: true },
    '9-12': { visible: 3, fleeMul: 1.5,  walk: 18, returns: 0, arrow: 'never',  halo: false, centerThresh: 0.26, encounters: 8, cueTime: 2.2, feint: true,  minStar: false, zoom: true }
  };

  var YAW_LIMIT = 55; // fenêtre de 110° (PRD §4)

  /* ── état ── */
  var canvas, ctx2d, dpr = 1, W = 0, H = 0;
  var running = false, rafId = 0, lastT = 0, gameT = 0;
  var cam = { yaw: 0, pitch: 0, zoom: 1 };
  var zoomTarget = 1;
  var age = null, decor = null;
  var session = null, enc = null;
  var callbacks = {};
  var gyroActive = false, gyroCalib = null, gyroRaw = { alpha: 0, beta: 0 };
  var gyroVal = { yaw: 0, pitch: 0 };
  var dragVal = { yaw: 0, pitch: 0 };
  var dragging = null;
  var shutterHeld = false, shutterDownT = 0, lastShotT = -10;
  var snapTimer = 0;
  var el = {};
  var timerLoop = false, timerId = 0;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function wrap180(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }
  function softClamp(v, lim) {
    if (v > lim) return Math.min(lim + (v - lim) * 0.12, lim + 4);
    if (v < -lim) return Math.max(-lim + (v + lim) * 0.12, -lim - 4);
    return v;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ── viseur (source unique de vérité, positionne aussi le DOM) ── */
  function vfRect() {
    var size = Math.min(W * 0.86, H * 0.52);
    return { w: size, h: size, x: (W - size) / 2, y: H * 0.40 - size / 2 };
  }
  function layoutViewfinder() {
    var r = vfRect();
    var v = el.viewfinder;
    v.style.left = r.x + 'px'; v.style.top = r.y + 'px';
    v.style.width = r.w + 'px'; v.style.height = r.h + 'px';
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutViewfinder();
  }

  /* ── gyroscope ── */
  function onOrient(e) {
    if (e.alpha === null || e.alpha === undefined) return;
    gyroRaw.alpha = e.alpha; gyroRaw.beta = e.beta || 0;
    if (!gyroCalib) gyroCalib = { alpha: e.alpha, beta: e.beta || 60 };
    gyroVal.yaw = wrap180(gyroCalib.alpha - e.alpha);
    gyroVal.pitch = clamp((e.beta - gyroCalib.beta) * 0.9, -25, 32);
    gyroActive = true;
  }
  function recenter() {
    if (gyroActive) gyroCalib = { alpha: gyroRaw.alpha, beta: gyroRaw.beta };
    dragVal.yaw = 0; dragVal.pitch = 0;
    SC.Audio.pop(0);
  }

  /* ── tactile / souris ── */
  function onDown(e) {
    var p = e.touches ? e.touches[0] : e;
    dragging = { x: p.clientX, y: p.clientY };
  }
  function onMove(e) {
    if (!dragging) return;
    var p = e.touches ? e.touches[0] : e;
    var ppd = W / SC.Art.FOV;
    dragVal.yaw -= (p.clientX - dragging.x) / ppd;
    dragVal.pitch += (p.clientY - dragging.y) / ppd;
    dragVal.pitch = clamp(dragVal.pitch, -30, 40);
    dragging = { x: p.clientX, y: p.clientY };
    if (e.cancelable) e.preventDefault();
  }
  function onUp() { dragging = null; }
  function onKey(e) {
    if (!running) return;
    if (e.key === 'ArrowLeft') dragVal.yaw -= 4;
    if (e.key === 'ArrowRight') dragVal.yaw += 4;
    if (e.key === 'ArrowUp') dragVal.pitch = clamp(dragVal.pitch + 3, -30, 40);
    if (e.key === 'ArrowDown') dragVal.pitch = clamp(dragVal.pitch - 3, -30, 40);
    if (e.key === ' ') { shoot(); e.preventDefault(); }
  }

  /* ── session ── */
  function buildSession() {
    var keys = Object.keys(SPECIES);
    var list = keys.slice();
    while (list.length < age.encounters) list.push(pick(keys));
    // mélange
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return { list: list, idx: 0, results: [] };
  }

  function newEncounter() {
    var key = session.list[session.idx];
    var sp = SPECIES[key];
    enc = {
      key: key, sp: sp,
      state: 'wait', t: 0, sndT: 0, searchT: 0,
      yaw: 0, yDeg: sp.yDeg, face: 1, mode: 'idle',
      runPhase: 0, appearK: 0, seed: Math.random() * 10,
      bestStars: -1, bestPhoto: null,
      returns: age.returns, feintArmed: age.feint && Math.random() < 0.45,
      waitDur: rand(1.1, 2.2), enterDir: 1, grazeYaw: 0
    };
    if (sp.behavior === 'pop') {
      var b = pick(decor.bushes);
      enc.yaw = b.yaw + (b.yaw < 0 ? 4.5 : -4.5);
      enc.face = enc.yaw > 0 ? 1 : -1; // regarde vers le centre
    } else if (sp.behavior === 'perch') {
      enc.yaw = decor.perchTree.yaw - 7.2;
      enc.face = decor.perchTree.yaw > 0 ? 1 : -1;
    } else { // traverse
      enc.enterDir = Math.random() < 0.5 ? 1 : -1; // 1 = entre par la gauche
      enc.yaw = -68 * enc.enterDir;
      enc.grazeYaw = rand(-18, 18);
      enc.face = enc.enterDir === 1 ? -1 : 1; // face au sens de marche
      enc.appearK = 1;
    }
    updateHud();
  }

  function encTargetPos() {
    // où pointer l'aide (flèche/halo)
    if (!enc) return null;
    var y = enc.yaw;
    if (enc.sp.behavior === 'traverse' && enc.state === 'cue') y = clamp(enc.yaw, -50, 50);
    return { yaw: y, yDeg: enc.sp.behavior === 'perch' ? enc.yDeg - 2 : enc.yDeg - enc.sp.heightDeg * 0.5 };
  }

  function relAngle(yaw) { return yaw - cam.yaw; }
  function elevOf(yDeg) { return clamp(-yDeg * 0.9, -30, 40); }

  function cueSound() {
    var rel = relAngle(enc.yaw), elv = elevOf(enc.yDeg);
    var k = enc.key;
    enc.cueN = (enc.cueN || 0) + 1;
    if (k === 'zebre') {
      SC.Audio.rustle(rel);
      if (enc.cueN % 2 === 0) SC.Audio.playCall('zebre', rel, elv);
    } else if (k === 'perroquet') {
      SC.Audio.playCall('perroquet', rel, elv);
      if (enc.cueN % 2 === 0) SC.Audio.wings(rel, elv);
    } else if (k === 'elephant') {
      if (enc.cueN === 1) SC.Audio.playCall('elephant', rel, elv);
      SC.Audio.steps(rel, true);
    } else {
      SC.Audio.steps(rel, false);
      if (enc.cueN % 2 === 0) SC.Audio.playCall('girafe', rel, elv);
    }
    if (age.halo) SC.Art.spawn('sparkle', enc.yaw, enc.yDeg - 4, 6);
  }

  function fleeSound() {
    var rel = relAngle(enc.yaw), elv = elevOf(enc.yDeg);
    if (enc.key === 'perroquet') SC.Audio.wings(rel, elv);
    else SC.Audio.steps(rel, enc.key === 'elephant');
  }

  /* ── machine à états d'une rencontre ── */
  function updateEncounter(dt) {
    if (!enc) return;
    enc.t += dt;
    enc.sndT -= dt;
    var sp = enc.sp;
    var walkSpd = age.walk * (sp.walkMul || 1);

    switch (enc.state) {
      case 'wait':
        if (enc.t > enc.waitDur) setState('cue');
        break;

      case 'cue':
        enc.searchT += dt;
        if (enc.sndT <= 0) { cueSound(); enc.sndT = 1.15; }
        if (enc.t > (enc.shortCue ? 1.4 : age.cueTime)) {
          if (sp.behavior === 'traverse') setState('enter');
          else setState('appear');
        }
        break;

      case 'appear':
        enc.appearK = Math.min(1, enc.t / 0.35);
        // petit rebond
        if (enc.appearK >= 1 && enc.t > 0.45) setState('visible');
        break;

      case 'enter': // traverse : marche vers son coin d'herbe
        enc.searchT += dt;
        enc.mode = 'run';
        enc.runPhase += dt * 6;
        enc.yaw += walkSpd * dt * (enc.enterDir === 1 ? 1 : -1);
        if (enc.sndT <= 0) { SC.Audio.steps(relAngle(enc.yaw), enc.key === 'elephant'); enc.sndT = 0.55; }
        if ((enc.enterDir === 1 && enc.yaw >= enc.grazeYaw) || (enc.enterDir === -1 && enc.yaw <= enc.grazeYaw)) {
          setState('visible');
        }
        break;

      case 'visible':
        enc.searchT += dt;
        enc.mode = 'idle';
        if (enc.sndT <= 0) {
          SC.Audio.playCall(enc.key, relAngle(enc.yaw), elevOf(enc.yDeg));
          enc.sndT = 2.6;
        }
        // feinte (9-12 ans) : l'animal se cache et ressort ailleurs
        if (enc.feintArmed && enc.t > Math.min(1.2, age.visible * 0.4) && sp.behavior !== 'traverse') {
          enc.feintArmed = false;
          SC.Art.spawn('dust', enc.yaw, enc.yDeg, 6);
          SC.Audio.rustle(relAngle(enc.yaw));
          if (sp.behavior === 'pop') {
            var b = pick(decor.bushes);
            enc.yaw = b.yaw + (b.yaw < 0 ? 4.5 : -4.5);
          } else {
            enc.yaw = decor.perchTree.yaw + 7.2;
          }
          enc.appearK = 0; enc.shortCue = true;
          setState('cue');
          break;
        }
        if (enc.t > age.visible) setState('flee');
        break;

      case 'flee':
        enc.mode = (sp.behavior === 'perch') ? 'fly' : 'run';
        enc.runPhase += dt * (sp.behavior === 'traverse' ? 7 : 14);
        if (enc.sndT <= 0) { fleeSound(); enc.sndT = 0.5; }
        if (sp.behavior === 'pop') {
          enc.yaw += enc.fleeDir * 34 * age.fleeMul * dt;
          if (Math.abs(enc.yaw) > 80) setState('gone');
        } else if (sp.behavior === 'perch') {
          enc.yDeg -= 20 * age.fleeMul * dt;
          enc.yaw += enc.fleeDir * 6 * dt;
          if (enc.yDeg < -50) setState('gone');
        } else {
          enc.yaw += enc.enterDir * walkSpd * 1.5 * dt;
          if (Math.abs(enc.yaw) > 76) setState('gone');
        }
        break;

      case 'gone':
        if (enc.bestStars < 0 && enc.returns > 0 && enc.t > 1.4) {
          // 3-5 ans : l'animal revient
          enc.returns--;
          enc.appearK = 0; enc.shortCue = true; enc.mode = 'idle';
          if (sp.behavior === 'traverse') {
            enc.yaw = -68 * enc.enterDir;
            enc.appearK = 1;
          } else if (sp.behavior === 'perch') {
            enc.yaw = decor.perchTree.yaw - 7.2;
            enc.yDeg = sp.yDeg;
          } else {
            var rb = pick(decor.bushes);
            enc.yaw = rb.yaw + (rb.yaw < 0 ? 4.5 : -4.5);
            enc.face = enc.yaw > 0 ? 1 : -1;
            enc.yDeg = sp.yDeg;
          }
          setState('cue');
        } else if (enc.t > 0.9) {
          nextEncounter();
        }
        break;
    }
  }

  function setState(s) {
    if (!enc) return;
    enc.state = s; enc.t = 0; enc.sndT = 0;
    if (s === 'appear') {
      enc.mode = 'idle';
      SC.Audio.pop(relAngle(enc.yaw));
      SC.Audio.playCall(enc.key, relAngle(enc.yaw), elevOf(enc.yDeg));
      SC.Art.spawn('dust', enc.yaw, enc.yDeg, 7);
      enc.appearK = 0;
    }
    if (s === 'visible') { enc.appearK = 1; enc.sndT = 2.2; }
    if (s === 'flee') {
      enc.fleeDir = (enc.yaw >= 0 ? 1 : -1);
      if (enc.sp.behavior === 'pop') enc.face = enc.fleeDir === 1 ? -1 : 1;
      if (enc.sp.behavior === 'perch' && Math.random() < 0.5) enc.fleeDir = -enc.fleeDir;
    }
  }

  function nextEncounter() {
    session.results.push({
      species: enc.key,
      stars: enc.bestStars,
      photo: enc.bestPhoto
    });
    session.idx++;
    enc = null;
    if (session.idx >= session.list.length) {
      endSession(false);
    } else {
      newEncounter();
    }
  }

  function endSession(aborted) {
    var results = session ? session.results : [];
    stopLoop();
    if (callbacks.onEnd) callbacks.onEnd(results, aborted);
  }

  /* ── photo ── */
  function animalScreenBox() {
    if (!enc || enc.appearK < 0.35) return null;
    var st = enc.state;
    if (st !== 'appear' && st !== 'visible' && st !== 'flee' && st !== 'enter') return null;
    var p = SC.Art.project(W, H, cam, enc.yaw, enc.yDeg, 1);
    var hPx = enc.sp.heightDeg * p.ppd;
    var cx = p.x, cy = p.y - hPx * 0.5;
    // transformation zoom (ancrée au centre de l'écran)
    var z = cam.zoom;
    cx = W / 2 + (cx - W / 2) * z;
    cy = H / 2 + (cy - H / 2) * z;
    hPx *= z;
    return { x: cx, y: cy, w: hPx * 1.05, h: hPx };
  }

  function shoot() {
    if (!running) return;
    if (gameT - lastShotT < 0.7) return;
    lastShotT = gameT;
    SC.Audio.shutter();
    el.flash.classList.remove('on');
    void el.flash.offsetWidth;
    el.flash.classList.add('on');

    var vf = vfRect();
    var box = animalScreenBox();
    var stars = 0;
    var beforeFlee = enc && (enc.state === 'visible' || enc.state === 'appear' || enc.state === 'enter');

    if (box) {
      var vcx = vf.x + vf.w / 2, vcy = vf.y + vf.h / 2;
      var dx = Math.abs(box.x - vcx), dy = Math.abs(box.y - vcy);
      var inFrame = dx < vf.w / 2 + box.w / 2 && dy < vf.h / 2 + box.h / 2;
      var c = Math.max(dx / (vf.w / 2), dy / (vf.h / 2));
      if (inFrame && c < 1.05) {
        stars = 1;
        if (c < age.centerThresh) stars++;
        if (beforeFlee) stars++;
      } else if (age.minStar) {
        stars = 1; // 3-5 ans : toujours ★ si l'animal est là
      }
    }

    if (stars > 0) {
      var photo = capture(vf);
      SC.Audio.stars(stars);
      showToast(stars);
      showSnap(photo);
      SC.Art.spawn('sparkle', enc.yaw, enc.yDeg - enc.sp.heightDeg * 0.5, 10);
      if (stars > enc.bestStars) {
        enc.bestStars = stars;
        enc.bestPhoto = photo;
      }
    } else {
      SC.Audio.almost();
      showToast(0);
    }
  }

  function capture(vf) {
    var out = document.createElement('canvas');
    var S = 320;
    out.width = S; out.height = S;
    var c = out.getContext('2d');
    c.drawImage(canvas, vf.x * dpr, vf.y * dpr, vf.w * dpr, vf.h * dpr, 0, 0, S, S);
    return out.toDataURL('image/jpeg', 0.72);
  }

  function showToast(stars) {
    var t = el.toast;
    t.classList.remove('hidden');
    if (stars >= 3) t.innerHTML = '<span class="stars">★★★</span>Superbe !';
    else if (stars === 2) t.innerHTML = '<span class="stars">★★</span>Bien joué !';
    else if (stars === 1) t.innerHTML = '<span class="stars">★</span>Clic !';
    else t.innerHTML = 'Presque !<br><small>Écoute bien…</small>';
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  }

  function showSnap(dataUrl) {
    el.snap.querySelector('img').src = dataUrl;
    el.snap.classList.remove('hidden');
    el.snap.style.animation = 'none';
    void el.snap.offsetWidth;
    el.snap.style.animation = '';
    clearTimeout(snapTimer);
    snapTimer = setTimeout(function () { el.snap.classList.add('hidden'); }, 1700);
  }

  /* ── aides visuelles ── */
  function updateArrow() {
    var show = false;
    var tgt = encTargetPos();
    if (tgt && enc && (enc.state === 'cue' || enc.state === 'visible' || enc.state === 'appear' || enc.state === 'enter')) {
      if (age.arrow === 'always') show = true;
      else if (age.arrow === 'late' && enc.searchT > 5 && enc.bestStars < 0) show = true;
    }
    if (show) {
      var rel = relAngle(tgt.yaw);
      var above = tgt.yDeg < -10;
      var a = el.arrow;
      if (rel > 14) {
        a.style.left = (W - 74) + 'px'; a.style.top = (H * 0.42) + 'px';
        a.style.setProperty('--rot', '0deg');
      } else if (rel < -14) {
        a.style.left = '18px'; a.style.top = (H * 0.42) + 'px';
        a.style.setProperty('--rot', '180deg');
      } else if (above && cam.pitch < 12) {
        a.style.left = (W / 2 - 26) + 'px'; a.style.top = (H * 0.16) + 'px';
        a.style.setProperty('--rot', '-90deg');
      } else {
        show = false;
      }
    }
    el.arrow.classList.toggle('hidden', !show);
  }

  function updateHud() {
    if (session) {
      el.counter.textContent = '📷 ' + Math.min(session.idx + 1, session.list.length) + '/' + session.list.length;
    }
  }

  /* ── boucle ── */
  function frame(ts) {
    if (!running) return;
    if (!timerLoop) rafId = requestAnimationFrame(frame);
    var dt = clamp((ts - lastT) / 1000, 0, 0.05);
    lastT = ts;
    gameT += dt;

    // caméra
    cam.yaw = softClamp(gyroVal.yaw + dragVal.yaw, YAW_LIMIT);
    cam.pitch = clamp(gyroVal.pitch + dragVal.pitch, -20, 34);
    // zoom (appui maintenu, 6 ans et +)
    if (shutterHeld && age.zoom && gameT - shutterDownT > 0.3) zoomTarget = 1.5;
    cam.zoom += (zoomTarget - cam.zoom) * Math.min(1, dt * 9);

    updateEncounter(dt);

    // rebond d'apparition
    var sprites = [];
    if (enc && enc.appearK > 0.01 && enc.state !== 'wait' && enc.state !== 'cue' && enc.state !== 'gone') {
      var k = enc.appearK;
      if (enc.state === 'appear') k = k < 0.8 ? k * 1.15 : 0.92 + (1 - k) * 0.6 + k * 0.08;
      sprites.push({
        species: enc.key, yaw: enc.yaw, yDeg: enc.yDeg,
        heightDeg: enc.sp.heightDeg, face: enc.face,
        mode: enc.mode, runPhase: enc.runPhase,
        appearK: Math.min(k, 1.08), seed: enc.seed
      });
    }

    var halo = null;
    if (age.halo && enc && (enc.state === 'cue' || enc.state === 'visible' || enc.state === 'appear')) {
      var tp = encTargetPos();
      if (tp) halo = tp;
    }

    SC.Art.render({
      ctx: ctx2d, w: W, h: H, cam: cam,
      decor: decor, sprites: sprites, halo: halo,
      t: gameT, dt: dt
    });

    updateArrow();
    el.dot.style.left = ((clamp(cam.yaw, -YAW_LIMIT, YAW_LIMIT) + YAW_LIMIT) / (YAW_LIMIT * 2) * 100) + '%';
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(timerId);
    SC.Audio.stopAmbience();
    window.removeEventListener('deviceorientation', onOrient);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
  }

  /* ── API ── */
  SC.Game = {
    SPECIES: SPECIES,
    AGE_PARAMS: AGE_PARAMS,

    requestGyro: function (done) {
      // iOS 13+ : permission obligatoire, à appeler depuis un geste utilisateur
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (r) {
          done(r === 'granted');
        }).catch(function () { done(false); });
      } else {
        done(typeof DeviceOrientationEvent !== 'undefined');
      }
    },

    start: function (opts) {
      callbacks = opts;
      age = AGE_PARAMS[opts.age] || AGE_PARAMS['6-8'];
      canvas = $('game-canvas');
      ctx2d = canvas.getContext('2d');
      el = {
        viewfinder: $('viewfinder'), counter: $('hud-counter'),
        arrow: $('hint-arrow'), dot: $('window-dot'),
        flash: $('flash'), toast: $('photo-toast'), snap: $('snap-preview')
      };
      el.toast.classList.add('hidden');
      el.snap.classList.add('hidden');

      cam = { yaw: 0, pitch: 0, zoom: 1 };
      zoomTarget = 1;
      gyroVal = { yaw: 0, pitch: 0 };
      dragVal = { yaw: 0, pitch: 0 };
      gyroCalib = null; gyroActive = false;
      gameT = 0; lastShotT = -10;

      decor = SC.Art.buildDecor(Math.floor(Math.random() * 1e9));
      SC.Art.resetParticles(window.innerWidth, window.innerHeight);
      session = buildSession();
      newEncounter();

      window.addEventListener('resize', resize);
      window.addEventListener('keydown', onKey);
      if (opts.gyro) window.addEventListener('deviceorientation', onOrient);
      resize();

      SC.Audio.unlock();
      SC.Audio.startAmbience();

      running = true;
      lastT = performance.now();
      timerLoop = !!opts.timerLoop; // test headless : rAF ne tourne pas en temps virtuel
      if (timerLoop) {
        timerId = setInterval(function () { frame(performance.now()); }, 16);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    },

    bindControls: function () {
      // appelé une seule fois au boot
      var cv = $('game-canvas');
      cv.addEventListener('touchstart', onDown, { passive: true });
      cv.addEventListener('touchmove', onMove, { passive: false });
      cv.addEventListener('touchend', onUp);
      cv.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      var sh = $('btn-shutter');
      function down(e) {
        shutterHeld = true; shutterDownT = gameT;
        if (e.cancelable) e.preventDefault();
      }
      function up(e) {
        if (!shutterHeld) return;
        shutterHeld = false; zoomTarget = 1;
        shoot();
        if (e && e.cancelable) e.preventDefault();
      }
      sh.addEventListener('touchstart', down, { passive: false });
      sh.addEventListener('touchend', up, { passive: false });
      sh.addEventListener('mousedown', down);
      sh.addEventListener('mouseup', up);

      $('btn-recenter').addEventListener('click', recenter);
    },

    quit: function () { endSession(true); },
    isRunning: function () { return running; },

    debugState: function () {
      return JSON.stringify({
        running: running, gameT: +gameT.toFixed(1),
        idx: session && session.idx,
        key: enc && enc.key, state: enc && enc.state,
        t: enc && +enc.t.toFixed(1), yaw: enc && +enc.yaw.toFixed(1),
        camYaw: +cam.yaw.toFixed(1)
      });
    },

    debugAim: function () {
      // outil de test : centre la caméra sur l'animal courant
      if (!enc || !running) return;
      var ppd = W / SC.Art.FOV;
      var cyDeg = enc.yDeg - enc.sp.heightDeg * 0.5;
      dragVal.yaw = clamp(enc.yaw, -YAW_LIMIT, YAW_LIMIT) - gyroVal.yaw;
      dragVal.pitch = clamp((-0.2 * H / ppd) - cyDeg, -30, 40) - gyroVal.pitch;
    }
  };
})();
