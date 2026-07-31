# Version Package Authoring Standard

Status: **Mandatory project process**  
Applies to: every Alpha, Beta, Release Candidate, patch, and production release package  
Repository: `eyalby-ux/family-trips`

## 1. Purpose

This document defines the single approved method for creating, opening, implementing, testing, deploying, closing, and documenting a Family Trips version.

It exists to prevent:

- version packages being structured differently each time;
- missing prerequisites such as local environment variables;
- duplicated or conflicting instructions;
- branch creation being treated as an external chat instruction;
- testing and closing steps being added after implementation;
- roadmap findings being recorded without a target version;
- competing scope or future-version documents;
- release closure that does not update the authoritative delivery plan.

A version package is complete only when it covers the entire lifecycle from baseline verification through roadmap update after closure.

## 2. Sources of truth

### 2.1 Product scope and future versions

Use the approved delivery-plan document as the single authoritative source for:

- version goals;
- included and excluded scope;
- sequencing;
- release blockers;
- future versions;
- backlog assignment.

For the current project, this is the approved `FAMILY_TRIPS_THAILAND_MVP_DELIVERY_PLAN_v3.md`, or its formally approved successor.

Do not create a separate scope, roadmap, milestone plan, or future-versions document when the approved delivery plan already covers the subject.

### 2.2 Repository state

GitHub `main` is the source of truth for accepted code and accepted process documentation.

### 2.3 Production state

The recorded production deployment and its tested commit SHA are the source of truth for the live release.

### 2.4 Finding records

The final test report, Known Issues, and the authoritative delivery plan must agree on every unresolved finding.

## 3. Package-generation prerequisites

Before generating a version package, the author must have:

- the approved delivery plan available in full;
- the repository and production identifiers;
- the accepted prior-version closing SHA;
- the target version number and approved title;
- the required branch convention;
- the current build, test, deployment, and rollback commands;
- the required local and hosted environment-variable names;
- known findings already assigned to the target version;
- confirmation of which actions ChatGPT can perform independently.

If any item is missing, do not guess. Mark the package generation as blocked until the authoritative information is supplied or verified.

## 4. Mandatory package structure

Each version package must use this structure unless the approved development-process standard requires a stricter structure:

```text
<version-package>/
  START_HERE.md
  01_OPEN_VERSION.md
  02_IMPLEMENT.md
  03_VERIFY.md
  04_DEPLOY.md
  EXECUTABLE_TEST_SESSION.md
  05_CLOSE_VERSION.md
  06_ROLLBACK.md
  KNOWN_ISSUES_TEMPLATE.md
  TEST_RESULTS_TEMPLATE.md
  RELEASE_NOTES_TEMPLATE.md
```

Optional scripts and fixtures may be added under:

```text
scripts/
fixtures/
```

Scripts are internal helpers only. They must not replace the documented process, and they must be invoked from the appropriate package document.

## 5. Document responsibilities and anti-duplication rules

### 5.1 `START_HERE.md`

Contains only:

- the source-of-truth declaration;
- the mandatory ordered sequence;
- entry and stop conditions;
- links to the other package documents.

It must not repeat implementation details, full test cases, deployment procedures, or rollback steps.

### 5.2 `01_OPEN_VERSION.md`

Owns:

- prior-release baseline verification;
- clean working-tree verification;
- `main` synchronization;
- dependency installation or validation;
- local secret and environment preparation;
- pre-branch quality gate;
- branch creation and push;
- base SHA recording.

Branch creation must never be supplied as a separate chat-only instruction. It is an integral part of the version package.

### 5.3 `02_IMPLEMENT.md`

Owns:

- scope copied or derived from the approved delivery plan;
- explicit non-scope;
- implementation slices and sequencing;
- acceptance examples and fixtures;
- architecture-review triggers.

It must not expand the approved scope without an explicit product decision and delivery-plan update.

### 5.4 `03_VERIFY.md`

Owns:

- repeatable local checks during implementation;
- automated quality gates;
- regression areas;
- local preview instructions;
- troubleshooting and stop conditions.

It must not duplicate the complete final acceptance session.

### 5.5 `04_DEPLOY.md`

Owns:

- deployment entry criteria;
- preview deployment;
- environment configuration;
- deploy evidence;
- production-promotion criteria;
- post-deploy checks.

### 5.6 `EXECUTABLE_TEST_SESSION.md`

Owns the final coordinated acceptance session.

It is an instruction script for ChatGPT, not a questionnaire that the user fills in before the session.

### 5.7 `05_CLOSE_VERSION.md`

Owns:

- final GO / NO-GO decision;
- result aggregation;
- finding disposition;
- Release Notes, Known Issues, and final-test-report updates;
- closing commit;
- pull request or merge;
- closing SHA and production deployment recording;
- mandatory future-version delivery-plan update.

Version closure is incomplete until the authoritative future-versions document is updated.

### 5.8 `06_ROLLBACK.md`

Owns rollback triggers and recovery only.

It must not repeat the normal verification or deployment path.

## 6. Opening a version

`01_OPEN_VERSION.md` must require the following sequence.

### 6.1 Verify the accepted baseline

