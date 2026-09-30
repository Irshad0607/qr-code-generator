(function () {
  "use strict";

  const MAX_CHARS = 1000;

  const TEMPLATES = [
    { id: "classic",   name: "Classic",   fg: "#000000", bg: "#FFFFFF", size: 250 },
    { id: "slate",     name: "Slate",     fg: "#4A5260", bg: "#F2F2F0", size: 250 },
    { id: "mono",      name: "Mono",      fg: "#F4F4F5", bg: "#0A0B0D", size: 250 },
    { id: "paper",     name: "Paper",     fg: "#3B2E22", bg: "#F5EFE4", size: 250 },
    { id: "terminal",  name: "Terminal",  fg: "#7A9B7A", bg: "#0B0F0B", size: 250 },
    { id: "midnight",  name: "Midnight",  fg: "#C8CCD4", bg: "#111318", size: 250 },
    { id: "linen",     name: "Linen",     fg: "#5C4A3A", bg: "#F7F3EC", size: 250 },
    { id: "ivory",     name: "Ivory",     fg: "#2A2A2A", bg: "#FAF8F2", size: 250 },
    { id: "concrete",  name: "Concrete",  fg: "#33363B", bg: "#D9DBDF", size: 250 },
    { id: "obsidian",  name: "Obsidian",  fg: "#E8E8EA", bg: "#0F1013", size: 250 },
    { id: "amber",     name: "Amber",     fg: "#4A3A1E", bg: "#F4EAD3", size: 250 },
    { id: "sage",      name: "Sage",      fg: "#3D4A3D", bg: "#E8EDE5", size: 250 },
    { id: "cobalt",    name: "Cobalt",    fg: "#1E2A44", bg: "#EDF0F6", size: 250 },
    { id: "crimson",   name: "Crimson",   fg: "#5A1F26", bg: "#F5EDEE", size: 250 },
    { id: "violet",    name: "Violet",    fg: "#3A2A4D", bg: "#F1ECF6", size: 250 }
  ];

  const $ = (id) => document.getElementById(id);

  const textInput         = $("qr-text");
  const charCount         = $("char-count");
  const errorMsg          = $("error-msg");
  const sizeSelect        = $("qr-size");
  const fgColor           = $("fg-color");
  const bgColor           = $("bg-color");
  const fgHex             = $("fg-hex");
  const bgHex             = $("bg-hex");
  const generateBtn       = $("generate-btn");
  const clearBtn          = $("clear-btn");
  const emptyState        = $("empty-state");
  const loadingState      = $("loading-state");
  const qrResult          = $("qr-result");
  const canvas            = $("qr-canvas");
  const qrFrame           = $("qr-frame");
  const qrSweep           = $("qr-sweep");
  const qrRecolorBuffer   = $("qr-recolor-buffer");
  const downloadBtn       = $("download-btn");
  const copyBtn           = $("copy-btn");
  const copyMsg           = $("copy-msg");
  const qrMetaText        = $("qr-meta-text");
  const previewStatus     = $("preview-status");
  const contentStatus     = $("content-status");
  const templatesToggle   = $("templates-toggle");
  const templatesPanel    = $("templates-panel");
  const templatesGrid     = $("templates-grid");
  const templatesActive   = $("templates-active-name");
  const advancedToggle    = $("advanced-toggle");
  const advancedPanel     = $("advanced-panel");
  const createAnotherBtn  = $("create-another-btn");
  const viewGenerator     = $("view-generator");

  const hamburger         = $("hamburger");
  const drawer            = $("drawer");
  const drawerClose       = $("drawer-close");
  const drawerBackdrop    = $("drawer-backdrop");

  const allNavItems = document.querySelectorAll("[data-view]");

  let isGenerating = false;
  let isRecoloring = false;
  let activeTemplate = TEMPLATES[0];
  let timers = [];
  let lastGeneratedValue = null;
  let recolorTimer = null;
  let recolorCooldown = 0;

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
    if (recolorTimer) {
      clearTimeout(recolorTimer);
      recolorTimer = null;
    }
  }

  function setTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n) + "…" : str;
  }

  function buildSwatch(tpl) {
    const pattern = [
      1,1,1,0,1,
      1,0,1,0,1,
      0,0,0,1,0,
      1,0,1,1,0,
      1,1,0,0,1
    ];
    let html = '<div class="template-swatch" style="background:' + tpl.bg + ';">';
    for (let i = 0; i < 25; i++) {
      html += '<span style="background:' + (pattern[i] ? tpl.fg : tpl.bg) + ';"></span>';
    }
    html += '</div>';
    return html;
  }

  function renderTemplates() {
    templatesGrid.innerHTML = TEMPLATES.map(function (tpl) {
      const active = tpl.id === activeTemplate.id;
      return (
        '<button type="button" class="template-card' + (active ? " active" : "") + '" data-template="' + tpl.id + '" aria-pressed="' + active + '">' +
          '<span class="template-check" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>' +
          '</span>' +
          buildSwatch(tpl) +
          '<span class="template-name">' + escapeHtml(tpl.name) + '</span>' +
        '</button>'
      );
    }).join("");

    templatesGrid.querySelectorAll(".template-card").forEach(function (card) {
      card.addEventListener("click", function () {
        applyTemplate(card.getAttribute("data-template"));
      });
    });
  }

  function applyTemplate(id) {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    activeTemplate = tpl;

    templatesGrid.querySelectorAll(".template-card").forEach(function (card) {
      const isActive = card.getAttribute("data-template") === id;
      card.classList.toggle("active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });

    templatesActive.textContent = tpl.name;
    fgColor.value = tpl.fg;
    bgColor.value = tpl.bg;
    fgHex.textContent = tpl.fg.toUpperCase();
    bgHex.textContent = tpl.bg.toUpperCase();
    sizeSelect.value = String(tpl.size);

    if (lastGeneratedValue && !qrResult.hidden && !isGenerating) {
      scheduleRecolor();
    }
  }

  function scheduleRecolor() {
    if (!lastGeneratedValue) return;

    const now = Date.now();
    if (now < recolorCooldown) {
      clearTimeout(recolorTimer);
      recolorTimer = setTimeout(scheduleRecolor, recolorCooldown - now);
      return;
    }
    recolorCooldown = now + 400;

    clearTimeout(recolorTimer);
    recolorTimer = setTimeout(function () {
      runRecolor();
    }, 30);
  }

  function runRecolor() {
    if (isRecoloring || !lastGeneratedValue) return;
    isRecoloring = true;

    const size = parseInt(sizeSelect.value, 10);
    const fg = fgColor.value;
    const bg = bgColor.value;

    qrRecolorBuffer.classList.add("active");

    setTimer(function () {
      QRCode.toCanvas(
        canvas,
        lastGeneratedValue,
        {
          width: size,
          margin: 2,
          color: { dark: fg, light: bg },
        },
        function (err) {
          if (err) {
            qrRecolorBuffer.classList.remove("active");
            isRecoloring = false;
            return;
          }

          qrFrame.style.background = bg;

          qrResult.classList.remove("qr-reveal");
          canvas.classList.remove("qr-reveal");
          qrSweep.classList.remove("run");
          void qrResult.offsetWidth;

          qrResult.classList.add("qr-reveal");
          canvas.classList.add("qr-reveal");
          qrSweep.classList.add("run");

          qrRecolorBuffer.classList.remove("active");
          isRecoloring = false;
        }
      );
    }, 280);
  }

  function toggleAccordion(toggleEl, panelEl) {
    const expanded = toggleEl.getAttribute("aria-expanded") === "true";
    const next = !expanded;
    toggleEl.setAttribute("aria-expanded", String(next));
    panelEl.classList.toggle("open", next);
  }

  templatesToggle.addEventListener("click", function () {
    toggleAccordion(templatesToggle, templatesPanel);
  });

  advancedToggle.addEventListener("click", function () {
    toggleAccordion(advancedToggle, advancedPanel);
  });

  function updateCharCount() {
    const len = textInput.value.length;
    charCount.textContent = len + "/" + MAX_CHARS;
    charCount.classList.toggle("near-limit", len >= MAX_CHARS * 0.9);
  }

  textInput.addEventListener("input", function () {
    updateCharCount();
    if (textInput.value.trim().length > 0) {
      contentStatus.textContent = "Ready";
    }
  });

  fgColor.addEventListener("input", function () {
    fgHex.textContent = fgColor.value.toUpperCase();
    if (lastGeneratedValue && !qrResult.hidden && !isGenerating) {
      scheduleRecolor();
    }
  });

  bgColor.addEventListener("input", function () {
    bgHex.textContent = bgColor.value.toUpperCase();
    if (lastGeneratedValue && !qrResult.hidden && !isGenerating) {
      scheduleRecolor();
    }
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
    contentStatus.textContent = "Error";
    contentStatus.classList.remove("is-ready");
  }

  function clearError() {
    errorMsg.hidden = true;
    errorMsg.textContent = "";
  }

  function setPreviewState(state) {
    emptyState.style.display = state === "empty" ? "" : "none";
    loadingState.classList.toggle("active", state === "loading");
    loadingState.setAttribute("aria-hidden", state !== "loading" ? "true" : "false");
    qrResult.hidden = state !== "result";

    if (state === "empty") {
      previewStatus.textContent = "Empty";
      previewStatus.classList.remove("is-ready");
    } else if (state === "loading") {
      previewStatus.textContent = "Working";
      previewStatus.classList.remove("is-ready");
    } else {
      previewStatus.textContent = "Ready";
      previewStatus.classList.add("is-ready");
    }
  }

  function resetPreview() {
    setPreviewState("empty");
    qrResult.classList.remove("qr-reveal");
    canvas.classList.remove("qr-reveal");
    qrSweep.classList.remove("run");
    qrRecolorBuffer.classList.remove("active");
  }

  function switchView(view) {
    if (view === "generator") {
      viewGenerator.classList.add("active");
    }
    allNavItems.forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-view") === view);
    });
  }

  allNavItems.forEach(function (el) {
    el.addEventListener("click", function () {
      switchView(el.getAttribute("data-view"));
      closeDrawer();
    });
  });

  function openDrawer() {
    drawer.classList.add("open");
    drawerBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawerBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  function generateQR() {
    if (isGenerating) return;

    clearError();
    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    const value = textInput.value.trim();

    if (!value) {
      showError("Please enter some text or a URL first.");
      textInput.focus();
      return;
    }

    if (value.length > MAX_CHARS) {
      showError("Text is too long. Maximum is " + MAX_CHARS + " characters.");
      return;
    }

    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.innerHTML =
      "Generating" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>';

    contentStatus.textContent = "Working";
    contentStatus.classList.remove("is-ready");

    setPreviewState("loading");

    const size = parseInt(sizeSelect.value, 10);
    const fg = fgColor.value;
    const bg = bgColor.value;

    setTimer(function () {
      QRCode.toCanvas(
        canvas,
        value,
        {
          width: size,
          margin: 2,
          color: { dark: fg, light: bg },
        },
        function (err) {
          if (err) {
            showError("Unable to generate QR code. Please check your input and try again.");
            setPreviewState("empty");
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.innerHTML =
              "Generate QR" +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
            contentStatus.textContent = "Ready";
            return;
          }

          setPreviewState("result");

          qrFrame.style.background = bg;

          const display = truncate(value, 44);
          qrMetaText.innerHTML =
            '<span class="meta-strong">' + escapeHtml(display) + "</span><br>QR code generated successfully.";

          qrResult.classList.remove("qr-reveal");
          canvas.classList.remove("qr-reveal");
          qrSweep.classList.remove("run");
          void qrResult.offsetWidth;

          qrResult.classList.add("qr-reveal");
          canvas.classList.add("qr-reveal");
          qrSweep.classList.add("run");

          isGenerating = false;
          generateBtn.disabled = false;
          generateBtn.innerHTML =
            "Generate QR" +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

          contentStatus.textContent = "Ready";
          contentStatus.classList.add("is-ready");

          lastGeneratedValue = value;
        }
      );
    }, 850);
  }

  function clearAll() {
    clearTimers();
    isGenerating = false;
    isRecoloring = false;
    lastGeneratedValue = null;

    textInput.value = "";
    updateCharCount();
    clearError();

    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    resetPreview();

    contentStatus.textContent = "Ready";
    contentStatus.classList.remove("is-ready");

    generateBtn.disabled = false;
    generateBtn.innerHTML =
      "Generate QR" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

    textInput.focus();
  }

  function createAnother() {
    clearTimers();
    isGenerating = false;
    isRecoloring = false;

    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    resetPreview();

    textInput.focus();
    textInput.select();

    contentStatus.textContent = "Ready";
    contentStatus.classList.remove("is-ready");

    generateBtn.disabled = false;
    generateBtn.innerHTML =
      "Generate QR" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
  }

  function downloadQR() {
    if (!canvas || canvas.width === 0) return;
    try {
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      copyMsg.textContent = "PNG downloaded";
      copyMsg.className = "qr-feedback success";
      setTimer(function () {
        if (copyMsg.textContent === "PNG downloaded") {
          copyMsg.textContent = "";
          copyMsg.className = "qr-feedback";
        }
      }, 2000);
    } catch (e) {
      copyMsg.textContent = "Download failed";
      copyMsg.className = "qr-feedback error";
    }
  }

  async function copyQR() {
    if (!canvas || canvas.width === 0) return;

    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    try {
      const blob = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) throw new Error("Blob failed");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copied";
      copyBtn.disabled = true;

      copyMsg.textContent = "QR image copied to your clipboard";
      copyMsg.className = "qr-feedback success";

      setTimer(function () {
        copyBtn.textContent = originalText;
        copyBtn.disabled = false;
        if (copyMsg.textContent === "QR image copied to your clipboard") {
          copyMsg.textContent = "";
          copyMsg.className = "qr-feedback";
        }
      }, 2000);
    } catch (err) {
      copyMsg.textContent = "Copy not supported. Use Download instead.";
      copyMsg.className = "qr-feedback error";
    }
  }

  generateBtn.addEventListener("click", generateQR);
  clearBtn.addEventListener("click", clearAll);
  downloadBtn.addEventListener("click", downloadQR);
  copyBtn.addEventListener("click", copyQR);
  createAnotherBtn.addEventListener("click", createAnother);

  textInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateQR();
    }
  });

  sizeSelect.addEventListener("change", function () {
    if (lastGeneratedValue && !qrResult.hidden && !isGenerating) {
      scheduleRecolor();
    }
  });

  renderTemplates();
  applyTemplate(activeTemplate.id);
  updateCharCount();
  setPreviewState("empty");

  if (window.innerWidth > 880) {
    textInput.focus();
  }
})();
