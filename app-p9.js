    }

    let resolved;
    try {
      resolved = new URL(raw, location.href).href;
    } catch (_) {
      setUrlStatus("網址格式無效，請檢查後重試。", "error");
      toast("網址格式無效");
      return;
    }

    if (!looksLikeSubtitleUrl(raw) && !raw.startsWith(".") && !raw.startsWith("/")) {
      // Allow anyway but warn — some CDNs omit extensions
      setUrlStatus("此網址不像 .srt／.vtt／.txt；仍會嘗試載入…", "loading");
    } else {
      setUrlStatus("載入中…", "loading");
    }

    btn.disabled = true;
    input.disabled = true;
    try {
      const { text, via } = await fetchTextWithCorsFallback(resolved);
      if (!text || !String(text).trim()) {
        setUrlStatus("取得的內容是空的，請確認網址。", "error");
        toast("字幕內容為空");
        return;
      }
      const lang = langSel?.value || "auto";
      // Reuse file-load path logic via temporary File-like handling
      const parsed = parseCaptions(text);
      if (!parsed.length) {
        setUrlStatus("無法解析為 SRT／VTT。請確認檔案格式，或改下載後上傳。", "error");
        toast("無法解析字幕");
        return;
      }
      // Apply using same rules as loadCaptionFile by synthesizing
      await applyParsedCaptions(parsed, lang === "bilingual" ? "auto" : lang);
      const note = via === "proxy"
        ? "（經公開 CORS 代理載入；若內容異常請改下載後上傳）"
        : "";
      setUrlStatus(`已載入 ${cues.length} 句${note}`, "ok");
      if (via === "proxy") {
        toast(`已載入字幕：${cues.length} 句（經 CORS 代理）`);
      }
    } catch (e) {
      if (e && e.message === "CORS_OR_NETWORK") {
        const msg = "載入失敗：瀏覽器可能因 CORS 跨域政策阻擋。請改下載字幕檔後上傳，或使用允許跨域的網址／同源相對路徑。";
        setUrlStatus(msg, "error");
        toast("CORS 阻擋，請下載後上傳");
      } else if (e && e.httpStatus) {
        setUrlStatus(`載入失敗：伺服器回應 HTTP ${e.httpStatus}。", "error");
        toast(`載入失敗（HTTP ${e.httpStatus}）`);
      } else {
        setUrlStatus("載入失敗，請檢查網址或改下載後上傳。", "error");
        toast("載入字幕失敗");
        console.warn(e);
      }
    } finally {
      btn.disabled = false;
      input.disabled = false;
    }
  }

  async function applyParsedCaptions(parsed, lang) {
    const hasBoth = parsed.some((c) => c.en && c.zh);
    const mostlyZh = parsed.filter((c) => c.zh && !c.en).length > parsed.length * 0.5;

    if (lang === "auto" || lang === "bilingual") {
      if (hasBoth) {
        cues = parsed.map((c, i) => ({ ...c, id: i }));
      } else if (mostlyZh) {
        cues = mergeCaptionTracks(
          cues.filter((c) => c.en).length ? cues : [],
          parsed
        );
        if (!cues.length) {
          cues = parsed.map((c, i) => ({
            id: i,
            start: c.start,
            end: c.end,
            en: "",
            zh: c.zh || c.en,
          }));
        }
      } else {
        cues = mergeCaptionTracks(parsed, cues.filter((c) => c.zh));
        if (!cues.length) cues = parsed.map((c, i) => ({ ...c, id: i }));
      }
    } else if (lang === "en") {
      cues = mergeCaptionTracks(parsed, cues);
    } else if (lang === "zh") {
      const zhTrack = parsed.map((c) => ({
        ...c,
        zh: c.zh || c.en,
        en: "",
      }));
      cues = mergeCaptionTracks(cues.length ? cues : parsed.map((c) => ({ ...c, zh: "" })), zhTrack);
    }

    currentCueIndex = -1;
    renderCues();
    toast(`已載入字幕：${cues.length} 句`);
  }


  // ── Load caption helpers ──
  async function readFileText(file) {
    return await file.text();
  }

  async function loadCaptionFile(file, lang) {
    const text = await readFileText(file);
    const parsed = parseCaptions(text);
    if (!parsed.length) {
