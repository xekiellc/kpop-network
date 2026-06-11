/* ============================================================
   KPOP NETWORK — app.js
   16 completely different layout experiences
   ============================================================ */

'use strict';

const SITES_CONFIG_URL = '/sites.json';
const DATA_BASE_URL = '/data';
const ARTICLES_PER_PAGE = 12;

let state = {
  site: null,
  allGroups: [],
  hubeGroups: [],
  activeGroup: 'all',
  activeTab: 'news',
  articles: [],
  videos: [],
  community: [],
  archive: [],
  articlesPage: 1,
  isLoading: false,
  lastUpdatedAt: null,
  splitSelected: null,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const config = await fetchJSON(SITES_CONFIG_URL);
    const hostname = getHostname();
    const site = config.sites.find(s => s.domain === hostname)
      || config.sites.find(s => s.domain === 'armypulse.com');

    state.site = site;
    state.allGroups = config.groups;
    state.hubeGroups = config.hubeGroups || [];

    applyTheme(site);
    applyMeta(site);
    document.body.setAttribute('data-layout', site.type);

    renderHeader(site);
    runEntryAnimation(site);
    await initLayout(site, config);

  } catch (err) {
    console.error('Init error:', err);
    renderError();
  }
}

// ── HOSTNAME ───────────────────────────────────────────────
function getHostname() {
  const host = window.location.hostname.replace('www.', '');
  if (host === 'localhost' || host === '127.0.0.1' || host.includes('netlify.app')) {
    return 'armypulse.com';
  }
  return host;
}

// ── LAYOUT ROUTER ──────────────────────────────────────────
async function initLayout(site, config) {
  const type = site.type;

  if (type === 'terminal') {
    hideStandardLayout();
    document.getElementById('hub-layout').style.display = 'flex';
    initTerminalLayout(site, config.groups);
    return;
  }

  if (type === 'splitscreen') {
    hideStandardLayout();
    document.getElementById('split-layout').style.display = 'flex';
    document.getElementById('tab-bar').style.display = 'none';
    initSplitLayout(site, config.groups);
    return;
  }

  if (type === 'podcast') {
    document.getElementById('group-strip').style.display = 'none';
    setupTabs();
    setupMobileMenu();
    await loadTabContent('podcast');
    return;
  }

  // Standard layouts: magazine, musicblog, luxury, nation, world,
  // hype, breakingnews, social, pinterest, timeline
  if (type !== 'magazine' && type !== 'musicblog') {
    renderGroupStrip(site, config.groups);
  } else {
    document.getElementById('group-strip').style.display = 'none';
  }

  if (type === 'breakingnews') {
    document.getElementById('breaking-ticker').style.display = 'flex';
  }

  setupTabs();
  setupMobileMenu();
  await loadTabContent('news');
  updateStats();
}

function hideStandardLayout() {
  document.getElementById('group-strip').style.display = 'none';
  document.getElementById('tab-bar').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';
}

// ── ENTRY ANIMATIONS ───────────────────────────────────────
function runEntryAnimation(site) {
  const type = site.type;

  if (type === 'magazine' || type === 'luxury' || type === 'nation') {
    // Elegant slow reveal
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(10px)';
    document.body.style.transition = 'opacity 1s ease, transform 1s ease';
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    }, 100);

  } else if (type === 'terminal') {
    // Terminal boot sequence
    runTerminalBoot();

  } else if (type === 'musicblog') {
    // Flash cut — stark
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 50);

  } else if (type === 'hype' || type === 'social') {
    // Bouncy pop
    document.body.style.opacity = '0';
    document.body.style.transform = 'scale(0.96)';
    document.body.style.transition = 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'scale(1)';
    }, 60);

  } else if (type === 'breakingnews') {
    // Urgent flash
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.2s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 30);

  } else if (type === 'world') {
    // Zoom in from far
    document.body.style.opacity = '0';
    document.body.style.transform = 'scale(1.04)';
    document.body.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'scale(1)';
    }, 80);

  } else if (type === 'pinterest') {
    // Cards rain down
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.6s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 80);

  } else if (type === 'timeline') {
    // Draw in from top
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(-8px)';
    document.body.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    }, 80);

  } else if (type === 'splitscreen') {
    // Slide left panel in
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 80);

  } else {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 80);
  }
}

