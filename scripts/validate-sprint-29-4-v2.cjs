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

has("PACK-ADD-001", "src/styles/editable-checklist-additions.css", "sprint-29-4-v2-add-form-fix");
has("PACK-UNASSIGNED-001", "src/styles/editable-checklist-additions.css", "sprint-29-4-v2-unassigned-fix");
has("GAME-SONG-001", "src/data/funData.ts", "youtube.com/watch?v=");
not("GAME-SONG-002", "src/data/funData.ts", "youtube.com/results?search_query");
has("GAME-SONG-003", "src/data/funData.ts", "Nel blu dipinto di blu");
has("ROUTE-HOTEL-001", "src/data/tripData.ts", "מילאנו — הדומו");
has("ROUTE-HOTEL-002", "src/data/tripData.ts", "מילאנו — אזור לינה");

let failed = 0;
for (const [id, passed, message] of results) {
  if (passed) console.log(`${id} PASS`);
  else {
    failed++;
    console.log(`${id} FAIL: ${message}`);
  }
}

if (failed > 0) {
  console.error(`SPRINT 29.4 v2 VALIDATION FAIL - ${failed} issue(s)`);
  process.exit(1);
}

console.log("BUILD-CHECK: run npm run build next");
console.log("SPRINT 29.4 v2 VALIDATION PASS");
