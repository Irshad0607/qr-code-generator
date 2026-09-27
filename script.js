const textInput = document.getElementById("qr-text");
const charCount = document.getElementById("char-count");
const errorMsg = document.getElementById("error-msg");
const sizeSelect = document.getElementById("qr-size");
const fgColor = document.getElementById("fg-color");
const bgColor = document.getElementById("bg-color");
const generateBtn = document.getElementById("generate-btn");
const clearBtn = document.getElementById("clear-btn");
const emptyState = document.getElementById("empty-state");
const qrOutput = document.getElementById("qr-output");
const canvas = document.getElementById("qr-canvas");
const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const copyMsg = document.getElementById("copy-msg");

const MAX_CHARS = 1000;

textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length;
});

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
  errorMsg.textContent = "";
}

function generateQR() {
  clearError();
  const value = textInput.value.trim();

  if (!value) {
    showError("Please enter some text or a URL first.");
    return;
  }
  if (value.length > MAX_CHARS) {
    showError(`Text is too long. Maximum is ${MAX_CHARS} characters.`);
    return;
  }

  const size = parseInt(sizeSelect.value, 10);

  QRCode.toCanvas(
    canvas,
    value,
    {
      width: size,
      margin: 2,
      color: {
        dark: fgColor.value,
        light: bgColor.value,
      },
    },
    function (err) {
      if (err) {
        showError("Something went wrong generating the QR code. Try again.");
        return;
      }
      emptyState.hidden = true;
      qrOutput.hidden = false;
      copyMsg.hidden = true;
    }
  );
}

function clearAll() {
  textInput.value = "";
  charCount.textContent = "0";
  clearError();
  qrOutput.hidden = true;
  emptyState.hidden = false;
  copyMsg.hidden = true;
}

function downloadQR() {
  const link = document.createElement("a");
  link.download = "qr-code.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function copyQR() {
  copyMsg.hidden = true;
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    copyMsg.textContent = "Copied to clipboard!";
    copyMsg.hidden = false;
  } catch (err) {
    copyMsg.textContent = "Copy not supported in this browser. Please use Download instead.";
    copyMsg.hidden = false;
  }
}

generateBtn.addEventListener("click", generateQR);
clearBtn.addEventListener("click", clearAll);
downloadBtn.addEventListener("click", downloadQR);
copyBtn.addEventListener("click", copyQR);

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    generateQR();
  }
});