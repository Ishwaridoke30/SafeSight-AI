
"use strict";

const API_URL = "http://127.0.0.1:8000/inspect";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imageInput = document.getElementById("imageInput");
const uploadZone = document.getElementById("uploadZone");
const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");
const fileDetails = document.getElementById("fileDetails");

const analyzeButton = document.getElementById("analyzeButton");
const clearButton = document.getElementById("clearButton");
const removeImageButton = document.getElementById("removeImage");
const uploadMessage = document.getElementById("uploadMessage");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultContent = document.getElementById("resultContent");
const resultTitle = document.getElementById("resultTitle");
const resultSummary = document.getElementById("resultSummary");
const resultStatus = document.getElementById("resultStatus");

const imagesCount = document.getElementById("imagesCount");
const compliantCount = document.getElementById("compliantCount");
const alertsCount = document.getElementById("alertsCount");

const activityEmpty = document.getElementById("activityEmpty");
const activityList = document.getElementById("activityList");
const clearHistoryButton = document.getElementById("clearHistory");

let selectedFile = null;
let previewUrl = null;
let uploadCount = 0;
let requestInProgress = false;

const currentDate = document.getElementById("currentDate");

if (currentDate) {
  currentDate.textContent = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date());
}

function setMessage(message) {
  if (uploadMessage) uploadMessage.textContent = message;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " bytes";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function clearPreviewUrl() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}

function addActivity(title, description) {
  if (!activityList || !activityEmpty) return;

  activityEmpty.hidden = true;

  const item = document.createElement("div");
  item.className = "activity-item";

  const marker = document.createElement("span");
  marker.className = "activity-marker";

  const info = document.createElement("div");
  info.className = "activity-info";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const detail = document.createElement("p");
  detail.textContent = description;

  const time = document.createElement("span");
  time.className = "activity-time";
  time.textContent = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  info.append(heading, detail);
  item.append(marker, info, time);
  activityList.prepend(item);
}

function setPPEStatus(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = text;
}

function resetResults() {
  if (resultPlaceholder) resultPlaceholder.hidden = false;
  if (resultContent) resultContent.hidden = true;

  if (compliantCount) compliantCount.textContent = "—";
  if (alertsCount) alertsCount.textContent = "—";

  setPPEStatus("helmetStatus", "Not evaluated");
  setPPEStatus("vestStatus", "Not evaluated");
  setPPEStatus("gogglesStatus", "Not supported by model");

  const list = document.getElementById("aiDetectionList");
  if (list) list.remove();
}

function resetSelection() {
  if (requestInProgress) return;

  selectedFile = null;
  if (imageInput) imageInput.value = "";
  if (analyzeButton) analyzeButton.disabled = true;

  clearPreviewUrl();

  if (imagePreview) imagePreview.removeAttribute("src");
  if (previewContainer) previewContainer.hidden = true;
  if (uploadZone) uploadZone.hidden = false;
  if (fileDetails) fileDetails.textContent = "";

  setMessage("Select an image to begin.");
  resetResults();
}

function handleFile(file) {
  if (!file || requestInProgress) return;

  if (!ALLOWED_TYPES.includes(file.type)) {
    setMessage("Choose a JPG, PNG, or WEBP image.");
    return;
  }

  if (file.size === 0) {
    setMessage("The selected file is empty.");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    setMessage("Image size must not exceed 10 MB.");
    return;
  }

  clearPreviewUrl();

  selectedFile = file;
  previewUrl = URL.createObjectURL(file);

  if (imagePreview) imagePreview.src = previewUrl;
  if (fileDetails) fileDetails.textContent = formatFileSize(file.size);
  if (uploadZone) uploadZone.hidden = true;
  if (previewContainer) previewContainer.hidden = false;
  if (analyzeButton) analyzeButton.disabled = false;

  setMessage("Image ready. Click Run AI inspection.");
  resetResults();

  addActivity("Image selected", file.name + " · " + formatFileSize(file.size));
}

if (imageInput) {
  imageInput.addEventListener("change", () => {
    handleFile(imageInput.files[0]);
  });
}

if (removeImageButton) removeImageButton.addEventListener("click", resetSelection);
if (clearButton) clearButton.addEventListener("click", resetSelection);

if (uploadZone) {
  uploadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadZone.classList.add("drag-over");
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("drag-over");
  });

  uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadZone.classList.remove("drag-over");
    handleFile(event.dataTransfer.files[0]);
  });
}

