/* ============================================================
   KPOP NETWORK — scripts/fetch-content.js
   Runs via GitHub Actions twice daily
   Fetches news, videos, and community content for all buckets
   ============================================================ */

const axios = require('axios');
const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new RSSParser({
  timeout: 10000,
  headers: { 'User-Agent': 'KPopNetwork/1.0' }
});

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data');

// ── GROUP DEFINITIONS ──────────────────────────────────────
const GROUPS = [
  { id: 'bts',          name: 'BTS',          bucket: 'bts',  terms: ['BTS kpop', 'Bangtan Boys', 'BTS 방탄'] },
  { id: 'txt',          name: 'TXT',          bucket: 'hybe', terms: ['TXT kpop', 'Tomorrow X Together'] },
  { id: 'cortis',       name: 'CORTIS',       bucket: 'hybe', terms: ['CORTIS kpop', 'CORTIS BigHit', 'GreenGreen kpop'] },
  { id: 'enhypen',      name: 'ENHYPEN',      bucket: 'hybe', terms: ['ENHYPEN kpop'] },
  { id: 'lesserafim',   name: 'LE SSERAFIM',  bucket: 'hybe', terms: ['LE SSERAFIM kpop'] },
  { id: 'illit',        name: 'ILLIT',        bucket: 'hybe', terms: ['ILLIT kpop'] },
  { id: 'boynextdoor',  name: 'BOYNEXTDOOR',  bucket: 'hybe', terms: ['BOYNEXTDOOR kpop'] },
  { id: 'andteam',      name: '&TEAM',        bucket: 'hybe', terms: ['&TEAM kpop'] },
  { id: 'blackpink',    name: 'BLACKPINK',    bucket: 'kpop', terms: ['BLACKPINK kpop'] },
  { id: 'twice',        name: 'TWICE',        bucket: 'kpop', terms: ['TWICE kpop'] },
  { id: 'straykids',    name: 'Stray Kids',   bucket: 'kpop', terms: ['Stray Kids kpop'] },
  { id: 'ateez',        name: 'ATEEZ',        bucket: 'kpop', terms: ['ATEEZ kpop'] },
  { id: 'aespa',        name: 'aespa',        bucket: 'kpop', terms: ['aespa kpop'] },
  { id: 'nct127',       name: 'NCT 127',      bucket: 'kpop', terms: ['NCT 127 kpop'] },
  { id: 'seventeen',    name: 'SEVENTEEN',    bucket: 'kpop', terms: ['SEVENTEEN kpop'] },
  { id: 'itzy',         name: 'ITZY',         bucket: 'kpop', terms: ['ITZY kpop'] },
  { id: 'ive',          name: 'IVE',          bucket: 'kpop', terms: ['IVE kpop group'] },
  { id: 'newjeans',     name: 'NewJeans',     bucket: 'kpop', terms: ['NewJeans kpop'] },
  { id: 'exo',          name: 'EXO',          bucket: 'kpop', terms: ['EXO kpop'] },
  { id: 'got7',         name: 'GOT7',         bucket: 'kpop', terms: ['GOT7 kpop'] },
  { id: 'monsta-x',     name: 'MONSTA X',     bucket: 'kpop', terms: ['MONSTA X kpop'] },
  { id: 'btob',         name: 'BTOB',         bucket: 'kpop', terms: ['BTOB kpop'] },
  { id: 'oneus',        name: 'ONEUS',        bucket: 'kpop', terms: ['ONEUS kpop'] },
  { id: 'lucy',         name: 'LUCY',         bucket: 'kpop', terms: ['LUCY band kpop'] },
  { id: 'day6',         name: 'DAY6',         bucket: 'kpop', terms: ['DAY6 kpop'] },
  { id: 'riize',        name: 'RIIZE',        bucket: 'kpop', terms: ['RIIZE kpop'] },
  { id: 'kep1er',       name: 'Kep1er',       bucket: 'kpop', terms: ['Kep1er kpop'] },
  { id: 'zerobaseone',  name: 'ZEROBASEONE',  bucket: 'kpop', terms: ['ZEROBASEONE kpop', 'ZB1 kpop'] },
];

// ── RSS SOURCES ────────────────────────────────────────────
const NEWS_RSS_FEEDS = [
  { url: 'https://www.soompi.com/feed',                    source: 'Soompi' },
  { url: 'https://www.allkpop.com/feed',                   source: 'AllKPop' },
  { url: 'https://kpopdigest.com/feed',                    source: 'KpopDigest' },
  { url: 'https://kpoppie.com/feed',                       source: 'Kpoppie' },
  { url: 'https://www.koreaherald.com/rss/kpop',           source: 'Korea Herald' },
  { url: 'https://www.billboard.com/feed/',                source: 'Billboard' },
];

