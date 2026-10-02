/**
 * Media English Study — bilingual English + 繁體中文 learner
 * Client-side only. No fake transcripts.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "media-english-study-v1";
  const DEFAULT_PREFS = {
    speed: 1,
    practiceMode: "both", // both | hide-en | hide-zh
    vocab: [], // { word, gloss, context, addedAt }
  };

  // ── State ──
  let cues = []; // { id, start, end, en, zh }
  let currentCueIndex = -1;
  let loopMode = false; // loop current cue
  let abLoop = null; // { a, b } in seconds, or null
  let shadowMode = false;
  let shadowPhase = "idle"; // idle | playing | pause | replay
  let shadowTimer = null;
  let mediaObjectUrl = null;
  let prefs = loadPrefs();

  // ── DOM ──
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const mediaEl = $("#mediaEl");
  const mediaWrap = $("#mediaWrap");
  const mediaPlaceholder = $("#mediaPlaceholder");
  const cueList = $("#cueList");
  const timeDisplay = $("#timeDisplay");
  const speedSelect = $("#speedSelect");
  const practiceSelect = $("#practiceSelect");
  const toastEl = $("#toast");
  const vocabBadge = $("#vocabBadge");
  const progressBar = $("#transcribeProgress");
  const progressFill = $("#transcribeProgressFill");
  const progressLabel = $("#transcribeProgressLabel");
  const shadowBanner = $("#shadowBanner");
  const abIndicator = $("#abIndicator");
  const loopBtn = $("#btnLoop");

  // ── Prefs ──
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_PREFS);
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return structuredClone(DEFAULT_PREFS);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn("localStorage save failed", e);
    }
  }

  // ── Toast ──
  let toastTimer;
  function toast(msg, ms = 2400) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  // ── Time helpers ──
  function parseTimestamp(str) {
    // Supports SRT (00:00:01,000) and VTT (00:00:01.000) and short (00:01.000 / 1.000)
    const s = str.trim().replace(",", ".");
    const parts = s.split(":");
    let h = 0, m = 0, sec = 0;
    if (parts.length === 3) {
      h = parseFloat(parts[0]) || 0;
      m = parseFloat(parts[1]) || 0;
      sec = parseFloat(parts[2]) || 0;
    } else if (parts.length === 2) {
      m = parseFloat(parts[0]) || 0;
      sec = parseFloat(parts[1]) || 0;
    } else {
      sec = parseFloat(parts[0]) || 0;
    }
    return h * 3600 + m * 60 + sec;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
    return `${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  }

  function formatTimeSRT(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  }

  function formatClock(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ── Detect CJK ──
  function isMostlyCJK(text) {
    const chars = [...text.replace(/\s/g, "")];
    if (!chars.length) return false;
