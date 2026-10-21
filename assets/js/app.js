/* Aurum Motors — интерактив без зависимостей.
   Данные об авто приходят из PHP (window.AURUM), логика расчётов совпадает с прототипом. */
(function () {
  'use strict';
  var D = window.AURUM, RATE = D.rate;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU'); };
  var monthly = function (p, down, months, apr) {
    down = down == null ? 0.2 : down; months = months || 60; apr = apr == null ? 0.14 : apr;
    var r = apr / 12, s = p * (1 - down);
    return (s * r) / (1 - Math.pow(1 + r, -months));
  };
  var param = function (k) { return new URLSearchParams(location.search).get(k); };

  /* ---------- главная ---------- */
  function initHome() {
    // подбор
    var sel = null, price = $('#f-price'), year = $('#f-year');
    function updateFilter() {
      var maxP = +price.value, minY = +year.value;
      $('#f-price-val').textContent = '$' + fmt(maxP);
      $('#f-year-val').textContent = String(minY);
      var n = D.cars.filter(function (c) { return (!sel || c.body === sel) && c.price <= maxP && c.year >= minY; }).length * 9 + (sel ? 2 : 3);
      $('#f-count').textContent = n; $('#f-count2').textContent = n;
      var q = new URLSearchParams({ price: maxP, year: minY });
      if (sel) q.set('body', sel);
      $('#f-link').href = 'catalog.html?' + q.toString();
    }
    $$('[data-body-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        $$('[data-body-btn]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        sel = on ? null : b.dataset.bodyBtn;
        if (!on) b.setAttribute('aria-pressed', 'true');
        updateFilter();
      });
    });
    price.addEventListener('input', updateFilter); year.addEventListener('input', updateFilter);
    updateFilter();

    // оценка / trade-in
    var step = 0, cond = 'Отличное';
    var panes = $$('.ti-pane'), stepBtns = $$('#ti-steps [data-step]'), next = $('#ti-next');
    function val(n) { var i = $('[name="' + n + '"]'); return i ? i.value.trim() : ''; }
    function tiMessage() {
      var car = [val('brand'), val('model'), val('year')].filter(Boolean).join(' ');
      var t = 'Здравствуйте! Хочу оценить авто: ' + (car || 'марка не указана') + (val('km') ? ', пробег ' + val('km') + ' км' : '') + '. Состояние: ' + cond + '.' + (val('phone') ? ' Телефон: ' + val('phone') : '');
      $('#ti-wa').href = D.whatsapp + '?text=' + encodeURIComponent(t);
    }
    function showStep(i) {
      step = i;
      panes.forEach(function (p) { p.hidden = +p.dataset.pane !== i; });
      stepBtns.forEach(function (b, k) { b.classList.toggle('is-reached', k <= i); b.classList.toggle('is-current', k === i); });
      next.hidden = i >= 2;
      tiMessage();
    }
    stepBtns.forEach(function (b, k) { b.addEventListener('click', function () { showStep(k); }); });
    next.addEventListener('click', function () { showStep(step + 1); });
    $$('.cond').forEach(function (b) {
      b.addEventListener('click', function () {
        cond = b.dataset.cond;
        $$('.cond').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        tiMessage();
      });
    });
    $$('.ti-pane input').forEach(function (i) { i.addEventListener('input', tiMessage); });
    showStep(0);

    // кредит
    var sum = $('#c-sum'), down = $('#c-down'), term = $('#c-term');
    function updateCredit() {
      var s = +sum.value, d = +down.value, t = +term.value, pay = monthly(s, d / 100, t);
      $('#c-sum-val').textContent = '$' + fmt(s);
      $('#c-down-val').textContent = d + '% · $' + fmt(s * d / 100);
      $('#c-term-val').textContent = t + ' мес';
      $('#c-pay').textContent = '$' + fmt(pay);
      $('#c-pay-byn').textContent = '≈ ' + fmt(pay * RATE) + ' BYN / мес · ставка от 14%';
      $('#c-cta').href = D.whatsapp + '?text=' + encodeURIComponent('Здравствуйте! Хочу предварительное одобрение: авто $' + fmt(s) + ', взнос ' + d + '%, срок ' + t + ' мес (платёж ≈ $' + fmt(pay) + '/мес).');
    }
    [sum, down, term].forEach(function (i) { i.addEventListener('input', updateCredit); });
    updateCredit();
  }

  /* ---------- каталог ---------- */
  function initCatalog() {
    var grid = $('#cat-grid'), cards = $$('.car-card', grid), empty = $('#cat-empty');
    var defaults = { q: '', brand: 'all', body: 'all', price: 100000, year: 2015, sort: 'default' };
    var f = Object.assign({}, defaults);
    var el = { q: $('#cf-q'), brand: $('#cf-brand'), body: $('#cf-body'), price: $('#cf-price'), year: $('#cf-year'), sort: $('#cf-sort') };

    // стартовые значения из ссылки (например, с главной: ?body=Седан&price=50000&year=2020)
    var pb = param('body'), pp = +param('price'), py = +param('year'), pq = param('q'), pbr = param('brand');
    if (pb && $$('option', el.body).some(function (o) { return o.value === pb || o.textContent === pb; })) f.body = pb;
    if (pbr && $$('option', el.brand).some(function (o) { return o.textContent === pbr; })) f.brand = pbr;
    if (pp >= 15000 && pp <= 100000) f.price = pp;
    if (py >= 2015 && py <= 2024) f.year = py;
    if (pq) f.q = pq;

    function render() {
      var q = f.q.trim().toLocaleLowerCase('ru-RU');
      var list = cards.filter(function (c) {
        return c.dataset.name.toLocaleLowerCase('ru-RU').indexOf(q) !== -1
          && (f.brand === 'all' || c.dataset.brand === f.brand)
          && (f.body === 'all' || c.dataset.body === f.body)
          && +c.dataset.price <= f.price && +c.dataset.year >= f.year;
      });
      var by = {
        'price-asc': function (a, b) { return a.dataset.price - b.dataset.price; },
        'price-desc': function (a, b) { return b.dataset.price - a.dataset.price; },
        'year': function (a, b) { return b.dataset.year - a.dataset.year; },
        'km': function (a, b) { return a.dataset.km - b.dataset.km; }
      };
      var sorted = list.slice().sort(by[f.sort] || function (a, b) { return a.dataset.index - b.dataset.index; });
      cards.forEach(function (c) { c.hidden = list.indexOf(c) === -1; });
      sorted.forEach(function (c) { grid.appendChild(c); });
      $('#cf-count').textContent = list.length;
      grid.hidden = !list.length; empty.hidden = !!list.length;
      $('#cf-price-val').textContent = '$' + fmt(f.price);
      $('#cf-year-val').textContent = String(f.year);
      var active = f.q !== '' || f.brand !== 'all' || f.body !== 'all' || f.price !== defaults.price || f.year !== defaults.year;
      $('#cf-reset').hidden = !active;
    }
    function sync() { Object.keys(el).forEach(function (k) { el[k].value = f[k]; }); render(); }
    Object.keys(el).forEach(function (k) {
      el[k].addEventListener('input', function () { f[k] = (k === 'price' || k === 'year') ? +el[k].value : el[k].value; render(); });
    });
    function reset() { f = Object.assign({}, defaults); sync(); }
    $('#cf-reset').addEventListener('click', reset); $('#cf-reset2').addEventListener('click', reset);
    sync();

    // превью авто (нативный <dialog> с анимацией как в прототипе)
    var dlg = $('#car-dialog'), lastFocus = null;
    function open(id) {
      var c = D.cars.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      $('#dlg-title').textContent = c.name;
      $('#dlg-desc').textContent = c.body + ' · ' + c.year + ' год · ' + fmt(c.km) + ' км · ' + c.vol;
      var img = $('#dlg-img'); img.src = c.img; img.alt = c.name;
      $('#dlg-usd').textContent = '$' + fmt(c.price);
      $('#dlg-byn').textContent = fmt(c.price * RATE) + ' BYN';
      lastFocus = document.activeElement;
      dlg.classList.remove('is-closing');
      if (!dlg.open) dlg.showModal();
      $('.dialog__content', dlg).focus({ preventScroll: true });
    }
    function close() {
      if (!dlg.open || dlg.classList.contains('is-closing')) return;
      var done = function () { dlg.classList.remove('is-closing'); dlg.close(); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
      dlg.classList.add('is-closing');
      dlg.addEventListener('animationend', function h(e) { if (e.target === dlg) { dlg.removeEventListener('animationend', h); done(); } });
    }
    grid.addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) open(b.dataset.view); });
    $('#dlg-close').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });      // клик по затемнению
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });         // Esc
    var v = param('view'); if (v) open(v);
  }

  var page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'catalog') initCatalog();
})();

