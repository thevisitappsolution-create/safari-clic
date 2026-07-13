/* Safari Clic ! — moteur audio : synthèse + spatialisation binaurale (HRTF) */
(function () {
  'use strict';
  window.SC = window.SC || {};

  var ctx = null;
  var master = null;
  var ambienceOn = false;
  var ambienceNodes = [];
  var ambienceTimers = [];
  var noiseBuf = null;

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // limiteur doux (volume maîtrisé, cf. PRD conformité enfants)
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 8;
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return ctx;
  }

  function now() { return ctx.currentTime; }

  function getNoise() {
    if (!noiseBuf) {
      var len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  /* Sortie spatialisée : angle relatif (°, 0 = devant, + = droite), élévation (°). */
  function spatialOut(relDeg, elevDeg) {
    if (relDeg === undefined || relDeg === null) {
      var g = ctx.createGain();
      g.connect(master);
      return g;
    }
    var p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'linear';
    p.refDistance = 1;
    p.maxDistance = 10;
    var a = relDeg * Math.PI / 180;
    var e = (elevDeg || 0) * Math.PI / 180;
    var x = Math.sin(a) * Math.cos(e);
    var z = -Math.cos(a) * Math.cos(e);
    var y = Math.sin(e);
    if (p.positionX) {
      p.positionX.value = x * 2; p.positionY.value = y * 2; p.positionZ.value = z * 2;
    } else {
      p.setPosition(x * 2, y * 2, z * 2);
    }
    p.connect(master);
    return p;
  }

  function env(g, t0, attack, hold, release, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.setValueAtTime(peak, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  }

  function tone(opts) {
    // {type,f0,f1,t0,dur,peak,out,vibrato}
    var o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    var t0 = opts.t0, dur = opts.dur;
    o.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1) o.frequency.linearRampToValueAtTime(opts.f1, t0 + dur);
    var g = ctx.createGain();
    env(g, t0, opts.attack || 0.02, Math.max(0, dur - (opts.attack || 0.02) - (opts.release || 0.08)), opts.release || 0.08, opts.peak || 0.2);
    if (opts.vibrato) {
      var lfo = ctx.createOscillator();
      lfo.frequency.value = opts.vibrato[0];
      var lg = ctx.createGain();
      lg.gain.value = opts.vibrato[1];
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.2);
    }
    var dst = opts.out || master;
    if (opts.lowpass) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(opts.lowpass, t0);
      if (opts.lowpass2) f.frequency.linearRampToValueAtTime(opts.lowpass2, t0 + dur);
      o.connect(g); g.connect(f); f.connect(dst);
    } else {
      o.connect(g); g.connect(dst);
    }
    o.start(t0); o.stop(t0 + dur + 0.3);
  }

  function noiseBurst(opts) {
    // {t0,dur,peak,filterType,freq,q,out}
    var s = ctx.createBufferSource();
    s.buffer = getNoise(); s.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = opts.filterType || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1500, opts.t0);
    if (opts.freq2) f.frequency.linearRampToValueAtTime(opts.freq2, opts.t0 + opts.dur);
    f.Q.value = opts.q || 1;
    var g = ctx.createGain();
    env(g, opts.t0, opts.attack || 0.01, Math.max(0, opts.dur - 0.05), opts.release || 0.06, opts.peak || 0.15);
    s.connect(f); f.connect(g); g.connect(opts.out || master);
    s.start(opts.t0); s.stop(opts.t0 + opts.dur + 0.2);
  }

  /* ── Cris des espèces ── */
  var calls = {
    zebre: function (out) {
      var t = now();
      for (var i = 0; i < 3; i++) {
        var t0 = t + i * 0.28;
        tone({ type: 'sawtooth', f0: 480 + i * 40, f1: 700, t0: t0, dur: 0.12, peak: 0.10, lowpass: 1600, out: out, vibrato: [26, 45] });
        tone({ type: 'sawtooth', f0: 380, f1: 300, t0: t0 + 0.13, dur: 0.10, peak: 0.08, lowpass: 1200, out: out });
      }
    },
    elephant: function (out) {
      var t = now();
      tone({ type: 'sawtooth', f0: 95, f1: 240, t0: t, dur: 0.9, peak: 0.16, lowpass: 500, lowpass2: 1100, out: out, vibrato: [7, 12], attack: 0.15, release: 0.3 });
      tone({ type: 'sine', f0: 60, f1: 90, t0: t, dur: 1.0, peak: 0.12, out: out, attack: 0.15, release: 0.3 });
    },
    girafe: function (out) {
      var t = now();
      tone({ type: 'sine', f0: 82, f1: 66, t0: t, dur: 0.8, peak: 0.14, out: out, vibrato: [5, 6], attack: 0.2, release: 0.3 });
      noiseBurst({ t0: t + 0.5, dur: 0.12, peak: 0.05, freq: 300, filterType: 'lowpass', out: out });
    },
    perroquet: function (out) {
      var t = now();
      for (var i = 0; i < 4; i++) {
        var t0 = t + i * 0.16;
        tone({ type: 'square', f0: 1250 + (i % 2) * 500, f1: 1900 + (i % 2) * 300, t0: t0, dur: 0.09, peak: 0.05, lowpass: 3600, out: out, vibrato: [40, 120] });
      }
    }
  };

  /* ── API publique ── */
  SC.Audio = {
    unlock: function () { ensureCtx(); },

    playCall: function (species, relDeg, elevDeg) {
      if (!ensureCtx()) return;
      var fn = calls[species];
      if (fn) fn(spatialOut(relDeg, elevDeg));
    },

    rustle: function (relDeg) {
      if (!ensureCtx()) return;
      var out = spatialOut(relDeg, -5);
      var t = now();
      for (var i = 0; i < 3; i++) {
        noiseBurst({ t0: t + i * 0.12 + Math.random() * 0.04, dur: 0.09, peak: 0.11, freq: 1900 + Math.random() * 700, q: 0.8, out: out });
      }
    },

    steps: function (relDeg, heavy) {
      if (!ensureCtx()) return;
      var out = spatialOut(relDeg, -10);
      var t = now();
      for (var i = 0; i < 2; i++) {
        noiseBurst({ t0: t + i * 0.22, dur: 0.07, peak: heavy ? 0.16 : 0.07, freq: heavy ? 140 : 320, filterType: 'lowpass', out: out });
      }
    },

    wings: function (relDeg, elevDeg) {
      if (!ensureCtx()) return;
      var out = spatialOut(relDeg, elevDeg || 10);
      var t = now();
      for (var i = 0; i < 5; i++) {
        noiseBurst({ t0: t + i * 0.1, dur: 0.07, peak: 0.09, freq: 700, q: 0.6, out: out });
      }
    },

    pop: function (relDeg) {
      if (!ensureCtx()) return;
      var out = spatialOut(relDeg, 0);
      tone({ type: 'sine', f0: 320, f1: 620, t0: now(), dur: 0.16, peak: 0.1, out: out });
    },

    shutter: function () {
      if (!ensureCtx()) return;
      var t = now();
      noiseBurst({ t0: t, dur: 0.03, peak: 0.22, freq: 2600, q: 1.5 });
      noiseBurst({ t0: t + 0.06, dur: 0.04, peak: 0.16, freq: 1200, q: 1.5 });
      tone({ type: 'square', f0: 2200, t0: t, dur: 0.03, peak: 0.05 });
    },

    stars: function (n) {
      if (!ensureCtx()) return;
      var notes = [880, 1108, 1318];
      var t = now() + 0.15;
      for (var i = 0; i < n; i++) {
        tone({ type: 'sine', f0: notes[i], t0: t + i * 0.18, dur: 0.3, peak: 0.14, release: 0.25 });
        tone({ type: 'sine', f0: notes[i] * 2, t0: t + i * 0.18, dur: 0.18, peak: 0.05, release: 0.15 });
      }
      if (n >= 3) {
        // petits applaudissements doux de la mascotte
        for (var j = 0; j < 5; j++) {
          noiseBurst({ t0: t + 0.65 + j * 0.09, dur: 0.045, peak: 0.07, freq: 1000 + Math.random() * 400, q: 1.2 });
        }
      }
    },

    almost: function () {
      if (!ensureCtx()) return;
      var t = now();
      tone({ type: 'sine', f0: 392, t0: t, dur: 0.16, peak: 0.1 });
      tone({ type: 'sine', f0: 330, t0: t + 0.18, dur: 0.22, peak: 0.1 });
    },

    stamp: function () {
      if (!ensureCtx()) return;
      var t = now();
      noiseBurst({ t0: t, dur: 0.05, peak: 0.15, freq: 240, filterType: 'lowpass' });
      tone({ type: 'sine', f0: 520, f1: 780, t0: t + 0.03, dur: 0.14, peak: 0.1 });
    },

    startAmbience: function () {
      if (!ensureCtx() || ambienceOn) return;
      ambienceOn = true;
      // vent doux
      var s = ctx.createBufferSource();
      s.buffer = getNoise(); s.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
      var g = ctx.createGain(); g.gain.value = 0.035;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
      var lg = ctx.createGain(); lg.gain.value = 0.018;
      lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(); lfo.start();
      ambienceNodes = [s, lfo];
      // kalimba pentatonique, calme
      var scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      function pluck() {
        if (!ambienceOn) return;
        var f0 = scale[Math.floor(Math.random() * scale.length)];
        var t0 = now() + 0.05;
        tone({ type: 'sine', f0: f0, t0: t0, dur: 0.5, peak: 0.05, release: 0.45, attack: 0.005 });
        tone({ type: 'triangle', f0: f0 * 2, t0: t0, dur: 0.25, peak: 0.015, release: 0.2, attack: 0.005 });
        ambienceTimers.push(setTimeout(pluck, 1400 + Math.random() * 2200));
      }
      ambienceTimers.push(setTimeout(pluck, 800));
      // oiseaux lointains
      function farBird() {
        if (!ambienceOn) return;
        var out = spatialOut(Math.random() * 140 - 70, 20);
        var t0 = now() + 0.05;
        for (var i = 0; i < 2; i++) {
          tone({ type: 'sine', f0: 2200 + Math.random() * 800, f1: 2800, t0: t0 + i * 0.14, dur: 0.08, peak: 0.02, out: out });
        }
        ambienceTimers.push(setTimeout(farBird, 5000 + Math.random() * 8000));
      }
      ambienceTimers.push(setTimeout(farBird, 3000));
    },

    stopAmbience: function () {
      ambienceOn = false;
      ambienceTimers.forEach(clearTimeout);
      ambienceTimers = [];
      ambienceNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      ambienceNodes = [];
    }
  };
})();