function runTerminalBoot() {
  const overlay = document.createElement('div');
  overlay.id = 'terminal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#000;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    font-family:'Space Mono',monospace;
    padding:40px;
  `;
  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary').trim() || '#60a5fa';
  const lines = [
    '> INITIALIZING HYBE NETWORK...',
    '> CONNECTING TO DATA FEEDS...',
    '> LOADING GROUP PROFILES...',
    '> SYNCING LIVE CONTENT...',
    '> ALL SYSTEMS ONLINE.',
  ];
  const pre = document.createElement('pre');
  pre.style.cssText = `color:${primary};line-height:2;text-align:left;max-width:420px;font-size:13px;`;
  overlay.appendChild(pre);
  document.body.appendChild(overlay);
  document.body.style.opacity = '0';

  let lineIndex = 0;
  const typeNextLine = () => {
    if (lineIndex >= lines.length) {
      setTimeout(() => {
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
        setTimeout(() => overlay.remove(), 500);
      }, 300);
      return;
    }
    const line = lines[lineIndex];
    let charIndex = 0;
    const typeLine = () => {
      if (charIndex <= line.length) {
        const prevLines = lines.slice(0, lineIndex).join('\n');
        pre.textContent = (prevLines ? prevLines + '\n' : '') + line.slice(0, charIndex) + '█';
        charIndex++;
        setTimeout(typeLine, 16);
      } else {
        pre.textContent = lines.slice(0, lineIndex + 1).join('\n');
        lineIndex++;
        setTimeout(typeNextLine, 100);
      }
    };
    typeLine();
  };
  typeNextLine();
}

// ── TERMINAL LAYOUT ────────────────────────────────────────
function initTerminalLayout(site, allGroups) {
  const groups = allGroups.filter(g => state.hubeGroups.includes(g.id));
  const sidebarPills = document.getElementById('hub-sidebar-pills');

  const allBtn = createHubPill('ALL FEEDS', true, () => {
    document.querySelectorAll('.hub-pill').forEach(p => p.classList.remove('active'));
    allBtn.classList.add('active');
    state.activeGroup = 'all';
    loadTerminalFeed();
  });
  sidebarPills.appendChild(allBtn);

  groups.forEach(group => {
    const btn = createHubPill(group.name, false, () => {
      document.querySelectorAll('.hub-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.activeGroup = group.id;
      loadTerminalFeed();
    });
    sidebarPills.appendChild(btn);
  });

  document.getElementById('hub-stats').innerHTML = `
    <div class="hub-stat-row"><span class="hub-stat-label">STATUS</span><span class="hub-stat-val hub-online">● ONLINE</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">GROUPS</span><span class="hub-stat-val" id="hub-stat-groups">—</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">UPDATED</span><span class="hub-stat-val" id="hub-stat-updated">—</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">PODCAST</span><span class="hub-stat-val">5×7</span></div>
  `;

  loadTerminalFeed();
}

function createHubPill(label, active, onClick) {
  const btn = document.createElement('button');
  btn.className = `hub-pill${active ? ' active' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

async function loadTerminalFeed() {
  const hubMain = document.getElementById('hub-main');
  hubMain.innerHTML = `<div class="hub-loading"><span class="hub-cursor">█</span> LOADING FEED...</div>`;

  try {
    const data = await fetchJSON(`${DATA_BASE_URL}/hybe-news.json`);
    state.articles = filterByGroup(data.articles || [], state.activeGroup);

    const updEl = document.getElementById('hub-stat-updated');
    if (updEl && data.updatedAt) updEl.textContent = formatTimeAgo(data.updatedAt);
    const grpEl = document.getElementById('hub-stat-groups');
    if (grpEl) grpEl.textContent = state.allGroups.length;

    hubMain.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'hub-feed-header';
    header.innerHTML = `
      <span class="hub-feed-title">> LIVE FEED</span>
      <span class="hub-feed-count">${state.articles.length} ENTRIES</span>
      <span class="hub-feed-time">${new Date().toLocaleTimeString()}</span>
    `;
    hubMain.appendChild(header);

    if (state.articles.length > 0) {
      const ticker = document.createElement('div');
      ticker.className = 'hub-ticker';
      const inner = state.articles.slice(0, 8).map(a =>
        `<span class="hub-ticker-item" onclick="window.open('${escHtml(a.url)}','_blank')">${escHtml(truncate(a.title, 60))}</span><span class="hub-ticker-sep">///</span>`
      ).join('');
      ticker.innerHTML = `
        <span class="hub-ticker-label">TRENDING</span>
        <div class="hub-ticker-track"><div class="hub-ticker-inner">${inner}${inner}</div></div>
      `;
      hubMain.appendChild(ticker);
    }

    const feed = document.createElement('div');
    feed.className = 'hub-feed';
    hubMain.appendChild(feed);

    state.articles.forEach((article, idx) => {
      const row = document.createElement('div');
      row.className = 'hub-row';
      const groupId = article.group || 'kpop';
      row.innerHTML = `
        <span class="hub-row-index">${String(idx + 1).padStart(3, '0')}</span>
        <span class="hub-row-group group-tag-${groupId}">${escHtml(getGroupName(groupId))}</span>
        <span class="hub-row-title"><a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">${escHtml(article.title)}</a></span>
        <span class="hub-row-source">${escHtml(article.source || '')}</span>
        <span class="hub-row-time">${escHtml(formatTimeAgo(article.publishedAt))}</span>
      `;
      row.style.opacity = '0';
      row.style.transform = 'translateX(-16px)';
      feed.appendChild(row);
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, idx * 25);
    });

  } catch (err) {
    hubMain.innerHTML = `<div class="hub-loading">ERROR: FEED UNAVAILABLE</div>`;
  }
}

// ── SPLIT SCREEN LAYOUT ────────────────────────────────────
function initSplitLayout(site, allGroups) {
  loadSplitFeed();
}

async function loadSplitFeed() {
  const splitLeft = document.getElementById('split-left');
  splitLeft.innerHTML = `<div class="split-loading">Loading...</div>`;

  try {
    const data = await fetchJSON(`${DATA_BASE_URL}/hybe-news.json`);
    state.articles = data.articles || [];

    splitLeft.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'split-header';
    header.innerHTML = `<span class="split-header-title">HYBE NEWS</span><span class="split-header-count">${state.articles.length} articles</span>`;
    splitLeft.appendChild(header);

    const list = document.createElement('div');
    list.className = 'split-list';
    splitLeft.appendChild(list);

    state.articles.forEach((article, idx) => {
      const item = document.createElement('div');
      item.className = 'split-item';
      const groupId = article.group || 'kpop';
      item.innerHTML = `
        <div class="split-item-top">
          <span class="split-item-group group-tag-${groupId}">${escHtml(getGroupName(groupId))}</span>
          <span class="split-item-time">${escHtml(formatTimeAgo(article.publishedAt))}</span>
        </div>
        <div class="split-item-title">${escHtml(article.title)}</div>
        <div class="split-item-source">${escHtml(article.source || '')}</div>
      `;
      item.style.opacity = '0';
      item.style.transform = 'translateX(-12px)';
      list.appendChild(item);

      item.addEventListener('click', () => {
        document.querySelectorAll('.split-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        showSplitPreview(article);
      });

      setTimeout(() => {
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, idx * 30);
    });

    // Auto-select first article
    if (state.articles.length > 0) {
      setTimeout(() => {
        const firstItem = list.querySelector('.split-item');
        if (firstItem) { firstItem.classList.add('active'); showSplitPreview(state.articles[0]); }
      }, 500);
    }

  } catch (err) {
    splitLeft.innerHTML = `<div class="split-loading">Error loading feed</div>`;
  }
}

function showSplitPreview(article) {
  const right = document.getElementById('split-right');
  const groupId = article.group || 'kpop';
  right.innerHTML = `
    <div class="split-preview">
      <div class="split-preview-eyebrow">
        <span class="split-preview-group group-tag-${groupId}">${escHtml(getGroupName(groupId))}</span>
        <span class="split-preview-source">${escHtml(article.source || '')}</span>
        <span class="split-preview-time">${escHtml(formatTimeAgo(article.publishedAt))}</span>
      </div>
      <h2 class="split-preview-title">${escHtml(article.title)}</h2>
      ${article.summary ? `<p class="split-preview-summary">${escHtml(article.summary)}</p>` : ''}
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener" class="split-preview-btn">
        Read Full Story →
      </a>
    </div>
  `;
  right.style.opacity = '0';
  setTimeout(() => {
    right.style.transition = 'opacity 0.3s ease';
    right.style.opacity = '1';
  }, 10);
}

// ── THEME ──────────────────────────────────────────────────
function applyTheme(site) {
  const t = site.theme;
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-dark', t.primaryDark);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--bg', t.background);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-border', t.surfaceBorder);
  root.style.setProperty('--header-bg', t.headerBg);
  root.style.setProperty('--tab-bg', t.tabBg);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-muted', t.textMuted);
  root.style.setProperty('--text-faint', t.textFaint);
  root.style.setProperty('--badge', t.badge);
  root.style.setProperty('--badge-text', t.badgeText);
  root.style.setProperty('--button-bg', t.buttonBg);
  root.style.setProperty('--button-text', t.buttonText);
  root.style.setProperty('--subscribe-bar', t.subscribeBar);
  root.style.setProperty('--subscribe-text', t.subscribeText);
  root.style.setProperty('--logo-color', t.logoColor || t.primary);
  root.style.setProperty('--tagline-color', t.taglineColor || t.textMuted);

  if (isLightTheme(t.background)) document.body.classList.add('light-theme');

  const metaTheme = document.querySelector('meta[name="theme-color"]')
    || (() => { const m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); return m; })();
  metaTheme.content = t.headerBg;
}

function isLightTheme(bg) {
  return bg.startsWith('#fff') || bg.startsWith('#fef');
}

// ── META ───────────────────────────────────────────────────
function applyMeta(site) {
  document.getElementById('page-title').textContent = `${site.name} — K-Pop News`;
  document.getElementById('page-desc').content = site.tagline;
  document.getElementById('og-title').content = site.name;
  document.getElementById('og-desc').content = site.tagline;
  document.getElementById('og-url').content = `https://${site.domain}`;
}

// ── HEADER ─────────────────────────────────────────────────
function renderHeader(site) {
  const logoEl = document.getElementById('site-logo');
  const taglineEl = document.getElementById('site-tagline');
  const footerLogoEl = document.getElementById('footer-logo');

  logoEl.textContent = site.name;
  taglineEl.textContent = site.tagline;
  if (footerLogoEl) footerLogoEl.textContent = site.name;

  logoEl.style.color = site.theme.logoColor || site.theme.primary;
  taglineEl.style.color = site.theme.taglineColor || site.theme.textMuted;

  const newsletterText = document.getElementById('newsletter-text');
  if (newsletterText) newsletterText.textContent = `Get ${site.name} news in your inbox — free weekly digest`;
  const nbtn = document.getElementById('newsletter-btn');
  if (nbtn) {
    nbtn.href = `https://${site.beehiiv}.beehiiv.com`;
    nbtn.textContent = 'Subscribe Free';
  }
}

// ── GROUP STRIP ────────────────────────────────────────────
function renderGroupStrip(site, allGroups) {
  const strip = document.getElementById('group-strip');
  const pillsEl = document.getElementById('group-pills');

  let groups = allGroups;
  if (site.type === 'terminal' || site.type === 'splitscreen') {
    groups = allGroups.filter(g => state.hubeGroups.includes(g.id));
  }

  const allPill = createPill('all', 'All', true);
  pillsEl.appendChild(allPill);
  groups.forEach(group => pillsEl.appendChild(createPill(group.id, group.name, false)));
}

function createPill(id, name, active) {
  const btn = document.createElement('button');
  btn.className = `group-pill${active ? ' active' : ''}`;
  btn.textContent = name;
  btn.dataset.group = id;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.group-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.activeGroup = id;
    state.articlesPage = 1;
    loadTabContent(state.activeTab);
  });
  return btn;
}

