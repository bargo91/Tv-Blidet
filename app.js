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
let countries = [];
const state = { country: 'all', query: '', selected: channels[0] };
let hlsPlayer = null;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const remotePlaylistUrl = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const appVersion = '1.0.2';
const releasesUrl = 'https://api.github.com/repos/bargo91/Tv-Blidet/releases/latest';
const updateState = { available: false, downloadUrl: '' };
const countryFlags = {
  AL: '🇦🇱', DZ: '🇩🇿', DE: '🇩🇪', EG: '🇪🇬', ES: '🇪🇸', FR: '🇫🇷', GB: '🇬🇧', GR: '🇬🇷',
  IN: '🇮🇳', IT: '🇮🇹', JP: '🇯🇵', MA: '🇲🇦', QA: '🇶🇦', RU: '🇷🇺', TN: '🇹🇳', TR: '🇹🇷',
  UA: '🇺🇦', US: '🇺🇸', AE: '🇦🇪', BR: '🇧🇷', CA: '🇨🇦', AU: '🇦🇺', BE: '🇧🇪', NL: '🇳🇱',
  PT: '🇵🇹', MX: '🇲🇽', ZA: '🇿🇦', KR: '🇰🇷', CN: '🇨🇳'
};

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
    parsed.push({ id, name: name || 'قناة بدون اسم', country, flag: countryFlags[countryCode] || '🌍', code: `remote-${countryCode || country.toLowerCase().replace(/\s+/g, '-')}`, logo: name || 'TV', quality: 'LIVE', color: '#285c5c', source, logoUrl: logo });
    index += 1;
  }
  return parsed.filter((channel, index, list) => list.findIndex((item) => item.source === channel.source) === index);
}

function rebuildCountries() {
  countries = [{ code: 'all', name: 'الكل', flag: '✦' }, ...channels.map(({ code, country, flag }) => ({ code, name: country, flag })).filter((item, index, list) => list.findIndex((other) => other.code === item.code) === index)];
}

async function loadRemotePlaylist() {
  try {
    const response = await fetch(remotePlaylistUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Playlist request failed: ${response.status}`);
    const remoteChannels = parsePlaylist(await response.text());
    if (!remoteChannels.length) throw new Error('Playlist is empty');
    channels = remoteChannels;
    state.selected = channels[0];
    rebuildCountries();
    renderTabs();
    renderChannels();
    showToast(`${channels.length} قناة تمت إضافتها من القائمة المفتوحة`);
  } catch (error) {
    rebuildCountries();
    renderTabs();
    renderChannels();
    showToast('تعذر تحديث قائمة القنوات، تم استخدام القائمة المحلية');
  }
}

function renderTabs() {
  $('#countryTabs').innerHTML = countries.map((country) => `<button class="country-tab ${state.country === country.code ? 'active' : ''}" data-country="${country.code}" role="tab"><span class="country-flag">${country.flag}</span>${country.name}</button>`).join('');
  $$('.country-tab').forEach((button) => button.addEventListener('click', () => { state.country = button.dataset.country; renderTabs(); renderChannels(); }));
}

function renderChannels() {
  const query = state.query.trim().toLocaleLowerCase();
  const visible = channels.filter((channel) => (state.country === 'all' || channel.code === state.country) && (!query || `${channel.name} ${channel.country}`.toLocaleLowerCase().includes(query)));
  $('#channelGrid').innerHTML = visible.map((channel) => `<article class="channel-card ${state.selected.id === channel.id ? 'selected' : ''}" data-id="${channel.id}" tabindex="0"><div class="channel-thumb" style="--thumb:${channel.color}"><span class="channel-logo">${channel.logo}</span><span class="channel-play">▶</span></div><div class="channel-info"><div><strong>${channel.name}</strong><small>${channel.flag} ${channel.country}</small></div><span class="hd-tag">${channel.quality}</span></div></article>`).join('');
  $('#emptyState').classList.toggle('hidden', visible.length > 0);
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
  if (/\.m3u8(?:$|[?#])/i.test(channel.source)) {
    if (window.Hls?.isSupported()) {
      hlsPlayer = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsPlayer.loadSource(channel.source);
      hlsPlayer.attachMedia(video);
      hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => showToast('القناة جاهزة، اضغط تشغيل'));
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
  showToast('تعذر تشغيل المصدر الحالي. اختر قناة أخرى.');
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }
function updateClock() { $('#clock').textContent = new Intl.DateTimeFormat('ar-DZ', { hour: '2-digit', minute: '2-digit' }).format(new Date()); }
function renderScores() { const scores = [['كأس العالم للأندية', 'مانشستر سيتي', '2 - 1'], ['الدوري الإسباني', 'برشلونة', '3 - 0'], ['بطولة إفريقيا', 'الترجي', '1 - 1']]; $('#scoreItems').innerHTML = scores.map(([competition, team, score]) => `<span class="score-item">${competition} · <b>${team}</b> ${score}</span>`).join(''); }

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
    if (showResult) showToast(updateState.available ? `يتوفر تحديث جديد ${release.tag_name}` : 'التطبيق محدث إلى آخر إصدار');
  } catch (error) {
    if (showResult) showToast('تعذر فحص التحديثات حالياً');
  }
}

$('#searchInput').addEventListener('input', (event) => { state.query = event.target.value; renderChannels(); });
$('#browseButton').addEventListener('click', () => $('#channels').scrollIntoView({ behavior: 'smooth' }));
$('#heroPlay').addEventListener('click', () => openPlayer(state.selected));
$('#closePlayer').addEventListener('click', () => { $('#playerDock').classList.remove('open'); $('#videoPlayer').pause(); hlsPlayer?.destroy(); hlsPlayer = null; });
$('#videoPlayer').addEventListener('play', () => { $('#videoPlayer').classList.add('playing'); $('#playerFallback').style.display = 'none'; });
$('#videoPlayer').addEventListener('error', showPlaybackError);
$('#fallbackPlay').addEventListener('click', () => startPlayback($('#videoPlayer')));
$('#fullscreenButton').addEventListener('click', () => { const screen = $('.player-screen'); if (document.fullscreenElement) document.exitFullscreen(); else screen.requestFullscreen?.(); });
$('#pipButton').addEventListener('click', async () => { try { await $('#videoPlayer').requestPictureInPicture(); } catch { showToast('النافذة العائمة غير مدعومة في هذا المتصفح'); } });
$('#qualitySelect').addEventListener('change', (event) => showToast(`تم اختيار جودة ${event.target.value === 'auto' ? 'تلقائية' : event.target.value + 'p'}`));
$('#updateButton').addEventListener('click', () => {
  if (updateState.available && updateState.downloadUrl) {
    window.open(updateState.downloadUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  localStorage.setItem('lastUpdateCheck', Date.now());
  checkForUpdate(true);
});

rebuildCountries(); renderTabs(); renderChannels(); renderScores(); updateClock(); window.setInterval(updateClock, 30000); loadRemotePlaylist(); checkForUpdate(); window.setInterval(() => checkForUpdate(), 6 * 60 * 60 * 1000);