// ── YOUTUBE CHANNEL IDs ────────────────────────────────────
const YOUTUBE_CHANNELS = [
  { id: 'UCLkAepWjdE3a4Yi6s6bOatg', name: 'BTS',             group: 'bts',         bucket: 'bts' },
  { id: 'UC3IZKseVpdzPSBaWxBxundA', name: 'BANGTANTV',       group: 'bts',         bucket: 'bts' },
  { id: 'UCQdMnzvMRLMFf1RIDtaOdqQ', name: 'HYBE LABELS',     group: 'hybe',        bucket: 'hybe' },
  { id: 'UCt2qTWsEgBhEALhlBCRQJsQ', name: 'TXT',             group: 'txt',         bucket: 'hybe' },
  { id: 'UCIINNq9LGI2HKKcLBDklncA', name: 'ENHYPEN',         group: 'enhypen',     bucket: 'hybe' },
  { id: 'UCKoT0EP2VqRhzjV3ZBfp3HQ', name: 'LE SSERAFIM',     group: 'lesserafim',  bucket: 'hybe' },
  { id: 'UCOmHUn--16B90oW2L6FRR3A', name: 'BLACKPINK',       group: 'blackpink',   bucket: 'kpop' },
  { id: 'UCaO6TYkqCYh-xqLZOathSFQ', name: 'TWICE',           group: 'twice',       bucket: 'kpop' },
  { id: 'UCCrFcIDB7XRbPiGkBLSiCXw', name: 'Stray Kids',      group: 'straykids',   bucket: 'kpop' },
  { id: 'UCG2eOVAvCpHyEFf0vCiRoRQ', name: 'ATEEZ',           group: 'ateez',       bucket: 'kpop' },
  { id: 'UCbKPMHHAGbkDGqJWfpF_ZIw', name: 'aespa',           group: 'aespa',       bucket: 'kpop' },
  { id: 'UC7-6hBV1uxLAMKMbM2CKhEQ', name: 'NCT 127',         group: 'nct127',      bucket: 'kpop' },
  { id: 'UC8ginYMgFnq5XMHQpBx8gAQ', name: 'SEVENTEEN',       group: 'seventeen',   bucket: 'kpop' },
  { id: 'UCKlDDMHNpBCHMDr6MdQygBQ', name: 'ITZY',            group: 'itzy',        bucket: 'kpop' },
  { id: 'UCIZF0He4y8u0m1etpSLDgyw', name: 'IVE',             group: 'ive',         bucket: 'kpop' },
  { id: 'UCt2y-YCMJJlRQDin1KBXOlw', name: 'NewJeans',        group: 'newjeans',    bucket: 'kpop' },
];

// ── REDDIT SOURCES ─────────────────────────────────────────
const REDDIT_FEEDS = [
  { subreddit: 'kpop',               group: 'kpop',       bucket: 'kpop' },
  { subreddit: 'bangtan',            group: 'bts',        bucket: 'bts' },
  { subreddit: 'ATEEZ',              group: 'ateez',      bucket: 'kpop' },
  { subreddit: 'StrayKids',          group: 'straykids',  bucket: 'kpop' },
  { subreddit: 'BLACKPINK',          group: 'blackpink',  bucket: 'kpop' },
  { subreddit: 'twice',              group: 'twice',      bucket: 'kpop' },
  { subreddit: 'seventeen',          group: 'seventeen',  bucket: 'kpop' },
  { subreddit: 'NewJeans',           group: 'newjeans',   bucket: 'kpop' },
  { subreddit: 'TomorrowByTogether', group: 'txt',        bucket: 'hybe' },
  { subreddit: 'aespa',              group: 'aespa',      bucket: 'kpop' },
  { subreddit: 'enhypen',            group: 'enhypen',    bucket: 'hybe' },
  { subreddit: 'lesserafim',         group: 'lesserafim', bucket: 'hybe' },
];