// ── TABS ───────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById(`tab-${tab}`).classList.add('active');
      state.activeTab = tab;
      loadTabContent(tab);
    });
  });

  const loadMoreBtn = document.getElementById('load-more-news');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      state.articlesPage++;
      renderArticles(state.articles, false);
    });
  }
}

// ── MOBILE MENU ────────────────────────────────────────────
function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const tabBar = document.getElementById('tab-bar');
      if (tabBar) tabBar.style.display = tabBar.style.display === 'none' ? 'block' : '';
    });
  }
}

// ── TAB LOADER ─────────────────────────────────────────────
async function loadTabContent(tab) {
  switch (tab) {
    case 'news':      await loadNews();      break;
    case 'videos':    await loadVideos();    break;
    case 'community': await loadCommunity(); break;
    case 'archive':   await loadArchive();   break;
    case 'podcast':   renderPodcast();       break;
  }
}

// ── NEWS ───────────────────────────────────────────────────
async function loadNews() {
  if (state.isLoading) return;
  state.isLoading = true;

  const grid = document.getElementById('articles-grid');
  if (state.articlesPage === 1 && grid) {
    grid.innerHTML = loadingHTML('Fetching latest K-pop news...');
  }

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-news.json`);
    state.articles = filterByGroup(data.articles || [], state.activeGroup);

    const type = state.site.type;

    // Show hero for magazine, nation, world
    if (['magazine', 'nation', 'world'].includes(type) && state.articles.length > 0) {
      const heroSection = document.getElementById('hero-section');
      if (heroSection) {
        heroSection.style.display = 'block';
        renderHero(state.articles[0]);
      }
      renderArticles(state.articles.slice(1), true);
    } else {
      renderArticles(state.articles, true);
    }

    // Breaking news ticker
    if (type === 'breakingnews') {
      renderBreakingTicker(state.articles);
    }

    renderTrending(state.articles);
    updateStats(data);
  } catch (err) {
    if (grid) grid.innerHTML = emptyHTML('No articles found yet — check back soon!');
  }

  state.isLoading = false;
}

// ── HERO ───────────────────────────────────────────────────
function renderHero(article) {
  const hero = document.getElementById('hero-article');
  if (!hero) return;
  const groupId = article.group || 'kpop';
  const timeAgo = formatTimeAgo(article.publishedAt);

  hero.innerHTML = `
    <div class="hero-eyebrow">
      <span class="hero-badge group-tag-${groupId}">${escHtml(getGroupName(groupId))}</span>
      <span class="hero-source">${escHtml(article.source || '')}</span>
      <span class="hero-time">${escHtml(timeAgo)}</span>
    </div>
    <h1 class="hero-title">
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">${escHtml(article.title)}</a>
    </h1>
    ${article.summary ? `<p class="hero-summary">${escHtml(article.summary)}</p>` : ''}
    <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener" class="hero-read-btn">Read Full Story →</a>
  `;

  hero.style.opacity = '0';
  hero.style.transform = 'translateY(20px)';
  setTimeout(() => {
    hero.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    hero.style.opacity = '1';
    hero.style.transform = 'translateY(0)';
  }, 300);
}

// ── BREAKING TICKER ────────────────────────────────────────
function renderBreakingTicker(articles) {
  const scroll = document.getElementById('breaking-scroll');
  if (!scroll) return;
  const items = articles.slice(0, 10).map(a =>
    `<span class="breaking-item" onclick="window.open('${escHtml(a.url)}','_blank')">${escHtml(a.title)}</span><span class="breaking-sep">◆</span>`
  ).join('');
  scroll.innerHTML = `<div class="breaking-inner">${items}${items}</div>`;
}

// ── ARTICLES ───────────────────────────────────────────────
function filterByGroup(articles, groupId) {
  if (groupId === 'all') return articles;
  return articles.filter(a => a.group === groupId || (a.groups && a.groups.includes(groupId)));
}

function renderArticles(articles, reset) {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  const start = reset ? 0 : (state.articlesPage - 1) * ARTICLES_PER_PAGE;
  const end = state.articlesPage * ARTICLES_PER_PAGE;
  const slice = articles.slice(start, end);

  if (reset) grid.innerHTML = '';

  if (articles.length === 0) {
    grid.innerHTML = emptyHTML('No articles found for this group yet.');
    return;
  }

  const type = state.site ? state.site.type : 'hype';

  slice.forEach((article, idx) => {
    const featured = reset && idx === 0 && !['magazine', 'nation', 'world', 'timeline', 'pinterest', 'musicblog'].includes(type);
    const card = createArticleCard(article, featured);
    card.style.opacity = '0';
    card.style.transform = getEntryTransform(type, idx);
    grid.appendChild(card);

    setTimeout(() => {
      card.style.transition = getEntryTransition(type);
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, idx * getEntryDelay(type));
  });

  const btn = document.getElementById('load-more-news');
  if (btn) btn.style.display = end >= articles.length ? 'none' : 'block';
}

function getEntryTransform(type, idx) {
  switch (type) {
    case 'magazine':     return 'translateY(20px)';
    case 'musicblog':    return 'translateX(30px)';
    case 'terminal':     return 'translateX(-20px)';
    case 'splitscreen':  return 'translateX(-12px)';
    case 'timeline':     return 'translateY(16px)';
    case 'luxury':       return 'translateY(24px)';
    case 'nation':       return 'translateY(16px)';
    case 'world':        return 'scale(0.96) translateY(16px)';
    case 'hype':         {
      const d = ['translateX(40px)', 'translateX(-40px)', 'translateY(40px)', 'translateX(30px) translateY(-20px)'];
      return d[idx % d.length];
    }
    case 'breakingnews': return 'translateY(-10px)';
    case 'social':       return 'scale(0.92)';
    case 'pinterest':    return idx % 2 === 0 ? 'translateX(-20px)' : 'translateX(20px)';
    default:             return 'translateY(16px)';
  }
}

function getEntryTransition(type) {
  if (type === 'hype' || type === 'social') {
    return 'opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  }
  if (type === 'magazine' || type === 'luxury' || type === 'nation') {
    return 'opacity 0.7s ease, transform 0.7s ease';
  }
  return 'opacity 0.4s ease, transform 0.4s ease';
}

function getEntryDelay(type) {
  if (type === 'magazine' || type === 'luxury') return 90;
  if (type === 'breakingnews') return 20;
  return 45;
}

function createArticleCard(article, featured) {
  const card = document.createElement('div');
  card.className = `article-card${featured ? ' featured' : ''}`;

  const groupId = article.group || 'default';
  const groupName = getGroupName(groupId);
  const sourceClass = getSourceClass(article.source);
  const timeAgo = formatTimeAgo(article.publishedAt);

  card.innerHTML = `
    ${featured ? '<div class="featured-label">Top Story</div>' : ''}
    <div class="article-card-top">
      <span class="article-source-badge ${sourceClass}">${escHtml(article.source || 'News')}</span>
      ${groupId !== 'default' ? `<span class="article-group-badge group-tag-${groupId}">${escHtml(groupName)}</span>` : ''}
    </div>
    <div class="article-title">
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">${escHtml(article.title || 'Untitled')}</a>
    </div>
    ${article.summary ? `<div class="article-summary">${escHtml(article.summary)}</div>` : ''}
    <div class="article-meta">
      <span>${escHtml(timeAgo)}</span>
      ${article.author ? `<span>· ${escHtml(article.author)}</span>` : ''}
    </div>
  `;

  return card;
}

// ── VIDEOS ─────────────────────────────────────────────────
async function loadVideos() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;
  grid.innerHTML = loadingHTML('Loading videos...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-videos.json`);
    const videos = filterByGroup(data.videos || [], state.activeGroup);

    if (videos.length === 0) { grid.innerHTML = emptyHTML('No videos found yet.'); return; }

    grid.innerHTML = '';
    videos.slice(0, 12).forEach((video, idx) => {
      const card = createVideoCard(video);
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      grid.appendChild(card);
      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'none';
      }, idx * 50);
    });
  } catch (err) {
    grid.innerHTML = emptyHTML('Videos coming soon!');
  }
}

