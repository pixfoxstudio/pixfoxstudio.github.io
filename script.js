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

  fetch('data/games.json').then(response => response.ok ? response.json() : []).then(games => {
    if (!Array.isArray(games) || !games.length) return;
    const list = document.getElementById('projects-list');
    if (!list) return;
    list.replaceChildren();
    games.forEach(game => {
      const card = make('article', 'cms-game-card');
      const copy = make('div', 'cms-game-copy');
      const label = make('div', 'project-label');
      label.append(make('span', 'online-dot'), document.createTextNode((game.status || 'PIXFOX PROJECT').toUpperCase()));
      copy.append(label, make('h3', '', game.title || 'Untitled game'), make('p', '', game.description || ''));
      if (game.platform) copy.append(make('div', 'cms-game-platform', game.platform));
      const link = safeUrl(game.storeUrl);
      if (link) {
        const anchor = make('a', 'cms-game-link', 'View game ↗');
        anchor.href = link; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; copy.append(anchor);
      }
      const visual = make('div', 'cms-game-visual');
      const imageUrl = safeUrl(game.image);
      if (imageUrl) {
        const image = make('img', 'cms-game-image'); image.src = imageUrl; image.alt = game.title || ''; image.loading = 'lazy'; visual.append(image);
      } else visual.append(make('span', 'cms-game-symbol', '✦'));
      card.append(copy, visual); list.append(card);
    });
  }).catch(() => {});

  fetch('data/news.json').then(response => response.ok ? response.json() : []).then(posts => {
    if (!Array.isArray(posts) || !posts.length) return;
    const section = document.getElementById('news'), list = document.getElementById('news-list');
    if (!section || !list) return;
    section.hidden = false;
    posts.slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).forEach(post => {
      const card = make('article', 'cms-news-card'), imageUrl = safeUrl(post.image);
      if (imageUrl) {
        const image = make('img', 'cms-news-image'); image.src = imageUrl; image.alt = ''; image.loading = 'lazy'; card.append(image);
      } else card.append(make('div', 'cms-news-placeholder', '✳'));
      const copy = make('div', 'cms-news-copy');
      copy.append(make('div', 'cms-news-meta', [post.category, post.date].filter(Boolean).join(' // ')));
      copy.append(make('h3', '', post.title || 'Studio update'));
      copy.append(make('p', '', post.excerpt || post.body || ''));
      card.append(copy); list.append(card);
    });
  }).catch(() => {});

})();