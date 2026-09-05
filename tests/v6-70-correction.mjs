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
  assert.match(server,/console\.info\('FamilyTrips Smart Import public page fetch',\{host:current\.hostname,status:response\.status,contentType:type\}\);/,'the main page fetch must log the host, HTTP status and content-type it actually received, before the unsupported_source check that used to be a dead end for investigation');
  console.log('PASS: V6-F70 the public page fetch logs host/status/content-type, closing the observability gap that blocked this investigation');
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
  // This fix is observability-only -- confirms the fail-open default (return, not throw, when
  // robots.txt is unreachable or empty) was NOT changed to fail-closed as part of this
  // investigation, since that is an explicit product decision still awaiting the Product Owner,
  // not something to decide unilaterally.
  assert.match(server,/console\.info\('FamilyTrips Smart Import robots\.txt check',\{host:url\.hostname,outcome:'fetch_error',error:String\(error\?\.message\|\|error\)\}\);\n    return;/,'a robots.txt fetch error must still fail OPEN (return, allowing the main fetch to proceed) after logging -- this investigation only added visibility, it did not change the fail-open/fail-closed policy, which remains an open product decision');
  console.log('PASS: V6-F70 the fail-open default for an unreachable/empty robots.txt is unchanged -- logging added, policy not altered unilaterally');
}

test_V6_F70_public_page_fetch_logs_host_status_and_content_type();
test_V6_F70_robots_check_logs_outcome_for_every_case();
test_V6_F70_fail_open_behavior_is_unchanged();
console.log('ALL PASS: V6-F70 public-URL fetch path now logs enough (host/status/content-type/robots verdict) for a future investigation to attribute a failure to a specific site without needing a code change first');
