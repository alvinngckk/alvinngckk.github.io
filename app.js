/* load full app.js + styles from media-english-study @ fa92af072c0cef3e151c476cb74b4452f74395e5 */
(async () => {
  const base = "https://cdn.jsdelivr.net/gh/alvinngckk/media-english-study@fa92af072c0cef3e151c476cb74b4452f74395e5/";
  try {
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = base + "styles.css";
    document.head.appendChild(cssLink);
  } catch (e) { console.warn("css load", e); }
  try {
    const res = await fetch(base + "app.js");
    if (!res.ok) throw new Error("app.js " + res.status);
    const code = await res.text();
    const s = document.createElement("script");
    s.textContent = code;
    document.body.appendChild(s);
  } catch (e) {
    console.error(e);
    const el = document.getElementById("mainMount");
    if (el) el.innerHTML = "<p class=\"hint\" style=\"padding:1rem\">無法載入應用（CDN）。請稍後重試或使用已部署後端站。</p>";
  }
})();