// ── NEWSAPI QUERIES PER BUCKET ─────────────────────────────
const NEWSAPI_QUERIES = [
  { query: 'BTS kpop',                bucket: 'bts' },
  { query: 'Bangtan Boys',            bucket: 'bts' },
  { query: 'BTS Jungkook',            bucket: 'bts' },
  { query: 'BTS Jimin solo',          bucket: 'bts' },
  { query: 'BTS Jin Suga J-Hope',     bucket: 'bts' },
  { query: 'HYBE kpop',               bucket: 'hybe' },
  { query: 'TXT Tomorrow X Together', bucket: 'hybe' },
  { query: 'ENHYPEN kpop',            bucket: 'hybe' },
  { query: 'LE SSERAFIM kpop',        bucket: 'hybe' },
  { query: 'ILLIT kpop',              bucket: 'hybe' },
  { query: 'BOYNEXTDOOR kpop',        bucket: 'hybe' },
  { query: 'SEVENTEEN kpop',          bucket: 'hybe' },
  { query: 'NewJeans kpop',           bucket: 'hybe' },
  { query: 'kpop music',              bucket: 'kpop' },
  { query: 'BLACKPINK kpop',          bucket: 'kpop' },
  { query: 'Stray Kids kpop',         bucket: 'kpop' },
  { query: 'TWICE kpop',              bucket: 'kpop' },
  { query: 'ATEEZ kpop',              bucket: 'kpop' },
  { query: 'aespa kpop',              bucket: 'kpop' },
];

// ── MAIN ───────────────────────────────────────────────────
async function main() {
  console.log('🎵 KPop Network content fetch starting...');
  console.log(`📅 ${new Date().toISOString()}`);

  const buckets = { bts: [], hybe: [], kpop: [] };
  const videoBuckets = { bts: [], hybe: [], kpop: [] };
  const communityBuckets = { bts: [], hybe: [], kpop: [] };

  console.log('\n📰 Fetching RSS news feeds...');
  const rssArticles = await fetchRSSFeeds();
  console.log(`   Found ${rssArticles.length} RSS articles`);

  for (const article of rssArticles) {
    const match = matchGroupFromText(article.title + ' ' + (article.summary || ''));
    article.group = match ? match.id : 'kpop';
    const bucket = match ? match.bucket : 'kpop';
    buckets[bucket].push(article);
    if (bucket !== 'kpop') buckets['kpop'].push({ ...article });
  }

  if (NEWS_API_KEY) {
    console.log('\n📡 Fetching from NewsAPI...');
    const newsApiResults = await fetchNewsAPI();
    console.log(`   Found ${newsApiResults.bts.length} BTS, ${newsApiResults.hybe.length} HYBE, ${newsApiResults.kpop.length} KPOP articles from NewsAPI`);

    for (const article of newsApiResults.bts) {
      const match = matchGroupFromText(article.title + ' ' + (article.summary || ''));
      article.group = match ? match.id : 'bts';
      buckets['bts'].push(article);
      buckets['kpop'].push({ ...article });
    }
    for (const article of newsApiResults.hybe) {
      const match = matchGroupFromText(article.title + ' ' + (article.summary || ''));
      article.group = match ? match.id : 'hybe';
      buckets['hybe'].push(article);
      buckets['kpop'].push({ ...article });
    }
    for (const article of newsApiResults.kpop) {
      const match = matchGroupFromText(article.title + ' ' + (article.summary || ''));
      article.group = match ? match.id : 'kpop';
      const bucket = match ? match.bucket : 'kpop';
      buckets[bucket].push(article);
      if (bucket !== 'kpop') buckets['kpop'].push({ ...article });
    }
  }

  console.log('\n🎬 Fetching YouTube RSS feeds...');
  const allVideos = await fetchYouTubeFeeds();
  console.log(`   Found ${allVideos.length} videos`);
  for (const video of allVideos) {
    videoBuckets[video.bucket].push(video);
    if (video.bucket !== 'kpop') videoBuckets['kpop'].push({ ...video });
  }

  console.log('\n💬 Fetching Reddit feeds...');
  const allPosts = await fetchRedditFeeds();
  console.log(`   Found ${allPosts.length} community posts`);
  for (const post of allPosts) {
    communityBuckets[post.bucket].push(post);
    if (post.bucket !== 'kpop') communityBuckets['kpop'].push({ ...post });
  }

  if (ANTHROPIC_API_KEY) {
    console.log('\n🤖 Generating AI summaries (max 5 per bucket)...');
    for (const bucket of ['bts', 'hybe', 'kpop']) {
      let summaryCount = 0;
      for (const article of buckets[bucket]) {
        if (summaryCount >= 5) break;
        if (!article.summary && article.title) {
          article.summary = await generateSummary(article.title, article.description);
          summaryCount++;
          await sleep(300);
        }
      }
      console.log(`   ✅ ${bucket}: generated ${summaryCount} summaries`);
    }
  }

  console.log('\n🔄 Deduplicating...');
  for (const bucket of ['bts', 'hybe', 'kpop']) {
    buckets[bucket] = deduplicateByTitle(buckets[bucket]);
    videoBuckets[bucket] = deduplicateByTitle(videoBuckets[bucket]);
    communityBuckets[bucket] = deduplicateByTitle(communityBuckets[bucket]);
  }

  console.log('\n📦 Updating archives...');
  for (const bucket of ['bts', 'hybe', 'kpop']) {
    const archivePath = path.join(DATA_DIR, `${bucket}-archive.json`);
    let existing = [];
    try {
      const data = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      existing = data.articles || [];
    } catch (e) { /* first run */ }

    const combined = deduplicateByTitle([...buckets[bucket], ...existing]);
    const archive = combined.slice(0, 500);

    writeJSON(archivePath, {
      updatedAt: new Date().toISOString(),
      bucket,
      articles: archive
    });
  }

  console.log('\n💾 Writing data files...');
  for (const bucket of ['bts', 'hybe', 'kpop']) {
    writeJSON(path.join(DATA_DIR, `${bucket}-news.json`), {
      updatedAt: new Date().toISOString(),
      bucket,
      articles: buckets[bucket].slice(0, 60)
    });
    writeJSON(path.join(DATA_DIR, `${bucket}-videos.json`), {
      updatedAt: new Date().toISOString(),
      bucket,
      videos: videoBuckets[bucket].slice(0, 40)
    });
    writeJSON(path.join(DATA_DIR, `${bucket}-community.json`), {
      updatedAt: new Date().toISOString(),
      bucket,
      posts: communityBuckets[bucket].slice(0, 40)
    });
    console.log(`   ✅ ${bucket}: ${buckets[bucket].length} articles, ${videoBuckets[bucket].length} videos, ${communityBuckets[bucket].length} posts`);
  }

  console.log('\n✅ Content fetch complete!');
}

