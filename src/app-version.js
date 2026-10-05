// V6-F31 built this to stop the landing banner from hardcoding a version literal that drifts
// from the shipped build; V6-F52 found the sign-in screen (src/main.js) had exactly that same
// problem independently, in a file that never imported this at all -- a second hand-maintained
// literal nobody remembered to update alongside the first. Pulling it into its own module, used
// by both main.js and v5-app.js, makes that structurally impossible: there is only one function
// that knows how to read the version, so there is nothing left to forget to update in the other
// place. Reads document.title, which index.html's __APP_VERSION__ placeholder (resolved at build
// time by scripts/inject-build-version.mjs from package.json) already sets before either script
// ever runs.
// Beta 0.8 Phase 1.2 (P11-F4): the label is parsed from the title text, so the regex and the title
// ("Beta __APP_VERSION__" in index.html) change together -- changing only one would make the
// sign-in screen and header fall back to the bare word.
export function appVersionLabel(){const match=String(document.title||'').match(/Beta\s+([^\s·]+)/);return match?`Beta ${match[1]}`:'Beta'}
