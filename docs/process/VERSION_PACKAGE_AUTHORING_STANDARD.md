# VERSION_PACKAGE_AUTHORING_STANDARD

Status: Mandatory project process  
Version naming: `V1`, `V2`, `V3`, `V4`, and so on

## Responsibility split

The development phase is performed by ChatGPT / the Development Agent without step-by-step user participation.

ChatGPT / Development Agent must:

- implement the approved version scope;
- update code, tests, release documents, and the authoritative delivery plan;
- run every automated or tool-accessible check;
- create one installable version package;
- provide one installer and one rollback path;
- record all technical evidence.

The Product Owner must only:

- install the completed package;
- perform user-only acceptance tests presented one at a time;
- report real behavior;
- approve trade-offs and GO / NO-GO.

The user must not manually edit code, apply patches, fill release records, or participate in implementation slices unless an explicit architecture decision requires Product Owner approval.

## Complete lifecycle

1. verify `main` and the accepted previous version;
2. verify environment and quality gate;
3. create the version branch;
4. Development Agent implements the complete approved scope;
5. Development Agent updates tests and documents;
6. Development Agent builds the installation package;
7. Product Owner installs the completed package;
8. ChatGPT runs the executable acceptance session, one user test at a time;
9. classify and assign every finding;
10. deploy and close;
11. merge or PR back to `main`;
12. update the authoritative delivery plan.

## Package content

Every package contains:

- changed application files;
- automated tests;
- `docs/process/VERSION_PACKAGE_AUTHORING_STANDARD.md`;
- `docs/versions/<VERSION>/` lifecycle documents;
- the approved delivery plan under `docs/roadmap/`;
- a single installation script;
- a rollback script;
- an executable test session.

## No manual records

Dates, SHAs, branch state, environment verification, test results, deploy IDs, findings, and decisions are assistant-recorded. The user never maintains placeholders manually.

## Version naming

Use `V1`, `V2`, `V3`, `V4`, and so on. For V4:

- package: `FAMILY_TRIPS_V4_RELEASE.zip`
- branch: `version/V4`
- docs: `docs/versions/V4/`

## Source of truth

The approved delivery plan is the only scope and roadmap source. It must be included in every future release package.

## Closure

A version is not closed while accepted work exists only on the version branch. Closure must return accepted work to `main`, record the final SHA, verify production, and update all future versions in the approved delivery plan.
