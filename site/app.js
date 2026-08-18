const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const valueEl = document.querySelector("[data-count]");
const fillEl = document.querySelector(".vessel__fill");
const vesselEl = document.querySelector(".vessel");

const formatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
});

const currentKg = Number(valueEl?.dataset.count || 0);
const targetKg = Number(vesselEl?.getAttribute("aria-valuemax") || 0);
const ratio = targetKg > 0 ? Math.min(1, Math.max(0, currentKg / targetKg)) : 0;
const DURATION = 2800;
const easeOut = (t) => Math.sin((t * Math.PI) / 2);

const setFill = (progressRatio) => {
  if (!fillEl) return;
  const capped = Math.min(1, Math.max(0, progressRatio));
  fillEl.style.clipPath = `inset(0 ${(1 - capped) * 100}% 0 0)`;
};

if (prefersReducedMotion) {
  setFill(ratio);
} else {
  if (fillEl) fillEl.style.animation = "none";
  setFill(0);
  if (valueEl) valueEl.textContent = "0";

  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / DURATION);
    const eased = easeOut(t);
    setFill(ratio * eased);
    if (valueEl && Number.isFinite(currentKg)) {
      valueEl.textContent = formatter.format(currentKg * eased);
    }
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    setFill(ratio);
    if (valueEl && Number.isFinite(currentKg)) {
      valueEl.textContent = formatter.format(currentKg);
    }
  };

  requestAnimationFrame(tick);
}
