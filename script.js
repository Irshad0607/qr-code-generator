"use strict";

(() => {
  const MAX_CHARS = 1000;
  const QR_SIZE = 600;
  const QR_MARGIN = 2;
  const DEFAULT_MESSAGE = "QR code generated successfully.";
  const STORAGE_KEY = "qr-studio-sidebar-collapsed";
  const INTRO_KEY = "qr-studio-intro-shown";
  const GENERATE_DELAY = 600;
  const INTRO_MIN_DURATION = 3000;
  const INTRO_FADE = 600;

  const $ = (id) => document.getElementById(id);

  const shell = $("app-shell");
  const textInput = $("qr-text");
  const charCount = $("char-count");
  const errorMsg = $("error-msg");
  const generateBtn = $("generate-btn");
  const generateLabel = $("generate-label");
  const generateIcon = $("generate-icon");
  const clearBtn = $("clear-btn");
  const emptyState = $("empty-state");
  const loadingState = $("loading-state");
  const qrResult = $("qr-result");
  const canvas = $("qr-canvas");
  const frameOuter = $("qr-frame-outer");
  const qrSweep = $("qr-sweep");
  const qrMessage = $("qr-message");
  const viewGenerator = $("view-generator");
  const contentPanel = $("content-panel");
  const previewPanel = $("preview-panel");
  const copyBtn = $("copy-btn");
  const shareBtn = $("share-btn");
  const downloadBtn = $("download-btn");
  const createAnotherBtn = $("create-another-btn");
  const previewStatus = $("preview-status");
  const contentStatus = $("content-status");
  const collapseBtn = $("collapse-btn");
  const collapseLabel = $("collapse-label");
  const hamburger = $("hamburger");
  const drawer = $("drawer");
  const drawerClose = $("drawer-close");
  const drawerBackdrop = $("drawer-backdrop");
  const mobileIntro = $("mobile-intro");
  const navItems = document.querySelectorAll("[data-view]");

  let isGenerating = false;
  let generateTimer = null;
  let flashTimer = null;
  let introTimer = null;
  let introFadeTimer = null;
  let introDismissed = false;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const safeStorageGet = (storage, key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeStorageSet = (storage, key, value) => {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  const setStatus = (el, text, cls) => {
    el.textContent = text;
    el.classList.toggle("is-ready", cls === "ready");
    el.classList.toggle("is-error", cls === "error");
  };

  const setGenerateIdle = () => {
    generateBtn.disabled = false;
    generateLabel.textContent = "Generate QR";
    generateIcon.classList.remove("spin");
    generateIcon.innerHTML = '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>';
  };

  const setGenerateBusy = () => {
    generateBtn.disabled = true;
    generateLabel.textContent = "Generating";
    generateIcon.classList.add("spin");
    generateIcon.innerHTML =
      '<circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/>';
  };

  const updateCharCount = () => {
    const len = textInput.value.length;
    charCount.textContent = `${len} / ${MAX_CHARS}`;
    charCount.classList.toggle("near-limit", len >= MAX_CHARS * 0.9);
  };

  const showError = (message) => {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
    setStatus(contentStatus, "Error", "error");
  };

  const clearError = () => {
    errorMsg.hidden = true;
    errorMsg.textContent = "";
  };

  const flash = (message, kind) => {
    clearTimeout(flashTimer);
    qrMessage.textContent = message;
    qrMessage.className = `qr-message ${kind}`;
    flashTimer = setTimeout(() => {
      qrMessage.textContent = DEFAULT_MESSAGE;
      qrMessage.className = "qr-message";
    }, 2400);
  };

  const resetFeedback = () => {
    clearTimeout(flashTimer);
    qrMessage.textContent = DEFAULT_MESSAGE;
    qrMessage.className = "qr-message";
  };

  const setPreviewState = (state) => {
    emptyState.hidden = state !== "empty";
    loadingState.classList.toggle("active", state === "loading");
    loadingState.setAttribute("aria-hidden", state === "loading" ? "false" : "true");
    qrResult.hidden = state !== "result";

    if (state === "empty") setStatus(previewStatus, "Empty");
    else if (state === "loading") setStatus(previewStatus, "Working");
    else setStatus(previewStatus, "Ready", "ready");
  };

  const playReveal = () => {
    frameOuter.classList.remove("qr-reveal");
    qrSweep.classList.remove("run");
    void frameOuter.offsetWidth;
    frameOuter.classList.add("qr-reveal");
    qrSweep.classList.add("run");
  };

  const resetPreview = () => {
    frameOuter.classList.remove("qr-reveal");
    qrSweep.classList.remove("run");
    setPreviewState("empty");
    resetFeedback();
  };

  const showResult = () => {
    isGenerating = false;
    setGenerateIdle();
    contentPanel.hidden = true;
    contentPanel.classList.remove("is-leaving");
    viewGenerator.classList.add("is-result");
    setPreviewState("result");
    previewPanel.classList.remove("is-entering");
    void previewPanel.offsetWidth;
    previewPanel.classList.add("is-entering");
    playReveal();
  };

  const generateQR = () => {
    if (isGenerating) return;
    clearError();

    const value = textInput.value.trim();

    if (!value) {
      showError("Please enter some text or a URL first.");
      textInput.focus();
      return;
    }
    if (value.length > MAX_CHARS) {
      showError(`Text is too long. Maximum is ${MAX_CHARS} characters.`);
      return;
    }
    if (typeof QRCode === "undefined" || typeof QRCode.toCanvas !== "function") {
      showError("QR library failed to load. Please refresh the page.");
      return;
    }

    isGenerating = true;
    setGenerateBusy();
    setStatus(contentStatus, "Working");
    setPreviewState("loading");
    resetFeedback();

    if (window.innerWidth < 1024) {
      previewPanel.scrollIntoView({
        behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        block: "center",
      });
    }

    generateTimer = setTimeout(() => {
      QRCode.toCanvas(
        canvas,
        value,
        { width: QR_SIZE, margin: QR_MARGIN, color: { dark: "#000000", light: "#FFFFFF" } },
        (err) => {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");

          if (err) {
            isGenerating = false;
            setGenerateIdle();
            showError("Unable to generate QR code. Please check your input and try again.");
            setPreviewState("empty");
            return;
          }

          contentPanel.classList.add("is-leaving");
          generateTimer = setTimeout(showResult, 180);
        }
      );
    }, GENERATE_DELAY);
  };

  const showInput = () => {
    clearTimeout(generateTimer);
    isGenerating = false;
    viewGenerator.classList.remove("is-result");
    previewPanel.classList.remove("is-entering");
    contentPanel.classList.remove("is-leaving");
    contentPanel.hidden = false;
    contentPanel.classList.remove("is-entering");
    void contentPanel.offsetWidth;
    contentPanel.classList.add("is-entering");
    clearError();
    resetPreview();
    setStatus(contentStatus, "Ready");
    setGenerateIdle();
  };

  const clearAll = () => {
    textInput.value = "";
    updateCharCount();
    showInput();
    textInput.focus();
  };

  const createAnother = () => {
    showInput();
    textInput.focus();
    textInput.select();
  };

  const canvasToBlob = () =>
    new Promise((resolve) => {
      if (!canvas.width || !canvas.height) {
        resolve(null);
        return;
      }
      canvas.toBlob(resolve, "image/png");
    });

  const downloadQR = () => {
    if (!canvas.width) return;
    canvasToBlob().then((blob) => {
      if (!blob) {
        flash("Download failed.", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash("QR code downloaded.", "success");
    });
  };

  const markSuccess = (btn, text) => {
    const label = btn.querySelector("span");
    const original = label.textContent;
    label.textContent = text;
    btn.classList.add("is-success");
    btn.disabled = true;
    setTimeout(() => {
      label.textContent = original;
      btn.classList.remove("is-success");
      btn.disabled = false;
    }, 1800);
  };

  const copyQR = async () => {
    if (!canvas.width) return;
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error("unsupported");
      const blob = await canvasToBlob();
      if (!blob) throw new Error("blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      markSuccess(copyBtn, "Copied");
      flash("QR code copied to clipboard.", "success");
    } catch {
      flash("Copy isn't supported here. Try Download.", "error");
    }
  };

  const shareQR = async () => {
    if (!canvas.width) return;
    if (!navigator.share || typeof File === "undefined") {
      flash("Sharing isn't supported here.", "error");
      return;
    }
    try {
      const blob = await canvasToBlob();
      if (!blob) throw new Error("blob");
      const file = new File([blob], "qr-code.png", { type: "image/png" });
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
        flash("Sharing isn't supported here.", "error");
        return;
      }
      await navigator.share({ files: [file], title: "QR code" });
    } catch (e) {
      if (e && e.name === "AbortError") return;
      flash("Sharing isn't supported here.", "error");
    }
  };

  const setCollapsed = (collapsed, persist) => {
    shell.classList.toggle("collapsed", collapsed);
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
    collapseBtn.setAttribute("aria-label", label);
    collapseBtn.setAttribute("data-tip", label);
    collapseLabel.textContent = label;
    if (persist) {
      safeStorageSet(localStorage, STORAGE_KEY, collapsed ? "1" : "0");
    }
  };

  const openDrawer = () => {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    drawerBackdrop.classList.add("open");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    drawerClose.focus();
  };

  const closeDrawer = (returnFocus) => {
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    drawerBackdrop.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (returnFocus) hamburger.focus();
  };

  const dismissIntro = () => {
    if (introDismissed || !mobileIntro) return;
    introDismissed = true;
    clearTimeout(introTimer);
    clearTimeout(introFadeTimer);
    mobileIntro.classList.add("hide");
    introFadeTimer = setTimeout(() => {
      mobileIntro.hidden = true;
    }, INTRO_FADE);
  };

  const runIntro = () => {
    if (!mobileIntro) return;

    if (reducedMotionQuery.matches) {
      mobileIntro.hidden = true;
      introDismissed = true;
      return;
    }

    const alreadyShown = safeStorageGet(sessionStorage, INTRO_KEY) === "1";
    if (alreadyShown) {
      mobileIntro.hidden = true;
      introDismissed = true;
      return;
    }

    safeStorageSet(sessionStorage, INTRO_KEY, "1");

    mobileIntro.hidden = false;
    mobileIntro.setAttribute("aria-hidden", "true");

    introTimer = setTimeout(() => {
      dismissIntro();
    }, INTRO_MIN_DURATION);

    mobileIntro.addEventListener("click", dismissIntro, { once: true });
  };

  navItems.forEach((el) => {
    el.addEventListener("click", () => {
      const view = el.getAttribute("data-view");
      navItems.forEach((item) => {
        const active = item.getAttribute("data-view") === view;
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      closeDrawer(false);
    });
  });

  textInput.addEventListener("input", () => {
    updateCharCount();
    if (!errorMsg.hidden) {
      clearError();
      setStatus(contentStatus, "Ready");
    }
  });

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateQR();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer(true);
      dismissIntro();
    }
  });

  reducedMotionQuery.addEventListener("change", (e) => {
    if (e.matches) dismissIntro();
  });

  generateBtn.addEventListener("click", generateQR);
  clearBtn.addEventListener("click", clearAll);
  copyBtn.addEventListener("click", copyQR);
  shareBtn.addEventListener("click", shareQR);
  downloadBtn.addEventListener("click", downloadQR);
  createAnotherBtn.addEventListener("click", createAnother);
  collapseBtn.addEventListener("click", () => {
    setCollapsed(!shell.classList.contains("collapsed"), true);
  });
  hamburger.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", () => closeDrawer(true));
  drawerBackdrop.addEventListener("click", () => closeDrawer(true));

  window.addEventListener("pagehide", () => {
    clearTimeout(generateTimer);
    clearTimeout(flashTimer);
    clearTimeout(introTimer);
    clearTimeout(introFadeTimer);
  });

  const saved = safeStorageGet(localStorage, STORAGE_KEY);
  setCollapsed(saved === "1", false);

  updateCharCount();
  setPreviewState("empty");
  runIntro();
  if (window.matchMedia("(min-width: 881px)").matches) textInput.focus();
})();
