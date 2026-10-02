    $("#vocabListPanel").classList.remove("hidden");
    openDrawer("#vocabDrawer");
  }


  // ── Load captions from URL ──
  const CORS_PROXY_PREFIX = "https://corsproxy.io/?";

  function setUrlStatus(msg, kind) {
    const el = $("#urlLoadStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("is-error", "is-loading", "is-ok");
    if (kind) el.classList.add(`is-${kind}`);
  }

  function isYouTubeOrVideoPageUrl(raw) {
    try {
      const u = new URL(raw, location.href);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (/(^|\.)youtube\.com$/.test(host) || host === "youtu.be" || host === "m.youtube.com") {
        // Direct subtitle endpoints are rare; treat watch/shorts/embed as pages
        if (/\.(srt|vtt|txt)(\?|#|$)/i.test(u.pathname + u.search)) return false;
        return true;
      }
      if (/(^|\.)vimeo\.com$/.test(host) && !/\.(srt|vtt|txt)(\?|#|$)/i.test(u.pathname)) return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function looksLikeSubtitleUrl(raw) {
    try {
      const u = new URL(raw, location.href);
      return /\.(srt|vtt|txt)(\?|#|$)/i.test(u.pathname) ||
        /\.(srt|vtt|txt)(\?|#|$)/i.test(raw);
    } catch (_) {
      return /\.(srt|vtt|txt)(\?|#|$)/i.test(raw);
    }
  }

  function isLikelyCorsFailure(err, res) {
    if (res && res.type === "opaque") return true;
    const msg = String(err && err.message || err || "").toLowerCase();
    if (/failed to fetch|networkerror|cors|blocked|access-control/i.test(msg)) return true;
    // TypeError from fetch often means CORS/network in browsers
    if (err && err.name === "TypeError") return true;
    return false;
  }

  async function fetchTextWithCorsFallback(url) {
    // 1) Direct fetch
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.httpStatus = res.status;
        err.res = res;
        throw err;
      }
      const text = await res.text();
      return { text, via: "direct" };
    } catch (directErr) {
      // Relative / same-origin failures: don't proxy
      let absolute;
      try { absolute = new URL(url, location.href); } catch (_) {
        throw directErr;
      }
      const sameOrigin = absolute.origin === location.origin;
      if (sameOrigin || absolute.protocol === "file:") {
        throw directErr;
      }
      if (!isLikelyCorsFailure(directErr, directErr.res) && directErr.httpStatus) {
        // Real HTTP error (404 etc.) — don't pretend CORS
        throw directErr;
      }
      // 2) Last-resort public CORS proxy
      const proxied = CORS_PROXY_PREFIX + encodeURIComponent(absolute.href);
      try {
        const res2 = await fetch(proxied, { mode: "cors", credentials: "omit", cache: "no-store" });
        if (!res2.ok) {
          const err = new Error(`Proxy HTTP ${res2.status}`);
          err.httpStatus = res2.status;
          throw err;
        }
        const text = await res2.text();
        return { text, via: "proxy" };
      } catch (proxyErr) {
        const wrap = new Error("CORS_OR_NETWORK");
        wrap.cause = directErr;
        wrap.proxyError = proxyErr;
        throw wrap;
      }
    }
  }

  async function loadCaptionFromUrl() {
    const input = $("#captionUrlInput");
    const btn = $("#btnLoadUrl");
    const langSel = $("#captionUrlLang");
    const raw = (input?.value || "").trim();
    if (!raw) {
      setUrlStatus("請先貼上字幕網址。", "error");
      toast("請先貼上字幕網址");
      return;
    }

    if (isYouTubeOrVideoPageUrl(raw)) {
      const msg = "無法在瀏覽器直接擷取 YouTube／影片頁字幕（需官方 API，且本應用不支援）。請改貼 .srt／.vtt 字幕檔網址，或下載後上傳。";
      setUrlStatus(msg, "error");
      toast("無法擷取 YouTube 字幕，請改用 SRT 網址或上傳");
      return;
