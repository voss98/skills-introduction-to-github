(() => {
  "use strict";

  const CALIBRATION_KEY = "ruler_pxPerInch";
  const DEFAULT_PX_PER_INCH = 96; // CSS reference pixel: 96px == 1in
  const MM_PER_INCH = 25.4;
  const CARD_WIDTH_MM = 85.6; // ISO/IEC 7810 ID-1 (credit card) width

  const TOTAL_INCHES = 12;
  const TOTAL_MM = 300;
  const LEFT_OFFSET = 16; // keeps the "0" label from being clipped by the rounded edge

  const els = {
    track: document.getElementById("rulerTrack"),
    viewport: document.getElementById("rulerViewport"),
    cursorLine: document.getElementById("cursorLine"),
    cursorBadge: document.getElementById("cursorBadge"),
    segmentedControl: document.getElementById("segmentedControl"),
    segmentPill: document.getElementById("segmentPill"),
    segments: Array.from(document.querySelectorAll(".segment")),
    calibrateBtn: document.getElementById("calibrateBtn"),
    calibrationStatus: document.getElementById("calibrationStatus"),
    modal: document.getElementById("calibrateModal"),
    calibrateBox: document.getElementById("calibrateBox"),
    calibrateHandle: document.getElementById("calibrateHandle"),
    saveCalibrate: document.getElementById("saveCalibrate"),
    cancelCalibrate: document.getElementById("cancelCalibrate"),
    resetCalibrate: document.getElementById("resetCalibrate"),
  };

  const state = {
    unit: "in",
    pxPerInch: loadCalibration(),
  };

  function loadCalibration() {
    const saved = parseFloat(localStorage.getItem(CALIBRATION_KEY));
    return Number.isFinite(saved) && saved > 20 && saved < 600 ? saved : DEFAULT_PX_PER_INCH;
  }

  function isCalibrated() {
    return localStorage.getItem(CALIBRATION_KEY) !== null;
  }

  function updateCalibrationStatus() {
    els.calibrationStatus.textContent = isCalibrated()
      ? "Calibrated to your screen"
      : "Standard scale";
  }

  function makeTick(position, height, strength, label) {
    const tick = document.createElement("div");
    tick.className = "tick" + (strength ? " " + strength : "");
    tick.style.left = position + "px";
    tick.style.height = height + "px";
    els.track.appendChild(tick);

    if (label !== null && label !== undefined) {
      const labelEl = document.createElement("div");
      labelEl.className = "tick-label";
      labelEl.style.left = position + "px";
      labelEl.style.bottom = height + 8 + "px";
      labelEl.textContent = label;
      els.track.appendChild(labelEl);
    }
  }

  function renderInchTicks() {
    const pxPerSixteenth = state.pxPerInch / 16;
    const totalSteps = TOTAL_INCHES * 16;

    for (let i = 0; i <= totalSteps; i++) {
      const position = i * pxPerSixteenth + LEFT_OFFSET;
      if (i % 16 === 0) {
        makeTick(position, 60, "strong", String(i / 16));
      } else if (i % 8 === 0) {
        makeTick(position, 44, "medium", null);
      } else if (i % 4 === 0) {
        makeTick(position, 34, null, null);
      } else if (i % 2 === 0) {
        makeTick(position, 26, null, null);
      } else {
        makeTick(position, 18, null, null);
      }
    }

    els.track.style.width = TOTAL_INCHES * state.pxPerInch + LEFT_OFFSET + 32 + "px";
  }

  function renderMetricTicks() {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;

    for (let i = 0; i <= TOTAL_MM; i++) {
      const position = i * pxPerMM + LEFT_OFFSET;
      if (i % 10 === 0) {
        const label = state.unit === "cm" ? String(i / 10) : String(i);
        makeTick(position, 60, "strong", label);
      } else if (i % 5 === 0) {
        makeTick(position, 40, "medium", null);
      } else {
        makeTick(position, 22, null, null);
      }
    }

    els.track.style.width = TOTAL_MM * pxPerMM + LEFT_OFFSET + 32 + "px";
  }

  function render() {
    els.track.innerHTML = "";
    if (state.unit === "in") {
      renderInchTicks();
    } else {
      renderMetricTicks();
    }
  }

  function setUnit(unit) {
    if (unit === state.unit) return;
    state.unit = unit;

    els.segments.forEach((seg) => {
      const active = seg.dataset.unit === unit;
      seg.classList.toggle("active", active);
      seg.setAttribute("aria-selected", String(active));
    });

    const index = els.segments.findIndex((seg) => seg.dataset.unit === unit);
    els.segmentPill.style.transform = `translateX(${index * 100}%)`;

    els.viewport.scrollTo({ left: 0, behavior: "smooth" });
    render();
  }

  els.segmentedControl.addEventListener("click", (e) => {
    const btn = e.target.closest(".segment");
    if (btn) setUnit(btn.dataset.unit);
  });

  // ---- Cursor read-out ----
  function formatValue(distanceFromZero) {
    if (state.unit === "in") {
      const inches = distanceFromZero / state.pxPerInch;
      return inches.toFixed(2) + " in";
    }
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    const mm = distanceFromZero / pxPerMM;
    if (state.unit === "cm") {
      return (mm / 10).toFixed(1) + " cm";
    }
    return mm.toFixed(0) + " mm";
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

  // ---- Calibration modal ----
  function currentCardWidthPx() {
    const pxPerMM = state.pxPerInch / MM_PER_INCH;
    return pxPerMM * CARD_WIDTH_MM;
  }

  function openModal() {
    const startWidth = Math.min(
      Math.max(currentCardWidthPx(), 160),
      window.innerWidth - 80
    );
    els.calibrateBox.style.width = startWidth + "px";
    els.modal.hidden = false;
  }

  function closeModal() {
    els.modal.hidden = true;
  }

  els.calibrateBtn.addEventListener("click", openModal);
  els.cancelCalibrate.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.saveCalibrate.addEventListener("click", () => {
    const widthPx = els.calibrateBox.getBoundingClientRect().width;
    const pxPerMM = widthPx / CARD_WIDTH_MM;
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
  let dragStartX = 0;
  let dragStartWidth = 0;

  els.calibrateHandle.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartWidth = els.calibrateBox.getBoundingClientRect().width;
    els.calibrateHandle.setPointerCapture(e.pointerId);
  });

  els.calibrateHandle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const delta = e.clientX - dragStartX;
    const maxWidth = window.innerWidth - 80;
    const newWidth = Math.min(Math.max(dragStartWidth + delta, 120), maxWidth);
    els.calibrateBox.style.width = newWidth + "px";
  });

  function endDrag() {
    dragging = false;
  }
  els.calibrateHandle.addEventListener("pointerup", endDrag);
  els.calibrateHandle.addEventListener("pointercancel", endDrag);

  // Keyboard support for the calibration handle
  els.calibrateHandle.addEventListener("keydown", (e) => {
    const current = els.calibrateBox.getBoundingClientRect().width;
    if (e.key === "ArrowRight") {
      els.calibrateBox.style.width = current + 2 + "px";
    } else if (e.key === "ArrowLeft") {
      els.calibrateBox.style.width = Math.max(current - 2, 120) + "px";
    }
  });

  // ---- Init ----
  updateCalibrationStatus();
  render();
})();
