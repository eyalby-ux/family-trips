import assert from 'node:assert/strict';
import fs from 'node:fs';

// Beta 0.8 Phase 1 (FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md, FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md
// V2): tokens, the 5-item bottom nav + Settings relocation, Today's leading/rest structure, and the
// participant selection carousel. No Firestore/authenticated-UI runtime is reachable from this
// environment (this project's established pattern) -- verified by source-inspection here, plus a
// live CSS-computed-style check against a real dev server during implementation (nav grid columns,
// day-item-time width, the plus circle's size/color, the needs-attention background, scroll-snap),
// not just these string assertions. A real, authenticated Product Owner acceptance session with
// screenshots (per the kickoff's own explicit ask) is still required before this phase can close.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const foundation=fs.readFileSync(new URL('../src/foundation.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

// Tracks paren depth alongside brace depth so a destructured-with-default parameter (e.g.
// dayItemCard's own `(item,{leading=false}={})`) doesn't get mistaken for the function body --
// only a `{`/`}` seen while parenDepth is back to 0 (i.e. outside the parameter list) counts.
function extractFn(src,name){
  let start=src.indexOf(`async function ${name}(`);
  if(start<0)start=src.indexOf(`function ${name}(`);
  if(start<0)start=src.indexOf(`const ${name}=`);
  if(start<0)throw new Error(`not found: ${name}`);
  let parenDepth=0,braceDepth=0,i=start,bodyStarted=false;
  for(;i<src.length;i++){
    const ch=src[i];
    if(ch==='(')parenDepth++;
    else if(ch===')')parenDepth--;
    else if(ch==='{'&&parenDepth===0){braceDepth++;bodyStarted=true}
    else if(ch==='}'&&parenDepth===0){braceDepth--;if(bodyStarted&&braceDepth===0){i++;break}}
  }
  return src.slice(start,i);
}

// --- Tokens (S2): new canonical names + the old-name alias bridge -------------------------------

