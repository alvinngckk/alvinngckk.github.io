/* load full app.js from media-english-study (assembled 49481 bytes) */
(async () => {
  const src = "https://cdn.jsdelivr.net/gh/alvinngckk/media-english-study@main/app.js";
  const css = "https://cdn.jsdelivr.net/gh/alvinngckk/media-english-study@main/styles.css";
  try {
    // Prefer repo styles if present; also pull canonical CSS from main app repo
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css;
    document.head.appendChild(link);
    const code = await fetch(src, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      return r.text();
    });
    const s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML(
      "afterbegin",
      "<pre style='color:red;padding:1rem'>Failed to load app from CDN: " +
        e +
        "</pre>"
    );
  }
})();
