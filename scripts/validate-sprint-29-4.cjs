const fs = require("fs");
const path = require("path");

const root = process.cwd();
const results = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    results.push([file, false, `Missing file: ${file}`]);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function check(id, passed, message) {
  results.push([id, passed, message || ""]);
}

function has(id, file, text) {
  const content = read(file);
  check(id, content.includes(text), `${file} missing "${text}"`);
}

function not(id, file, text) {
  const content = read(file);
  check(id, !content.includes(text), `${file} still contains "${text}"`);
}

function re(id, file, regex) {
  const content = read(file);
  check(id, regex.test(content), `${file} does not match ${regex}`);
}

has("HOME-001", "src/components/dashboard/MobileDashboard.tsx", "homeHeroMountain");
has("HOME-002", "src/styles/mobile-ux-additions.css", ".homeHeroMountain");
has("HOME-003", "src/components/dashboard/MobileDashboard.tsx", "openTravelHubSection");
has("PREP-001", "src/pages/Preparations.tsx", "getLinearProgress");
re("PREP-002", "src/pages/Preparations.tsx", /doneCount\s*\/\s*preparationParticipants\.length/);
has("ROUTE-001", "src/styles/mobile-ux-additions.css", ".dayStepper");
has("ROUTE-002", "src/styles/mobile-ux-additions.css", ".routeTabs");
has("HUB-001", "src/pages/TravelHub.tsx", "forceHomeToken");
has("HUB-002", "src/pages/TravelHub.tsx", "bottomBackButton");
not("HUB-003", "src/pages/TravelHub.tsx", "tripTravelers.map");
has("PACK-001", "src/styles/editable-checklist-additions.css", ".unassignedItem");
has("PACK-002", "src/styles/editable-checklist-additions.css", ".deleteItemButton");
has("PACK-003", "src/styles/editable-checklist-additions.css", ".addItemForm");
has("GAME-001", "src/data/funData.ts", "GPS שמנסה לבטא שם איטלקי");
has("GAME-002", "src/data/funData.ts", "youtube.com/watch?v=");
not("GAME-003", "src/data/funData.ts", "youtube.com/results?search_query");

let failed = 0;
for (const [id, passed, message] of results) {
  if (passed) {
    console.log(`${id} PASS`);
  } else {
    failed++;
    console.log(`${id} FAIL: ${message}`);
  }
}

if (failed > 0) {
  console.error(`SPRINT 29.4 VALIDATION FAIL - ${failed} issue(s)`);
  process.exit(1);
}

console.log("BUILD-CHECK: run npm run build next");
console.log("SPRINT 29.4 VALIDATION PASS");