function showBackendResult(data) {
  if (resultPlaceholder) resultPlaceholder.hidden = true;
  if (resultContent) resultContent.hidden = false;

  const detections = Array.isArray(data.detections) ? data.detections : [];

  const countClass = (name) =>
    detections.filter(
      (item) => String(item.class_name).toLowerCase() === name
    ).length;

  const humans = countClass("human");
  const helmets = countClass("helmet");
  const noHelmets = countClass("no-helmet");
  const vests = countClass("vest");

  const confidenceText = (name) => {
    const items = detections.filter(
      (item) => String(item.class_name).toLowerCase() === name
    );

    if (!items.length) return "";

    const average = items.reduce(
      (sum, item) => sum + Number(item.confidence || 0),
      0
    ) / items.length;

    return ` · ${average * 100}% average confidence`;
  };

  if (resultTitle) resultTitle.textContent = "AI inspection completed";

  if (resultSummary) {
    resultSummary.textContent =
      `${humans} human(s), ${helmets} helmet(s), ` +
      `${noHelmets} no-helmet detection(s), ${vests} vest(s) detected.`;
  }

  setPPEStatus(
    "helmetStatus",
    helmets ? `${helmets} detected${confidenceText("helmet")}` : "No helmet detected"
  );

  setPPEStatus(
    "vestStatus",
    vests ? `${vests} detected${confidenceText("vest")}` : "No vest detected"
  );

  setPPEStatus("gogglesStatus", "Not supported by model");

  // PPE compliance requires person-level association and safety rules.
  if (compliantCount) compliantCount.textContent = "Not assessed";

  // Only count explicit no-helmet model detections as alerts.
  if (alertsCount) alertsCount.textContent = String(noHelmets);

  uploadCount++;
  if (imagesCount) imagesCount.textContent = String(uploadCount);

  if (resultStatus) {
    resultStatus.style.background = noHelmets ? "#fff0f0" : "#fff8e9";
    resultStatus.style.borderColor = noHelmets ? "#f0bcbc" : "#f0dfb8";
  }

  setMessage(`AI analysis complete: ${detections.length} object detection(s).`);

  let detectionList = document.getElementById("aiDetectionList");

  if (!detectionList && resultContent) {
    detectionList = document.createElement("div");
    detectionList.id = "aiDetectionList";
    detectionList.className = "ai-detection-list";
    resultContent.appendChild(detectionList);
  }

  if (detectionList) {
    detectionList.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Detected Objects";
    detectionList.appendChild(heading);

    if (detections.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No objects detected. Try another clear image.";
      detectionList.appendChild(empty);
    }

    detections.forEach((item) => {
      const row = document.createElement("p");
      const name = String(item.class_name || "unknown");
      const confidence = (Number(item.confidence || 0) * 100).toFixed(1);

      row.textContent = `${name} — ${confidence}% confidence`;
      detectionList.appendChild(row);
    });
  }

  addActivity(
    "AI inspection completed",
    `${detections.length} detection(s) · ${data.filename || "Uploaded image"}`
  );
}

async function inspectImage() {
  if (!selectedFile) {
    setMessage("Please select an image first.");
    return;
  }

  if (requestInProgress) return;

  const fileBeingSent = selectedFile;
  const formData = new FormData();
  formData.append("file", fileBeingSent);

  requestInProgress = true;

  if (analyzeButton) analyzeButton.disabled = true;
  if (clearButton) clearButton.disabled = true;
  if (removeImageButton) removeImageButton.disabled = true;
  if (analyzeButton) analyzeButton.textContent = "Analyzing image...";

  setMessage("Uploading image and running AI detection...");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail || "The server rejected the image.")
      );
    }

    if (data.ai_model_connected !== true || data.detection_status !== "evaluated") {
      throw new Error("The backend did not return completed AI detection results.");
    }

    showBackendResult(data);

  } catch (error) {
    console.error("SafeSight AI API error:", error);

    if (resultPlaceholder) resultPlaceholder.hidden = true;
    if (resultContent) resultContent.hidden = false;

    if (resultTitle) resultTitle.textContent = "Inspection request failed";

    if (resultSummary) {
      resultSummary.textContent =
        error.message === "Failed to fetch"
          ? "Cannot connect to backend. Check that FastAPI is running on port 8000."
          : error.message;
    }

    if (resultStatus) {
      resultStatus.style.background = "#fff0f0";
      resultStatus.style.borderColor = "#f0bcbc";
    }

    setPPEStatus("helmetStatus", "Not evaluated");
    setPPEStatus("vestStatus", "Not evaluated");
    setPPEStatus("gogglesStatus", "Not supported by model");

    if (compliantCount) compliantCount.textContent = "—";
    if (alertsCount) alertsCount.textContent = "—";

    setMessage("Could not complete AI detection.");
    addActivity("AI inspection failed", fileBeingSent.name + " · " + error.message);

  } finally {
    requestInProgress = false;

    if (analyzeButton) {
      analyzeButton.disabled = !selectedFile;
      analyzeButton.textContent = "Run AI inspection";
    }

    if (clearButton) clearButton.disabled = false;
    if (removeImageButton) removeImageButton.disabled = false;
  }
}

if (analyzeButton) {
  analyzeButton.addEventListener("click", inspectImage);
}

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    if (activityList) activityList.replaceChildren();
    if (activityEmpty) activityEmpty.hidden = false;
  });
}

window.addEventListener("beforeunload", clearPreviewUrl);
