(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px 55px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
  }

  const safeUrl = value => {
    try { const url = new URL(value, location.origin); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
  };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const load = async path => {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  };
  const dateLabel = value => {
    if (!value) return '';
    const date = new Date(value + (String(value).length === 10 ? 'T12:00:00' : ''));
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const addImage = (container, value, className, alt) => {
    const src = safeUrl(value);
    if (!src) return false;
    const img = make('img', className); img.src = src; img.alt = alt || ''; img.loading = 'lazy';
    container.append(img); return true;
  };

  load('data/news.json').then(posts => {
    const list = document.getElementById('news-list');
    if (!list || !posts.length) return;
    list.replaceChildren();
    posts.filter(post => post.status !== 'draft').sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).forEach(post => {
      const card = make('article', 'cms-news-card');
      if (!addImage(card, post.image, 'cms-news-image', post.title)) card.append(make('div', 'cms-news-placeholder', '✳'));
      const copy = make('div', 'cms-news-copy');
      copy.append(make('div', 'cms-news-meta', dateLabel(post.date)));
      copy.append(make('h3', '', post.title || 'Studio update'));
      copy.append(make('p', '', post.excerpt || ''));
      if (post.body) {
        const details = make('details', 'cms-news-full');
        details.append(make('summary', '', 'Read full story'), make('p', '', post.body));
        copy.append(details);
      }
      card.append(copy); list.append(card);
    });
  });

  load('data/devlogs.json').then(posts => {
    const list = document.getElementById('devlogs-list');
    if (!list || !posts.length) return;
    list.replaceChildren();
    posts.filter(post => post.status !== 'draft').sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).forEach(post => {
      const card = make('article', 'cms-devlog-card');
      const visual = make('div', 'cms-devlog-visual');
      if (!addImage(visual, post.image, 'cms-devlog-image', post.title)) visual.append(make('span', 'cms-devlog-symbol', '✦'));
      const copy = make('div', 'cms-devlog-copy');
      copy.append(make('div', 'cms-news-meta', dateLabel(post.date)));
      copy.append(make('h3', '', post.title || 'Development diary'));
      copy.append(make('p', '', post.excerpt || ''));
      if (post.body) {
        const details = make('details', 'cms-news-full');
        details.append(make('summary', '', 'Read devlog'), make('p', '', post.body));
        copy.append(details);
      }
      card.append(visual, copy); list.append(card);
    });
  });

  load('data/games.json').then(games => {
    const list = document.getElementById('games-list');
    if (!list || !games.length) return;
    list.replaceChildren();
    games.filter(game => game.status !== 'hidden').forEach(game => {
      const card = make('article', 'cms-game-card');
      const copy = make('div', 'cms-game-copy');
      const label = make('div', 'project-label');
      label.append(make('span', 'online-dot'), document.createTextNode((game.status || 'PIXFOX GAME').toUpperCase()));
      copy.append(label, make('h3', '', game.title || 'Untitled game'), make('p', '', game.description || ''));
      if (game.platform) copy.append(make('div', 'cms-game-platform', game.platform));
      const link = safeUrl(game.storeUrl || game.url);
      if (link) {
        const anchor = make('a', 'cms-game-link', 'Discover game ↗');
        anchor.href = link; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; copy.append(anchor);
      }
      const visual = make('div', 'cms-game-visual');
      if (!addImage(visual, game.image, 'cms-game-image', game.title)) visual.append(make('span', 'cms-game-symbol', '✦'));
      card.append(copy, visual); list.append(card);
    });
  });
})();
