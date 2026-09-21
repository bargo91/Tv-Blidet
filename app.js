const fallbackChannels = [
  { id: 'nasa', name: 'NASA TV Public', country: 'الولايات المتحدة', flag: '🇺🇸', code: 'usa', logo: 'NASA TV', quality: 'HD', color: '#284f74', source: 'https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4' },
  { id: 'france24', name: 'France 24', country: 'فرنسا', flag: '🇫🇷', code: 'france', logo: 'FRANCE 24', quality: 'HD', color: '#1b5e8f', source: 'https://storage.googleapis.com/coverr-main/mp4/Footboys.mp4' },
  { id: 'aljazeera', name: 'الجزيرة الوثائقية', country: 'قطر', flag: '🇶🇦', code: 'qatar', logo: 'الجزيرة', quality: 'HD', color: '#a14a21', source: 'https://storage.googleapis.com/coverr-main/mp4/Island_Nature.mp4' },
  { id: 'dw', name: 'DW English', country: 'ألمانيا', flag: '🇩🇪', code: 'germany', logo: 'DW', quality: 'HD', color: '#376c83', source: 'https://storage.googleapis.com/coverr-main/mp4/For_Wes.mp4' },
  { id: 'rtm', name: 'الأولى المغربية', country: 'المغرب', flag: '🇲🇦', code: 'morocco', logo: 'الأولى', quality: 'HD', color: '#a7353b', source: 'https://storage.googleapis.com/coverr-main/mp4/Big_Buck_Bunny.mp4' },
  { id: 'tunisia', name: 'الوطنية التونسية', country: 'تونس', flag: '🇹🇳', code: 'tunisia', logo: 'الوطنية 1', quality: 'SD', color: '#a12f36', source: 'https://storage.googleapis.com/coverr-main/mp4/Elephants_Dream.mp4' },
  { id: 'euro', name: 'Euronews', country: 'أوروبا', flag: '🇪🇺', code: 'europe', logo: 'euronews', quality: 'HD', color: '#2c5d7b', source: 'https://storage.googleapis.com/coverr-main/mp4/For_Wes.mp4' },
  { id: 'open-sport', name: 'Open Sport Demo', country: 'عالمي', flag: '🌍', code: 'world', logo: 'OPEN SPORT', quality: '4K', color: '#3d7048', source: 'https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4' }
];
let channels = fallbackChannels;
let generalChannels = fallbackChannels;
let sportsChannels = [];
let categories = [];
const state = { category: 'all', query: '', selected: channels[0], section: 'general' };
let hlsPlayer = null;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const remotePlaylistUrl = 'https://iptv-org.github.io/iptv/index.m3u';
const sportsPlaylistUrl = 'https://live.hacks.tools/iptv/categories/sports.m3u';
const appVersion = '1.0.9';
const releasesUrl = 'https://api.github.com/repos/bargo91/Tv-Blidet/releases/latest';
const updateState = { available: false, downloadUrl: '' };
let storedRemovedChannels = [];
try { storedRemovedChannels = JSON.parse(localStorage.getItem('removedChannels') || '[]'); } catch (error) { storedRemovedChannels = []; }
const removedChannels = new Set(storedRemovedChannels);
const countryFlags = {
  AL: '🇦🇱', DZ: '🇩🇿', DE: '🇩🇪', EG: '🇪🇬', ES: '🇪🇸', FR: '🇫🇷', GB: '🇬🇧', GR: '🇬🇷',
  IN: '🇮🇳', IT: '🇮🇹', JP: '🇯🇵', MA: '🇲🇦', QA: '🇶🇦', RU: '🇷🇺', TN: '🇹🇳', TR: '🇹🇷',
  UA: '🇺🇦', US: '🇺🇸', AE: '🇦🇪', BR: '🇧🇷', CA: '🇨🇦', AU: '🇦🇺', BE: '🇧🇪', NL: '🇳🇱',
  PT: '🇵🇹', MX: '🇲🇽', ZA: '🇿🇦', KR: '🇰🇷', CN: '🇨🇳'
};
const categoryDefinitions = [
  ['all', 'الكل', '✦'], ['sports', 'رياضة', '⚽'], ['news', 'أخبار', '📰'], ['culture', 'ثقافة', '📚'],
  ['kids', 'أطفال', '★'], ['music', 'موسيقى', '♫'], ['movies', 'أفلام', '▶'], ['entertainment', 'ترفيه', '✦'], ['religion', 'دينية', '☼']
];