function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card';
  const groupId = video.group || 'default';
  const timeAgo = formatTimeAgo(video.publishedAt);
  const thumb = video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;

  card.innerHTML = `
    <div class="video-thumbnail">
      <img src="${escHtml(thumb)}" alt="${escHtml(video.title)}" loading="lazy" onerror="this.style.display='none'" />
      <div class="video-play-overlay">
        <div class="play-btn-circle"><div class="play-triangle"></div></div>
      </div>
    </div>
    <div class="video-info">
      ${groupId !== 'default' ? `<span class="video-group-badge group-tag-${groupId}">${escHtml(getGroupName(groupId))}</span>` : ''}
      <div class="video-title">${escHtml(video.title || 'Untitled')}</div>
      <div class="video-meta"><span>${escHtml(video.channelName || 'YouTube')}</span><span>· ${escHtml(timeAgo)}</span></div>
    </div>
  `;

  card.addEventListener('click', () => {
    window.open(video.url || `https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener');
  });

  return card;
}

// ── COMMUNITY ──────────────────────────────────────────────
async function loadCommunity() {
  const grid = document.getElementById('community-grid');
  if (!grid) return;
  grid.innerHTML = loadingHTML('Loading community posts...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-community.json`);
    const posts = filterByGroup(data.posts || [], state.activeGroup);

    if (posts.length === 0) { grid.innerHTML = emptyHTML('No community posts yet.'); return; }

    grid.innerHTML = '';
    posts.slice(0, 12).forEach(post => grid.appendChild(createCommunityCard(post)));
  } catch (err) {
    grid.innerHTML = emptyHTML('Community content coming soon!');
  }
}

