(function () {
  "use strict";

  var MAX_CHARS = 1000;
  var QR_OUTPUT_SIZE = 500;

  var $ = function (id) { return document.getElementById(id); };

  var textInput         = $("qr-text");
  var charCount         = $("char-count");
  var errorMsg          = $("error-msg");
  var generateBtn       = $("generate-btn");
  var clearBtn          = $("clear-btn");
  var emptyState        = $("empty-state");
  var loadingState      = $("loading-state");
  var qrResult          = $("qr-result");
  var canvas            = $("qr-canvas");
  var qrSweep           = $("qr-sweep");
  var copyBtn           = $("copy-btn");
  var shareBtn          = $("share-btn");
  var downloadBtn       = $("download-btn");
  var copyMsg           = $("copy-msg");
  var qrMetaText        = $("qr-meta-text");
  var previewStatus     = $("preview-status");
  var contentStatus     = $("content-status");
  var createAnotherBtn  = $("create-another-btn");
  var viewGenerator     = $("view-generator");

  var sidebar           = $("sidebar");
  var sidebarCollapse   = $("sidebar-collapse-btn");
  var mainArea          = $("main-area");
  var hamburger         = $("hamburger");
  var drawer            = $("drawer");
  var drawerClose       = $("drawer-close");
  var drawerBackdrop    = $("drawer-backdrop");

  var allNavItems = document.querySelectorAll("[data-view]");
  var isGenerating = false;
  var timers = [];
  var lastGeneratedValue = null;

  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
  }

  function setTimer(fn, ms) {
    var id = setTimeout(fn, ms);
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

  function updateCharCount() {
    var len = textInput.value.length;
    charCount.textContent = len + "/" + MAX_CHARS;
    charCount.classList.toggle("near-limit", len >= MAX_CHARS * 0.9);
  }

  textInput.addEventListener("input", function () {
    updateCharCount();
    if (textInput.value.trim().length > 0) {
      contentStatus.textContent = "Ready";
      contentStatus.classList.remove("is-ready");
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

  function isDesktop() {
    return window.innerWidth > 880;
  }

  function toggleSidebar() {
    if (!isDesktop()) return;
    sidebar.classList.toggle("collapsed");
    var collapsed = sidebar.classList.contains("collapsed");
    try {
      localStorage.setItem("qr-studio-sidebar-collapsed", collapsed ? "true" : "false");
    } catch (e) {}
  }

  sidebarCollapse.addEventListener("click", toggleSidebar);

  function restoreSidebarState() {
    if (!isDesktop()) return;
    try {
      var stored = localStorage.getItem("qr-studio-sidebar-collapsed");
      if (stored === "true") {
        sidebar.classList.add("collapsed");
      } else {
        sidebar.classList.remove("collapsed");
      }
    } catch (e) {}
  }

  function applySidebarForViewport() {
    if (isDesktop()) {
      restoreSidebarState();
    } else {
      sidebar.classList.remove("collapsed");
      closeDrawer();
    }
  }

  window.addEventListener("resize", applySidebarForViewport);

  function generateQR() {
    if (isGenerating) return;

    clearError();
    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    var value = textInput.value.trim();

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

    setTimer(function () {
      QRCode.toCanvas(
        canvas,
        value,
        {
          width: QR_OUTPUT_SIZE,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" }
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

          var display = truncate(value, 44);
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
      var link = document.createElement("a");
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
      var blob = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) throw new Error("Blob failed");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

      var originalText = copyBtn.textContent;
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

  async function shareQR() {
    if (!canvas || canvas.width === 0) return;

    copyMsg.textContent = "";
    copyMsg.className = "qr-feedback";

    if (!navigator.share) {
      copyMsg.textContent = "Sharing isn't supported here.";
      copyMsg.className = "qr-feedback error";
      setTimer(function () {
        if (copyMsg.textContent === "Sharing isn't supported here.") {
          copyMsg.textContent = "";
          copyMsg.className = "qr-feedback";
        }
      }, 2500);
      return;
    }

    try {
      var blob = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/png");
      });

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "qr-code.png", { type: "image/png" })] })) {
        var file = new File([blob], "qr-code.png", { type: "image/png" });
        await navigator.share({
          title: "QR Code",
          text: lastGeneratedValue || "Scan this QR code",
          files: [file]
        });
      } else {
        await navigator.share({
          title: "QR Code",
          text: lastGeneratedValue || "Scan this QR code",
          url: lastGeneratedValue && (lastGeneratedValue.startsWith("http://") || lastGeneratedValue.startsWith("https://")) ? lastGeneratedValue : undefined
        });
      }

      copyMsg.textContent = "Shared successfully";
      copyMsg.className = "qr-feedback success";
      setTimer(function () {
        if (copyMsg.textContent === "Shared successfully") {
          copyMsg.textContent = "";
          copyMsg.className = "qr-feedback";
        }
      }, 2000);
    } catch (err) {
      if (err.name !== "AbortError") {
        copyMsg.textContent = "Sharing isn't supported here.";
        copyMsg.className = "qr-feedback error";
        setTimer(function () {
          if (copyMsg.textContent === "Sharing isn't supported here.") {
            copyMsg.textContent = "";
            copyMsg.className = "qr-feedback";
          }
        }, 2500);
      }
    }
  }

  generateBtn.addEventListener("click", generateQR);
  clearBtn.addEventListener("click", clearAll);
  downloadBtn.addEventListener("click", downloadQR);
  copyBtn.addEventListener("click", copyQR);
  shareBtn.addEventListener("click", shareQR);
  createAnotherBtn.addEventListener("click", createAnother);

  textInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateQR();
    }
  });

  updateCharCount();
  setPreviewState("empty");
  applySidebarForViewport();

  if (window.innerWidth > 880) {
    textInput.focus();
  }
})();
