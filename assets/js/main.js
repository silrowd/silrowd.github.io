/* =========================================================================
   ГК «СК ПСП» — main.js
   Vanilla JS (no jQuery). Handles: mobile nav, hero slider, clients
   carousel, scroll-reveal, contact form validation, footer year.
   ========================================================================= */
(function () {
  'use strict';

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is chosen
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Hero slider ---------- */
  var hero = document.querySelector('[data-hero]');
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.hero__dot'));
    var prevBtn = hero.querySelector('[data-hero-prev]');
    var nextBtn = hero.querySelector('[data-hero-next]');
    var idx = 0;
    var timer = null;
    var DELAY = 6000;

    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === idx); });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === idx); });
      // keep the matching caption active if present
      var caps = hero.querySelectorAll('.hero__caption');
      caps.forEach(function (c, n) { c.classList.toggle('is-active', n === idx); });
    }
    function restart() {
      if (timer) { clearInterval(timer); timer = null; }
      if (!prefersReducedMotion) {
        timer = setInterval(function () { show(idx + 1); }, DELAY);
      }
    }

    dots.forEach(function (d, n) {
      d.addEventListener('click', function () { show(n); restart(); });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { show(idx - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(idx + 1); restart(); });

    // Pause on hover
    hero.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
    hero.addEventListener('mouseleave', restart);

    // Basic keyboard support when hero is focused
    hero.setAttribute('tabindex', '0');
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(idx - 1); restart(); }
      if (e.key === 'ArrowRight') { show(idx + 1); restart(); }
    });

    show(0);
    restart();
  }

  /* ---------- Clients carousel ---------- */
  var car = document.querySelector('[data-clients-carousel]');
  if (car) {
    var track = car.querySelector('.clients__track');
    var cPrev = car.querySelector('[data-clients-prev]');
    var cNext = car.querySelector('[data-clients-next]');
    var step = 0;
    var cTimer = null;

    function stepSize() {
      var item = track.querySelector('.client');
      if (!item) return 218;
      var gap = parseFloat(getComputedStyle(track).gap) || 18;
      return item.getBoundingClientRect().width + gap;
    }
    function maxStep() {
      var wrap = car.querySelector('.clients__track-wrap');
      return Math.max(0, Math.ceil((track.scrollWidth - wrap.clientWidth) / stepSize()));
    }
    function update() {
      track.style.transform = 'translateX(' + (-step * stepSize()) + 'px)';
    }
    function auto() {
      if (cTimer) clearInterval(cTimer);
      if (!prefersReducedMotion) {
        cTimer = setInterval(function () {
          step = step >= maxStep() ? 0 : step + 1;
          update();
        }, 4000);
      }
    }
    if (cPrev) cPrev.addEventListener('click', function () { step = Math.max(0, step - 1); update(); auto(); });
    if (cNext) cNext.addEventListener('click', function () { step = step >= maxStep() ? 0 : step + 1; update(); auto(); });
    car.addEventListener('mouseenter', function () { if (cTimer) clearInterval(cTimer); });
    car.addEventListener('mouseleave', auto);
    window.addEventListener('resize', function () { step = Math.min(step, maxStep()); update(); });

    update();
    auto();
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!els.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      els.forEach(function (el) { io.observe(el); });
    }
  }
  initReveal();

  /* ---------- Dynamic news (data/news.json) ---------- */
  var MONTHS = ['января','февраля','марта','апреля','мая','июня',
                'июля','августа','сентября','октября','ноября','декабря'];

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function esc(s) {
    var map = {
      '&': '&' + 'amp;',
      '<': '&' + 'lt;',
      '>': '&' + 'gt;',
      '"': '&' + 'quot;',
      "'": '&#' + '39;'
    };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return map[ch]; });
  }

  var FALLBACK_IMG = 'linear-gradient(135deg,#3f5c7a,#243b53)';

  function newsCard(n, feature) {
    var img = n.image
      ? "background-image:url('" + esc(n.image) + "');"
      : "background-image:" + FALLBACK_IMG + ";";
    var cls = 'news-item reveal' + (feature ? ' news-item--feature' : '');
    var link = n.link || 'news.html';
    var linkTxt = n.link_text || 'Подробнее';
    var html =
      '<article class="' + cls + '">' +
        '<div class="news-item__media" style="' + img + '"></div>' +
        '<div class="news-item__body">' +
          '<time class="news-item__date" datetime="' + esc(n.date) + '">' + esc(fmtDate(n.date)) + '</time>' +
          '<h3 class="news-item__title"><a href="' + esc(link) + '">' + esc(n.title) + '</a></h3>' +
          (n.text ? '<p class="news-item__text">' + esc(n.text) + '</p>' : '') +
          '<a class="news-item__read" href="' + esc(link) + '">' + esc(linkTxt) + '</a>' +
        '</div>' +
      '</article>';
    return html;
  }

  function loadNews() {
    return fetch('data/news.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('bad data');
        data.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        return data;
      });
  }

  // Full list: news.html
  var newsGrid = document.querySelector('[data-news-grid]');
  if (newsGrid) {
    loadNews().then(function (list) {
      if (!list.length) {
        newsGrid.innerHTML = '<p class="news-empty">Новости появятся совсем скоро.</p>';
        return;
      }
      newsGrid.innerHTML = list.map(function (n, i) { return newsCard(n, i === 0); }).join('');
      initReveal();
    }).catch(function () {
      newsGrid.innerHTML = '<p class="news-empty">Не удалось загрузить новости.</p>';
    });
  }

  // Home page: latest 3
  var homeNews = document.querySelector('[data-home-news]');
  if (homeNews) {
    loadNews().then(function (list) {
      var top = list.slice(0, 3);
      if (!top.length) {
        homeNews.innerHTML = '<p class="news-empty">Новости появятся совсем скоро.</p>';
        return;
      }
      homeNews.innerHTML = top.map(function (n, i) { return newsCard(n, i === 0); }).join('');
      initReveal();
    }).catch(function () {
      homeNews.innerHTML = '<p class="news-empty">Не удалось загрузить новости.</p>';
    });
  }

  /* ---------- Contact form (client-side validation only) ---------- */
  var form = document.querySelector('[data-form]');
  if (form) {
    var status = form.querySelector('.form-status');

    function setInvalid(field, invalid) {
      field.classList.toggle('invalid', invalid);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      // name
      var nameField = form.querySelector('[data-field="name"]');
      var nameInput = nameField.querySelector('input');
      if (nameInput.value.trim().length < 2) { setInvalid(nameField, true); ok = false; }
      else { setInvalid(nameField, false); }

      // phone
      var phoneField = form.querySelector('[data-field="phone"]');
      var phoneInput = phoneField.querySelector('input');
      var phoneDigits = phoneInput.value.replace(/\D/g, '');
      if (phoneDigits.length < 10) { setInvalid(phoneField, true); ok = false; }
      else { setInvalid(phoneField, false); }

      // message (optional)
      var msgField = form.querySelector('[data-field="message"]');
      if (msgField) setInvalid(msgField, false);

      // privacy
      var privacy = form.querySelector('[data-field="privacy"] input');
      if (privacy && !privacy.checked) {
        if (status) { status.className = 'form-status err'; status.textContent = 'Необходимо согласие на обработку персональных данных.'; }
        ok = false;
      }

      if (ok) {
        // Prototype: no backend yet. In the Laravel build this POSTs to
        // POST /contacts (Route::post) and stores a `messages` row.
        if (status) {
          status.className = 'form-status ok';
          status.textContent = 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.';
        }
        form.reset();
      }
    });

    // Clear invalid state while typing
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();