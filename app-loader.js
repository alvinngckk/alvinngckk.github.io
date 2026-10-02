(() => {
  const parts = ["app-p1.js", "app-p2.js", "app-p3.js", "app-p4.js", "app-p5.js", "app-p6.js", "app-p7.js", "app-p8.js", "app-p9.js", "app-p10.js", "app-p11.js", "app-p12.js"];
  (async () => {
    try {
      let code = "";
      for (const p of parts) {
        const res = await fetch("./" + p, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status + " " + p);
        code += await res.text();
      }
      (0, eval)(code);
    } catch (e) {
      console.error(e);
      const t = document.getElementById("toast");
      if (t) { t.textContent = "載入腳本失敗：" + e; t.classList.add("show"); }
    }
  })();
})();
