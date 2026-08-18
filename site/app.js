const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const valueEl = document.querySelector(".hero__value");
const fillEl = document.querySelector(".vessel__fill");
const percentEl = document.querySelector("[data-percent]");

const kgFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const toKg = (value) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const currentKg = Math.max(0, toKg(valueEl?.dataset.current));
const targetKg = Math.max(0, toKg(valueEl?.dataset.target));
const displayKg = targetKg > 0 ? Math.min(currentKg, targetKg) : currentKg;
const ratio = targetKg > 0 ? displayKg / targetKg : 0;
const DURATION = 2200;
const easeOut = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

const setFill = (progressRatio) => {
  if (!fillEl) return;
  const capped = Math.min(1, Math.max(0, progressRatio));
  fillEl.style.clipPath = `inset(0 ${(1 - capped) * 100}% 0 0)`;
};

const setValues = (kgValue, progressRatio) => {
  if (valueEl) valueEl.textContent = kgFormatter.format(kgValue);
  if (percentEl) percentEl.textContent = `${percentFormatter.format(progressRatio * 100)}%`;
  setFill(progressRatio);
};

if (prefersReducedMotion) {
  setValues(displayKg, ratio);
} else {
  setValues(0, 0);

  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / DURATION));
    const eased = easeOut(t);
    setValues(displayKg * eased, ratio * eased);
    if (t < 1) requestAnimationFrame(tick);
    else setValues(displayKg, ratio);
  };

  requestAnimationFrame(tick);
}
