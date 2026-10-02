    const cjk = chars.filter((c) => /[\u3000-\u9fff\uf900-\ufaff]/.test(c)).length;
    return cjk / chars.length >= 0.35;
  }

  function stripTags(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  // ── Parse SRT / VTT ──
  function parseCaptions(text) {
    if (!text || !text.trim()) return [];
    let raw = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Strip WEBVTT header / NOTE / STYLE blocks lightly
    if (/^WEBVTT/i.test(raw.trim())) {
      raw = raw.replace(/^WEBVTT[^\n]*\n/, "");
      // Remove STYLE / REGION blocks (until blank line)
      raw = raw.replace(/^(STYLE|REGION|NOTE)[^\n]*\n(?:.*\n)*?(?=\n\n|\n(?=\d|\w))/gim, "\n");
    }

    const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const result = [];

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length);
      if (!lines.length) continue;

      let timeLineIdx = lines.findIndex((l) => /-->/.test(l));
      if (timeLineIdx === -1) continue;

      const timeLine = lines[timeLineIdx];
      const m = timeLine.match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!m) continue;

      const start = parseTimestamp(m[1]);
      const end = parseTimestamp(m[2]);
      if (!(end > start)) continue;

      const textLines = lines.slice(timeLineIdx + 1).map(stripTags).filter(Boolean);
      if (!textLines.length) continue;

      let en = "";
      let zh = "";

      if (textLines.length === 1) {
        if (isMostlyCJK(textLines[0])) zh = textLines[0];
        else en = textLines[0];
      } else if (textLines.length === 2) {
        const a = textLines[0];
        const b = textLines[1];
        if (isMostlyCJK(a) && !isMostlyCJK(b)) {
          zh = a;
          en = b;
        } else if (!isMostlyCJK(a) && isMostlyCJK(b)) {
          en = a;
          zh = b;
        } else if (isMostlyCJK(a) && isMostlyCJK(b)) {
          zh = textLines.join(" ");
        } else {
          // Both look English — keep first as EN, second as secondary EN→merge
          en = textLines.join(" ");
        }
      } else {
        // 3+ lines: classify each
        const enParts = [];
        const zhParts = [];
        for (const line of textLines) {
          if (isMostlyCJK(line)) zhParts.push(line);
          else enParts.push(line);
        }
        en = enParts.join(" ");
        zh = zhParts.join(" ");
      }

      result.push({
        id: result.length,
        start,
        end,
        en: en.trim(),
        zh: zh.trim(),
      });
    }

    return result;
  }

  function mergeCaptionTracks(enCues, zhCues) {
    // Prefer EN timing; attach ZH by overlap or index fallback
    if (!enCues.length && zhCues.length) {
      return zhCues.map((c, i) => ({ ...c, id: i, en: c.en || "", zh: c.zh || c.en || "" }));
    }
    if (enCues.length && !zhCues.length) {
      return enCues.map((c, i) => ({ ...c, id: i }));
    }
    if (!enCues.length && !zhCues.length) return [];

    const merged = enCues.map((ec, i) => {
      let best = null;
      let bestOverlap = 0;
      for (const zc of zhCues) {
        const overlap = Math.min(ec.end, zc.end) - Math.max(ec.start, zc.start);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = zc;
        }
      }
      let zh = "";
      if (best && bestOverlap > 0.15) {
        zh = best.zh || (isMostlyCJK(best.en) ? best.en : best.zh) || "";
      } else if (zhCues[i]) {
        // index fallback if timings differ a lot
        const z = zhCues[i];
        zh = z.zh || (isMostlyCJK(z.en) ? z.en : "") || "";
      }
      return { id: i, start: ec.start, end: ec.end, en: ec.en || "", zh };
    });
    return merged;
  }

  // ── Render cues ──
