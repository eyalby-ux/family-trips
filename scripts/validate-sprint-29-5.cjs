const fs = require("fs");
const content = fs.readFileSync("src/data/funData.ts", "utf8");

const checks = [
  ["NO_YOUTUBE_SEARCH", !content.includes("youtube.com/results?search_query")],
  ["DIRECT_YOUTUBE_LINKS", (content.match(/youtube\.com\/watch\?v=/g) || []).length >= 18],
  ["PHOTO_DAYS", (content.match(/dayId:/g) || []).length >= 8],
  ["CHARADES", (content.match(/text:/g) || []).length >= 80],
  ["TRIVIA", (content.match(/question:/g) || []).length >= 35],
  ["TRUE_FALSE", (content.match(/statement:/g) || []).length >= 35],
  ["TRIP_CONTEXT", content.includes("דולומיטים") && content.includes("מילאנו") && content.includes("Tre Cime")],
  ["PHOTO_RECREATION", content.includes("שחזור תמונה")]
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`${name} PASS`);
  else { console.log(`${name} FAIL`); failed++; }
}

if (failed) {
  console.error(`SPRINT 29.5 VALIDATION FAIL - ${failed} issue(s)`);
  process.exit(1);
}

console.log("BUILD-CHECK: run npm run build next");
console.log("SPRINT 29.5 VALIDATION PASS");
