/* Safari Clic ! — écrans, carnet, sauvegarde locale, démarrage */
(function () {
  'use strict';
  window.SC = window.SC || {};

  var SAVE_KEY = 'safariclic_save_v1';

  function $(id) { return document.getElementById(id); }

  /* ── sauvegarde (100 % locale, cf. PRD §10) ── */
  var save = { v: 1, age: null, tampons: 0, carnet: {} };
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.v === 1) save = d;
      }
    } catch (e) {}
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  /* ── navigation ── */
  function show(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $(screenId).classList.add('active');
  }
  function openModal(id) { $(id).classList.remove('hidden'); }
  function closeModal(id) { $(id).classList.add('hidden'); }

  function starsTxt(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '★';
    return s;
  }

  function refreshHome() {
    $('tampons-badge').textContent = '🐾 ' + save.tampons + ' tampon' + (save.tampons > 1 ? 's' : '');
    $('btn-age').textContent = '⚙️ ' + (save.age ? save.age + ' ans' : 'âge');
    document.body.className = save.age ? ('age-' + save.age) : '';
  }

  /* ── réglage d'âge ── */
  function askAge(then) {
    openModal('modal-age');
    var btns = document.querySelectorAll('.btn-age');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () {
        save.age = this.getAttribute('data-age');
        persist();
        refreshHome();
        closeModal('modal-age');
        SC.Audio.unlock();
        SC.Audio.stamp();
        if (then) then();
      };
    }
  }

  /* ── sortie photo ── */
  function startSortie() {
    SC.Audio.unlock();
    if (!save.age) { askAge(startSortie); return; }
    openModal('modal-gyro');
  }

  function launchGame(useGyro) {
    closeModal('modal-gyro');
    show('screen-game');
    SC.Game.start({
      age: save.age,
      gyro: useGyro,
      timerLoop: !!window.__autotest,
      onEnd: function (results, aborted) {
        if (results && results.length && results.some(function (r) { return r.stars > 0; })) {
          showDevelop(results);
        } else {
          show('screen-home');
          refreshHome();
        }
      }
    });
  }

  /* ── développement des photos (petit rituel joyeux) ── */
  function showDevelop(results) {
    show('screen-develop');
    var strip = $('develop-strip');
    strip.innerHTML = '';
    $('develop-total').classList.add('hidden');
    $('btn-develop-done').classList.add('hidden');

    var gained = 0;
    results.forEach(function (r) {
      if (r.stars > 0) {
        gained += r.stars;
        var sp = SC.Game.SPECIES[r.species];
        var c = save.carnet[r.species] || { count: 0, bestStars: 0, photo: null };
        c.count++;
        if (r.stars >= c.bestStars) { c.bestStars = r.stars; c.photo = r.photo; }
        save.carnet[r.species] = c;
      }
    });
    save.tampons += gained;
    persist();

    var delay = 300;
    results.forEach(function (r) {
      var sp = SC.Game.SPECIES[r.species];
      var card = document.createElement('div');
      card.className = 'dev-photo' + (r.stars > 0 ? '' : ' dev-missed');
      if (r.stars > 0) {
        card.innerHTML = '<img alt=""><div class="dev-name"></div><div class="dev-stars"></div>';
        card.querySelector('img').src = r.photo;
        card.querySelector('.dev-name').textContent = sp.emoji + ' ' + sp.short;
        card.querySelector('.dev-stars').textContent = starsTxt(r.stars);
      } else {
        card.innerHTML = '<div class="dev-missed-face">💨</div><div class="dev-name"></div><div class="dev-stars">Presque !</div>';
        card.querySelector('.dev-name').textContent = sp.emoji + ' ' + sp.short;
      }
      card.style.display = 'none';
      strip.appendChild(card);
      setTimeout(function () {
        card.style.display = '';
        SC.Audio.stamp();
      }, delay);
      delay += 550;
    });

    setTimeout(function () {
      var tot = $('develop-total');
      tot.textContent = '🐾 +' + gained + ' tampon' + (gained > 1 ? 's' : '') + ' pour ton passeport !';
      tot.classList.remove('hidden');
      $('btn-develop-done').classList.remove('hidden');
      if (gained > 0) SC.Audio.stars(3);
    }, delay + 200);
  }

  /* ── carnet ── */
  var silCache = {};
  function showCarnet() {
    show('screen-carnet');
    var grid = $('carnet-grid');
    grid.innerHTML = '';
    var keys = Object.keys(SC.Game.SPECIES);
    var seen = 0;
    keys.forEach(function (key) {
      var sp = SC.Game.SPECIES[key];
      var c = save.carnet[key];
      var btn = document.createElement('button');
      btn.className = 'carnet-card' + (c ? '' : ' cc-unknown');
      var img = document.createElement('img');
      if (c && c.photo) {
        img.src = c.photo;
        seen++;
      } else {
        if (!silCache[key]) silCache[key] = SC.Art.speciesCard(key, true);
        img.src = silCache[key];
      }
      btn.appendChild(img);
      var name = document.createElement('div');
      name.className = 'cc-name';
      name.textContent = c ? (sp.emoji + ' ' + sp.short) : '❓ ? ? ?';
      btn.appendChild(name);
      var st = document.createElement('div');
      st.className = 'cc-stars';
      st.textContent = c ? starsTxt(c.bestStars) : ' ';
      st.innerHTML = st.textContent || '&nbsp;';
      btn.appendChild(st);
      btn.onclick = function () { showFiche(key); };
      grid.appendChild(btn);
    });
    $('carnet-count').textContent = seen + '/' + keys.length;
  }

  function showFiche(key) {
    var sp = SC.Game.SPECIES[key];
    var c = save.carnet[key];
    var body = $('fiche-body');
    body.innerHTML = '';

    var img = document.createElement('img');
    img.className = 'fiche-photo';
    if (c && c.photo) img.src = c.photo;
    else {
      if (!silCache[key]) silCache[key] = SC.Art.speciesCard(key, true);
      img.src = silCache[key];
    }
    body.appendChild(img);

    var h = document.createElement('h3');
    h.textContent = c ? (sp.emoji + ' ' + sp.name) : '❓ Espèce mystère';
    body.appendChild(h);

    if (c) {
      var st = document.createElement('div');
      st.className = 'fiche-stars';
      st.textContent = starsTxt(c.bestStars) + '  ·  ' + c.count + ' photo' + (c.count > 1 ? 's' : '');
      body.appendChild(st);

      var hab = document.createElement('div');
      hab.className = 'fiche-row';
      hab.textContent = '🌍 Habitat : ' + sp.habitat;
      body.appendChild(hab);

      var fact = document.createElement('div');
      fact.className = 'fiche-fact';
      fact.textContent = '💡 Le savais-tu ? ' + sp.fact;
      body.appendChild(fact);

      var cri = document.createElement('button');
      cri.className = 'btn btn-mid';
      cri.textContent = '🔊 Écouter son cri';
      cri.onclick = function () {
        SC.Audio.unlock();
        SC.Audio.playCall(key, 0, 0);
      };
      body.appendChild(cri);
    } else {
      var mys = document.createElement('div');
      mys.className = 'fiche-fact';
      mys.textContent = '📸 Pars en sortie photo pour découvrir cet animal !';
      body.appendChild(mys);
    }
    openModal('modal-fiche');
  }

  /* ── démarrage ── */
  function boot() {
    loadSave();
    refreshHome();
    SC.Game.bindControls();

    $('btn-sortie').addEventListener('click', startSortie);
    $('btn-carnet').addEventListener('click', function () { SC.Audio.unlock(); showCarnet(); });
    $('btn-carnet-back').addEventListener('click', function () { show('screen-home'); refreshHome(); });
    $('btn-age').addEventListener('click', function () { askAge(null); });

    $('btn-gyro-ok').addEventListener('click', function () {
      SC.Audio.unlock();
      SC.Game.requestGyro(function (granted) { launchGame(granted); });
    });
    $('btn-gyro-skip').addEventListener('click', function () {
      SC.Audio.unlock();
      launchGame(false);
    });

    $('btn-quit').addEventListener('click', function () { openModal('modal-quit'); });
    $('btn-quit-no').addEventListener('click', function () { closeModal('modal-quit'); });
    $('btn-quit-yes').addEventListener('click', function () {
      closeModal('modal-quit');
      SC.Game.quit();
    });

    $('btn-develop-done').addEventListener('click', function () {
      show('screen-home');
      refreshHome();
    });

    $('btn-fiche-close').addEventListener('click', function () { closeModal('modal-fiche'); });
    $('modal-fiche').addEventListener('click', function (e) {
      if (e.target === this) closeModal('modal-fiche');
    });

    // mode test (dév) : lance directement une sortie en mode tactile
    if (location.hash === '#autotest') {
      window.__autotest = true;
      save.age = save.age || '6-8';
      launchGame(false);
      setInterval(function () {
        var dbg = document.getElementById('dbg');
        if (!dbg) {
          dbg = document.createElement('div');
          dbg.id = 'dbg'; dbg.style.display = 'none';
          document.body.appendChild(dbg);
        }
        dbg.textContent += ' | ' + SC.Game.debugState();
        if (SC.Game.isRunning()) {
          SC.Game.debugAim();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        }
      }, 1200);
      return;
    }

    // premier lancement : réglage d'âge
    if (!save.age) askAge(null);

    // PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    // pas de double-tap zoom sur iOS
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
