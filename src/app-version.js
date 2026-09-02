// V6-F31 built this to stop the landing banner from hardcoding a version literal that drifts
// from the shipped build; V6-F52 found the sign-in screen (src/main.js) had exactly that same
// problem independently, in a file that never imported this at all -- a second hand-maintained
// literal nobody remembered to update alongside the first. Pulling it into its own module, used
// by both main.js and v5-app.js, makes that structurally impossible: there is only one function
// that knows how to read the version, so there is nothing left to forget to update in the other
// place. Reads document.title, which index.html's __APP_VERSION__ placeholder (resolved at build
// time by scripts/inject-build-version.mjs from package.json) already sets before either script
// ever runs.
export function appVersionLabel(){const match=String(document.title||'').match(/Alpha\s+([^\s·]+)/);return match?`Alpha ${match[1]}`:'Alpha'}
