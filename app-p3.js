  function tokenizeEnglish(text) {
    // Split keeping punctuation attached loosely; clickable word tokens
    const parts = [];
    const re = /([A-Za-z][A-Za-z'-]*|[^\sA-Za-z]+|\s+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      parts.push(m[0]);
    }
    return parts.length ? parts : [text];
  }

  function renderCues() {
    cueList.classList.remove("practice-hide-en", "practice-hide-zh");
    if (prefs.practiceMode === "hide-en") cueList.classList.add("practice-hide-en");
    if (prefs.practiceMode === "hide-zh") cueList.classList.add("practice-hide-zh");

    if (!cues.length) {
      cueList.innerHTML = `<div class="empty-cues">尚未載入字幕。<br>請上傳、貼上網址／文字，或載入示範字幕。</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    cues.forEach((cue, i) => {
      const div = document.createElement("div");
      div.className = "cue" + (i === currentCueIndex ? " active" : "") + (loopMode && i === currentCueIndex ? " looping" : "");
      div.dataset.index = String(i);
      div.setAttribute("role", "button");
      div.tabIndex = 0;

      const time = document.createElement("div");
      time.className = "cue-time";
      time.textContent = `${formatClock(cue.start)} → ${formatClock(cue.end)}`;

      const en = document.createElement("div");
      en.className = "cue-en";
      if (cue.en) {
        tokenizeEnglish(cue.en).forEach((tok) => {
          if (/^[A-Za-z][A-Za-z'-]*$/.test(tok)) {
            const span = document.createElement("span");
            span.className = "word";
            span.textContent = tok;
            span.title = "點擊加入生詞本";
            span.addEventListener("click", (e) => {
              e.stopPropagation();
              addVocab(tok, cue.en);
            });
            en.appendChild(span);
          } else {
            en.appendChild(document.createTextNode(tok));
          }
        });
      } else {
        en.textContent = "（無英文）";
        en.style.opacity = "0.5";
      }

      const zh = document.createElement("div");
      zh.className = "cue-zh";
      zh.textContent = cue.zh || "";
      if (!cue.zh) {
        zh.dataset.placeholder = "1";
        zh.textContent = "點此輸入繁中翻譯…";
        zh.style.opacity = "0.45";
        zh.style.fontStyle = "italic";
      }
      zh.contentEditable = "true";
      zh.spellcheck = false;
      zh.addEventListener("click", (e) => e.stopPropagation());
      zh.addEventListener("focus", () => {
        if (zh.dataset.placeholder === "1") {
          zh.textContent = "";
          zh.style.opacity = "1";
          zh.style.fontStyle = "normal";
          delete zh.dataset.placeholder;
        }
      });
      zh.addEventListener("blur", () => {
        const val = zh.textContent.trim();
        cues[i].zh = val;
        if (!val) {
          zh.dataset.placeholder = "1";
          zh.textContent = "點此輸入繁中翻譯…";
          zh.style.opacity = "0.45";
          zh.style.fontStyle = "italic";
        }
      });

      div.appendChild(time);
      div.appendChild(en);
      div.appendChild(zh);

      div.addEventListener("click", () => seekToCue(i, true));
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          seekToCue(i, true);
        }
      });

      frag.appendChild(div);
    });

    cueList.innerHTML = "";
    cueList.appendChild(frag);
    scrollActiveCueIntoView();
  }

  function scrollActiveCueIntoView() {
    const el = cueList.querySelector(".cue.active");
    if (el) {
      const listRect = cueList.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.top < listRect.top + 8 || elRect.bottom > listRect.bottom - 8) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  function setActiveCue(index, forceRender = false) {
