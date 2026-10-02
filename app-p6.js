    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`已下載 ${filename}`);
  }

  // ── Whisper (optional) ──
  let whisperPipeline = null;
  let whisperLoading = false;

  async function runWhisperTranscribe() {
    if (!mediaEl.src) {
      toast("請先上傳音訊或影片");
      return;
    }
    if (whisperLoading) {
      toast("轉錄進行中…");
      return;
    }

    const note = $("#whisperNote");
    note.textContent = "首次使用會下載 Whisper 模型（約數十 MB），請保持網路暢通。僅支援英文轉錄。";

    try {
      whisperLoading = true;
      progressBar.classList.add("visible");
      progressFill.style.width = "5%";
      progressLabel.textContent = "載入模型中…";

      if (!whisperPipeline) {
        const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
        env.allowLocalModels = false;
        progressLabel.textContent = "下載／初始化 Whisper tiny 模型…";
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny.en",
          {
            progress_callback: (p) => {
              if (p && typeof p.progress === "number") {
                progressFill.style.width = `${Math.min(40, Math.round(p.progress * 0.4))}%`;
                progressLabel.textContent = `模型：${p.status || "loading"} ${Math.round(p.progress || 0)}%`;
              }
            },
          }
        );
      }

      progressFill.style.width = "45%";
      progressLabel.textContent = "擷取音訊中…";

      // Decode audio via Web Audio API from media element source
      const audioBuf = await fetchMediaAsAudioBuffer();
      progressFill.style.width = "60%";
      progressLabel.textContent = "轉錄中（可能需一分鐘）…";

      // Convert to mono float32 at 16kHz for Whisper
      const mono = downsampleTo16k(audioBuf);

      const result = await whisperPipeline(mono, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      progressFill.style.width = "90%";
      progressLabel.textContent = "整理字幕…";

      const newCues = [];
      const chunks = result.chunks || [];
      if (chunks.length) {
        chunks.forEach((ch, i) => {
          const ts = ch.timestamp || [0, 0];
          let start = typeof ts[0] === "number" ? ts[0] : 0;
          let end = typeof ts[1] === "number" ? ts[1] : start + 2;
          if (!(end > start)) end = start + 1.5;
          const text = (ch.text || "").trim();
          if (!text) return;
          newCues.push({ id: i, start, end, en: text, zh: "" });
        });
      } else if (result.text) {
        // fallback single cue
        newCues.push({
          id: 0,
          start: 0,
          end: mediaEl.duration || 5,
          en: result.text.trim(),
          zh: "",
        });
      }

      if (!newCues.length) {
        toast("轉錄未產生字幕，請改用 SRT 上傳");
      } else {
        // Keep existing ZH if timings overlap
        const oldZh = cues.filter((c) => c.zh);
        cues = mergeCaptionTracks(newCues, oldZh.map((c) => ({ ...c, en: "" })));
        currentCueIndex = -1;
        renderCues();
        toast(`轉錄完成：${cues.length} 句（僅英文，可逐行補繁中）`);
      }

      progressFill.style.width = "100%";
      progressLabel.textContent = "完成";
    } catch (err) {
      console.error(err);
      toast("自動轉錄失敗（模型或瀏覽器限制）。請改用 SRT／VTT 上傳。", 4000);
      progressLabel.textContent = "失敗：" + (err.message || String(err));
    } finally {
      whisperLoading = false;
      setTimeout(() => {
        progressBar.classList.remove("visible");
        progressFill.style.width = "0%";
      }, 2500);