Record:

- accepted prior version;
- prior closing commit SHA;
- expected production deployment;
- current `main` HEAD;
- local and remote synchronization state.

### 6.2 Verify repository cleanliness

Required evidence:

```powershell
git status
git rev-parse HEAD
git rev-parse origin/main
```

The process must stop on:

- uncommitted changes;
- unexpected local commits;
- a non-fast-forward update;
- an unverified baseline.

### 6.3 Verify local environment and secrets

The package must list every required variable by name, without values.

For a Vite/Firebase environment, this includes the applicable `VITE_FIREBASE_*` variables.

Before any preview or authentication test, require:

```powershell
Get-ChildItem -Force .env*
Test-Path .env.local
```

If `.env.local` is required and missing:

- stop the process;
- explain how to create it from the approved hosted-environment values;
- never ask the user to paste secrets into chat;
- verify that `.env.local` is ignored by Git;
- verify that no secret value is committed.

The package must not allow the user to reach `npm run preview` with an undocumented empty Firebase configuration.

### 6.4 Run the pre-branch quality gate

Use the repository's actual command, currently:

```powershell
npm run check
```

Do not create the version branch after a failed gate.

### 6.5 Create the version branch

The exact branch name must be specified in the package and derived from the approved version purpose.

Required actions:

```powershell
git switch -c <approved-version-branch>
git push -u origin <approved-version-branch>
git rev-parse HEAD
```

Record:

- branch name;
- base SHA;
- creation date;
- remote verification.

## 7. Implementation-authoring rules

### 7.1 Derive, do not reinvent

For every scope item in `02_IMPLEMENT.md`, identify its approved delivery-plan source.

Do not silently add:

- new product screens;
- cloud features;
- persistence changes;
- architecture changes;
- release-process features as product features;
- unrelated refactors.

A process requirement may be included in the version package without claiming it is a user-facing feature.

### 7.2 Scope traceability

Each implementation slice must state:

- source requirement;
- expected user behavior;
- acceptance criteria;
- required fixture or evidence;
- dependencies;
- out-of-scope boundary;
- tests required before the next slice.

### 7.3 Architecture-review trigger

Stop for explicit review when a change affects:

- authentication or authorization boundaries;
- Firestore or Storage access;
- ownership or sharing;
- migration of local data;
- document retention;
- synchronization;
- destructive changes;
- multiple major screens or navigation structure.

## 8. Verification-authoring rules

### 8.1 Local and continuous verification

`03_VERIFY.md` must include:

- exact commands;
- expected results;
- failure symptoms;
- troubleshooting steps;
- stop conditions;
- regression checks inherited from the accepted prior release.

Do not write a compressed paragraph that merely lists many checks. Each actionable check must tell the operator what to do and how to identify PASS or FAIL.

### 8.2 Test ownership

Every test must have one of these executors:

- `ASSISTANT`
- `USER`
- `ASSISTANT_THEN_USER`

Prefer `ASSISTANT` whenever ChatGPT has access to the required repository, file, status, or public production evidence.

Do not ask the user to manually inspect information that ChatGPT can retrieve reliably.

### 8.3 One test at a time

During the executable session:

- present exactly one user action at a time;
- wait for the result;
- record it;
- do not skip ahead;
- do not repeat already completed tests.

### 8.4 Required test fields

Each test in `EXECUTABLE_TEST_SESSION.md` must define:

- `ID`
- `Title`
- `Executor`
- `Blocking`
- `Instruction`
- `Expected`
- `Pass criteria`
- `Fail criteria`
- `Evidence`
- `Next on pass`
- `Next on fail`

### 8.5 Result states

Allowed states:

- `PASS`
- `FAIL`
- `BLOCKED`
- `PASS-WITH-LIMITATION`

A blocking test may not be converted to PASS merely because the limitation is inconvenient.

## 9. Finding classification and version assignment

Every failed test, regression, limitation, or newly discovered requirement must receive a disposition before closure.

### 9.1 Required classification

Use one of:

- current-version blocker;
- current-version correction;
- patch candidate;
- scheduled Alpha feature;
- Architecture Review;
- Beta refinement;
- Release Candidate requirement;
- post-release backlog;
- accepted known limitation;
- out of scope.

### 9.2 Required record

Record:

- finding ID;
- summary;
- observed behavior;
- expected behavior;
- impact;
- blocking status;
- assigned release or backlog milestone;
- rationale;
- evidence;
- decision owner;
- Known Issues update;
- test-report update;
- authoritative delivery-plan section updated.

### 9.3 Roadmap rule

When a finding is assigned to a future version, update the existing authoritative delivery plan during the same version process.

Do not merely mention the target version in chat or Known Issues.

Do not create a competing roadmap document.

## 10. Deployment-authoring rules

`04_DEPLOY.md` must distinguish:

- local preview;
- branch or preview deployment;
- production promotion.

For each environment, record:

- branch;
- commit SHA;
- build command;
- publish directory;
- environment-variable names and configuration status;
- deploy identifier;
- deployment result;
- Console result;
- asset result;
- Service Worker result where applicable.

Production promotion requires:

- passing quality gate;
- passing preview verification;
- passing final executable session or an explicitly documented staged-production exception;
- no unresolved blocking finding;
- every non-blocking finding assigned and documented.

## 11. Closing a version

`05_CLOSE_VERSION.md` must contain the complete closure workflow.

### 11.1 Required closure inputs

- completed executable test session;
- unified result totals;
- all evidence;
- all finding dispositions;
- tested SHA;
- preview and production deployment identifiers;
- product-owner GO / NO-GO decision.

### 11.2 Required document updates

Update:

- `RELEASE_NOTES.md` or the version-specific release notes;
- `KNOWN_ISSUES.md`;
- final test results;
- release checklist;
- authoritative delivery plan and future-version sections.

### 11.3 Mandatory future-version update

The authoritative delivery plan must record:

- version acceptance status and date;
- base, tested, and closing SHAs;
- capabilities actually accepted;
- approved scope not completed;
- every deferred finding and target version;
- changes to future Alpha, Beta, RC, or backlog scope;
- revised next actions;
- obsolete assumptions that must be removed or corrected.

### 11.4 Git closure

The package must define the approved pull-request or merge process, including:

- final quality gate;
- documentation commit;
- branch push;
- PR or merge;
- `main` update;
- closing SHA;
- clean final working tree;
- production deployment from the recorded commit.

### 11.5 Final decision rule

`GO` is permitted only when:

- every blocking test passes;
- no blocking finding remains;
- every other finding has a disposition and target;
- all closure documents agree;
- the delivery plan is updated;
- the tested and deployed commits are known.

Otherwise the decision is `NO-GO` or closure remains incomplete.

## 12. Rollback-authoring rules

The rollback document must specify:

- objective triggers;
- last accepted release and deployment;
- restoration procedure;
- data-safety precautions;
- evidence collection;
- finding classification and target-version assignment;
- roadmap and Known Issues updates after rollback.

Never rewrite or erase accepted prior-release history.

## 13. Scripts and automation

Scripts may automate repetitive steps, but they must:

- live inside the version package or repository;
- be referenced by the owning document;
- validate preconditions before writing or pushing;
- stop on quality-gate failure;
- avoid printing secrets;
- avoid committing `.env.local` or secret values;
- be safe to rerun or clearly state that they are one-time scripts;
- show the final commit and working-tree status;
- not invent or modify product scope.

Do not distribute an external script and describe it as the version package.

## 14. Package self-review before delivery

Before presenting a generated package, the author must perform a consistency review.

### 14.1 Completeness

Confirm that the package includes:

- opening;
- branch creation;
- local environment setup;
- implementation;
- continuous verification;
- deployment;
- executable final testing;
- finding disposition;
- closure;
- roadmap update;
- rollback.

### 14.2 Relevance

Confirm that every instruction applies to the actual repository, toolchain, version scope, and environment.

Remove generic filler and steps copied from unrelated releases.

### 14.3 No duplication

Confirm that each instruction has one owning document.

Cross-reference instead of copying procedures into multiple files.

### 14.4 No contradictions

Confirm that:

- branch names match everywhere;
- version names match everywhere;
- commands match `package.json` and repository configuration;
- environment-variable names match the code;
- prior and target SHAs are internally consistent;
- deployment instructions match Netlify configuration;
- test ownership is consistent;
- GO criteria match the checklist.

### 14.5 Secret safety

Confirm that:

- no real key or credential is included;
- `.env.local` is documented and ignored;
- hosted variables are named but not exposed;
- screenshots or logs do not reveal secrets.

### 14.6 Source-of-truth integrity

Confirm that the package references the approved delivery plan and does not create a competing scope or roadmap.

## 15. Package approval checklist

A generated version package may be used only when all are checked:

- [ ] approved delivery plan reviewed in full
- [ ] prior accepted release and closing SHA verified
- [ ] package structure matches this standard
- [ ] branch creation is inside `01_OPEN_VERSION.md`
- [ ] local secrets and `.env.local` handling are documented
- [ ] implementation scope is traceable to the delivery plan
- [ ] continuous verification is actionable and not compressed filler
- [ ] `EXECUTABLE_TEST_SESSION.md` is complete
- [ ] Assistant-owned checks are not unnecessarily delegated to the user
- [ ] finding classification and target-version assignment are mandatory
- [ ] closure updates the authoritative future-version plan
- [ ] rollback is included
- [ ] scripts are internal and referenced
- [ ] no duplicated procedures
- [ ] no conflicting branch, command, version, or SHA values
- [ ] no secrets are present
- [ ] the package has been reviewed for relevance and consistency

## 16. Change control for this standard

This standard is a project-level process document.

Changes to it must:

- be committed to `main`;
- explain the process failure or improvement that motivated the change;
- avoid changing an active version package silently;
- be applied to newly generated packages;
- be backported to an active package when the issue could cause incorrect execution, data loss, security exposure, or invalid release closure.

## 17. Immediate application

The current Alpha 0.4 package must be regenerated against this standard before continued execution.

The prior Alpha 0.4 package is not authoritative because it omitted a complete local-environment prerequisite and contained overlapping responsibilities between verification, final testing, and release closure.
