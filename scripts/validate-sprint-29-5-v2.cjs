const fs = require("fs");

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

const games = read("src/pages/Games.tsx");
const dashboard = read("src/components/dashboard/MobileDashboard.tsx");
const preview = read("src/utils/devPreview.ts");
const data = read("src/data/funData.ts");

const checks = [
  ["DEV_PREVIEW_FILE", preview.includes("getPreviewDayIndex") && preview.includes("import.meta.env.DEV")],
  ["GAMES_PREVIEW_DAY", games.includes("getPreviewDayIndex(0, dailyPhotoChallenges.length)")],
  ["PHOTO_TOGGLE_STATE", games.includes("photoDone") && games.includes("setPhotoDone")],
  ["PHOTO_TOGGLE_BUTTONS", games.includes("⭕") && games.includes("✅")],
  ["PHOTO_RESET", games.includes("אפס סימונים")],
  ["HOME_PREVIEW_DAY", dashboard.includes("getPreviewDayIndex(getCurrentTripDayIndex(), tripDays.length)")],
  ["HOME_DEV_DURING", dashboard.includes("previewDay") && dashboard.includes('return "during"')],
  ["NO_YOUTUBE_SEARCH", !data.includes("youtube.com/results?search_query")],
  ["DIRECT_YOUTUBE_LINKS", (data.match(/youtube\.com\/watch\?v=/g) || []).length >= 18],
  ["PHOTO_CONTENT", (data.match(/dayId:/g) || []).length >= 8],
  ["CHARADES_CONTENT", (data.match(/text:/g) || []).length >= 80],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`${name} PASS`);
  else {
    console.log(`${name} FAIL`);
    failed++;
  }
}

if (failed) {
  console.error(`SPRINT 29.5 v2 VALIDATION FAIL - ${failed} issue(s)`);
  process.exit(1);
}

console.log("BUILD-CHECK: run npm run build next");
console.log("SPRINT 29.5 v2 VALIDATION PASS");
