/*!
 * Agroeco 2.0 — script.js
 * Без залежностей. Прогресивне покращення: сторінки читаються й без JS.
 * Підключення у WordPress: wp_enqueue_script('agroeco', get_theme_file_uri('js/script.js'), [], '2.0.0', true);
 * Модулі: повні ряди карток · навігація · вкладки · акордеон · фільтри списків · нормативні документи · мова · форми · зображення
 */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Навігація ---------- */
  function initNav() {
    var nav = $('#site-navigation');
    if (!nav) return;
    var btn = $('.menu-toggle', nav);
    var mobile = function () { return window.innerWidth <= 900; };

    if (btn) {
      btn.addEventListener('click', function () {
        var open = nav.classList.toggle('toggled');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // На мобільних: перший дотик до пункту з підменю розкриває його, другий — переходить за посиланням
    $$('.menu-item-has-children > a', nav).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var li = a.parentNode;
        if (mobile() && !li.classList.contains('is-open')) {
          e.preventDefault();
          $$(':scope > ul > li.is-open', li.parentNode.parentNode).forEach(function (x) { if (x !== li) x.classList.remove('is-open'); });
          li.classList.add('is-open');
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#site-navigation')) {
        $$('.is-open', nav).forEach(function (x) { x.classList.remove('is-open'); });
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        $$('.is-open', nav).forEach(function (x) { x.classList.remove('is-open'); });
        nav.classList.remove('toggled');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
    window.addEventListener('resize', function () {
      if (!mobile()) {
        nav.classList.remove('toggled');
        $$('.is-open', nav).forEach(function (x) { x.classList.remove('is-open'); });
      }
    });
  }

  /* ---------- 2. Вкладки: кнопка[data-tab-target="група:N"] ↔ панель[data-tab-pane="група:N"] ---------- */
  function initTabs() {
    $$('[data-tab-target]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-tab-target'), g = t.split(':')[0];
        $$('[data-tab-target^="' + g + ':"]').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        $$('[data-tab-pane^="' + g + ':"]').forEach(function (p) { p.hidden = p.getAttribute('data-tab-pane') !== t; });
        document.dispatchEvent(new CustomEvent('agroeco:tab', { detail: { target: t } }));
      });
    });
  }

  /* ---------- 3. Акордеон (профіль співробітника) ---------- */
  function initAccordion() {
    $$('.ai h4').forEach(function (h) {
      h.setAttribute('tabindex', '0');
      h.setAttribute('role', 'button');
      var tg = function () { h.parentNode.classList.toggle('open'); };
      h.addEventListener('click', tg);
      h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tg(); } });
    });
  }

  /* ---------- 4. Фільтри списків ----------
     Контейнер  [data-filter]
       поле пошуку      input[data-f-q]
       рік              select[data-f-year]
       сортування       select[data-f-sort]  (значення: new | old | az)
       групи/категорії  [data-f-groups] > button[data-f-group="значення"]  (порожнє = «Усі»)
       вигляд           [data-f-view] > button[data-v="g|l"]  → клас .lst на [data-f-list]
       елементи         [data-f-item] з data-group, data-year, data-date (дд.мм.рррр), data-title
       лічильник        [data-f-count]; повідомлення «нічого не знайдено» [data-f-empty]               */
  function initFilter(root) {
    var items = $$('[data-f-item]', root);
    var q = $('[data-f-q]', root), yr = $('[data-f-year]', root), so = $('[data-f-sort]', root);
    var gb = $$('[data-f-groups] [data-f-group]', root), vw = $$('[data-f-view] button', root);
    var cnt = $('[data-f-count]', root), emp = $('[data-f-empty]', root), list = $('[data-f-list]', root);
    var S = { q: '', y: '', g: '', s: 'new' };

    function num(d) { var m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(d || ''); return m ? +(m[3] + m[2] + m[1]) : 0; }
    function apply() {
      var shown = 0, filtering = !!(S.q || S.y);
      items.forEach(function (it) {
        var txt = (it.getAttribute('data-title') || '') + ' ' + it.textContent;
        var ok = (!S.g || it.getAttribute('data-group') === S.g) &&
                 (!S.y || (it.getAttribute('data-year') || '') === S.y) &&
                 (!S.q || txt.toLowerCase().indexOf(S.q) > -1);
        if (it.classList.contains('ghost') && (filtering || S.g)) ok = false;
        it.hidden = !ok;
        if (ok) shown++;
      });
      if (cnt) cnt.textContent = 'Знайдено: ' + shown;
      if (emp) emp.hidden = shown > 0;
    }
    function sort() {
      if (!so) return;
      var parents = [];
      items.forEach(function (it) { if (parents.indexOf(it.parentNode) < 0) parents.push(it.parentNode); });
      parents.forEach(function (p) {
        var arr = items.filter(function (i) { return i.parentNode === p && !i.classList.contains('ghost'); });
        arr.sort(function (a, b) {
          if (S.s === 'az') return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '', 'uk');
          var da = num(a.getAttribute('data-date')) || +a.getAttribute('data-year') || 0, db = num(b.getAttribute('data-date')) || +b.getAttribute('data-year') || 0;
          return S.s === 'old' ? da - db : db - da;
        });
        var ghosts = items.filter(function (i) { return i.parentNode === p && i.classList.contains('ghost'); });
        arr.concat(ghosts).forEach(function (i) { p.appendChild(i); });
      });
    }
    if (q) q.addEventListener('input', function () { S.q = q.value.trim().toLowerCase(); apply(); });
    if (yr) yr.addEventListener('change', function () { S.y = yr.value.replace(/\D/g, ''); apply(); });
    if (so) so.addEventListener('change', function () {
      var v = so.value; S.s = (v === 'a' || v === 'old') ? 'old' : (v === 'az' ? 'az' : 'new'); sort(); apply();
    });
    gb.forEach(function (b) {
      b.addEventListener('click', function () {
        S.g = b.getAttribute('data-f-group') || '';
        if (S.g === 'Усі' || S.g === 'all') S.g = '';
        gb.forEach(function (x) { x.classList.toggle('on', x === b); });
        apply();
      });
    });
    vw.forEach(function (b) {
      b.addEventListener('click', function () {
        vw.forEach(function (x) { x.classList.toggle('on', x === b); });
        if (list) list.classList.toggle('lst', b.getAttribute('data-v') === 'l');
      });
    });
    apply();
  }

  /* ---------- 5. Нормативні документи: вкладки-розділи + чипси груп + пошук ---------- */
  function initDocs() {
    var root = $('[data-docs]');
    if (!root) return;
    var q = $('#dq'), chips = $('#dch'), cnt = $('#dcn');
    var S = { g: '', q: '' };
    function pane() { return $('[data-tab-pane^="docs:"]:not([hidden])', root) || root; }
    function buildChips() {
      if (!chips) return;
      var gs = $$('.dgrp', pane()).map(function (g) { return g.getAttribute('data-group'); });
      chips.innerHTML = '';
      [''].concat(gs).forEach(function (g) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = g || 'Усі'; b.className = (S.g === g) ? 'on' : '';
        b.addEventListener('click', function () { S.g = g; buildChips(); apply(); });
        chips.appendChild(b);
      });
    }
    function apply() {
      var n = 0;
      $$('.dgrp', root).forEach(function (grp) {
        var gOk = !S.g || grp.getAttribute('data-group') === S.g, any = 0;
        $$('.drw', grp).forEach(function (r) {
          var ok = gOk && (!S.q || r.textContent.toLowerCase().indexOf(S.q) > -1);
          r.hidden = !ok; if (ok) any++;
        });
        grp.hidden = !any;
        if (!grp.closest('[hidden]')) n += any;
      });
      if (cnt) cnt.textContent = 'Знайдено: ' + n;
    }
    if (q) q.addEventListener('input', function () { S.q = q.value.trim().toLowerCase(); apply(); });
    document.addEventListener('agroeco:tab', function () { S.g = ''; buildChips(); apply(); });
    buildChips(); apply();
  }

  /* ---------- 6. Перемикач мови (демонстрація; у WordPress — Polylang/WPML) ---------- */
  function initLang() {
    var box = $('.lg');
    if (!box) return;
    var cur = 'ua';
    try { cur = localStorage.getItem('agroeco_lang') || 'ua'; } catch (e) {}
    function mark() { $$('a', box).forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-l') === cur); }); document.documentElement.setAttribute('lang', cur === 'en' ? 'en' : 'uk'); }
    $$('a', box).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); cur = a.getAttribute('data-l');
        try { localStorage.setItem('agroeco_lang', cur); } catch (x) {}
        mark();
      });
    });
    mark();
  }

  /* ---------- 7. Демонстраційні форми й пошук ---------- */
  function initForms() {
    $$('form[data-demo-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = $('.ok', f);
        if (ok) ok.style.display = 'block';
        f.reset();
      });
    });
    $$('form.search-form').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); });
    });
  }

  /* ---------- 8. Зображення: прибрати, якщо не завантажилось ---------- */
  function initImages() {
    $$('img[data-hide-onerror]').forEach(function (i) {
      var rm = function () { i.remove(); };
      i.addEventListener('error', rm);
      if (i.complete && i.naturalWidth === 0) rm();
    });
  }


  /* ---------- 9. Повні ряди карток: [data-fill] ----------
     Стрічки карток (видання, новини) завжди заповнюють ряд: зайві картки в кінці ховаються
     залежно від кількості колонок на поточній ширині; [data-rows="1"] обмежує блок одним рядом (так на головній). Не застосовувати до контенту, який не можна ховати. */
  function initFill() {
    var boxes = $$('[data-fill]');
    if (!boxes.length) return;
    function fit() {
      boxes.forEach(function (g) {
        var kids = $$(':scope > *', g);
        kids.forEach(function (k) { k.removeAttribute('data-fill-hide'); });
        g.style.gridTemplateColumns = '';
        var cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
        var vis = kids.filter(function (k) { return getComputedStyle(k).display !== 'none' && !k.hidden; });
        if (vis.length && vis.length <= cols) { g.style.gridTemplateColumns = 'repeat(' + vis.length + ', minmax(0, 1fr))'; return; }
        if (cols < 2) return;
        var rows = parseInt(g.getAttribute('data-rows'), 10);
        var keep = Math.floor(vis.length / cols) * cols;
        if (rows > 0) keep = Math.min(keep, rows * cols);
        vis.slice(keep).forEach(function (k) { k.setAttribute('data-fill-hide', ''); });
      });
    }
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 80); });
    fit();
  }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    initNav(); initTabs(); initAccordion();
    $$('[data-filter]').forEach(initFilter);
    initDocs(); initLang(); initForms(); initImages(); initFill();
  });
})();