function classifyChannel(name = '', group = '') {
  const text = `${name} ${group}`.toLocaleLowerCase();
  const rules = [
    ['sports', /sport|football|soccer|basket|tennis|cricket|fifa|bein|espn|sky sport|الدوري|رياضة|رياضي/],
    ['news', /news|breaking|cnn|bbc|france 24|euronews|aljazeera|أخبار|خبر/],
    ['kids', /kid|cartoon|junior|disney|nick|toons|أطفال|طفل|كرتون/],
    ['music', /music|radio|song|hits|mtv|موسيقى|أغاني|إذاعة/],
    ['movies', /movie|film|cinema|hbo|action|drama|أفلام|سينما/],
    ['religion', /relig|quran|church|christ|islam|قرآن|دينية|دين/],
    ['culture', /culture|documentary|history|science|education|ثقاف|وثائق|تاريخ|علوم|تعليم/],
    ['entertainment', /entertainment|series|show|comedy|ترفيه|مسلسلات|منوعات/]
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || 'entertainment';
}

function attributeValue(attributes, name) {
  return attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1]?.trim() || '';
}

function parsePlaylist(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const parsed = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith('#EXTINF')) continue;
    const source = lines[index + 1];
    if (!source || !/^https?:\/\//i.test(source)) continue;
    const comma = lines[index].indexOf(',');
    const attributes = comma >= 0 ? lines[index].slice(0, comma) : lines[index];
    const name = (comma >= 0 ? lines[index].slice(comma + 1) : attributeValue(attributes, 'tvg-name')).trim();
    const countryCode = attributeValue(attributes, 'tvg-country').toUpperCase();
    const country = attributeValue(attributes, 'group-title') || countryCode || 'عالمي';
    const logo = attributeValue(attributes, 'tvg-logo');
    const id = `remote-${parsed.length}-${encodeURIComponent(source)}`;
    parsed.push({ id, name: name || 'قناة بدون اسم', country, flag: countryFlags[countryCode] || '🌍', code: `remote-${countryCode || country.toLowerCase().replace(/\s+/g, '-')}`, category: classifyChannel(name, country), logo: name || 'TV', quality: 'LIVE', color: '#285c5c', source, logoUrl: logo });
    index += 1;
  }
  return parsed.filter((channel, index, list) => !removedChannels.has(channel.source) && list.findIndex((item) => item.source === channel.source) === index);
}

function rebuildCategories() {
  const active = new Set(channels.map((channel) => channel.category || classifyChannel(channel.name, channel.country)));
  categories = categoryDefinitions.filter(([code]) => code === 'all' || active.has(code)).map(([code, name, icon]) => ({ code, name, icon }));
}

async function loadRemotePlaylist() {
  try {
    const response = await fetch(remotePlaylistUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Playlist request failed: ${response.status}`);
    const remoteChannels = parsePlaylist(await response.text());
    if (!remoteChannels.length) throw new Error('Playlist is empty');
    generalChannels = ChannelIntelligence.rank(remoteChannels);
    await ChannelDatabase.save(generalChannels, 'general');
    if (state.section === 'general') channels = generalChannels;
    if (state.section === 'general') state.selected = channels[0];
    rebuildCategories();
    renderTabs();
    renderChannels();
    showToast(`${channels.length} قناة تمت إضافتها من القائمة المفتوحة`);
  } catch (error) {
    rebuildCategories();
    renderTabs();
    renderChannels();
    showToast('تعذر تحديث قائمة القنوات، تم استخدام القائمة المحلية');
  }
}

async function loadSportsPlaylist() {
  try {
    const response = await fetch(sportsPlaylistUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Sports playlist request failed: ${response.status}`);
    const parsed = parsePlaylist(await response.text());
    if (!parsed.length) throw new Error('Sports playlist is empty');
    sportsChannels = ChannelIntelligence.rank(parsed);
    await ChannelDatabase.save(sportsChannels, 'sports');
    if (state.section === 'sports') {
      channels = sportsChannels;
      state.selected = channels[0];
      rebuildCategories();
      renderTabs();
      renderChannels();
    }
    showToast(`${sportsChannels.length} قناة رياضية تمت مزامنتها`);
  } catch (error) {
    if (state.section === 'sports') showToast('مصدر Live Sport محجوب أو غير متاح حالياً');
  }
}

function switchSection(section) {
  state.section = section;
  state.category = 'all';
  state.query = '';
  $('#searchInput').value = '';
  $('#sportsTab').classList.toggle('active', section === 'sports');
  $('#allChannelsTab').classList.toggle('active', section === 'general');
  if (section === 'sports') {
    if (!sportsChannels.length) loadSportsPlaylist();
    channels = sportsChannels;
  } else {
    channels = generalChannels;
  }
  state.selected = channels[0] || fallbackChannels[0];
  rebuildCategories();
  renderTabs();
  renderChannels();
}

