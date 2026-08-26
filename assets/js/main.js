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
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var stagger = parseInt(el.getAttribute('data-stagger'), 10);
        if (stagger > 0) {
          // Каскад: задержка задаётся только пока идёт появление
          el.classList.add('is-revealing');
          var kids = el.children;
          for (var i = 0; i < kids.length && i < 12; i++) {
            kids[i].style.transitionDelay = (i * stagger) + 'ms';
          }
          el.classList.add('is-visible');
          var clear = function () {
            el.classList.remove('is-revealing');
            for (var j = 0; j < kids.length; j++) kids[j].style.transitionDelay = '';
            el.removeEventListener('transitionend', clear);
          };
          el.addEventListener('transitionend', clear);
          setTimeout(clear, stagger * 12 + 1600);
          return;
        }
        el.classList.add('is-visible');
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
  initReveal();

  /* ---------- Hero parallax ---------- */
  function initHeroParallax() {
    if (prefersReducedMotion) return;
    var hero = document.querySelector('.hero');
    var bg = hero && hero.querySelector('.hero__bg');
    if (!bg) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var rect = hero.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        var progress = Math.min(Math.max(-rect.top / (rect.height || 1), -1), 1);
        bg.style.transform = 'translate3d(0,' + (progress * -46).toFixed(1) + 'px,0)';
      });
    }
    bg.style.willChange = 'transform';
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  initHeroParallax();

  /* ---------- Header shadow on scroll ---------- */
  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  initHeaderScroll();

  /* ---------- Smooth anchor scroll (offset for sticky header) ---------- */
  function initSmoothAnchors() {
    if (!('scrollBehavior' in document.documentElement.style)) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      if (history.pushState) history.pushState(null, '', hash);
    });
  }
  initSmoothAnchors();

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

  // Ссылка на полную новость: ссылка из админки, а если её нет — страница
  // новостей с ?id= (полный текст рендерится из news.json в новом окне)
  function newsFullUrl(n) {
    return n.link ? n.link : 'news?id=' + encodeURIComponent(n.id);
  }

  // Короткий текст для карточки: без markdown-разметки, до ~200 символов
  function newsExcerpt(text, max) {
    max = max || 200;
    var t = String(text || '')
      .replace(/^#{1,6}\s+/gm, '')            // заголовки
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')   // картинки
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // ссылки → текст
      .replace(/[*_`~]+/g, '')                // жирный/курсив/код
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length <= max) return t;
    var cut = t.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    if (sp > max * 0.6) cut = cut.slice(0, sp);
    return cut + '…';
  }

  function newsCard(n, feature) {
    var img = n.image
      ? "background-image:url('" + esc(n.image) + "');"
      : "background-image:" + FALLBACK_IMG + ";";
    var cls = 'news-item reveal' + (feature ? ' news-item--feature' : '');
    var linkTxt = n.link_text || 'Читать полностью';
    // Полная новость открывается в новом окне (всегда есть куда вести)
    var fullUrl = newsFullUrl(n);
    var newWin = ' target="_blank" rel="noopener"';
    var titleHtml = '<a href="' + esc(fullUrl) + '"' + newWin + '>' + esc(n.title) + '</a>';
    var excerpt = newsExcerpt(n.text);
    var readHtml = '<a class="news-item__read" href="' + esc(fullUrl) + '"' + newWin + '>' + esc(linkTxt) + '</a>';
    var html =
      '<article class="' + cls + '">' +
        '<div class="news-item__media" style="' + img + '"></div>' +
        '<div class="news-item__body">' +
          '<time class="news-item__date" datetime="' + esc(n.date) + '">' + esc(fmtDate(n.date)) + '</time>' +
          '<h3 class="news-item__title">' + titleHtml + '</h3>' +
          (excerpt ? '<p class="news-item__text">' + esc(excerpt) + '</p>' : '') +
          readHtml +
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
        // новые сверху; при равной дате — по id (больше id = создана позже)
        data.sort(function (a, b) {
          var da = String(a.date || ''), db = String(b.date || '');
          if (da !== db) return db.localeCompare(da);
          return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
        });
        return data;
      });
  }

  /* Мини-рендер markdown из текста новости (безопасно: всё экранируется,
     разрешены только наши теги: h2/h3, p, ul, li, strong, em, code, a, img) */
  function renderNewsText(raw) {
    var lines = String(raw || '').split(/\r?\n/);
    var html = '';
    var inList = false;
    var para = [];

    function inline(s) {
      var out = esc(s);
      out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
        if (/^(javascript|data):/i.test(src)) return '';
        return '<img src="' + src + '" alt="' + alt + '" style="width:100%;height:auto;border-radius:8px;margin:14px 0;">';
      });
      out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
        if (/^(javascript|data):/i.test(href)) return txt;
        return '<a href="' + href + '" target="_blank" rel="noopener">' + txt + '</a>';
      });
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
      return out;
    }
    function flushPara() {
      if (para.length) {
        html += '<p>' + inline(para.join(' ')) + '</p>';
        para = [];
      }
    }
    function closeList() {
      if (inList) { html += '</ul>'; inList = false; }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { flushPara(); closeList(); continue; }
      var h = line.match(/^#{1,6}\s+(.*)/);
      if (h) {
        flushPara(); closeList();
        html += '<h2>' + inline(h[1]) + '</h2>';
        continue;
      }
      var li = line.match(/^\s*[-*+]\s+(.*)/);
      if (li) {
        flushPara();
        if (!inList) { html += '<ul class="list">'; inList = true; }
        html += '<li>' + inline(li[1]) + '</li>';
        continue;
      }
      closeList();
      para.push(line.trim());
    }
    flushPara();
    closeList();
    return html;
  }

  /* Полная новость: ?id= на странице новостей (для новостей из админки
     без отдельной HTML-страницы). Рендерим статью вместо списка. */
  function renderArticle(list, id) {
    var n = null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) { n = list[i]; break; }
    }
    var main = document.querySelector('main');
    if (!main) return false;

    if (!n) {
      main.innerHTML =
        '<div class="container" style="padding:60px 20px;text-align:center;">' +
          '<h1 style="font-size:20px;">Новость не найдена</h1>' +
          '<p style="margin-top:12px;"><a class="btn btn--ghost" href="news">← Все новости</a></p>' +
        '</div>';
      document.title = 'Новость не найдена — СК ПСП';
      return true;
    }

    var d = new Date(n.date + 'T00:00:00');
    var dateStr = isNaN(d.getTime()) ? esc(n.date) : esc(fmtDate(n.date));
    main.innerHTML =
      '<div class="page-hero"><div class="container">' +
        '<h1>' + esc(n.title) + '</h1>' +
        '<p>' + dateStr + ' · Новость компании</p>' +
      '</div></div>' +
      '<nav class="breadcrumbs" aria-label="Хлебные крошки" style="background:#fff;border-bottom:1px solid var(--border);">' +
        '<div class="container">' +
          '<a href="index">Главная</a><span class="sep">/</span>' +
          '<a href="news">Новости</a><span class="sep">/</span>' +
          '<span class="current">' + esc(n.title) + '</span>' +
        '</div>' +
      '</nav>' +
      '<section class="section"><div class="container">' +
        '<article class="prose reveal news-article">' +
          (n.image ? '<figure class="news-article__photo"><img src="' + esc(n.image) + '" alt="' + esc(n.title) + '"></figure>' : '') +
          renderNewsText(n.text) +
          '<p style="margin-top:28px;"><a class="btn btn--ghost" href="news">← Все новости</a></p>' +
        '</article>' +
      '</div></section>' +
      '<section class="section"><div class="container">' +
        '<div class="cta-band reveal">' +
          '<div>' +
            '<h2>Есть вопрос по проекту?</h2>' +
            '<p>Оставьте заявку — ответим в течение рабочего дня.</p>' +
          '</div>' +
          '<a class="btn" href="contacts">Оставить заявку</a>' +
        '</div>' +
      '</div></section>';
    document.title = n.title + ' — Новости | СК ПСП';
    window.scrollTo(0, 0);
    initReveal();
    return true;
  }

  // Full list: news (или полная новость по ?id=)
  var newsGrid = document.querySelector('[data-news-grid]');
  if (newsGrid) {
    loadNews().then(function (list) {
      var q = new URLSearchParams(window.location.search);
      var idParam = q.get('id');
      if (idParam !== null && renderArticle(list, idParam)) return;

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

  // Home page: latest 4
  var homeNews = document.querySelector('[data-home-news]');
  if (homeNews) {
    loadNews().then(function (list) {
      var top = list.slice(0, 4);
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

  /* ---------- Contact form (локальный бэкенд api/contact.php, без сторонних сервисов) ---------- */
  var form = document.querySelector('[data-form]');
  if (form) {
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');
    var FORM_ENDPOINT = 'api/contact.php';

    function setInvalid(field, invalid) {
      field.classList.toggle('invalid', invalid);
    }

    function setStatus(type, text) {
      if (!status) return;
      status.className = 'form-status' + (type ? ' ' + type : '');
      status.textContent = text || '';
    }

    function setLoading(on) {
      if (!submitBtn) return;
      submitBtn.disabled = on;
      var label = submitBtn.querySelector('.btn__loading');
      if (label) label.hidden = !on;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // honeypot: боты заполняют скрытое поле — тихо «принимаем» и не отправляем
      var hp = form.querySelector('[name="website"]');
      if (hp && hp.value.trim() !== '') {
        setStatus('ok', 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.');
        form.reset();
        return;
      }

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
      var msgInput = msgField ? msgField.querySelector('textarea') : null;

      // privacy
      var privacy = form.querySelector('[data-field="privacy"] input');
      if (privacy && !privacy.checked) {
        setStatus('err', 'Необходимо согласие на обработку персональных данных.');
        ok = false;
      }

      if (!ok) return;

      setLoading(true);
      setStatus('', '');

      var payload = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        message: msgInput ? msgInput.value.trim() : '',
        consent: privacy ? privacy.checked : false,
        website: hp ? hp.value : '',
        page: window.location.pathname
      };

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (res) {
        if (!res || res.success === false) {
          // Серверная валидация: подсвечиваем поле с ошибкой (если указана)
          if (res && res.field) {
            if (res.field === 'name') setInvalid(nameField, true);
            else if (res.field === 'phone') setInvalid(phoneField, true);
            else if (res.field === 'message') setInvalid(msgField, true);
            setStatus('err', res.message || 'Проверьте поля формы.');
            return;
          }
          throw new Error('Form error');
        }
        form.reset();
        setStatus('ok', 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.');
      })
      .catch(function () {
        setStatus('err', 'Не удалось отправить заявку. Попробуйте ещё раз позже или напишите нам на bik-m@mail.ru.');
      })
      .then(function () {
        setLoading(false);
      });
    });

    // Clear invalid state while typing
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
    });
  }

  /* ---------- Print button (vacancy pages) ---------- */
  var printBtn = document.querySelector('[data-print]');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      var article = document.querySelector('.prose');
      var title = document.querySelector('.page-hero h1');
      if (!article) { window.print(); return; }

      // Text-only copy: drop images, icons and other non-text elements
      var clone = article.cloneNode(true);
      clone.querySelectorAll('img, svg, .hr-block, .service-media').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });

      var t = title ? title.textContent.trim() : 'Вакансия';
      var doc =
        '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n' +
        '<title>Вакансия «' + t + '» — СК ПСП</title>\n<style>' +
        'body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:40px auto;max-width:720px;line-height:1.55;font-size:14px;}' +
        'h1{font-size:24px;margin:0 0 4px;}' +
        '.meta{color:#444;font-size:12px;margin:0 0 18px;border-bottom:1px solid #000;padding-bottom:12px;}' +
        'h2{font-size:17px;margin:22px 0 8px;}' +
        'p{margin:0 0 10px;}' +
        'ul{margin:0 0 12px;padding-left:20px;}' +
        'li{margin-bottom:6px;}' +
        'a{color:#000;text-decoration:none;}' +
        '</style></head><body>' +
        '<h1>' + t + '</h1>' +
        '<p class="meta">Строительная компания «СК ПСП» · Санкт-Петербург · Тел: +7 (812) 388-63-71</p>' +
        clone.innerHTML +
        '<script>window.onload=function(){window.print();}<\/script>' +
        '</body></html>';

      var win = window.open('', '_blank');
      if (!win) { window.print(); return; }
      win.document.open();
      win.document.write(doc);
      win.document.close();
    });
  }

  /* ---------- Certificate lightbox ---------- */
  var lbRoot = document.querySelector('[data-lightbox]');
  if (lbRoot) {
    var lbItems = Array.prototype.slice.call(lbRoot.querySelectorAll('[data-full]'));
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Просмотр сертификата');
    lb.innerHTML =
      '<button type="button" class="lightbox__close" aria-label="Закрыть">×</button>' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Предыдущее">‹</button>' +
      '<figure class="lightbox__figure">' +
        '<img class="lightbox__img" alt="">' +
        '<figcaption class="lightbox__caption"></figcaption>' +
      '</figure>' +
      '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Следующее">›</button>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lightbox__img');
    var lbCap = lb.querySelector('.lightbox__caption');
    var lbClose = lb.querySelector('.lightbox__close');
    var lbPrev = lb.querySelector('.lightbox__nav--prev');
    var lbNext = lb.querySelector('.lightbox__nav--next');
    var lbCur = 0;
    var lbLastFocus = null;

    function lbShow(i) {
      lbCur = (i + lbItems.length) % lbItems.length;
      var btn = lbItems[lbCur];
      lbImg.src = btn.getAttribute('data-full');
      lbImg.alt = btn.getAttribute('aria-label') || 'Сертификат';
      lbCap.textContent = (btn.getAttribute('aria-label') || 'Сертификат') +
        ' · ' + (lbCur + 1) + ' / ' + lbItems.length;
      lb.classList.add('is-open');
      lbClose.focus();
    }
    function lbCloseFn() {
      lb.classList.remove('is-open');
      lbImg.removeAttribute('src');
      if (lbLastFocus) lbLastFocus.focus();
    }

    lbItems.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        lbLastFocus = btn;
        lbShow(i);
      });
    });
    lbClose.addEventListener('click', lbCloseFn);
    lbPrev.addEventListener('click', function () { lbShow(lbCur - 1); });
    lbNext.addEventListener('click', function () { lbShow(lbCur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbCloseFn(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') lbCloseFn();
      else if (e.key === 'ArrowLeft') lbShow(lbCur - 1);
      else if (e.key === 'ArrowRight') lbShow(lbCur + 1);
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();