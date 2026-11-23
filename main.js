// FRŪT — interactions & motion
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- split headlines into words / letters ---------- */
  $$('[data-split]').forEach((el) => {
    const mode = el.dataset.split || 'words';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const nodes = [...el.childNodes];
    el.textContent = '';
    const wrap = (child) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      w.append(child);
      el.append(w);
    };
    nodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { el.append(' '); return; }
          if (mode === 'chars') {
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            [...tok].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              c.style.setProperty('--i', i++);
              w.append(c);
            });
            el.append(w);
          } else {
            const s = document.createElement('span');
            s.className = 'wi';
            s.textContent = tok;
            s.style.setProperty('--i', i++);
            wrap(s);
          }
        });
      } else if (n.nodeName === 'BR') {
        el.append(n);
      } else {
        const s = document.createElement('span');
        s.className = 'wi';
        s.style.setProperty('--i', i++);
        s.append(n);
        wrap(s);
      }
    });
  });

  /* ---------- rolling labels on big nav links ---------- */
  $$('.footer-nav a, .menu a').forEach((a) => {
    const t = a.textContent.trim();
    a.classList.add('roll');
    a.textContent = '';
    const s = document.createElement('span');
    s.dataset.text = t;
    s.textContent = t;
    a.append(s);
  });

  /* ---------- nav + menu ---------- */
  const nav = $('#nav');
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('open'))); }
    else { menu.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, reduce ? 0 : 700); }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- count-up numbers ---------- */
  const countUp = (b) => {
    const to = +b.dataset.count, from = +(b.dataset.from || 0), suf = b.dataset.suffix || '';
    if (reduce) { b.textContent = to + suf; return; }
    const t0 = performance.now(), dur = 1500;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      b.textContent = Math.round(lerp(from, to, e)) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- cart route: draw the path, drive the mascot along it ---------- */
  const route = $('.cart-route');
  const startRoute = () => {
    route.classList.add('go');
    const motion = $('#routeMotion');
    if (reduce || !motion || !motion.beginElement) {
      $('#routePin').setAttribute('transform', 'translate(370 70)');
      route.classList.add('arrived');
      return;
    }
    motion.beginElement();
    setTimeout(() => route.classList.add('arrived'), 2400);
  };

  /* ---------- reveal on scroll ---------- */
  const onIn = (el) => {
    el.classList.add('in');
    if (el.matches('.stats')) $$('[data-count]', el).forEach(countUp);
    if (el === route) startRoute();
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { onIn(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  const startReveals = () => $$('.reveal, [data-split], .img-reveal, .cart-head').forEach((el) => io.observe(el));

  /* ---------- intro loader ---------- */
  const loader = $('#loader');
  const root = document.documentElement;
  if (!loader || root.classList.contains('no-intro')) {
    loader && loader.remove();
    startReveals();
  } else {
    root.classList.add('is-loading');
    try { sessionStorage.setItem('frut-intro', '1'); } catch (e) {}
    setTimeout(() => {
      loader.classList.add('done');
      root.classList.remove('is-loading');
      setTimeout(startReveals, 250);
      setTimeout(() => loader.remove(), 1100);
    }, 1500);
  }

  /* ---------- scroll + pointer driven motion (one rAF loop) ---------- */
  const progress = $('#progress');
  const bleedImg = $('[data-parallax]');
  const t1 = $('#t1'), t2 = $('#t2'), story = $('#story');
  const ticker = $('.ticker-track'), ring = $('.ring');
  const pxEls = $$('[data-speed]').map((el) => ({ el, speed: +el.dataset.speed, mouse: +(el.dataset.mouse || 0), sec: el.closest('section') }));
  const social = $('#social');
  let lastY = scrollY, vel = 0, ringAngle = 0, tickerX = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  if (social) {
    social.addEventListener('pointermove', (e) => {
      const r = social.getBoundingClientRect();
      tmx = (e.clientX - r.left) / r.width - 0.5;
      tmy = (e.clientY - r.top) / r.height - 0.5;
    });
    social.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
  }

  // the ticker is driven from JS so its speed and direction follow scrolling
  if (!reduce && ticker) ticker.style.animation = 'none';

  const frame = () => {
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 40);

    const dy = y - lastY; lastY = y;
    vel = lerp(vel, dy, 0.12);

    if (!reduce) {
      // full-bleed photo parallax
      if (bleedImg) {
        const r = bleedImg.parentElement.getBoundingClientRect();
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        bleedImg.style.transform = `translateY(${(-10 + p * 10).toFixed(2)}%)`;
      }
      // arc headline slides along its curve as you scroll past
      if (t1 && story) {
        const r = story.getBoundingClientRect();
        const p = clamp((r.top + r.height / 2 - vh / 2) / vh, -0.8, 0.8);
        t1.setAttribute('startOffset', `${(50 + p * 28).toFixed(2)}%`);
        t2.setAttribute('startOffset', `${(50 - p * 28).toFixed(2)}%`);
      }
      // pointer easing
      mx = lerp(mx, tmx, 0.08); my = lerp(my, tmy, 0.08);
      // element parallax
      pxEls.forEach(({ el, speed, mouse, sec }) => {
        const r = (sec || el).getBoundingClientRect();
        const off = (r.top + r.height / 2 - vh / 2) * -speed;
        const ox = mouse ? mx * mouse : 0, oy = mouse ? my * mouse : 0;
        el.style.translate = `${ox.toFixed(1)}px ${(off + oy).toFixed(1)}px`;
      });
      // ticker: base drift + scroll velocity (reverses when scrolling up)
      if (ticker) {
        const half = ticker.scrollWidth / 2;
        tickerX -= 0.6 + clamp(vel, -40, 40) * 0.35;
        if (tickerX <= -half) tickerX += half;
        if (tickerX > 0) tickerX -= half;
        ticker.style.transform = `translateX(${tickerX.toFixed(1)}px)`;
      }
      // text ring spins faster while scrolling
      if (ring) {
        ringAngle += 0.15 + Math.abs(clamp(vel, -40, 40)) * 0.08;
        ring.style.transform = `rotate(${ringAngle % 360}deg)`;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ---------- flavour lineup ---------- */
  const flavours = [
    { name: 'Strawberry', img: 'strawberry-close.jpg', bg: '#FEB7D9',
      text: 'Ripe strawberries, blended and frozen on a stick. The one that started the cravings.' },
    { name: 'Mango', img: 'mango-ice.jpg', bg: '#F6B52E', pos: '50% 40%',
      text: 'Indian mangoes at their sunniest. Thick, golden and nothing else.' },
    { name: 'Musk Melon', img: 'melon-pop.jpg', bg: '#F9C79B', pos: '50% 30%',
      text: 'Soft, mellow musk melon. Clean, quietly sweet, built for Ahmedabad afternoons.' },
    { name: 'Guava', img: 'guava-bite.jpg', bg: '#C9DD8A', pos: '58% 22%',
      text: 'Pink guava, tangy and bright. Tastes like the fruit cart down the road.' },
    { name: 'Chikoo', img: 'logo-chikoo.jpg', bg: '#E0B48A',
      text: 'Caramel-soft chikoo — nature’s own dessert, frozen.' },
    { name: 'Banana', img: 'logo-banana.jpg', bg: '#F7E27A',
      text: 'Ripe bananas, creamy without a drop of cream.' },
  ];
  const sec = $('#lineup');
  const flower = $('.flower');
  const img = $('#lineImg');
  const nameEl = $('#lineName');
  const desc = $('#lineDesc');
  const prevSideBtn = $('#prevSide'), nextSideBtn = $('#nextSide');
  const prevSide = $('img', prevSideBtn), nextSide = $('img', nextSideBtn);
  const dots = $('#dots');
  const src = (f) => `assets/img/${f.img}`;
  let i = 0, spin = 0;

  flavours.forEach((f, k) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', f.name);
    b.addEventListener('click', () => go(k, k > i ? 1 : -1));
    dots.appendChild(b);
    new Image().src = src(f); // preload
  });

  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function render(animate) {
    const f = flavours[i];
    const n = flavours.length;
    sec.style.setProperty('--bg', f.bg);
    img.src = src(f);
    img.alt = `${f.name} FRŪT`;
    img.style.objectPosition = f.pos || '50% 50%';
    nameEl.textContent = f.name;
    desc.textContent = f.text;
    const p = flavours[(i - 1 + n) % n], q = flavours[(i + 1) % n];
    prevSide.src = src(p); prevSide.style.objectPosition = p.pos || '50% 50%';
    nextSide.src = src(q); nextSide.style.objectPosition = q.pos || '50% 50%';
    [...dots.children].forEach((d, k) => d.setAttribute('aria-selected', k === i));
    if (animate) {
      replay(nameEl, 'pop');
      replay(desc, 'fade');
      replay(prevSideBtn, 'bump');
      replay(nextSideBtn, 'bump');
    }
  }
  function go(k, dir = 1) {
    i = (k + flavours.length) % flavours.length;
    if (reduce) return render(false);
    // the flower outline spins a quarter turn (it has 4-fold symmetry); the photo counter-rotates to stay upright
    spin += 90 * dir;
    flower.style.rotate = `${spin}deg`;
    img.style.rotate = `${-spin}deg`;
    img.classList.add('swap');
    setTimeout(() => { render(true); requestAnimationFrame(() => img.classList.remove('swap')); }, 240);
  }
  $('#prevBtn').addEventListener('click', () => go(i - 1, -1));
  $('#nextBtn').addEventListener('click', () => go(i + 1, 1));
  prevSideBtn.addEventListener('click', () => go(i - 1, -1));
  nextSideBtn.addEventListener('click', () => go(i + 1, 1));
  sec.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(i - 1, -1);
    if (e.key === 'ArrowRight') go(i + 1, 1);
  });
  let sx = null;
  sec.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  sec.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    sx = null;
  });
  render(false);

  /* ---------- newsletter: front-end only until a form service is connected ---------- */
  const form = $('#news');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    $('.news-row', form).hidden = true;
    $('#newsOk').hidden = false;
  });
})();