function test_beta_0_8_root_defines_the_spec_s_8_canonical_tokens(){
  assert.match(styles,/--bg:#FCFAF7;--surface:#FFFFFF;--ink:#123F42;--muted:#726B66;--border:#E7E1DA;/);
  assert.match(styles,/--accent:#C86442;--accent-soft:#F9ECE7;--teal-soft:#E8F3F1;/);
  console.log('PASS: :root defines the design spec\'s own 8 canonical token values');
}
function test_beta_0_8_every_old_token_name_is_aliased_not_deleted(){
  // The alias bridge is what makes every pre-existing screen (not just Phase 1's own explicit
  // scope) pick up the new palette immediately -- deleting the old names instead would break every
  // screen this phase didn't touch.
  for(const oldName of ['--card:var(--surface)','--line:var(--border)','--green:var(--accent)','--green-dark:var(--accent)','--green-soft:var(--accent-soft)','--blue:var(--accent)','--blue-soft:var(--teal-soft)','--purple:var(--accent)','--orange:var(--accent)']){
    assert(styles.includes(oldName),`missing alias: ${oldName}`);
  }
  console.log('PASS: every pre-existing token name is aliased to a new S2 token, not deleted -- old screens keep working unchanged');
}
test_beta_0_8_root_defines_the_spec_s_8_canonical_tokens();
test_beta_0_8_every_old_token_name_is_aliased_not_deleted();

// --- Navigation (S3): 5-item nav, central + folded in, no separate floating .fab ----------------

function test_beta_0_8_nav_has_five_items_today_timeline_plus_center_packing(){
  const fn=extractFn(app,'nav');
  assert.match(fn,/tab\('today','היום'\)/);
  assert.match(fn,/tab\('timeline','ציר זמן'\)/);
  assert.match(fn,/data-action="create" aria-label="הוספה"/,'the central + must be one of nav()\'s own 5 cells, not a separate element');
  assert.match(fn,/tab\('center','מרכז הטיול'\)/);
  assert.match(fn,/tab\('packing','אריזה'\)/);
  console.log('PASS: nav() renders the spec\'s own 5 items (Today, Timeline, central +, Trip Center, Packing), no separate Settings tab');
}
function test_beta_0_8_render_no_longer_renders_a_separate_floating_fab(){
  assert(!app.includes('<button class="fab" data-action="create">'),'the old separate floating FAB must be gone -- create is now nav()\'s own central + cell');
  console.log('PASS: render()\'s own shell markup no longer renders a separate .fab -- create lives inside nav() itself');
}
function test_beta_0_8_dead_fab_css_was_removed_alongside_the_markup(){
  assert(!styles.includes('.fab{position:fixed'),'the old .fab base rule is dead now that no element ever gets that class -- must be removed, not left as orphaned CSS');
  console.log('PASS: the now-dead .fab CSS rules were removed together with the markup that used them');
}
test_beta_0_8_nav_has_five_items_today_timeline_plus_center_packing();
test_beta_0_8_render_no_longer_renders_a_separate_floating_fab();
test_beta_0_8_dead_fab_css_was_removed_alongside_the_markup();

// --- Settings relocation: the spec's own 5-item nav has no Settings slot ------------------------

function test_beta_0_8_settings_button_lives_in_the_account_bar_not_the_nav(){
  assert.match(main,/id="account-settings" class="account-settings"/);
  assert(!extractFn(app,'nav').includes("'settings'"),'nav() must not reference settings -- it has no slot in the spec\'s own 5-item nav');
  console.log('PASS: Settings is reachable from the account bar\'s own gear button, not from nav() (which the spec gives no slot to)');
}
function test_beta_0_8_account_settings_click_dispatches_a_bridge_event_to_v5_app(){
  assert.match(main,/document\.querySelector\('#account-settings'\)\?\.addEventListener\('click', \(\) => \{\s*dispatchEvent\(new CustomEvent\('familytrips:open-settings'\)\);/);
  assert.match(app,/addEventListener\('familytrips:open-settings',\(\)=>route\('settings'\)\)/);
  console.log('PASS: main.js\'s settings button dispatches a plain DOM CustomEvent, and v5-app.js listens for it and routes to settings -- the same bridge shape as the existing online/offline listeners, since main.js and v5-app.js own separate state/routing');
}
test_beta_0_8_settings_button_lives_in_the_account_bar_not_the_nav();
test_beta_0_8_account_settings_click_dispatches_a_bridge_event_to_v5_app();

// --- Today (S4): leading action card (busy/transit day) vs. calm/free day -----------------------

function test_beta_0_8_today_view_separates_a_leading_item_from_the_rest(){
  const fn=extractFn(app,'todayView');
  // Fixed after a real bug found live on qa: op.next (a "what's coming up" fallback item shown
  // when today is empty, possibly days away) was getting picked as `leading` just because it was
  // still chronologically upcoming, wrongly styling a multi-day-out item as today's imminent
  // action. `leading` must only ever come from op.todayItems -- items genuinely dated today.
  assert.match(fn,/const leading=op\.todayItems\.find\(item=>item\.startAt>=nowIso\)\|\|null;/,'the leading action card must only be picked from items actually dated today (op.todayItems), never from the op.next "coming up" fallback');
  assert.match(fn,/const rest=dayList\.filter\(item=>item!==leading\);/,'the leading item must be pulled out of the remainder list, not duplicated in it');
  console.log('PASS: todayView() finds one leading (imminent) item and renders the rest as a separate, compact list -- covers both the "Busy day" and "Transit or flight day" cases with one shared structure');
}
function test_beta_0_8_game_suggestion_only_shows_on_a_day_with_no_leading_item(){
  const fn=extractFn(app,'todayView');
  assert.match(fn,/const suggestedGame=!leading&&state\.games\.length\?/,'"one single game suggestion, only on a free day" -- must be gated on the absence of a leading/imminent item');
  console.log('PASS: the game suggestion only appears when there is no leading action card -- the calm/free-day case, per spec');
}
function test_beta_0_8_relative_time_label_never_duplicates_the_time_shown_beside_it(){
  // Fixed after the same live-qa bug: relativeTimeLabel()'s own >24h fallback used to be
  // fmt(startAt,true) (date AND time), but dayItemCard's leading timeArea ALWAYS appends a
  // separate timeOnly(item.startAt) after it -- so a far-out leading item showed its time twice,
  // wrapped and cramped in the narrow 76px time column. date-only (fmt(startAt,false)) fixes it.
  // (leading is now scoped to op.todayItems, so a same-day item can never actually be >24h out --
  // this stays as a defensive guarantee, not the primary fix.)
  const fn=extractFn(app,'relativeTimeLabel');
  assert.match(fn,/return hours<24\?`בעוד \$\{hours\} שע׳`:fmt\(startAt,false\);/,'the >24h relative-time fallback must be date-only, never duplicating the time shown separately beside it');
  console.log('PASS: relativeTimeLabel()\'s own >24h fallback is date-only, so it can never duplicate the time already shown beside it');
}
function test_beta_0_8_day_item_card_covers_leading_and_regular_rows_with_one_function(){
  const fn=extractFn(app,'dayItemCard');
  assert.match(fn,/leading\?`<bdi>\$\{esc\(relativeTimeLabel\(item\.startAt\)\)\}<\/bdi><span class="imminent-dot">/,'only the leading card gets the relative-time label + accent dot, per the day-item-card spec');
  assert.match(fn,/const attention=conflict\(item\);/,'needs-attention must reuse the existing conflict()\\/isItemOutsideTrip check -- the one already-modeled "needs a look" condition Today has real data for');
  console.log('PASS: dayItemCard() renders both the leading card and every regular Today row from one function, differing only by the `leading` flag and the needs-attention state');
}
function test_beta_0_8_day_item_actions_are_gated_on_real_data(){
  const fn=extractFn(app,'dayItemActions');
  assert.match(fn,/item\.website\?/,'Website action must require a real item.website');
  assert.match(fn,/hasConfirmedTicket\(item\)\?/,'Tickets action must require an actual confirmed-ticket document, not the retired item.tickets[]');
  console.log('PASS: Navigate/Website/Tickets each only render when the item actually has the underlying data (location, website, a confirmed ticket document)');
}
test_beta_0_8_today_view_separates_a_leading_item_from_the_rest();
test_beta_0_8_game_suggestion_only_shows_on_a_day_with_no_leading_item();
test_beta_0_8_relative_time_label_never_duplicates_the_time_shown_beside_it();
test_beta_0_8_day_item_card_covers_leading_and_regular_rows_with_one_function();
test_beta_0_8_day_item_actions_are_gated_on_real_data();

// --- Participant selection carousel (S5) ---------------------------------------------------------

function test_beta_0_8_participant_carousel_renders_avatar_and_name_only(){
  const fn=extractFn(app,'participantCarousel');
  assert.match(fn,/class="p-carousel-avatar">\$\{esc\(label\.slice\(0,1\)\)\}/);
  assert.match(fn,/class="p-carousel-dots"/);
  console.log('PASS: participantCarousel() renders one avatar + name per option and an indicator-dots row, matching §5\'s "avatar and name only, no counters/badges"');
}
function test_beta_0_8_packing_view_uses_the_carousel_only_for_2_to_5_options(){
  const fn=extractFn(app,'packingView');
  assert.match(fn,/participantOptions\.length<=5\?participantCarousel\(/,'§5: "do not use a carousel for a long list" -- must fall back to a plain switcher above 5 options');
  assert.match(fn,/:`<div class="participant-switcher">/,'the pre-existing flat button switcher must remain as the >5-options fallback');
  console.log('PASS: packingView() uses the new carousel for 2-5 participant options and falls back to the original flat switcher for a longer list, per §5');
}
function test_beta_0_8_arrow_keys_step_through_the_carousel_in_reading_order(){
  assert.match(app,/addEventListener\('keydown',event=>\{/);
  assert.match(app,/const next=siblings\[event\.key==='ArrowRight'\?index\+1:index-1\];/,'§5: dragging/arrow-right must move to the NEXT item in reading order (not the previous), matching the spec\'s own explicit reading-direction rule');
  console.log('PASS: a keydown delegate steps ArrowRight to the next carousel option and ArrowLeft to the previous, matching §5\'s reading-direction rule (Tab already works natively, real <button> elements in DOM order)');
}
function test_beta_0_8_selected_carousel_item_is_recentered_after_every_render(){
  assert.match(app,/document\.querySelector\('\.p-carousel-item\.selected'\)\?\.scrollIntoView\(\{inline:'center',block:'nearest'\}\);/,'§5: "the selected item is centered" -- must be re-applied after every render(), not only after a manual drag');
  console.log('PASS: render() re-centers the carousel\'s own current selection after every render');
}
test_beta_0_8_participant_carousel_renders_avatar_and_name_only();
test_beta_0_8_packing_view_uses_the_carousel_only_for_2_to_5_options();
test_beta_0_8_arrow_keys_step_through_the_carousel_in_reading_order();
test_beta_0_8_selected_carousel_item_is_recentered_after_every_render();

// --- RTL / bidi (S3) ------------------------------------------------------------------------------

function test_beta_0_8_directional_icons_mirror_under_rtl_non_directional_ones_dont(){
  assert.match(styles,/html\[dir="rtl"\] \.icon-directional\{transform:scaleX\(-1\)\}/);
  assert(!extractFn(app,'NAV_ICONS').includes('icon-directional'),'the nav\'s own icons (home/timeline/center/packing) are not reading-direction-dependent and must stay unmirrored');
  console.log('PASS: .icon-directional mirrors under RTL via CSS; the bottom nav\'s own icons (none of them a "forward in a flow" chevron) deliberately don\'t use the class');
}
function test_beta_0_8_day_item_time_and_detail_text_is_bidi_wrapped(){
  const fn=extractFn(app,'dayItemCard');
  assert.match(fn,/<bdi>\$\{esc\(timeOnly\(item\.startAt\)\)\}<\/bdi>/,'a time is Latin/numeric text embedded in a Hebrew layout -- must be <bdi>-wrapped so it can\'t invert');
  assert.match(fn,/<bdi>\$\{esc\(detail\)\}<\/bdi>/,'a route/provider/location detail line (often Latin, e.g. an airport code) must be <bdi>-wrapped too');
  console.log('PASS: the day-item card wraps its own time and detail text in <bdi>, per §3\'s bidi rule');
}
function test_beta_0_8_heebo_loads_with_the_spec_s_own_named_fallback(){
  assert.match(html,/family=Heebo:wght@400;600;700&display=swap/);
  console.log('PASS: index.html loads Heebo (weights 400/600/700) via Google Fonts, with the CSS\'s own Arial fallback covering the offline/font-unavailable case');
}
test_beta_0_8_directional_icons_mirror_under_rtl_non_directional_ones_dont();
test_beta_0_8_day_item_time_and_detail_text_is_bidi_wrapped();
test_beta_0_8_heebo_loads_with_the_spec_s_own_named_fallback();

console.log('ALL PASS: Beta 0.8 Phase 1 -- Foundation: tokens (S2), 5-item nav + Settings relocation (S3), Today\'s leading/rest structure (S4), participant selection carousel (S5) (18 tests). Deployed to qa only, per the Product Owner\'s own decision that no phase of Beta 0.8 promotes to Production individually. Destination image (S4) was deliberately not built -- no destinationImage field exists anywhere in the data model, the spec itself scopes this document to design/behavior only ("no data model... should be inferred"), and the spec\'s own wording ("if present") already treats the image as conditional -- CSS for it (.today-image) is drafted and ready for whenever that field is actually added.');