function removeUnavailableChannel(channel) {
  if (!channel?.source || removedChannels.has(channel.source)) return;
  removedChannels.add(channel.source);
  ChannelDatabase.markUnavailable(channel.source);
  localStorage.setItem('removedChannels', JSON.stringify([...removedChannels]));
  channels = channels.filter((item) => item.source !== channel.source);
  if (state.selected.id === channel.id) state.selected = channels[0] || fallbackChannels[0];
  rebuildCategories();
  renderTabs();
  renderChannels();
  showToast(`تمت إزالة القناة غير المتاحة: ${channel.name}`);
}

function renderTabs() {
  $('#countryTabs').innerHTML = categories.map((category) => `<button class="country-tab ${state.category === category.code ? 'active' : ''}" data-category="${category.code}" role="tab"><span class="country-flag">${category.icon}</span>${category.name}</button>`).join('');
  $$('.country-tab').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; state.channelLimit = 120; renderTabs(); renderChannels(); }));
}

function renderChannels() {
  const query = state.query.trim().toLocaleLowerCase();
  const visible = channels.filter((channel) => (state.category === 'all' || (channel.category || classifyChannel(channel.name, channel.country)) === state.category) && (!query || `${channel.name} ${channel.country} ${channel.code}`.toLocaleLowerCase().includes(query)));
  const pageSize = 120;
  const displayed = visible.slice(0, state.channelLimit || pageSize);
  $('#channelGrid').innerHTML = displayed.map((channel) => `<article class="channel-card ${state.selected.id === channel.id ? 'selected' : ''}" data-id="${channel.id}" tabindex="0"><div class="channel-thumb" style="--thumb:${channel.color};background-image:url('${channel.logoUrl || ''}');background-size:contain;background-position:center;background-repeat:no-repeat"><span class="channel-logo">${channel.logo}</span><span class="channel-play">▶</span></div><div class="channel-info"><div><strong>${channel.name}</strong><small>${channel.flag} ${channel.country}</small></div><span class="hd-tag">${channel.quality}</span></div></article>`).join('');
  $('#emptyState').classList.toggle('hidden', visible.length > 0);
  const loadMoreButton = $('#loadMoreButton');
  loadMoreButton.classList.toggle('hidden', displayed.length >= visible.length);
  loadMoreButton.textContent = `تحميل المزيد (${visible.length - displayed.length} متبقية)`;
  $$('.channel-card').forEach((card) => { const choose = () => openPlayer(channels.find((channel) => channel.id === card.dataset.id)); card.addEventListener('click', choose); card.addEventListener('keydown', (event) => { if (event.key === 'Enter') choose(); }); });
}

