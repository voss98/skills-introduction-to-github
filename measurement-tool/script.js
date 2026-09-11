(() => {
  "use strict";

  const CALIBRATION_KEY = "ruler_pxPerInch";
  const MODEL_KEY = "ruler_iphoneModel";
  const REF_TYPE_KEY = "ruler_refType";
  const DEFAULT_PX_PER_INCH = 96; // CSS reference pixel: 96px == 1in
  const MM_PER_INCH = 25.4;
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

  // ISO/IEC 7810 ID-1 (credit card): 85.60 x 53.98 mm.
  const REFERENCES = {
    iphone: {
      label: "iPhone",
      copy: "Hold your iPhone flat against the screen. Drag the edge until the outline matches its exact length — then every measurement here will be true to life.",
      getLengthMM: () => state.model.mm,
      shortMM: () => 71.6, // typical iPhone width, for the silhouette's proportions
      defaultOrientation: "portrait",
    },
    card: {
      label: "Credit Card",
      copy: "Hold a credit card, ID, or gift card flat against the screen. Drag the edge until the outline matches its exact width — then every measurement here will be true to life.",
      getLengthMM: () => 85.6,
      shortMM: () => 53.98,
      defaultOrientation: "landscape",
    },
  };

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
    modalCopy: document.getElementById("modalCopy"),
    calibrateStage: document.getElementById("calibrateStage"),
    calibrateBox: document.getElementById("calibrateBox"),
    calibrateHandle: document.getElementById("calibrateHandle"),
    rotateBtn: document.getElementById("rotateBtn"),
    saveCalibrate: document.getElementById("saveCalibrate"),
    cancelCalibrate: document.getElementById("cancelCalibrate"),
    resetCalibrate: document.getElementById("resetCalibrate"),
    refTypeToggle: document.getElementById("refTypeToggle"),
    refTypeButtons: Array.from(document.querySelectorAll(".ref-type-btn")),
    modelPickerWrap: document.getElementById("modelPickerWrap"),
    modelPickerBtn: document.getElementById("modelPickerBtn"),
    modelPickerLabel: document.getElementById("modelPickerLabel"),
    modelMenu: document.getElementById("modelMenu"),
  };

  const state = {
    unit: "in",
    pxPerInch: loadCalibration(),
    model: loadModel(),
    refType: localStorage.getItem(REF_TYPE_KEY) === "card" ? "card" : "iphone",
    orientation: "portrait",
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

  const RENDERERS = {
    in: renderInchTicks,
    cm: renderMetricTicks,
    mm: renderMetricTicks,
    m: renderMeterTicks,
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
      case "cm":
        return (distanceFromZero / pxPerMM / 10).toFixed(1) + " cm";
      case "mm":
        return (distanceFromZero / pxPerMM).toFixed(0) + " mm";
      case "m":
        return (distanceFromZero / pxPerMM / 1000).toFixed(2) + " m";
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

  // ---- Model picker (iPhone reference only) ----
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
    applyBoxSize();
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

  // ---- Reference object (iPhone / credit card) ----
  function currentRef() {
    return REFERENCES[state.refType];
  }

  function buildFrameDecoration() {
    els.calibrateBox.innerHTML = "";
    els.calibrateBox.classList.toggle("phone", state.refType === "iphone");
    els.calibrateBox.classList.toggle("card", state.refType === "card");

    if (state.refType === "iphone") {
      const island = document.createElement("div");
      island.className = "phone-island";
      const camera = document.createElement("div");
      camera.className = "phone-camera";
      els.calibrateBox.append(island, camera);
    } else {
      const chip = document.createElement("div");
      chip.className = "card-chip";
      const stripe = document.createElement("div");
      stripe.className = "card-stripe";
      els.calibrateBox.append(stripe, chip);
    }
  }

  function maxLengthPx() {
    return state.orientation === "portrait"
      ? window.innerHeight - 380
      : window.innerWidth - 96;
  }

  function applyBoxSize() {
    const ref = currentRef();
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    const lengthPx = Math.min(Math.max(pxPerMM * ref.getLengthMM(), 140), maxLengthPx());
    const shortToLong = ref.shortMM() / ref.getLengthMM();

    els.calibrateBox.style.width = "";
    els.calibrateBox.style.height = "";

    if (state.orientation === "portrait") {
      els.calibrateBox.style.height = lengthPx + "px";
      els.calibrateBox.style.aspectRatio = String(shortToLong);
    } else {
      els.calibrateBox.style.width = lengthPx + "px";
      els.calibrateBox.style.aspectRatio = String(1 / shortToLong);
    }
  }

  function updateOrientationUI() {
    els.calibrateStage.classList.toggle("orientation-portrait", state.orientation === "portrait");
    els.calibrateStage.classList.toggle("orientation-landscape", state.orientation === "landscape");
    els.calibrateHandle.setAttribute("aria-orientation", state.orientation === "portrait" ? "vertical" : "horizontal");
  }

  function setRefType(refType) {
    if (refType === state.refType) return;
    state.refType = refType;
    state.orientation = REFERENCES[refType].defaultOrientation;
    localStorage.setItem(REF_TYPE_KEY, refType);

    els.refTypeButtons.forEach((btn) => {
      const active = btn.dataset.ref === refType;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    els.modelPickerWrap.hidden = refType !== "iphone";
    els.modalCopy.textContent = currentRef().copy;

    buildFrameDecoration();
    updateOrientationUI();
    applyBoxSize();
  }

  function toggleOrientation() {
    state.orientation = state.orientation === "portrait" ? "landscape" : "portrait";
    updateOrientationUI();
    applyBoxSize();
  }

  els.refTypeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".ref-type-btn");
    if (btn) setRefType(btn.dataset.ref);
  });

  els.rotateBtn.addEventListener("click", toggleOrientation);

  // ---- Calibration modal ----
  function openModal() {
    els.modelPickerLabel.textContent = state.model.name;
    els.modelPickerWrap.hidden = state.refType !== "iphone";
    els.refTypeButtons.forEach((btn) => {
      const active = btn.dataset.ref === state.refType;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    els.modalCopy.textContent = currentRef().copy;
    renderModelMenu();
    buildFrameDecoration();
    updateOrientationUI();
    applyBoxSize();
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
    const rect = els.calibrateBox.getBoundingClientRect();
    const lengthPx = state.orientation === "portrait" ? rect.height : rect.width;
    const pxPerMM = lengthPx / currentRef().getLengthMM();
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
  let dragStart = 0;
  let dragStartLength = 0;

  els.calibrateHandle.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragStart = state.orientation === "portrait" ? e.clientY : e.clientX;
    const rect = els.calibrateBox.getBoundingClientRect();
    dragStartLength = state.orientation === "portrait" ? rect.height : rect.width;
    els.calibrateHandle.setPointerCapture(e.pointerId);
  });

  els.calibrateHandle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const current = state.orientation === "portrait" ? e.clientY : e.clientX;
    const delta = current - dragStart;
    const newLength = Math.min(Math.max(dragStartLength + delta, 120), maxLengthPx());
    if (state.orientation === "portrait") els.calibrateBox.style.height = newLength + "px";
    else els.calibrateBox.style.width = newLength + "px";
  });

  function endDrag() {
    dragging = false;
  }
  els.calibrateHandle.addEventListener("pointerup", endDrag);
  els.calibrateHandle.addEventListener("pointercancel", endDrag);

  // Keyboard support for the calibration handle
  els.calibrateHandle.addEventListener("keydown", (e) => {
    const rect = els.calibrateBox.getBoundingClientRect();
    const current = state.orientation === "portrait" ? rect.height : rect.width;
    const grow = state.orientation === "portrait" ? e.key === "ArrowDown" : e.key === "ArrowRight";
    const shrink = state.orientation === "portrait" ? e.key === "ArrowUp" : e.key === "ArrowLeft";
    if (grow) {
      const next = current + 2 + "px";
      if (state.orientation === "portrait") els.calibrateBox.style.height = next;
      else els.calibrateBox.style.width = next;
    } else if (shrink) {
      const next = Math.max(current - 2, 120) + "px";
      if (state.orientation === "portrait") els.calibrateBox.style.height = next;
      else els.calibrateBox.style.width = next;
    }
  });

  // ---- Init ----
  updateCalibrationStatus();
  render();
})();
