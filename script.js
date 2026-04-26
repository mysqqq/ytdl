const API_BASE = 'https://api-library-kohi.onrender.com/api/alldl';

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

let progressTimer = null;
function startProgress() {
  let secs = 0;
  const update = () => {
    secs++;
    const dots = '.'.repeat((secs % 4));
    setStatus(`<b>Processing video${dots}</b><div class="progress-msg">Extracting download link — please wait <b>${secs}s</b>. Do not close this page.</div>`);
  };
  update();
  progressTimer = setInterval(update, 1000);
}
function stopProgress() { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } }

async function run() {
  const url = urlInput.value.trim();
  clear();
  if (!url) return setStatus('Please enter a YouTube URL.', 'error');
  if (!/youtube\.com|youtu\.be/i.test(url)) return setStatus('Invalid YouTube URL.', 'error');

  setLoading(true);
  startProgress();

  try {
    const r = await fetch(`${API_BASE}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    console.log('YT API response', json);

    if (!json.status || !json.data || !json.data.videoUrl) {
      throw new Error(json.error || 'No download link returned');
    }

    const videoUrl = json.data.videoUrl;
    const ytId = extractYtId(url);
    const thumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '';

    let html = `<div class="result">`;
    html += `<span class="platform-badge">YouTube</span>`;
    if (thumb) html += `<img src="${thumb}" class="thumb" alt="" onerror="this.remove()">`;
    html += `<div class="qrow">`;
    html += `<a class="dl" href="${escape(videoUrl)}" download target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      Download Video <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.18);color:#fff;letter-spacing:.5px;">MP4</span>
    </a>`;
    html += `</div></div>`;

    resultBox.innerHTML = html;
    stopProgress();
    setStatus('');
  } catch (e) {
    console.error(e);
    stopProgress();
    setStatus('Failed to fetch video. The service may be busy or the video is restricted.', 'error');
  } finally { setLoading(false); }
}

btn.addEventListener('click', run);
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') run(); });
