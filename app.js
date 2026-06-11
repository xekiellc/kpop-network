/* ============================================================
   KPOP NETWORK — app.js
   Three completely different experiences by site type
   ============================================================ */

'use strict';

const SITES_CONFIG_URL = '/sites.json';
const DATA_BASE_URL = '/data';
const ARTICLES_PER_PAGE = 12;
const VIDEOS_PER_PAGE = 12;
const COMMUNITY_PER_PAGE = 12;

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
    state.hubeGroups = config.hubeGroups;

    applyTheme(site);
    applyMeta(site);
    applyLayoutType(site);
    renderHeader(site);

    if (site.type === 'HUB') {
      initHubLayout(site, config.groups);
    } else {
      renderGroupStrip(site, config.groups);
      setupTabs();
      setupMobileMenu();
    }

    runEntryAnimation(site);
    await loadTabContent('news');
    updateStats();

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

// ── LAYOUT TYPE ────────────────────────────────────────────
function applyLayoutType(site) {
  document.body.classList.remove('layout-a', 'layout-hub', 'layout-b');
  if (site.type === 'A') document.body.classList.add('layout-a');
  else if (site.type === 'HUB') document.body.classList.add('layout-hub');
  else document.body.classList.add('layout-b');
}

// ── ENTRY ANIMATIONS ───────────────────────────────────────
function runEntryAnimation(site) {
  if (site.type === 'A') runMagazineEntry();
  else if (site.type === 'HUB') runTerminalEntry();
  else runHypeEntry();
}

// Type A — elegant magazine reveal
function runMagazineEntry() {
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(12px)';
  document.body.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    }, 80);
  });
}

