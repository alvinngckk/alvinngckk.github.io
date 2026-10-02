(() => {
  async function loadText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
    return await res.text();
  }
  async function tryLoad(urls) {
    let lastErr;
    for (const url of urls) {
      try {
        return await loadText(url);
      } catch (e) {
        lastErr = e;
        console.warn("script mirror failed", url, e);
      }
    }
    throw lastErr || new Error("no script mirrors");
  }
  (async () => {
    try {
      const chunks = ["app-p1.js","app-p2.js","app-p3.js","app-p4.js","app-p5.js","app-p6.js","app-p7.js","app-p8.js","app-p9.js","app-p10.js","app-p11.js","app-p12.js"];
      let code = "";
      try {
        code = await tryLoad([
          "./app.js",
          "https://snappy-ribbon-844.harvis.page/app.js",
          "https://witty-cove-t4kv.shiply.now/app.js"
        ]);
      } catch (_) {
        for (const p of chunks) code += await loadText("./" + p);
      }
      (0, eval)(code);
    } catch (e) {
      console.error(e);
      const t = document.getElementById("toast");
      if (t) { t.textContent = "載入腳本失敗：" + e; t.classList.add("show"); }
    }
  })();
})();
