# FamilyTrips V6 / Alpha 0.6.3 Executable Test Session

Document revision: `V124`  
Date: 2026-08-15  
Candidate: Alpha 0.6.3 deterministic Netlify environment reset of Hotel-first Smart Import  
Baseline: accepted Production Alpha 0.5.6  
Status: **READY FOR PRODUCT OWNER EXECUTION — Production deployment is prohibited before GO**

## Change history

| Revision | Date | Phase | Change |
| --- | --- | --- | --- |
| V120 | 2026-08-12 | Alpha 0.5.6 closure | Recorded focused GO, exact no-build Production promotion, sign-in PASS and accepted empty local/data baseline. |
| V121 | 2026-08-14 | Alpha 0.6.0 QA | Opens the Hotel-first Smart Import acceptance session after the V11/V13 measured gate passed; adds server configuration, PDF/image/public-URL, protected-URL, review-first, original-source, place-validation, existing-item attachment and regression tests. |
| V122 | 2026-08-15 | Alpha 0.6.1 fixed-QA correction | Records `V6-F01`: Google sign-in was blocked because the 0.6.0 version-specific alias was not authorized. Requires the fixed general QA host and dedicated deployment helper, then retains the unchanged V121 Smart Import acceptance matrix. |
| V123 | 2026-08-15 | Alpha 0.6.2 environment correction | Records `V6-F02`: 0.6.1 configuration stopped when Netlify CLI rejected simultaneous context/scope updates for an existing variable. Adds inventory-based new/existing paths, non-interactive overwrite, mandatory owner retention and the Paola invitation default. |
| V124 | 2026-08-15 | Alpha 0.6.3 deterministic environment reset | Records `V6-F03`: 0.6.2 inventory detection missed the existing variable and repeated the forbidden combined update. Replaces detection with remove-then-recreate for four QA-only Function values and accepts the installed 0.6.2 handoff. |

## Finding carried into this session

| ID | Observed behavior | 0.6.3 required result | Status |
| --- | --- | --- | --- |
| V6-F01 | Google sign-in on `v6-0-6-0-test--familytripz.netlify.app` failed with Firebase `auth/requests-from-referer-...-are-blocked` because the per-version host was not authorized. | Deploy only to the already authorized fixed host `qa--familytripz.netlify.app`; Google sign-in succeeds with no OAuth/referrer console error. | Open until Test 1 PASS. |
| V6-F02 | `configure_V6_0_6_1.ps1` failed on the existing Places key with `Setting the context and scope at the same time on an existing env var is not allowed`. Entering only an additional email would also replace the owner allowlist value. | Existing variables update value/contexts without changing scope; new variables create Functions scope and QA contexts; configuration completes without an overwrite prompt; `eyalby@gmail.com` and `paolakohan@gmail.com` are both active. | Open until Test 0.2 PASS. |
| V6-F03 | `configure_V6_0_6_2.ps1` did not recognize the existing Places variable in Netlify CLI inventory output and again attempted to set scope and contexts together. | Configuration does not parse variable inventory: it removes and immediately recreates all four Alpha 0.6 QA values with Functions scope in `deploy-preview` and `branch-deploy`, then prints PASS without deploying. | Open until Test 0.2 PASS. |

## Session rules

- ChatGPT presents one numbered test at a time. The Product Owner performs only that test and reports the observed result or a screenshot.
- Do not repair, rebuild, reinstall or redeploy during this session. A changed artifact invalidates later evidence until a new controlled session is issued.
- Test only `https://qa--familytripz.netlify.app`. Do not create or use a version-specific alias. Alpha 0.5.6 stays live in Production until explicit final GO.
- Do not paste API keys, tokens or private credentials into chat, screenshots, Git or app fields.
- Every Smart Import result is a proposal. Review and explicit approval are mandatory before structured Hotel data changes.
- Stop immediately only for unauthorized data exposure, credential capture, irreversible data loss or an unexpected Production change. Other findings are recorded and testing continues.

## Test material

Have these controlled cases available locally:

- H-001: `Confirmation_for_Booking_ Ban Ta Khun(1).pdf`;
- H-002: `Confirmation1819-1.pdf`;
- H-003: `Panvaree_Hotel_booking.png`;
- H-004: `https://www.panvaree.com/`;
- H-005: the previously frozen Booking.com reservation-management URL that requires login/session access.

Use a dedicated QA Google Places key. The deleted V13 spike key must not be restored or reused.