// ── FETCH RSS FEEDS ────────────────────────────────────────
async function fetchRSSFeeds() {
  const articles = [];
  for (const feed of NEWS_RSS_FEEDS) {
    try {
      console.log(`   Fetching ${feed.source}...`);
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, 30)) {
        articles.push({
          id: slugify(item.title || ''),
          title: cleanText(item.title || ''),
          url: item.link || '',
          source: feed.source,
          description: cleanText(item.contentSnippet || item.content || ''),
          summary: '',
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          author: item.creator || item.author || '',
          group: 'kpop',
        });
      }
    } catch (err) {
      console.log(`   ⚠️  ${feed.source} failed: ${err.message}`);
    }
  }
  return articles;
}

// ── FETCH NEWSAPI ──────────────────────────────────────────
async function fetchNewsAPI() {
  const results = { bts: [], hybe: [], kpop: [] };
  for (const { query, bucket } of NEWSAPI_QUERIES) {
    try {
      const res = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: NEWS_API_KEY,
        },
        timeout: 10000,
      });
      for (const item of (res.data.articles || [])) {
        if (!item.title || item.title === '[Removed]') continue;
        results[bucket].push({
          id: slugify(item.title),
          title: cleanText(item.title),
          url: item.url || '',
          source: item.source?.name || 'News',
          description: cleanText(item.description || ''),
          summary: cleanText(item.description || ''),
          publishedAt: item.publishedAt || new Date().toISOString(),
          author: item.author || '',
          group: bucket,
        });
      }
      await sleep(500);
    } catch (err) {
      console.log(`   ⚠️  NewsAPI query "${query}" failed: ${err.message}`);
    }
  }
  return results;
}

// ── FETCH YOUTUBE RSS ──────────────────────────────────────
async function fetchYouTubeFeeds() {
  const videos = [];
  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
      const parsed = await parser.parseURL(url);
      for (const item of (parsed.items || []).slice(0, 8)) {
        const videoId = extractYouTubeId(item.link || item.id || '');
        videos.push({
          id: videoId || slugify(item.title || ''),
          title: cleanText(item.title || ''),
          url: item.link || `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId,
          channelName: channel.name,
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '',
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          group: channel.group,
          bucket: channel.bucket,
        });
      }
      await sleep(300);
    } catch (err) {
      console.log(`   ⚠️  YouTube ${channel.name} failed: ${err.message}`);
    }
  }
  return videos;
}

// ── FETCH REDDIT ───────────────────────────────────────────
async function fetchRedditFeeds() {
  const posts = [];
  for (const feed of REDDIT_FEEDS) {
    try {
      const url = `https://www.reddit.com/r/${feed.subreddit}/hot.json?limit=15`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'KPopNetwork/1.0' },
        timeout: 10000,
      });
      const children = res.data?.data?.children || [];
      for (const child of children) {
        const post = child.data;
        if (post.stickied) continue;
        posts.push({
          id: post.id,
          title: cleanText(post.title || ''),
          url: `https://www.reddit.com${post.permalink}`,
          subreddit: feed.subreddit,
          upvotes: post.ups || 0,
          comments: post.num_comments || 0,
          author: post.author || '',
          publishedAt: post.created_utc
            ? new Date(post.created_utc * 1000).toISOString()
            : new Date().toISOString(),
          group: feed.group,
          bucket: feed.bucket,
        });
      }
      await sleep(1000);
    } catch (err) {
      console.log(`   ⚠️  Reddit r/${feed.subreddit} failed: ${err.message}`);
    }
  }
  return posts;
}

