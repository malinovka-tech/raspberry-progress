const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const siteDir = path.join(rootDir, "site");
const distDir = path.join(rootDir, "dist");
const configPath = path.join(rootDir, "config.json");
const statePath = path.join(rootDir, "state.json");

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundKg = (value, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const formatKg = (value) =>
  new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(roundKg(value));

const formatPercent = (value) =>
  new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);

const formatUpdatedAt = (timezone, value) => {
  if (value) return value;
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date());
};

const readJson = (filePath, fallback = {}) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const readEventPayload = () => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return {};
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    const payload = event.client_payload || {};
    const inputs = event.inputs || {};
    return {
      currentKg: payload.currentKg ?? inputs.current_kg,
      lastDeltaKg: payload.lastDeltaKg ?? inputs.last_delta_kg,
    };
  } catch {
    return {};
  }
};

const statusText = ({ currentKg, targetKg, remainingKg, unit }) => {
  if (targetKg <= 0) return "Ціль ще не задана.";
  if (currentKg >= targetKg) return "Ціль сезону досягнуто.";
  return `Ще ${formatKg(remainingKg)} ${unit} до цілі.`;
};

const hasIncomingValue = (eventValue, envValue) => {
  if (eventValue !== undefined && eventValue !== null && eventValue !== "") return true;
  if (envValue !== undefined && envValue !== null && envValue !== "") return true;
  return false;
};

const loadData = () => {
  const config = readJson(configPath);
  const state = readJson(statePath);
  const event = readEventPayload();
  const timezone = process.env.TIMEZONE || "Europe/Kyiv";
  const incomingCurrent = hasIncomingValue(event.currentKg, process.env.CURRENT_KG);
  const incomingDelta = hasIncomingValue(event.lastDeltaKg, process.env.LAST_DELTA_KG);

  const currentKg = roundKg(
    event.currentKg ?? process.env.CURRENT_KG ?? state.currentKg ?? 0,
  );
  const lastDeltaKg = roundKg(
    incomingDelta || incomingCurrent
      ? event.lastDeltaKg ?? process.env.LAST_DELTA_KG ?? 0
      : state.lastDeltaKg ?? 0,
  );
  const targetKg = roundKg(process.env.TARGET_KG || config.targetKg || 1000);
  const unit = config.unit || "кг";
  const ratio = targetKg > 0 ? Math.max(0, currentKg / targetKg) : 0;
  const percent = Math.min(100, ratio * 100);
  const remainingKg = Math.max(0, roundKg(targetKg - currentKg));
  const updatedAt = incomingCurrent
    ? formatUpdatedAt(timezone)
    : state.updatedAt || "";

  return {
    farm: config.farm || "Малинівка",
    title: config.title || "Збір малини",
    season: String(config.season || new Date().getFullYear()),
    unit,
    currentKg,
    lastDeltaKg,
    targetKg,
    remainingKg,
    percent,
    updatedAt,
    persistState: incomingCurrent,
  };
};

const renderHtml = (data) => {
  const template = fs.readFileSync(path.join(siteDir, "index.html"), "utf8");
  const isDone = data.currentKg >= data.targetKg && data.targetKg > 0;
  const hasDelta = data.lastDeltaKg > 0;
  return template
    .replaceAll("__FARM__", data.farm)
    .replaceAll("__TITLE__", data.title)
    .replaceAll("__SEASON__", data.season)
    .replaceAll("__UNIT__", data.unit)
    .replaceAll("__CURRENT_KG_RAW__", String(data.currentKg))
    .replaceAll("__CURRENT_KG__", formatKg(data.currentKg))
    .replaceAll("__TARGET_KG_RAW__", String(data.targetKg))
    .replaceAll("__TARGET_KG__", formatKg(data.targetKg))
    .replaceAll("__REMAINING_KG__", formatKg(data.remainingKg))
    .replaceAll("__PERCENT_DISPLAY__", formatPercent(data.percent))
    .replaceAll("__PROGRESS__", `${data.percent}%`)
    .replaceAll("__PROGRESS_RATIO__", String(Math.min(1, data.percent / 100)))
    .replaceAll("__LAST_DELTA__", formatKg(data.lastDeltaKg))
    .replaceAll("__STATUS__", statusText(data))
    .replaceAll("__UPDATED_AT__", data.updatedAt ? `Оновлено ${data.updatedAt}` : "Очікує першого збору")
    .replaceAll("__DONE_CLASS__", isDone ? "is-done" : "")
    .replaceAll("__DELTA_CLASS__", hasDelta ? "delta" : "delta is-hidden");
};

const writeDist = (html) => {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), html);
  fs.copyFileSync(path.join(siteDir, "styles.css"), path.join(distDir, "styles.css"));
  fs.copyFileSync(path.join(siteDir, "app.js"), path.join(distDir, "app.js"));
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "");
};

const persistState = (data) => {
  const next = {
    currentKg: data.currentKg,
    lastDeltaKg: data.lastDeltaKg,
    updatedAt: data.updatedAt,
  };
  fs.writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`);
};

const render = () => {
  const data = loadData();
  if (data.persistState) persistState(data);
  writeDist(renderHtml(data));
  return data;
};

if (require.main === module) {
  const data = render();
  console.log(
    `Rendered harvest page: ${data.currentKg}/${data.targetKg} ${data.unit} (${formatPercent(data.percent)}%)`,
  );
}

module.exports = {
  loadData,
  renderHtml,
  render,
};