## 0. Install, configure and deploy the exact candidate

### 0.1 Install

From the extracted package directory:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
```

Expected result:

- installer detects version 0.6.0, 0.6.1 or 0.6.2 on the existing `version/V6` branch;
- package checksums pass;
- `npm ci`, syntax checks, all automated suites and Vite Production build pass;
- installer prints the external backup path and `Installed version: 0.6.3`;
- Production is unchanged.

### 0.2 Configure server-only QA values

Before running the helper, create a Google Cloud API key restricted to **Places API (New)** only and retain the reduced `SearchTextRequest per minute per user` quota of 10. Do not add the key to `.env.local` or any `VITE_` variable.

```powershell
.\scripts\configure_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
```

Expected result:

- helper confirms the linked `familytripz` Netlify site;
- it obtains the Firebase project ID from `.env.local` without printing Firebase secrets;
- it prompts privately for the Places key and for additional invite-only emails, defaulting to `paolakohan@gmail.com`;
- it always merges the Product Owner `eyalby@gmail.com` into the allowlist;
- each of the four Alpha 0.6 QA variables is removed with `--force` and immediately recreated with Functions scope and both QA contexts; no inventory parsing or interactive overwrite prompt is used;
- `FAMILYTRIPS_GOOGLE_PLACES_API_KEY`, `FAMILYTRIPS_ALLOWED_EMAILS`, `FAMILYTRIPS_FIREBASE_PROJECT_ID` and `FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA` are scoped to Netlify Functions in Deploy Preview and Branch Deploy contexts;
- helper prints PASS and the active list `eyalby@gmail.com,paolakohan@gmail.com`;
- no server secret appears in Git, `dist`, browser source or a `VITE_` variable.

### 0.3 Deploy the exact no-build artifact

```powershell
.\scripts\deploy_QA_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
```

PASS when the deploy command uses `--alias qa --no-build`, the stable URL is exactly `https://qa--familytripz.netlify.app`, and no version-specific alias is created. Record the deploy ID and use only the fixed QA URL for all tests below.

## 1. Identity and access boundary

Open `https://qa--familytripz.netlify.app` in a clean desktop browser profile.

PASS when:

- login screen visibly says `Alpha 0.6.3`;
- Google sign-in succeeds for the invited verified email;
- the browser console does not report `auth/requests-from-referer-...-are-blocked` or an unauthorized OAuth domain;
- the disclosure explains that paid analysis is explicit and originals remain separate;
- a non-invited verified account cannot invoke Smart Import even if it can reach browser assets;
- no key or token is visible in DevTools source/network response bodies.

## 2. Save-only is independent of AI

Choose Add → PDF, select H-001 and choose **Save source only**.

PASS when:

- the original appears in Documents/Intake with `saved_only` state;
- no suggestion or Hotel is created;
- no AI-analysis success/cost message appears;
- the original opens locally;
- a later explicit analysis action remains available.

## 3. H-001 PDF extraction and evidence review

Analyze the saved H-001 source. Do not approve immediately.

PASS when the proposal:

- is titled `Panvaree Resort`, not a generic park/dam/region label;
- shows both booking identifiers, arrival/departure dates, Hotel phone, occupancy/room data, payment/cancellation text and every operational note present in the document;
- does not invent check-in/check-out times, email or official website when absent from the source;
- keeps raw and normalized phone interpretations reviewable;
- shows evidence for every value, including important/other values without a dedicated field;
- displays Location as `Panvaree Resort` after a strong place match;
- retains the resolved address, Google place ID, coordinates and Maps URI as separate canonical metadata;
- does not select `Panvaree The Greenery`, Khao Sok park or Ratchaprapha Dam as the Hotel;
- changes no final Hotel data before explicit approval.

## 4. Approve H-001 and reopen the original

Review the draft, make no deliberate correction, approve it once, reopen the Hotel and then open its original source.

PASS when:

- one Hotel/stay is created;
- all approved structured values and notes persist after refresh;
- the original PDF opens from the Hotel's Documents/Tickets area;
- the place action uses validated canonical metadata while the displayed Location remains `Panvaree Resort`;
- no duplicate proposal remains active.

## 5. H-002 mixed RTL/LTR PDF

Analyze H-002 as a new PDF source and review without approving.

PASS when:

- the meaningful Hotel title is correct;
- Hebrew/English label-value relationships, dates, times, contacts, prices and operational text are not reversed or attached to the wrong field;
- missing property address/location is not replaced with guest/recipient data;
- the exact Hotel name remains the Location fallback if place validation cannot safely complete;
- all uncertain/conflicting fields are visible as `needs_review`, not omitted or guessed.

