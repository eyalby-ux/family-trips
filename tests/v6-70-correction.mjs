import assert from 'node:assert/strict';
import fs from 'node:fs';

// V6-F70: a real ticket-platform URL (tickets.leaan.net) failed with unsupported_source ("The
// URL did not return an HTML page") instead of the robots_disallowed safe-failure this exact
// platform was already documented (ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md V4) as expected
// to produce -- its robots.txt genuinely disallows /ticket/, confirmed independently from this
// environment (direct fetch, matching the exact FamilyTrips-SmartImport/0.6 user-agent), and the
// site is confirmed to run behind Cloudflare (Server: cloudflare, CF-RAY, cf-cache-status headers
// on both the robots.txt and page responses), the kind of system that commonly treats cloud/
// datacenter IP ranges (Netlify Functions runs on AWS Lambda) and non-browser User-Agents
// differently from a normal browser/residential request -- consistent with, though not fully
// provable without direct visibility into Netlify's own outbound response, the Product Owner's
// leading hypothesis that assertRobotsAllowed's own robots.txt fetch received something different
// there than it did from this investigation's own vantage point, silently failing open via its
// existing catch{return}/if(!robotsText)return fallback.
//
// Root cause of why this couldn't be confirmed definitively: this exact call site had NO logging
// of its own at all -- Netlify's function logs (pulled directly via `netlify logs --source
// functions --function smart-import`) showed only a generic Duration/error summary with no
// per-request host, so a robots_disallowed error found in the same log window could not be
// attributed to this specific URL versus any other one tested in the same session. Fixed by
// adding one bounded log line (host + status + content-type, never the full page body) at both
// the robots.txt check and the main page fetch, in netlify/functions/smart-import.mjs -- this is
// an observability fix only, not a behavior change: assertRobotsAllowed's fail-open default when
// robots.txt is unreachable is UNCHANGED, since whether it should fail closed instead is an
// explicit product decision flagged back to the Product Owner, not decided here.
//
// netlify/functions/smart-import.mjs can be imported directly under this project's plain-Node
// test harness (unlike src/smart-import-client.js -- it has no firebase.js/import.meta.env
// dependency), and an existing test (test_activity_url_scope_and_robots_disallowed,
// tests/v6-6-attraction-event-import.mjs) already source-inspects parts of this same file for
// exactly that reason -- this test follows the same established pattern for the new logging lines
// specifically, since exercising the real network-dependent fetchPublicPage/assertRobotsAllowed
// functions (neither of which is exported) would require either live network access (flaky, not
// suitable for a regression suite) or a mocking framework this project's minimal test harness
// does not have.
function test_V6_F70_public_page_fetch_logs_host_status_and_content_type(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/console\.info\('FamilyTrips Smart Import public page fetch',\{host:current\.hostname,status:response\.status,contentType:type,robotsCheck\}\);/,'the main page fetch must log the host, HTTP status, content-type AND the robots-check outcome it actually received, before the unsupported_source check that used to be a dead end for investigation');
  console.log('PASS: V6-F70 the public page fetch logs host/status/content-type/robotsCheck, closing the observability gap that blocked this investigation');
}
function test_V6_F70_robots_check_logs_outcome_for_every_case(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,outcome:'fetch_error',error:String\(error\?\.message\|\|error\)\}\);/,'a robots.txt fetch that errors (network failure, timeout) must be logged, not silently swallowed');
  assert.match(server,/console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,outcome:'empty_or_not_ok',status\}\);/,'a robots.txt fetch that returns a non-ok status or an empty body must be logged with the actual status received');
  assert.match(server,/console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,pathname:url\.pathname,status,disallowed,bodySnippet:robotsText\.slice\(0,200\)\}\);/,'a successfully-parsed robots.txt check must log its disallowed verdict and a bounded body snippet, so a future investigation can see WHY it did or did not match without needing a code change first');
  console.log('PASS: V6-F70 every robots.txt check outcome (fetch error, non-ok/empty, or parsed) is now logged, not just the ones that end in a thrown robots_disallowed error');
}
function test_V6_F70_fail_open_behavior_is_unchanged(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  // This fix is observability-only at the robots-check level -- confirms fetching is still
  // ATTEMPTED (never blocked) when robots.txt is unreachable or empty; assertRobotsAllowed now
  // returns 'unverifiable' instead of silently returning undefined, but it still does not throw
  // for either case, so the caller always proceeds to the real fetch regardless.
  assert.match(server,/console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,outcome:'fetch_error',error:String\(error\?\.message\|\|error\)\}\);\n    return 'unverifiable';/,'a robots.txt fetch error must still fail OPEN (proceed to the real fetch) after logging -- it now returns \'unverifiable\' instead of undefined, but does not throw');
  assert.match(server,/if\(!robotsText\)\{console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,outcome:'empty_or_not_ok',status\}\);return 'unverifiable'\}/,'an empty or non-ok robots.txt response must also still fail open (return \'unverifiable\', not throw)');
  console.log('PASS: V6-F70 the fail-open default for an unreachable/empty robots.txt is unchanged -- fetching is still attempted either way, only the caller\'s visibility into WHY changed');
}