// Type HUB — terminal boot sequence
function runTerminalEntry() {
  const overlay = document.createElement('div');
  overlay.id = 'terminal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#000;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    font-family:'Space Mono',monospace;color:#00ff88;
    font-size:13px;padding:40px;
  `;

  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary').trim() || '#60a5fa';

  const lines = [
    '> INITIALIZING HYBE NETWORK...',
    '> CONNECTING TO DATA FEEDS...',
    '> LOADING GROUP PROFILES...',
    '> SYNCING LIVE CONTENT...',
    '> SYSTEM READY.',
  ];

  let lineIndex = 0;
  const pre = document.createElement('pre');
  pre.style.cssText = `color:${primary};line-height:2;text-align:left;max-width:400px;`;
  overlay.appendChild(pre);
  document.body.appendChild(overlay);
  document.body.style.opacity = '0';

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
        pre.textContent = pre.textContent.split('\n').slice(0, lineIndex).join('\n')
          + (lineIndex > 0 ? '\n' : '') + line.slice(0, charIndex) + '█';
        charIndex++;
        setTimeout(typeLine, 18);
      } else {
        pre.textContent = pre.textContent.slice(0, -1);
        lineIndex++;
        setTimeout(typeNextLine, 120);
      }
    };
    typeLine();
  };
  typeNextLine();
}

// Type B — hype explosion entry
function runHypeEntry() {
  document.body.style.opacity = '0';
  document.body.style.transform = 'scale(0.97)';
  document.body.style.transition = 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.body.style.opacity = '1';
      document.body.style.transform = 'scale(1)';
    }, 60);
  });
}

// ── HUB LAYOUT (sidebar + feed) ────────────────────────────
function initHubLayout(site, allGroups) {
  // Hide standard layout elements
  document.getElementById('group-strip').style.display = 'none';
  document.getElementById('tab-bar').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';

  // Show hub layout
  const hubLayout = document.getElementById('hub-layout');
  hubLayout.style.display = 'flex';

  // Build sidebar
  const groups = allGroups.filter(g => state.hubeGroups.includes(g.id));
  const sidebarPills = document.getElementById('hub-sidebar-pills');

  const allBtn = document.createElement('button');
  allBtn.className = 'hub-pill active';
  allBtn.textContent = 'ALL FEEDS';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('.hub-pill').forEach(p => p.classList.remove('active'));
    allBtn.classList.add('active');
    state.activeGroup = 'all';
    loadHubFeed();
  });
  sidebarPills.appendChild(allBtn);

  groups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'hub-pill';
    btn.textContent = group.name;
    btn.dataset.group = group.id;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hub-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.activeGroup = group.id;
      loadHubFeed();
    });
    sidebarPills.appendChild(btn);
  });

  // Hub stats
  const hubStats = document.getElementById('hub-stats');
  hubStats.innerHTML = `
    <div class="hub-stat-row"><span class="hub-stat-label">STATUS</span><span class="hub-stat-val hub-online">● ONLINE</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">GROUPS</span><span class="hub-stat-val" id="hub-stat-groups">—</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">UPDATED</span><span class="hub-stat-val" id="hub-stat-updated">—</span></div>
    <div class="hub-stat-row"><span class="hub-stat-label">PODCAST</span><span class="hub-stat-val">5×7</span></div>
  `;

  loadHubFeed();
}

async function loadHubFeed() {
  const hubMain = document.getElementById('hub-main');
  hubMain.innerHTML = `<div class="hub-loading">
    <span class="hub-cursor">█</span> LOADING FEED...
  </div>`;

  try {
    const data = await fetchJSON(`${DATA_BASE_URL}/hybe-news.json`);
    state.articles = filterByGroup(data.articles || [], state.activeGroup);

    if (data.updatedAt) {
      const el = document.getElementById('hub-stat-updated');
      if (el) el.textContent = formatTimeAgo(data.updatedAt);
      state.lastUpdatedAt = data.updatedAt;
    }
    const grpEl = document.getElementById('hub-stat-groups');
    if (grpEl) grpEl.textContent = state.allGroups.length;

    hubMain.innerHTML = '';

    // Hub header bar
    const headerBar = document.createElement('div');
    headerBar.className = 'hub-feed-header';
    headerBar.innerHTML = `
      <span class="hub-feed-title">> LIVE FEED</span>
      <span class="hub-feed-count">${state.articles.length} ENTRIES</span>
      <span class="hub-feed-time">${new Date().toLocaleTimeString()}</span>
    `;
    hubMain.appendChild(headerBar);

    // Trending ticker
    if (state.articles.length > 0) {
      const ticker = document.createElement('div');
      ticker.className = 'hub-ticker';
      ticker.innerHTML = `<span class="hub-ticker-label">TRENDING</span>
        <div class="hub-ticker-track">
          <div class="hub-ticker-inner">
            ${state.articles.slice(0, 8).map(a =>
              `<span class="hub-ticker-item" onclick="window.open('${escHtml(a.url)}','_blank')">${escHtml(truncate(a.title, 60))}</span>`
            ).join('<span class="hub-ticker-sep">///</span>')}
          </div>
        </div>`;
      hubMain.appendChild(ticker);
    }

    // Feed rows
    const feed = document.createElement('div');
    feed.className = 'hub-feed';
    hubMain.appendChild(feed);

    state.articles.forEach((article, idx) => {
      const row = createHubRow(article, idx);
      row.style.opacity = '0';
      row.style.transform = 'translateX(-20px)';
      feed.appendChild(row);
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, idx * 30);
    });

  } catch (err) {
    hubMain.innerHTML = `<div class="hub-loading">ERROR: FEED UNAVAILABLE</div>`;
  }
}

function createHubRow(article, idx) {
  const row = document.createElement('div');
  row.className = 'hub-row';
  const groupId = article.group || 'kpop';
  const groupName = getGroupName(groupId);
  const timeAgo = formatTimeAgo(article.publishedAt);

  row.innerHTML = `
    <span class="hub-row-index">${String(idx + 1).padStart(3, '0')}</span>
    <span class="hub-row-group group-tag-${groupId}">${escHtml(groupName)}</span>
    <span class="hub-row-title">
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">${escHtml(article.title)}</a>
    </span>
    <span class="hub-row-source">${escHtml(article.source || '')}</span>
    <span class="hub-row-time">${escHtml(timeAgo)}</span>
  `;
  return row;
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
  footerLogoEl.textContent = site.name;

  logoEl.style.color = site.theme.logoColor || site.theme.primary;
  taglineEl.style.color = site.theme.taglineColor || site.theme.textMuted;

  document.getElementById('newsletter-text').textContent =
    `Get ${site.name} news in your inbox — free weekly digest`;
  const nbtn = document.getElementById('newsletter-btn');
  nbtn.href = `https://${site.beehiiv}.beehiiv.com`;
  nbtn.textContent = 'Subscribe Free';
}