// ── AI SUMMARY GENERATION ──────────────────────────────────
async function generateSummary(title, description) {
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Write a 1-2 sentence neutral summary of this K-pop news article. Be concise and factual. Title: "${title}". Description: "${description || 'N/A'}". Reply with only the summary, no extra text.`
        }]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 8000,
      }
    );
    return res.data?.content?.[0]?.text?.trim() || '';
  } catch (err) {
    return '';
  }
}

// ── GROUP MATCHING ─────────────────────────────────────────
function matchGroupFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const keywords = [
    { id: 'bts',         terms: ['bts', 'bangtan', 'army fandom', 'jungkook', 'jimin', 'taehyung', ' rm ', 'suga', 'j-hope', 'jin ', 'v of bts'] },
    { id: 'txt',         terms: ['txt', 'tomorrow x together', 'moa fandom'] },
    { id: 'cortis',      terms: ['cortis', 'coer fandom', 'greengreen kpop', 'color outside the lines'] },
    { id: 'enhypen',     terms: ['enhypen', 'engene'] },
    { id: 'lesserafim',  terms: ['le sserafim', 'lesserafim', 'fearnot'] },
    { id: 'illit',       terms: ['illit kpop', 'illit group'] },
    { id: 'boynextdoor', terms: ['boynextdoor'] },
    { id: 'andteam',     terms: ['&team', 'andteam'] },
    { id: 'blackpink',   terms: ['blackpink', 'blink fandom', 'jennie', 'lisa', 'rosé', 'jisoo'] },
    { id: 'twice',       terms: ['twice kpop', 'once fandom', 'nayeon', 'jihyo', 'momo', 'sana', 'mina', 'dahyun', 'chaeyoung', 'tzuyu'] },
    { id: 'straykids',   terms: ['stray kids', 'straykids', 'stay fandom', 'bang chan', 'felix'] },
    { id: 'ateez',       terms: ['ateez', 'atiny', 'hongjoong', 'wooyoung'] },
    { id: 'aespa',       terms: ['aespa', 'karina', 'winter', 'giselle', 'ningning'] },
    { id: 'nct127',      terms: ['nct 127', 'nct127'] },
    { id: 'seventeen',   terms: ['seventeen kpop', 'carat fandom', 'svt'] },
    { id: 'itzy',        terms: ['itzy kpop', 'midzy'] },
    { id: 'ive',         terms: ['ive kpop', 'dive fandom', 'wonyoung'] },
    { id: 'newjeans',    terms: ['newjeans', 'bunnies fandom', 'minji', 'hanni', 'danielle', 'haerin', 'hyein'] },
    { id: 'exo',         terms: ['exo kpop', 'exo-l'] },
    { id: 'got7',        terms: ['got7', 'igot7', 'jay b', 'mark tuan'] },
    { id: 'monsta-x',    terms: ['monsta x', 'monbebe'] },
    { id: 'btob',        terms: ['btob kpop', 'melody fandom'] },
    { id: 'oneus',       terms: ['oneus kpop'] },
    { id: 'lucy',        terms: ['lucy band', 'lucy kpop'] },
    { id: 'day6',        terms: ['day6', 'my day fandom'] },
    { id: 'riize',       terms: ['riize kpop', 'briize'] },
    { id: 'kep1er',      terms: ['kep1er', 'keplian'] },
    { id: 'zerobaseone', terms: ['zerobaseone', 'zb1', 'zerobase fandom'] },
  ];

  for (const group of keywords) {
    for (const term of group.terms) {
      if (lower.includes(term)) {
        const found = GROUPS.find(g => g.id === group.id);
        return found || null;
      }
    }
  }
  return null;
}

// ── UTILITIES ──────────────────────────────────────────────
function deduplicateByTitle(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = slugify(item.title || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function extractYouTubeId(str) {
  const match = str.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|watch\?v=|\/videos\/|yt:video:)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   📄 Written: ${path.basename(filePath)}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── RUN ────────────────────────────────────────────────────
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