// V6-F70 (Product Owner decision, second pass): a third, honestly-distinct outcome -- when
// robots.txt could NOT be verified (fetch error, non-ok, or empty) and the subsequent page fetch
// ALSO fails or comes back non-HTML, the user must see a message that says the real reason
// (couldn't confirm this site allows automated access), not the generic content-type/access
// message that would otherwise misleadingly imply nothing about robots.txt was ever in question.
// These three tests distinguish all three possible outcomes explicitly, so a future change to any
// one of them cannot silently blur into another.
function test_V6_F70_verified_allowed_keeps_original_generic_messages_on_later_failure(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  // Outcome 1 (verified-allowed success path, later genuine failure): when robots.txt WAS
  // actively verified as allowing access, a later HTTP failure or non-HTML content type must
  // still produce the ORIGINAL, unchanged codes/messages -- a real PDF-serving URL (verified
  // robots.txt, genuinely not HTML) must not be misreported as a robots-verification problem it
  // never had.
  assert.match(server,/robotsCheck===\s*'unverifiable'\?'robots_unverifiable':'protected_or_private_url'/,'when robots.txt was actively verified (not unverifiable), an HTTP failure on the main fetch must keep the original protected_or_private_url code');
  assert.match(server,/robotsCheck===\s*'unverifiable'\?'robots_unverifiable':'unsupported_source'/,'when robots.txt was actively verified (not unverifiable), a non-HTML content type must keep the original unsupported_source code -- a genuinely wrong file type is not a robots-verification problem');
  console.log('PASS: V6-F70 outcome 1/3 -- a verified-allowed site\'s later genuine failure still gets the original, unchanged generic message');
}
function test_V6_F70_robots_disallowed_still_thrown_unchanged(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  // Outcome 2/3: a CONFIRMED robots.txt block is unaffected by this change -- still thrown
  // directly from assertRobotsAllowed, before the main fetch is even attempted, exactly as before.
  assert.match(server,/if\(disallowed\)throw httpError\(422,'robots_disallowed',`This site's robots\.txt disallows automated access to this page\.`\);/,'a confirmed robots.txt block must still throw robots_disallowed directly, unaffected by the new unverifiable-outcome handling');
  assert.match(server,/return 'verified';/,'assertRobotsAllowed must return \'verified\' for the one case where robots.txt was actually fetched, parsed, and did not disallow the path');
  console.log('PASS: V6-F70 outcome 2/3 -- a confirmed robots.txt block is unaffected, still thrown directly and immediately');
}
function test_V6_F70_unverifiable_then_failed_surfaces_honest_message(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  // Outcome 3/3: the new case this whole fix exists for -- robots.txt couldn't be verified AND
  // the real fetch afterward also failed or came back non-HTML.
  // V6-F71 correction pass: this constant's own text is now plain English again (matching every
  // other httpError message in this file) -- the actual Hebrew the user sees now comes from
  // resolveSmartImportErrorMessage's dictionary (src/operational-data.js), consulted by the CODE
  // 'robots_unverifiable' this constant is paired with, not from this string's own content. What
  // still matters here is that one single shared constant exists and is used consistently by both
  // failure sites, so the code (which drives the Hebrew dictionary lookup) is right either way.
  assert.match(server,/const ROBOTS_UNVERIFIABLE_MESSAGE=`Could not verify whether this site's robots\.txt allows automated access, and the page fetch also failed\.`;/,'a single shared message constant must exist for the unverifiable-then-failed outcome, used consistently by both failure sites (HTTP failure and non-HTML content type)');
  assert.match(server,/robotsCheck==='unverifiable'\?ROBOTS_UNVERIFIABLE_MESSAGE:`Public page returned HTTP \$\{response\.status\}\.`/,'an HTTP failure following an unverifiable robots.txt check must surface the honest robots_unverifiable message, not the generic HTTP-status one');
  assert.match(server,/robotsCheck==='unverifiable'\?ROBOTS_UNVERIFIABLE_MESSAGE:'The URL did not return an HTML page\.'/,'a non-HTML content type following an unverifiable robots.txt check must surface the honest robots_unverifiable message, not the generic "not an HTML page" one -- this is the exact tickets.leaan.net scenario this investigation could not rule out');
  console.log('PASS: V6-F70 outcome 3/3 -- an unverifiable robots.txt followed by a genuine fetch failure now surfaces the honest "couldn\'t confirm this site allows automated access" reason, not a misleading generic one');
}
// V6-F71 correction pass: this test originally only confirmed the dictionary entry's mere
// existence in src/smart-import-client.js -- exactly the shallow check that let the precedence
// bug (V6-F71) go unnoticed for robots_disallowed. Superseded by tests/v6-71-correction.mjs,
// which executes the real resolution function (now resolveSmartImportErrorMessage,
// src/operational-data.js, moved there specifically so it CAN be executed rather than merely
// source-inspected) and asserts on the actual resolved/displayed text for all three codes.
function test_V6_F70_client_error_message_dict_has_robots_unverifiable_entry(){
  const operationalData=fs.readFileSync(new URL('../src/operational-data.js',import.meta.url),'utf8');
  assert.match(operationalData,/robots_unverifiable:'לא ניתן היה לאמת מראש שהאתר מתיר גישה אוטומטית \(robots\.txt\), וניתוח הדף נכשל\./,'the shared error-message dictionary (src/operational-data.js) must have an entry for robots_unverifiable alongside the existing robots_disallowed one -- see tests/v6-71-correction.mjs for the executed, displayed-text-level proof this is actually reachable, not just present');
  console.log('PASS: V6-F70 the shared error-message dictionary has a robots_unverifiable entry alongside robots_disallowed');
}

test_V6_F70_public_page_fetch_logs_host_status_and_content_type();
test_V6_F70_robots_check_logs_outcome_for_every_case();
test_V6_F70_fail_open_behavior_is_unchanged();
test_V6_F70_verified_allowed_keeps_original_generic_messages_on_later_failure();
test_V6_F70_robots_disallowed_still_thrown_unchanged();
test_V6_F70_unverifiable_then_failed_surfaces_honest_message();
test_V6_F70_client_error_message_dict_has_robots_unverifiable_entry();
console.log('ALL PASS: V6-F70 public-URL fetch path now logs enough to attribute a failure to a specific site, and honestly distinguishes verified-allowed/robots_disallowed/robots_unverifiable outcomes without changing the fail-open default');