// ── GROUP STRIP ────────────────────────────────────────────
function renderGroupStrip(site, allGroups) {
  const strip = document.getElementById('group-strip');
  const pillsEl = document.getElementById('group-pills');

  if (site.type === 'A') {
    strip.style.display = 'none';
    return;
  }

  const groups = allGroups;
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

  document.getElementById('load-more-news').addEventListener('click', () => {
    state.articlesPage++;
    renderArticles(state.articles, false);
  });
}

// ── MOBILE MENU ────────────────────────────────────────────
function setupMobileMenu() {
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    const tabBar = document.getElementById('tab-bar');
    tabBar.style.display = tabBar.style.display === 'none' ? 'block' : '';
  });
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
  if (state.articlesPage === 1) {
    grid.innerHTML = loadingHTML('Fetching latest K-pop news...');
  }

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-news.json`);
    state.articles = filterByGroup(data.articles || [], state.activeGroup);

    // Type A — show hero section
    if (state.site.type === 'A' && state.articles.length > 0) {
      const heroSection = document.getElementById('hero-section');
      heroSection.style.display = 'block';
      renderHero(state.articles[0]);
      renderArticles(state.articles.slice(1), true);
    } else {
      renderArticles(state.articles, true);
    }

    renderTrending(state.articles);
    updateStats(data);
  } catch (err) {
    grid.innerHTML = emptyHTML('No articles found yet — check back soon!');
  }

  state.isLoading = false;
}

// ── TYPE A HERO ────────────────────────────────────────────
function renderHero(article) {
  const hero = document.getElementById('hero-article');
  const groupId = article.group || 'kpop';
  const groupName = getGroupName(groupId);
  const timeAgo = formatTimeAgo(article.publishedAt);

  hero.innerHTML = `
    <div class="hero-eyebrow">
      <span class="hero-badge group-tag-${groupId}">${escHtml(groupName)}</span>
      <span class="hero-source">${escHtml(article.source || 'News')}</span>
      <span class="hero-time">${escHtml(timeAgo)}</span>
    </div>
    <h1 class="hero-title">
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">
        ${escHtml(article.title)}
      </a>
    </h1>
    ${article.summary ? `<p class="hero-summary">${escHtml(article.summary)}</p>` : ''}
    <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener" class="hero-read-btn">
      Read Full Story →
    </a>
  `;

  // Animate hero in
  hero.style.opacity = '0';
  hero.style.transform = 'translateY(30px)';
  setTimeout(() => {
    hero.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    hero.style.opacity = '1';
    hero.style.transform = 'translateY(0)';
  }, 200);
}

// ── ARTICLES ───────────────────────────────────────────────
function filterByGroup(articles, groupId) {
  if (groupId === 'all') return articles;
  return articles.filter(a => a.group === groupId || (a.groups && a.groups.includes(groupId)));
}

function renderArticles(articles, reset) {
  const grid = document.getElementById('articles-grid');
  const start = reset ? 0 : (state.articlesPage - 1) * ARTICLES_PER_PAGE;
  const end = state.articlesPage * ARTICLES_PER_PAGE;
  const slice = articles.slice(start, end);

  if (reset) grid.innerHTML = '';

  if (articles.length === 0) {
    grid.innerHTML = emptyHTML('No articles found for this group yet.');
    return;
  }

  const type = state.site ? state.site.type : 'B';

  slice.forEach((article, idx) => {
    const card = createArticleCard(article, reset && idx === 0 && type !== 'A');
    card.style.opacity = '0';

    if (type === 'A') {
      card.style.transform = 'translateY(24px)';
    } else if (type === 'B') {
      const dirs = [
        'translateX(40px) translateY(20px)',
        'translateX(-40px) translateY(20px)',
        'translateY(40px) scale(0.95)',
        'translateX(30px) translateY(-20px)',
      ];
      card.style.transform = dirs[idx % dirs.length];
    }

    grid.appendChild(card);

    const delay = type === 'A' ? idx * 80 : idx * 45;
    setTimeout(() => {
      if (type === 'A') {
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      } else if (type === 'B') {
        card.style.transition = 'opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
      }
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, delay);
  });

  const btn = document.getElementById('load-more-news');
  btn.style.display = end >= articles.length ? 'none' : 'block';
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
      <a href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">
        ${escHtml(article.title || 'Untitled')}
      </a>
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
  grid.innerHTML = loadingHTML('Loading videos...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-videos.json`);
    const videos = filterByGroup(data.videos || [], state.activeGroup);

    if (videos.length === 0) {
      grid.innerHTML = emptyHTML('No videos found yet — check back soon!');
      return;
    }

    grid.innerHTML = '';
    videos.slice(0, VIDEOS_PER_PAGE).forEach((video, idx) => {
      const card = createVideoCard(video);
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      grid.appendChild(card);
      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'none';
      }, idx * 60);
    });
  } catch (err) {
    grid.innerHTML = emptyHTML('Videos coming soon!');
  }
}

