    const existing = prefs.vocab.find((v) => v.word.toLowerCase() === w.toLowerCase());
    if (existing) {
      toast(`「${w}」已在生詞本`);
      openVocabDrawer();
      return;
    }
    prefs.vocab.unshift({
      word: w,
      gloss: "",
      context: context || "",
      addedAt: Date.now(),
    });
    savePrefs();
    updateVocabBadge();
    toast(`已加入生詞：${w}`);
  }

  function updateVocabBadge() {
    const n = prefs.vocab.length;
    vocabBadge.textContent = String(n);
    vocabBadge.style.display = n ? "inline-flex" : "none";
  }

  function renderVocabList() {
    const list = $("#vocabList");
    if (!prefs.vocab.length) {
      list.innerHTML = `<p class="hint">尚未加入生詞。在英文字幕中點擊單字即可加入。</p>`;
      return;
    }
    list.innerHTML = "";
    prefs.vocab.forEach((v, i) => {
      const item = document.createElement("div");
      item.className = "vocab-item";
      item.innerHTML = `
        <div class="vocab-word"></div>
        <input class="vocab-gloss" type="text" placeholder="輸入中文解釋／例句…" />
        <div class="vocab-meta">
          <span class="ctx"></span>
          <button type="button" class="btn btn-sm btn-ghost del">刪除</button>
        </div>`;
      item.querySelector(".vocab-word").textContent = v.word;
      const input = item.querySelector(".vocab-gloss");
      input.value = v.gloss || "";
      input.addEventListener("change", () => {
        prefs.vocab[i].gloss = input.value.trim();
        savePrefs();
      });
      const ctx = item.querySelector(".ctx");
      ctx.textContent = v.context ? `「${v.context.slice(0, 40)}${v.context.length > 40 ? "…" : ""}」` : "";
      item.querySelector(".del").addEventListener("click", () => {
        prefs.vocab.splice(i, 1);
        savePrefs();
        updateVocabBadge();
        renderVocabList();
        toast("已刪除生詞");
      });
      list.appendChild(item);
    });
  }

  // Flashcards
  let fcIndex = 0;
  let fcRevealed = false;

  function renderFlashcard() {
    const card = $("#flashcard");
    if (!prefs.vocab.length) {
      card.innerHTML = `<p class="hint">生詞本是空的，先點擊英文字幕中的單字吧。</p>`;
      return;
    }
    if (fcIndex >= prefs.vocab.length) fcIndex = 0;
    const v = prefs.vocab[fcIndex];
    card.innerHTML = "";
    const w = document.createElement("div");
    w.className = "fc-word";
    w.textContent = v.word;
    card.appendChild(w);
    if (fcRevealed) {
      const g = document.createElement("div");
      g.className = "fc-gloss";
      g.textContent = v.gloss || "（尚未填寫中文）";
      card.appendChild(g);
      if (v.context) {
        const c = document.createElement("div");
        c.className = "fc-hint";
        c.textContent = v.context;
        card.appendChild(c);
      }
    } else {
      const h = document.createElement("div");
      h.className = "fc-hint";
      h.textContent = "點擊卡片顯示中文";
      card.appendChild(h);
    }
  }

  // ── Export ──
  function exportSRT() {
    if (!cues.length) {
      toast("沒有字幕可匯出");
      return;
    }
    const lines = [];
    cues.forEach((c, i) => {
      lines.push(String(i + 1));
      lines.push(`${formatTimeSRT(c.start)} --> ${formatTimeSRT(c.end)}`);
      if (c.en) lines.push(c.en);
      if (c.zh) lines.push(c.zh);
      lines.push("");
    });
    downloadText(lines.join("\n"), "bilingual-transcript.srt", "application/x-subrip");
  }

  function exportTXT() {
    if (!cues.length) {
      toast("沒有字幕可匯出");
      return;
    }
    const lines = cues.map((c) => {
      const t = `[${formatClock(c.start)}]`;
      return `${t}\n${c.en || ""}\n${c.zh || ""}\n`;
    });
    downloadText(lines.join("\n"), "bilingual-transcript.txt", "text/plain");
  }

  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime + ";charset=utf-8" });
