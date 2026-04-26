const APIFY_TOKEN = "apify_api_F5ykzo2OHD83NHEQJ6zkPgDg5kabLp2EnykG";
const APIFY_URL = `https://api.apify.com/v2/acts/streamers~youtube-video-downloader/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

const urlInput = document.getElementById('urlInput');
const btn = document.getElementById('downloadBtn');
const status = document.getElementById('status');
const resultBox = document.getElementById('result');

function setStatus(m, t) { status.className = 'status' + (t ? ' ' + t : ''); status.innerHTML = m || ''; }
function setLoading(on) { btn.disabled = on; btn.innerHTML = on ? '<span class="spinner"></span>Processing…' : 'Download'; }
function clear() { resultBox.innerHTML = ''; setStatus(''); }
function escape(s) { const d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }

function extractYtId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function cleanTitle(fileKey) {
  if (!fileKey) return '';
  return fileKey.replace(/^[^_]+_/, '').replace(/\.\w+$/, '').replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim();
}

let progressTimer = null;
function startProgress() {
  let secs = 0;
  const update = () => {
    secs++;
    const dots = '.'.repeat((secs % 4));
    setStatus(`<b>⏳ Processing video${dots}</b><div class="progress-msg">YouTube takes <b>30–60 seconds</b> to extract. Please wait, do not close this page.</div>`);
  };
  update();
  progressTimer = setInterval(update, 1000);
}
function stopProgress() { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } }

async function run() {
  const url = urlInput.value.trim();
  clear();
  if (!url) return setStatus('⚠️ Please enter a YouTube URL.', 'error');
  if (!/youtube\.com|youtu\.be/i.test(url)) return setStatus('⚠️ Invalid YouTube URL.', 'error');

  setLoading(true);
  startProgress();

  try {
    const r = await fetch(APIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos: [{ url }] }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    console.log('YT (Apify) response', data);

    const item = Array.isArray(data) ? data[0] : data;
    if (!item || !item.downloadedFileUrl) throw new Error('No download link returned');

    const ytId = item.id || extractYtId(url);
    const thumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '';
    const title = cleanTitle(item.fileKey);

    let html = `<div class="result">`;
    html += `<span class="platform-badge">▶ YouTube</span>`;
    if (thumb) html += `<img src="${thumb}" class="thumb" alt="" onerror="this.remove()">`;
    if (title) html += `<div class="meta">${escape(title)}</div>`;
    html += `<div class="qrow">`;
    html += `<a class="dl" href="${item.downloadedFileUrl}" download target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      Download Video <span class="qbadge">HD</span>
    </a>`;
    if (item.audioOnlyUrl) html += `<a class="dl audio" href="${item.audioOnlyUrl}" download="youtube-audio.webm" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
      Download Audio Only <span class="qbadge">M4A</span>
    </a>`;
    if (item.videoOnlyUrl) html += `<a class="dl" style="background:rgba(255,255,255,.06);border:1px solid var(--line);box-shadow:none" href="${item.videoOnlyUrl}" download target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      Video Only (no audio)
    </a>`;
    html += `</div></div>`;

    resultBox.innerHTML = html;
    stopProgress();
    setStatus('');
  } catch (e) {
    console.error(e);
    stopProgress();
    setStatus('❌ Failed to fetch video. The service may be busy or the video is restricted.', 'error');
  } finally { setLoading(false); }
}

btn.addEventListener('click', run);
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') run(); });