function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card';
  const groupId = video.group || 'default';
  const groupName = getGroupName(groupId);
  const timeAgo = formatTimeAgo(video.publishedAt);
  const thumb = video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;

  card.innerHTML = `
    <div class="video-thumbnail">
      <img src="${escHtml(thumb)}" alt="${escHtml(video.title)}" loading="lazy"
           onerror="this.style.display='none'" />
      <div class="video-play-overlay">
        <div class="play-btn-circle">
          <div class="play-triangle"></div>
        </div>
      </div>
    </div>
    <div class="video-info">
      ${groupId !== 'default' ? `<span class="video-group-badge group-tag-${groupId}">${escHtml(groupName)}</span>` : ''}
      <div class="video-title">${escHtml(video.title || 'Untitled')}</div>
      <div class="video-meta">
        <span>${escHtml(video.channelName || 'YouTube')}</span>
        <span>· ${escHtml(timeAgo)}</span>
      </div>
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
  grid.innerHTML = loadingHTML('Loading community posts...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-community.json`);
    const posts = filterByGroup(data.posts || [], state.activeGroup);

    if (posts.length === 0) {
      grid.innerHTML = emptyHTML('No community posts yet — check back soon!');
      return;
    }

    grid.innerHTML = '';
    posts.slice(0, COMMUNITY_PER_PAGE).forEach(post => grid.appendChild(createCommunityCard(post)));
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
      <a href="${escHtml(post.url || '#')}" target="_blank" rel="noopener">
        ${escHtml(post.title || 'Untitled')}
      </a>
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
  grid.innerHTML = loadingHTML('Loading archive...');

  try {
    const bucket = state.site.bucket;
    const data = await fetchJSON(`${DATA_BASE_URL}/${bucket}-archive.json`);
    const articles = data.articles || [];
    const groups = [...new Set(articles.map(a => a.group).filter(Boolean))];

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

    renderArchiveGrid(articles, 'all');
  } catch (err) {
    grid.innerHTML = emptyHTML('Archive coming soon!');
  }
}

function renderArchiveGrid(articles, groupId) {
  const grid = document.getElementById('archive-grid');
  const filtered = filterByGroup(articles, groupId);
  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = emptyHTML('No archived articles yet.');
    return;
  }
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
      <span style="font-size:12px;margin-top:8px;display:block">
        Two AI hosts. Every Monday. All the K-pop news you need.
      </span>
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
  const todayCount = articles.filter(a => {
    if (!a.publishedAt) return false;
    return new Date(a.publishedAt).toDateString() === today;
  }).length;

  const statArticles = document.getElementById('stat-articles');
  const statGroups = document.getElementById('stat-groups');
  const statUpdated = document.getElementById('stat-updated');

  if (statArticles) statArticles.textContent = todayCount || articles.length || '—';
  if (statGroups) statGroups.textContent = state.allGroups.length || '28';

  if (data && data.updatedAt) {
    if (statUpdated) statUpdated.textContent = formatTimeAgo(data.updatedAt);
    state.lastUpdatedAt = data.updatedAt;
  } else if (state.lastUpdatedAt) {
    if (statUpdated) statUpdated.textContent = formatTimeAgo(state.lastUpdatedAt);
  } else {
    if (statUpdated) statUpdated.textContent = 'Daily';
  }
}

// ── HELPERS ────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
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
  if (s.includes('kpopdigest')) return 'source-kpopdigest';
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
  return `<div class="loading-state">
    <div class="loading-spinner"></div>
    <div class="loading-text">${msg}</div>
  </div>`;
}

function emptyHTML(msg) {
  return `<div class="empty-state">${msg}</div>`;
}

function renderError() {
  const grid = document.getElementById('articles-grid');
  if (grid) grid.innerHTML = emptyHTML('Something went wrong loading the site. Please try again shortly.');
}