## 6. H-003 raster companion and duplicate safety

From the existing Panvaree Hotel, choose Add document → Attach and extract, select H-003 and review the proposal.

PASS when:

- the image is attached to the same Hotel;
- OCR preserves both booking numbers, phone, visible dates, room count/status and partial address evidence;
- uncertain raster dates remain marked for review;
- the proposal targets the existing Hotel and does not create a second Panvaree Hotel;
- Cancel leaves the existing Hotel unchanged and preserves the source;
- repeating Attach and extract and explicitly approving merges reviewed values into the same Hotel only.

## 7. H-004 bounded public official URL

Choose Add → Link, enter `https://www.panvaree.com/` and choose Analyze and propose.

PASS when:

- server retrieves public readable content and creates a Hotel proposal with source-linked official identity/contact/location/arrival evidence;
- missing booking reference remains absent because this is an official Hotel site, not a reservation;
- no unrestricted search or unrelated page content appears;
- one place lookup at most is used;
- the proposal is not applied until approval;
- cancel preserves the URL source without creating a Hotel.

## 8. H-005 protected booking URL

Analyze the frozen login/session-required Booking.com URL.

PASS when:

- the app reports that access or another source is required;
- it never asks for Booking.com credentials, cookies or session transfer;
- it creates no Hotel, no enrichment and no fabricated proposal;
- the URL remains available as a saved source with retry/recovery options such as PDF, image, manual or QR;
- the failed attempt does not expose server internals or secrets.

## 9. Existing-Hotel Attach only

Open any existing Hotel, choose Add document → Attach only and attach a supported local file.

PASS when:

- the original is linked and opens from the same Hotel;
- no AI request, proposal, cost or structured-field mutation occurs;
- refresh preserves the Hotel and attachment relationship.

## 10. Invitation, quota and ownership enforcement

Perform these checks without modifying Production:

1. With an invited owner, analysis works until the configured daily quota permits it.
2. A request for an unregistered/foreign Trip ID is rejected server-side.
3. A non-invited verified user is rejected before source analysis.
4. If the Product Owner temporarily removes an email from the QA allowlist and redeploys the same artifact, subsequent AI access is blocked immediately. Restore the QA value afterward without changing code.

PASS when source bytes are not processed for rejected callers and no extracted content appears in audit metadata.

## 11. Offline and accepted 0.5.6 regression

With at least one saved source and Hotel already present:

- load the app online, close it, disable connectivity and cold-start the installed PWA;
- open locally retained Hotel/source data;
- confirm manual add and validated QR/JSON remain available and unchanged;
- confirm analysis/public URL actions clearly require network and do not create partial items;
- restore connectivity and confirm recovery;
- verify the accepted start/end Trip-range boundary behavior still marks an item whose end exceeds the Trip end.

## 12. Desktop/phone consistency

Open the same exact QA deploy on the phone using the invited account and repeat the H-001 proposal review plus one existing-Hotel Attach only action.

PASS when the same Hotel fields, evidence, review state and attachment actions are usable on phone. Alpha 0.6 does not claim full cross-device source/data synchronization; this step verifies responsive behavior on the same release, not synchronized persistence.

## 13. Final decision

Record:

- fixed QA URL and deploy ID;
- desktop and phone results for tests 1–12;
- every finding with observed/expected behavior and screenshot where useful;
- measured Smart Import latency/cost shown by the app for H-001/H-004;
- final Product Owner **GO** or **NO-GO**.

GO requires all security/privacy/safe-failure/review-before-apply/original-source/ownership tests to pass. A completeness issue may be assessed only with its source evidence visible; missing source-present dates/times, Hotel identity, phone, booking number, important instruction or meaningful title is a release blocker. Production deployment is a separate explicit step after GO and must reuse the exact accepted `dist` and Functions without a rebuild.

## Rollback

If the candidate is rejected locally, use the exact backup path printed by the installer:

```powershell
.\scripts\rollback_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository" -BackupPath "C:\Projects\FamilyTrips\family-trips-backups\v6-0.6.3-env-reset-YYYYMMDD-HHMMSS"
```

QA environment values can then be removed with the configuration helper's `-Remove` switch. Neither rollback nor QA cleanup modifies the Google Cloud key itself; disable or delete that key in Google Cloud if the candidate is rejected.
