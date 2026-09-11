(() => {
  "use strict";

  const CALIBRATION_KEY = "ruler_pxPerInch";
  const MODEL_KEY = "ruler_iphoneModel";
  const DEFAULT_PX_PER_INCH = 96; // CSS reference pixel: 96px == 1in
  const MM_PER_INCH = 25.4;
  const PT_PER_INCH = 72;
  const LEFT_OFFSET = 16; // keeps the "0" label from being clipped by the rounded edge

  // Official Apple exterior lengths (long edge, portrait), in millimeters.
  const IPHONE_MODELS = [
    { name: "iPhone 13 mini", mm: 131.5 },
    { name: "iPhone SE (3rd gen)", mm: 138.4 },
    { name: "iPhone 14", mm: 146.7 },
    { name: "iPhone 15", mm: 147.6 },
    { name: "iPhone 16", mm: 147.6 },
    { name: "iPhone 16e", mm: 146.7 },
    { name: "iPhone 14 Plus", mm: 160.8 },
    { name: "iPhone 15 Plus", mm: 160.9 },
    { name: "iPhone 16 Plus", mm: 160.9 },
    { name: "iPhone 15 Pro", mm: 146.6 },
    { name: "iPhone 16 Pro", mm: 149.6 },
    { name: "iPhone 15 Pro Max", mm: 159.9 },
    { name: "iPhone 16 Pro Max", mm: 163.0 },
    { name: "iPhone Air", mm: 156.2 },
    { name: "iPhone 17", mm: 149.6 },
    { name: "iPhone 17 Pro", mm: 150.0 },
    { name: "iPhone 17 Pro Max", mm: 163.4 },
  ];
  const DEFAULT_MODEL_NAME = "iPhone 16";

  const els = {
    track: document.getElementById("rulerTrack"),
    viewport: document.getElementById("rulerViewport"),
    cursorLine: document.getElementById("cursorLine"),
    cursorBadge: document.getElementById("cursorBadge"),
    chipRow: document.getElementById("unitChipRow"),
    chips: Array.from(document.querySelectorAll(".unit-chip")),
    calibrateBtn: document.getElementById("calibrateBtn"),
    calibrationStatus: document.getElementById("calibrationStatus"),
    modal: document.getElementById("calibrateModal"),
    calibrateBox: document.getElementById("calibrateBox"),
    calibrateHandle: document.getElementById("calibrateHandle"),
    saveCalibrate: document.getElementById("saveCalibrate"),
    cancelCalibrate: document.getElementById("cancelCalibrate"),
    resetCalibrate: document.getElementById("resetCalibrate"),
    modelPickerBtn: document.getElementById("modelPickerBtn"),
    modelPickerLabel: document.getElementById("modelPickerLabel"),
    modelMenu: document.getElementById("modelMenu"),
  };

  const state = {
    unit: "in",
    pxPerInch: loadCalibration(),
    model: loadModel(),
  };

  function loadCalibration() {
    const saved = parseFloat(localStorage.getItem(CALIBRATION_KEY));
    return Number.isFinite(saved) && saved > 20 && saved < 600 ? saved : DEFAULT_PX_PER_INCH;
  }

  function loadModel() {
    const saved = localStorage.getItem(MODEL_KEY);
    return IPHONE_MODELS.find((m) => m.name === saved) || IPHONE_MODELS.find((m) => m.name === DEFAULT_MODEL_NAME);
  }

  function isCalibrated() {
    return localStorage.getItem(CALIBRATION_KEY) !== null;
  }

  function updateCalibrationStatus() {
    els.calibrationStatus.textContent = isCalibrated()
      ? "Calibrated to your screen"
      : "Standard scale";
  }

  function makeTick(position, height, strength, label, faint) {
    const tick = document.createElement("div");
    tick.className = "tick" + (strength ? " " + strength : "");
    tick.style.left = position + "px";
    tick.style.height = height + "px";
    els.track.appendChild(tick);

    if (label !== null && label !== undefined) {
      const labelEl = document.createElement("div");
      labelEl.className = "tick-label" + (faint ? " faint" : "");
      labelEl.style.left = position + "px";
      labelEl.style.bottom = height + 8 + "px";
      labelEl.textContent = label;
      els.track.appendChild(labelEl);
    }
  }

  function setTrackWidth(px) {
    els.track.style.width = px + LEFT_OFFSET + 32 + "px";
  }

  // ---- Per-unit tick renderers ----

  function renderInchTicks() {
    const pxPerSixteenth = state.pxPerInch / 16;
    const totalSteps = 12 * 16; // 12 inches

    for (let i = 0; i <= totalSteps; i++) {
      const position = i * pxPerSixteenth + LEFT_OFFSET;
      if (i % 16 === 0) makeTick(position, 60, "strong", String(i / 16));
      else if (i % 8 === 0) makeTick(position, 44, "medium", null);
      else if (i % 4 === 0) makeTick(position, 34, null, null);
      else if (i % 2 === 0) makeTick(position, 26, null, null);
      else makeTick(position, 18, null, null);
    }
    setTrackWidth(totalSteps * pxPerSixteenth);
  }

  function renderFootTicks() {
    // Granularity: eighths of an inch, like a real tape measure.
    const pxPerEighth = state.pxPerInch / 8;
    const totalFeet = 4;
    const totalSteps = totalFeet * 12 * 8;

    for (let i = 0; i <= totalSteps; i++) {
      const position = i * pxPerEighth + LEFT_OFFSET;
      if (i % 96 === 0) {
        makeTick(position, 64, "strong", String(i / 96) + " ft");
      } else if (i % 8 === 0) {
        const inchInFoot = (i / 8) % 12;
        makeTick(position, 46, "medium", String(inchInFoot), true);
      } else if (i % 4 === 0) makeTick(position, 34, null, null);
      else if (i % 2 === 0) makeTick(position, 24, null, null);
      else makeTick(position, 16, null, null);
    }
    setTrackWidth(totalSteps * pxPerEighth);
  }

  function renderMetricTicks() {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    const totalMM = 300; // 30 cm

    for (let i = 0; i <= totalMM; i++) {
      const position = i * pxPerMM + LEFT_OFFSET;
      if (i % 10 === 0) {
        const label = state.unit === "cm" ? String(i / 10) : String(i);
        makeTick(position, 60, "strong", label);
      } else if (i % 5 === 0) makeTick(position, 40, "medium", null);
      else makeTick(position, 22, null, null);
    }
    setTrackWidth(totalMM * pxPerMM);
  }

  function renderMeterTicks() {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    const totalMM = 1500; // 1.5 m

    for (let i = 0; i <= totalMM; i++) {
      const position = i * pxPerMM + LEFT_OFFSET;
      if (i % 100 === 0) {
        makeTick(position, i % 500 === 0 ? 64 : 46, i % 500 === 0 ? "strong" : "medium", (i / 1000).toFixed(1));
      } else if (i % 10 === 0) makeTick(position, 22, null, null);
    }
    setTrackWidth(totalMM * pxPerMM);
  }

  function renderPointTicks() {
    const pxPerPt = state.pxPerInch / PT_PER_INCH;
    const totalPt = 6 * PT_PER_INCH; // 6 inches worth of points

    for (let i = 0; i <= totalPt; i++) {
      const position = i * pxPerPt + LEFT_OFFSET;
      if (i % 72 === 0) makeTick(position, 64, "strong", String(i));
      else if (i % 12 === 0) makeTick(position, 42, "medium", String(i), true);
      else if (i % 6 === 0) makeTick(position, 26, null, null);
      else makeTick(position, 15, null, null);
    }
    setTrackWidth(totalPt * pxPerPt);
  }

  function renderPixelTicks() {
    // Pixels are literal CSS pixels: always 1:1, independent of calibration.
    const totalPx = 900;

    for (let i = 0; i <= totalPx; i += 10) {
      const position = i + LEFT_OFFSET;
      if (i % 100 === 0) makeTick(position, 64, "strong", String(i));
      else if (i % 50 === 0) makeTick(position, 42, "medium", null);
      else makeTick(position, 22, null, null);
    }
    setTrackWidth(totalPx);
  }

  const RENDERERS = {
    in: renderInchTicks,
    ft: renderFootTicks,
    cm: renderMetricTicks,
    mm: renderMetricTicks,
    m: renderMeterTicks,
    pt: renderPointTicks,
    px: renderPixelTicks,
  };

  function render() {
    els.track.innerHTML = "";
    RENDERERS[state.unit]();
  }

  function setUnit(unit) {
    if (unit === state.unit || !RENDERERS[unit]) return;
    state.unit = unit;

    els.chips.forEach((chip) => {
      const active = chip.dataset.unit === unit;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-selected", String(active));
      if (active) chip.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    });

    els.viewport.scrollTo({ left: 0, behavior: "smooth" });
    render();
  }

  els.chipRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".unit-chip");
    if (btn) setUnit(btn.dataset.unit);
  });

  // ---- Cursor read-out ----
  function formatValue(distanceFromZero) {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    switch (state.unit) {
      case "in":
        return (distanceFromZero / state.pxPerInch).toFixed(2) + " in";
      case "ft":
        return (distanceFromZero / state.pxPerInch / 12).toFixed(2) + " ft";
      case "cm":
        return (distanceFromZero / pxPerMM / 10).toFixed(1) + " cm";
      case "mm":
        return (distanceFromZero / pxPerMM).toFixed(0) + " mm";
      case "m":
        return (distanceFromZero / pxPerMM / 1000).toFixed(2) + " m";
      case "pt":
        return (distanceFromZero / (state.pxPerInch / PT_PER_INCH)).toFixed(0) + " pt";
      case "px":
        return distanceFromZero.toFixed(0) + " px";
      default:
        return "";
    }
  }

  function updateCursor(clientX) {
    const rect = els.viewport.getBoundingClientRect();
    const screenX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const absoluteX = screenX + els.viewport.scrollLeft;
    const distanceFromZero = Math.max(absoluteX - LEFT_OFFSET, 0);

    els.cursorLine.style.transform = `translateX(${screenX}px)`;
    els.cursorBadge.textContent = formatValue(distanceFromZero);
  }

  els.viewport.addEventListener("pointerenter", (e) => {
    els.cursorLine.classList.add("visible");
    updateCursor(e.clientX);
  });

  els.viewport.addEventListener("pointermove", (e) => {
    updateCursor(e.clientX);
  });

  els.viewport.addEventListener("pointerleave", () => {
    els.cursorLine.classList.remove("visible");
  });

  els.viewport.addEventListener("pointerdown", (e) => {
    els.cursorLine.classList.add("visible");
    updateCursor(e.clientX);
  });

  // ---- Model picker ----
  function renderModelMenu() {
    els.modelMenu.innerHTML = "";
    IPHONE_MODELS.forEach((model) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "model-menu-item" + (model === state.model ? " selected" : "");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(model === state.model));
      item.innerHTML =
        '<span>' + model.name + '</span><span class="model-menu-length">' + model.mm.toFixed(1) + " mm</span>";
      item.addEventListener("click", () => selectModel(model));
      els.modelMenu.appendChild(item);
    });
  }

  function selectModel(model) {
    state.model = model;
    els.modelPickerLabel.textContent = model.name;
    localStorage.setItem(MODEL_KEY, model.name);
    closeModelMenu();
    setBoxHeightForModel();
    renderModelMenu();
  }

  function openModelMenu() {
    els.modelMenu.hidden = false;
    els.modelPickerBtn.setAttribute("aria-expanded", "true");
  }

  function closeModelMenu() {
    els.modelMenu.hidden = true;
    els.modelPickerBtn.setAttribute("aria-expanded", "false");
  }

  els.modelPickerBtn.addEventListener("click", () => {
    if (els.modelMenu.hidden) openModelMenu();
    else closeModelMenu();
  });

  document.addEventListener("click", (e) => {
    if (!els.modelMenu.hidden && !e.target.closest(".model-picker")) closeModelMenu();
  });

  // ---- Calibration modal ----
  function setBoxHeightForModel() {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    const height = Math.min(
      Math.max(pxPerMM * state.model.mm, 160),
      window.innerHeight - 340
    );
    els.calibrateBox.style.height = height + "px";
  }

  function openModal() {
    els.modelPickerLabel.textContent = state.model.name;
    renderModelMenu();
    setBoxHeightForModel();
    els.modal.hidden = false;
  }

  function closeModal() {
    els.modal.hidden = true;
    closeModelMenu();
  }

  els.calibrateBtn.addEventListener("click", openModal);
  els.cancelCalibrate.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.saveCalibrate.addEventListener("click", () => {
    const heightPx = els.calibrateBox.getBoundingClientRect().height;
    const pxPerMM = heightPx / state.model.mm;
    const newPxPerInch = pxPerMM * MM_PER_INCH;

    if (newPxPerInch > 20 && newPxPerInch < 600) {
      state.pxPerInch = newPxPerInch;
      localStorage.setItem(CALIBRATION_KEY, String(newPxPerInch));
      updateCalibrationStatus();
      render();
    }
    closeModal();
  });

  els.resetCalibrate.addEventListener("click", () => {
    localStorage.removeItem(CALIBRATION_KEY);
    state.pxPerInch = DEFAULT_PX_PER_INCH;
    updateCalibrationStatus();
    render();
    closeModal();
  });

  // Drag-to-resize handle (pointer events unify mouse + touch)
  let dragging = false;
  let dragStartY = 0;
  let dragStartHeight = 0;

  els.calibrateHandle.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragStartY = e.clientY;
    dragStartHeight = els.calibrateBox.getBoundingClientRect().height;
    els.calibrateHandle.setPointerCapture(e.pointerId);
  });

  els.calibrateHandle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const delta = e.clientY - dragStartY;
    const maxHeight = window.innerHeight - 340;
    const newHeight = Math.min(Math.max(dragStartHeight + delta, 120), maxHeight);
    els.calibrateBox.style.height = newHeight + "px";
  });

  function endDrag() {
    dragging = false;
  }
  els.calibrateHandle.addEventListener("pointerup", endDrag);
  els.calibrateHandle.addEventListener("pointercancel", endDrag);

  // Keyboard support for the calibration handle
  els.calibrateHandle.addEventListener("keydown", (e) => {
    const current = els.calibrateBox.getBoundingClientRect().height;
    if (e.key === "ArrowDown") els.calibrateBox.style.height = current + 2 + "px";
    else if (e.key === "ArrowUp") els.calibrateBox.style.height = Math.max(current - 2, 120) + "px";
  });

  // ---- Init ----
  updateCalibrationStatus();
  render();
})();
