    $("#btnVocab").addEventListener("click", openVocabDrawer);
    $("#btnShortcuts").addEventListener("click", () => openDrawer("#shortcutsDrawer"));
    $("#drawerBackdrop").addEventListener("click", closeDrawers);
    $$("[data-close-drawer]").forEach((b) => b.addEventListener("click", closeDrawers));

    $("#btnFlashcards").addEventListener("click", () => {
      $("#vocabListPanel").classList.add("hidden");
      $("#flashcardPanel").classList.remove("hidden");
      fcIndex = 0;
      fcRevealed = false;
      renderFlashcard();
    });
    $("#btnBackVocab").addEventListener("click", () => {
      $("#flashcardPanel").classList.add("hidden");
      $("#vocabListPanel").classList.remove("hidden");
      renderVocabList();
    });
    $("#flashcard").addEventListener("click", () => {
      if (!prefs.vocab.length) return;
      fcRevealed = !fcRevealed;
      renderFlashcard();
    });
    $("#btnFcPrev").addEventListener("click", () => {
      if (!prefs.vocab.length) return;
      fcIndex = (fcIndex - 1 + prefs.vocab.length) % prefs.vocab.length;
      fcRevealed = false;
      renderFlashcard();
    });
    $("#btnFcNext").addEventListener("click", () => {
      if (!prefs.vocab.length) return;
      fcIndex = (fcIndex + 1) % prefs.vocab.length;
      fcRevealed = false;
      renderFlashcard();
    });
    $("#btnClearVocab").addEventListener("click", () => {
      if (!prefs.vocab.length) return;
      if (confirm("確定清空生詞本？")) {
        prefs.vocab = [];
        savePrefs();
        updateVocabBadge();
        renderVocabList();
        toast("已清空生詞本");
      }
    });

    document.addEventListener("keydown", onKeydown);

    renderCues();
    updateLoopUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