function createCommunityCard(post) {
  const card = document.createElement('div');
  card.className = 'community-card';
  const timeAgo = formatTimeAgo(post.publishedAt);

  card.innerHTML = `
    <div class="community-card-top">
      <span class="subreddit-badge">r/${escHtml(post.subreddit || 'kpop')}</span>
      ${post.upvotes ? `<span class="upvote-count">▲ ${formatNum(post.upvotes)}</span>` : ''}
    </div>
    <div class="community-title">
      <a href="${escHtml(post.url || '#')}" target="_blank" rel="noopener">${escHtml(post.title || 'Untitled')}</a>
    </div>
    <div class="community-meta">
      <span>${escHtml(timeAgo)}</span>
      ${post.comments ? `<span>· ${formatNum(post.comments)} comments</span>` : ''}
      ${post.author ? `<span>· u/${escHtml(post.author)}</span>` : ''}
    </div>
  `;

  return card;
}

// ── ARCHIVE ────────────────────────────────────────────────
async function loadArchive() {
  const grid = document.getElementById('archive-grid');
  const filtersEl = document.getElementById('archive-filters');
  if (!grid) return;
  grid.innerHTML = loadingHTML('Loading archive...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-archive.json`);
    const articles = data.articles || [];
    const groups = [...new Set(articles.map(a => a.group).filter(Boolean))];

    if (filtersEl) {
      filtersEl.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.className = 'archive-filter-btn active';
      allBtn.textContent = 'All';
      allBtn.addEventListener('click', () => {
        document.querySelectorAll('.archive-filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        renderArchiveGrid(articles, 'all');
      });
      filtersEl.appendChild(allBtn);

      groups.slice(0, 10).forEach(gId => {
        const btn = document.createElement('button');
        btn.className = 'archive-filter-btn';
        btn.textContent = getGroupName(gId);
        btn.addEventListener('click', () => {
          document.querySelectorAll('.archive-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderArchiveGrid(articles, gId);
        });
        filtersEl.appendChild(btn);
      });
    }

    renderArchiveGrid(articles, 'all');
  } catch (err) {
    grid.innerHTML = emptyHTML('Archive coming soon!');
  }
}

function renderArchiveGrid(articles, groupId) {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;
  const filtered = filterByGroup(articles, groupId);
  grid.innerHTML = '';
  if (filtered.length === 0) { grid.innerHTML = emptyHTML('No archived articles yet.'); return; }
  filtered.forEach(article => grid.appendChild(createArticleCard(article, false)));
}

// ── PODCAST ────────────────────────────────────────────────
function renderPodcast() {
  const episodeList = document.getElementById('episode-list');
  if (!episodeList) return;
  episodeList.innerHTML = `
    <div class="episode-list-label">Episodes</div>
    <div class="empty-state">
      5×7 — The AI K-Pop Podcast is launching soon!<br>
      <span style="font-size:12px;margin-top:8px;display:block">Two AI hosts. Every Monday. All the K-pop news you need.</span>
    </div>
  `;
}

// ── TRENDING ───────────────────────────────────────────────
function renderTrending(articles) {
  const el = document.getElementById('trending-items');
  if (!el) return;
  const top = articles.slice(0, 6);
  if (top.length === 0) return;
  el.innerHTML = top.map(a =>
    `<span class="trending-item" onclick="window.open('${escHtml(a.url || '#')}','_blank')">${escHtml(truncate(a.title, 60))}</span>`
  ).join('');
}

// ── STATS ──────────────────────────────────────────────────
function updateStats(data) {
  const articles = data ? (data.articles || []) : state.articles;
  const today = new Date().toDateString();
  const todayCount = articles.filter(a => a.publishedAt && new Date(a.publishedAt).toDateString() === today).length;

  const sa = document.getElementById('stat-articles');
  const sg = document.getElementById('stat-groups');
  const su = document.getElementById('stat-updated');

  if (sa) sa.textContent = todayCount || articles.length || '—';
  if (sg) sg.textContent = state.allGroups.length || '28';

  if (data && data.updatedAt) {
    if (su) su.textContent = formatTimeAgo(data.updatedAt);
    state.lastUpdatedAt = data.updatedAt;
  } else if (state.lastUpdatedAt) {
    if (su) su.textContent = formatTimeAgo(state.lastUpdatedAt);
  } else {
    if (su) su.textContent = 'Daily';
  }
}

// ── HELPERS ────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.json();
}

function getGroupName(id) {
  const group = state.allGroups.find(g => g.id === id);
  return group ? group.name : id;
}

function getSourceClass(source) {
  if (!source) return 'source-default';
  const s = source.toLowerCase();
  if (s.includes('soompi')) return 'source-soompi';
  if (s.includes('allkpop')) return 'source-allkpop';
  if (s.includes('billboard')) return 'source-billboard';
  if (s.includes('korea herald')) return 'source-koreaherald';
  if (s.includes('reddit')) return 'source-reddit';
  if (s.includes('youtube')) return 'source-youtube';
  return 'source-default';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadingHTML(msg) {
  return `<div class="loading-state"><div class="loading-spinner"></div><div class="loading-text">${msg}</div></div>`;
}

function emptyHTML(msg) {
  return `<div class="empty-state">${msg}</div>`;
}

function renderError() {
  const grid = document.getElementById('articles-grid');
  if (grid) grid.innerHTML = emptyHTML('Something went wrong. Please try again shortly.');
}
