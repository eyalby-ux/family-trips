# Executable Test Session — Authoring Standard

Status: Required starting with Alpha 0.4

## Mandatory instruction

Every release guide must say:

> Upload `EXECUTABLE_TEST_SESSION.md` to ChatGPT and ask to begin the test session.

## Purpose

The file is an execution script for ChatGPT, not a form the user completes in advance.

## Priority

1. ChatGPT performs every test it can complete independently.
2. The user performs only device, browser, terminal, account, or physical-interaction tests unavailable to ChatGPT.
3. Tests run one at a time.
4. Each result is recorded as PASS, FAIL, BLOCKED, or PASS-WITH-LIMITATION.
5. A unified final report is produced.

## Required fields

- ID
- Title
- Executor: `ASSISTANT`, `USER`, or `ASSISTANT_THEN_USER`
- Instruction
- Expected
- Pass criteria
- Fail criteria
- Evidence
- Blocking
- Next on pass
- Next on fail

## Assistant behavior

For `ASSISTANT` tests, perform the check first and report evidence.

For `USER` tests, read one instruction, wait for the result, and record it.

For `ASSISTANT_THEN_USER` tests, complete the accessible portion first and ask only for the remaining device-specific verification.