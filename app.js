/* ============================================================
   KPOP NETWORK — app.js
   Domain detection, theme loading, content fetching & rendering
   ============================================================ */

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────
const SITES_CONFIG_URL = '/sites.json';
const DATA_BASE_URL = '/data';
const ARTICLES_PER_PAGE = 12;
const VIDEOS_PER_PAGE = 12;
const COMMUNITY_PER_PAGE = 12;

// ── STATE ──────────────────────────────────────────────────
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

// ── INIT ───────────────────────────────────────────────────
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
    renderHeader(site);
    renderGroupStrip(site, config.groups);
    setupTabs();
    setupMobileMenu();
    await loadTabContent('news');
    updateStats();
  } catch (err) {
    console.error('Init error:', err);
    renderError();
  }
}

// ── HOSTNAME DETECTION ─────────────────────────────────────
function getHostname() {
  const host = window.location.hostname.replace('www.', '');
  if (host === 'localhost' || host === '127.0.0.1' || host.includes('netlify.app')) {
    return 'armypulse.com';
  }
  return host;
}

// ── THEME APPLICATION ──────────────────────────────────────
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

  if (isLightTheme(t.background)) {
    document.body.classList.add('light-theme');
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]')
    || (() => { const m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); return m; })();
  metaTheme.content = t.headerBg;
}

function isLightTheme(bg) {
  return bg.startsWith('#fff') || bg.startsWith('#fef') || bg.startsWith('#fff');
}

// ── META TAGS ──────────────────────────────────────────────
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

  let groups = [];
  if (site.type === 'HUB') {
    groups = allGroups.filter(g => state.hubeGroups.includes(g.id));
  } else {
    groups = allGroups;
  }

  const allPill = createPill('all', 'All', true);
  pillsEl.appendChild(allPill);

  groups.forEach(group => {
    const pill = createPill(group.id, group.name, false);
    pillsEl.appendChild(pill);
  });
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

// ── TAB CONTENT LOADER ─────────────────────────────────────
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
    renderArticles(state.articles, true);
    renderTrending(state.articles);
    updateStats(data);
  } catch (err) {
    grid.innerHTML = emptyHTML('No articles found yet — check back soon!');
  }

  state.isLoading = false;
}

function filterByGroup(articles, groupId) {
  if (groupId === 'all') return articles;
  return articles.filter(a =>
    a.group === groupId ||
    (a.groups && a.groups.includes(groupId))
  );
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

  slice.forEach((article, idx) => {
    const card = createArticleCard(article, reset && idx === 0);
    grid.appendChild(card);
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
    videos.slice(0, VIDEOS_PER_PAGE).forEach(video => {
      grid.appendChild(createVideoCard(video));
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
    const url = video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    window.open(url, '_blank', 'noopener');
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
    posts.slice(0, COMMUNITY_PER_PAGE).forEach(post => {
      grid.appendChild(createCommunityCard(post));
    });
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

  filtered.forEach(article => {
    grid.appendChild(createArticleCard(article, false));
  });
}

// ── PODCAST ────────────────────────────────────────────────
function renderPodcast() {
  const episodeList = document.getElementById('episode-list');
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

  document.getElementById('stat-articles').textContent = todayCount || articles.length || '—';
  document.getElementById('stat-groups').textContent = state.allGroups.length || '28';

  if (data && data.updatedAt) {
    const ago = formatTimeAgo(data.updatedAt);
    document.getElementById('stat-updated').textContent = ago;
    state.lastUpdatedAt = data.updatedAt;
  } else if (state.lastUpdatedAt) {
    document.getElementById('stat-updated').textContent = formatTimeAgo(state.lastUpdatedAt);
  } else {
    document.getElementById('stat-updated').textContent = 'Daily';
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
  document.getElementById('articles-grid').innerHTML =
    emptyHTML('Something went wrong loading the site. Please try again shortly.');
}
