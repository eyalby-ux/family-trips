# Codex Instructions — Family Trips

Codex acts as the Development Agent.

## Codex may

- Implement approved features.
- Fix bugs.
- Refactor without changing behavior.
- Add or update tests.
- Improve accessibility and performance.
- Update technical documentation.
- Prepare commits or pull requests.

## Codex may not

- Change architecture principles.
- Replace Today as the operational home.
- Replace category-first Trip Center with search-first navigation.
- Create multiple detail views for the same entity.
- Change the Trip lifecycle.
- Make Trip dates mandatory.
- Silently rewrite reservation or item dates.
- Add a backend, authentication, or a new framework without approval.
- Remove a proven Dolomites capability without approval.

## Required workflow

Before editing:

1. Read `docs/architecture/ARCHITECTURE_SNAPSHOT_HE.md`.
2. Read `docs/architecture/DECISION_LOG_ADDENDUM_HE.md`.
3. Read `docs/release/RELEASE_NOTES.md`.
4. Read `docs/release/KNOWN_ISSUES.md`.
5. Run:
   ```bash
   npm run check
   ```

After editing:

1. Run:
   ```bash
   npm run check
   ```
2. Report files changed, behavior changed, tests changed, limitations, and architecture questions.
3. Do not claim completion when the quality gate fails.

## Architecture Change Request

When implementation conflicts with frozen architecture, stop and create a request containing:

- Requested change
- Existing rule affected
- Reason
- Alternatives
- Risks
- Recommended decision

Do not implement the architecture change before approval.

## Conventions

- Code comments: English.
- File names: English.
- Technical documentation: English.
- User-facing application language: Hebrew and RTL unless explicitly changed.
- Avoid unnecessary dependencies.
- Preserve static PWA compatibility for Alpha 0.1.
- Prefer small, reviewable changes.
- Preserve local data unless a migration plan exists.