function openPlayer(channel) {
  if (!channel) return;
  state.selected = channel;
  $('#playerDock').classList.add('open');
  $('#playerName').textContent = channel.name;
  $('#fallbackName').textContent = channel.name;
  $('#heroChannelName').textContent = channel.name;
  $('#playerCountry').textContent = `${channel.country} · مصدر قانوني تجريبي`;
  const video = $('#videoPlayer');
  hlsPlayer?.destroy();
  hlsPlayer = null;
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.classList.remove('playing');
  $('#playerFallback').style.display = 'flex';
  $('#qualitySelect').innerHTML = '<option value="auto">تلقائي</option>';
  if (/\.m3u8(?:$|[?#])/i.test(channel.source)) {
    if (window.Hls?.isSupported()) {
      hlsPlayer = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsPlayer.loadSource(channel.source);
      hlsPlayer.attachMedia(video);
      hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
        const options = hlsPlayer.levels.map((level, index) => `<option value="${index}">${level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`}</option>`).join('');
        $('#qualitySelect').insertAdjacentHTML('beforeend', options);
        showToast('القناة جاهزة، اضغط تشغيل');
      });
      hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hlsPlayer.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hlsPlayer.recoverMediaError();
        else showPlaybackError();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.source;
      video.addEventListener('loadedmetadata', () => showToast('القناة جاهزة، اضغط تشغيل'), { once: true });
    } else {
      showPlaybackError();
    }
  } else {
    video.src = channel.source;
    video.addEventListener('loadedmetadata', () => showToast('القناة جاهزة، اضغط تشغيل'), { once: true });
  }
  renderChannels();
  $('#playerDock').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function startPlayback(video) {
  video.play().catch(() => showToast('اضغط زر التشغيل لبدء المشاهدة'));
}

function showPlaybackError() {
  $('#playerFallback').style.display = 'flex';
  removeUnavailableChannel(state.selected);
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }
function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat('ar-DZ', { hour: '2-digit', minute: '2-digit' }).format(new Date()); }

function versionNumber(version) {
  return version.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0).slice(0, 3).concat([0, 0, 0]).slice(0, 3);
}

function isNewerVersion(candidate, current) {
  const next = versionNumber(candidate);
  const installed = versionNumber(current);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] > installed[index]) return true;
    if (next[index] < installed[index]) return false;
  }
  return false;
}

async function checkForUpdate(showResult = false) {
  try {
    const response = await fetch(releasesUrl, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Release request failed: ${response.status}`);
    const release = await response.json();
    const apk = release.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
    updateState.available = Boolean(apk && isNewerVersion(release.tag_name || release.name || '', appVersion));
    updateState.downloadUrl = apk?.browser_download_url || '';
    const updateButton = $('#updateButton');
    updateButton.classList.toggle('update-ready', updateState.available);
    updateButton.title = updateState.available ? `تحديث متاح: ${release.tag_name}` : 'التحقق من التحديثات';
    updateButton.setAttribute('aria-label', updateButton.title);
    if (updateState.available) {
      $('#updateMessage').textContent = `يتوفر الإصدار ${release.tag_name} من BLidaoui TV.`;
      if (!sessionStorage.getItem('updatePromptShown')) {
        $('#updateDialog').showModal();
        sessionStorage.setItem('updatePromptShown', 'true');
      }
    }
    if (showResult) showToast(updateState.available ? `يتوفر تحديث جديد ${release.tag_name}` : 'التطبيق محدث إلى آخر إصدار');
  } catch (error) {
    if (showResult) showToast('تعذر فحص التحديثات حالياً');
  }
}

$('#searchInput').addEventListener('input', (event) => { state.query = event.target.value; state.channelLimit = 120; renderChannels(); });
$('#loadMoreButton').addEventListener('click', () => { state.channelLimit = (state.channelLimit || 120) + 120; renderChannels(); });
$('#allChannelsTab').addEventListener('click', () => switchSection('general'));
$('#sportsTab').addEventListener('click', () => switchSection('sports'));
$('#browseButton').addEventListener('click', () => $('#channels').scrollIntoView({ behavior: 'smooth' }));
$('#heroPlay').addEventListener('click', () => openPlayer(state.selected));
$('#closePlayer').addEventListener('click', () => { $('#playerDock').classList.remove('open'); $('#videoPlayer').pause(); hlsPlayer?.destroy(); hlsPlayer = null; });
$('#videoPlayer').addEventListener('play', () => { $('#videoPlayer').classList.add('playing'); $('#playerFallback').style.display = 'none'; });
$('#videoPlayer').addEventListener('error', showPlaybackError);
$('#fallbackPlay').addEventListener('click', () => startPlayback($('#videoPlayer')));
$('#fullscreenButton').addEventListener('click', () => { const screen = $('.player-screen'); if (document.fullscreenElement) document.exitFullscreen(); else screen.requestFullscreen?.(); });
$('#pipButton').addEventListener('click', async () => { try { await $('#videoPlayer').requestPictureInPicture(); } catch { showToast('النافذة العائمة غير مدعومة في هذا المتصفح'); } });
$('#qualitySelect').addEventListener('change', (event) => {
  if (hlsPlayer) hlsPlayer.currentLevel = event.target.value === 'auto' ? -1 : Number(event.target.value);
  showToast(`تم اختيار جودة ${event.target.value === 'auto' ? 'تلقائية' : event.target.options[event.target.selectedIndex].textContent}`);
});
function downloadUpdate() {
  if (updateState.available && updateState.downloadUrl) {
    window.open(updateState.downloadUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  localStorage.setItem('lastUpdateCheck', Date.now());
  checkForUpdate(true);
}

$('#updateButton').addEventListener('click', downloadUpdate);
$('#downloadUpdate').addEventListener('click', downloadUpdate);
$('#dismissUpdate').addEventListener('click', () => $('#updateDialog').close());

rebuildCategories(); renderTabs(); renderChannels(); updateClock(); window.setInterval(updateClock, 30000); loadRemotePlaylist(); loadSportsPlaylist(); window.setInterval(loadRemotePlaylist, 60 * 60 * 1000); window.setInterval(loadSportsPlaylist, 60 * 60 * 1000); checkForUpdate(); window.setInterval(() => checkForUpdate(), 60 * 60 * 1000);
