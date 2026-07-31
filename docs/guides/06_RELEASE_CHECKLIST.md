# 06 — Alpha 0.3 Foundation Release Checklist

## Goal

Record the final GO or NO-GO decision.

A release is not complete until every required item below is checked.

## Installation

- [ ] Windows prerequisites verified
- [ ] repository began from clean `main`
- [ ] `main` was pulled
- [ ] `archive/alpha-0.2.1-before-vite` exists locally
- [ ] archive branch exists on GitHub
- [ ] package copied with `.git` protected
- [ ] `robocopy` exit code was 0–7
- [ ] dependencies installed

## Quality gate

- [ ] `npm run check` passed
- [ ] smoke tests passed
- [ ] Vite production build passed
- [ ] `dist/index.html` exists
- [ ] local preview loaded
- [ ] no blocking browser Console errors

## Firebase Authentication

- [ ] Google sign-in passed locally
- [ ] session survived refresh
- [ ] session survived tab close and reopen
- [ ] sign-out passed
- [ ] second sign-in passed
- [ ] existing local Trip remained available
- [ ] Firestore remains deny-all
- [ ] Storage remains deny-all

## Git and GitHub

- [ ] release commit created
- [ ] release commit pushed to `main`
- [ ] GitHub displays the expected commit
- [ ] recorded commit SHA:

```text
________________________________________
```

## Netlify

- [ ] production branch is `main`
- [ ] build command is `npm run build`
- [ ] publish directory is `dist`
- [ ] production deploy passed
- [ ] deploy used the recorded commit SHA

## Production

- [ ] production site loads
- [ ] production Google sign-in passed
- [ ] production sign-out passed
- [ ] production session persistence passed
- [ ] current Service Worker controls the page
- [ ] Android Chrome test passed
- [ ] installed PWA test passed
- [ ] no silent local-data deletion occurred

## Scope control

- [ ] no Firestore sharing feature was accepted as part of Foundation
- [ ] no Storage document feature was accepted as part of Foundation
- [ ] `ELAL_flight_booking_screenshot.png` classification issue is recorded for Alpha 0.4, not patched in 0.3
- [ ] only the 0.2.1-to-0.3 upgrade guide is included

## Final decision

Select one:

```text
[ ] GO — Alpha 0.3 Foundation accepted
[ ] NO-GO — rollback or correction required
```

Decision date:

```text
________________________________________
```

Notes:

```text
________________________________________
________________________________________
________________________________________
```

## When GO is selected

Alpha 0.3 Foundation is the verified technical baseline for the remaining Alpha 0.3 implementation.

Do not describe Shared Trips, Participants, document ownership, Firestore synchronization, or Storage upload as complete until implemented and tested separately.

## When NO-GO is selected

Open:

`docs/guides/07_ROLLBACK.md`
