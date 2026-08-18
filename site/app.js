const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const valueEl = document.querySelector("[data-count]");

if (!valueEl || prefersReducedMotion) {
  // Server-rendered number is already visible.
} else {
  const target = Number(valueEl.dataset.count);
  const formatter = new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });

  if (Number.isFinite(target) && target > 0) {
    const duration = 1600;
    const start = performance.now();
    valueEl.textContent = "0";

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      valueEl.textContent = formatter.format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else valueEl.textContent = formatter.format(target);
    };

    requestAnimationFrame(tick);
  }
}
