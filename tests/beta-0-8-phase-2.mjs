// Beta 0.8 Phase 2: the Smart Import status pill (spec V7 S7), its interaction rule, the eight refinement items,
// P12-F1 / P12-F2, and the G1 screens. Behavioral where there is logic (import-status.js, operational-data.js,
// ingestion.js, smart-import-adapter.js all run for real); source-wiring assertions where the code lives in
// v5-app.js, which cannot be imported in plain Node (it needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IMPORT_LABELS,IMPORT_STATES,PROCESSING_PHRASES,STALE_PROCESSING_MS,isProcessingLive,importStatusPill,isConfirmBlocked,sourceImportState,suggestionImportState,hasReviewBlockers} from '../src/import-status.js';
import {computeTicketCoverage,pickerParticipants} from '../src/operational-data.js';
import {flightRouteDeparture,needsReviewFormField} from '../src/ingestion.js';
import {NOTES_ITEM_LIMIT,scopeNoteLines} from '../src/smart-import-adapter.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),foundation=read('../src/foundation.css'),main=read('../src/main.js');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);

// ---- S7: the seven states -------------------------------------------------------------------------
test('S7: exactly the seven states, with the spec\'s own labels',()=>{
  assert.deepEqual([...IMPORT_STATES],['queued','processing','partial','needsReview','failed','attached','rejected']);
  assert.deepEqual({...IMPORT_LABELS},{queued:'ממתין בתור',processing:'מנתח…',partial:'חלקי',needsReview:'דורש בדיקה',failed:'נכשל',attached:'צורף',rejected:'נדחה'});
  for(const stateName of IMPORT_STATES)assert.match(importStatusPill(stateName),new RegExp(`data-import-state="${stateName}"`),`${stateName} must render`);
  assert.equal(importStatusPill('nonsense'),'','an unknown state renders nothing rather than a guess');
});
test('S7: one component -- v5-app.js never builds pill markup of its own, and all three locations call it',()=>{
  assert(!app.includes('import-pill'),'pill markup must live only in import-status.js');
  const row=app.slice(app.indexOf('function suggestionRow('),app.indexOf('function confidenceLabel('));
  assert(row.includes('importStatusPill(stateName)')&&row.includes("importStatusPill('rejected')"),'Intake Inbox rows');
  const source=app.slice(app.indexOf('function sourceRow('),app.indexOf('function ticketCoverage('));
  assert(source.includes('importStatusPill(stateName,{actions:failedActions})'),"an item's Documents area");
  const review=app.slice(app.indexOf('function suggestionView('),app.indexOf('const BAGGAGE_LABELS'));
  assert(review.includes('importStatusPill(reviewState)'),'the proposal review screen');
});
test('S7: --accent-soft appears on exactly one of the seven states (needs review)',()=>{
  const rules=css.split('\n').filter(line=>/^\.import-/.test(line)&&line.includes('accent-soft'));
  assert.equal(rules.length,1,'only one .import-* rule may use --accent-soft');
  assert.match(rules[0],/^\.import-status-needsReview \.import-pill\{/);
  assert(!/import-status-(processing|partial)[^{]*\{[^}]*accent-soft/.test(css),'never on Processing or Partial');
  // the same pill is what every location renders, so "in each of the three locations" follows from the single component
  for(const stateName of IMPORT_STATES)assert(!importStatusPill(stateName).includes('accent-soft'),'the markup carries no fill of its own');
});
test('S7: Partial shows its muted subtext; Failed alone carries the inline actions',()=>{
  assert.match(importStatusPill('partial'),/import-subtext">חלק מהפרטים זוהו במקור</);
  const actions='<button class="btn">נסה שוב</button><button class="btn">מחק</button>';
  assert(importStatusPill('failed',{actions}).includes('נסה שוב')&&importStatusPill('failed',{actions}).includes('מחק'));
  for(const stateName of IMPORT_STATES.filter(name=>name!=='failed'))assert(!importStatusPill(stateName,{actions}).includes('נסה שוב'),`${stateName} must not carry retry/delete`);
});
test('S7: Processing icon stays within the exception limits (<=24px, ink outline + exactly two accent coconuts)',()=>{
  const pill=importStatusPill('processing');
  assert.match(pill,/<svg class="import-palm" viewBox="0 0 24 24" width="24" height="24"/);
  assert.equal((pill.match(/class="palm-coconut"/g)||[]).length,2,'two coconuts, no more');
  assert.equal((pill.match(/<svg/g)||[]).length,1,'no second illustrated element');
  assert(!/gradient|filter|<image/i.test(pill),'no gradient, shading or scene');
  assert.match(css,/\.import-palm\{[^}]*stroke:var\(--ink\)[^}]*fill:none[^}]*\}/);
  assert.match(css,/\.palm-coconut\{fill:var\(--accent\);stroke:var\(--accent\)\}/,'coconuts are the only accent');
  assert(pill.indexOf('palm-trunk')<pill.indexOf('palm-fronds'),'trunk is outside the swaying group');
});
test('S7: Processing animates per the spec -- sway +-6deg 2.2s ease-in-out, 3 dots, 3 rotating phrases ~2s apart, 2px hairline',()=>{
  assert.match(css,/\.palm-fronds\{transform-origin:12px 9px;animation:palm-sway 2\.2s ease-in-out infinite\}/);
  assert.match(css,/@keyframes palm-sway\{0%,100%\{transform:rotate\(-6deg\)\}50%\{transform:rotate\(6deg\)\}\}/);
  const pill=importStatusPill('processing');
  assert.equal((pill.match(/<i><\/i>/g)||[]).length,3,'three dots');
  assert.deepEqual([...pill.matchAll(/<span>([^<]+)<\/span>/g)].map(match=>match[1]),[...PROCESSING_PHRASES]);
  assert.deepEqual([...PROCESSING_PHRASES],['קורא את המסמך','מזהה פרטים','מכין טיוטה']);
  // each pulse: 16.6% of a 1.2s cycle = 200ms, inside the 160-220ms ease-out range
  assert.match(css,/animation:import-dot 1\.2s ease-out infinite/);
  assert.match(css,/16\.6%\{opacity:1;transform:scale\(1\.35\)\}/);
  assert(1.2*0.166*1000>=160&&1.2*0.166*1000<=220);
  // phrases: a 6s loop, the three spans offset by 2s each
  assert.match(css,/\.import-phrases span\{[^}]*animation:import-phrase 6s ease-in-out infinite\}/);
  assert.match(css,/nth-child\(2\)\{animation-delay:2s\}/);assert.match(css,/nth-child\(3\)\{animation-delay:4s\}/);
  assert.match(css,/\.import-hairline\{[^}]*height:2px[^}]*\}/);
  assert.match(css,/\.import-hairline::after\{[^}]*background:var\(--accent\)[^}]*animation:import-hairline 1\.4s ease-in-out infinite\}/);
  assert.match(css,/prefers-reduced-motion: reduce\)\{\s*\.palm-fronds,\.import-dots i,\.import-hairline::after\{animation:none !important\}/,'motion respects reduced-motion');
});
test('S7: state mapping from sources and suggestions',()=>{
  const live={processingState:'processing',processingStartedAt:new Date().toISOString()};
  assert.equal(sourceImportState(live),'processing');
  assert.equal(sourceImportState({processingState:'failed'}),'failed');
  assert.equal(sourceImportState({processingState:'saved_only'}),'queued');
  assert.equal(sourceImportState({processingState:'proposal_ready'}),null,'the proposal carries the state from then on');
  assert.equal(sourceImportState({processingState:'attached_only'}),null,'Attached is transient, never a persistent badge');
  assert.equal(sourceImportState({processingState:'attached_only'},{flashAttached:true}),'attached');
  assert.equal(sourceImportState({}),null);
  const clean={status:'pending',confidence:'high',proposed:{startAt:'2026-10-10T10:00',details:{}},warnings:[]};
  assert.equal(suggestionImportState(clean,[]),null,'a clean draft has no pill');
  assert.equal(suggestionImportState({...clean,status:'rejected'},[]),'rejected');
  assert.equal(suggestionImportState({...clean,status:'approved'},[]),null);
  assert.equal(suggestionImportState(clean,[live]),'processing');
  assert.equal(suggestionImportState({...clean,proposed:{...clean.proposed,details:{needsReviewFields:[{key:'startDate',value:'x'}]}}},[]),'needsReview');
  assert.equal(suggestionImportState({...clean,proposed:{...clean.proposed,details:{mergeCandidates:{phone:'1'}}}},[]),'needsReview');
  assert.equal(suggestionImportState({...clean,confidence:'low'},[]),'partial');
  assert.equal(suggestionImportState({...clean,warnings:['משהו'],proposed:{...clean.proposed}},[]),'partial');
  assert.equal(suggestionImportState({...clean,proposed:{...clean.proposed,startAt:''}},[]),'partial');
  // a needs-review warning alone is not "partial" -- review blockers win, and ref-carrying warnings are not counted twice
  const blockers={...clean,warnings:[{message:'x',needsReviewRef:{key:'a',value:'b'}}],proposed:{...clean.proposed,details:{needsReviewFields:[{key:'a',value:'b'}]}}};
  assert.equal(suggestionImportState(blockers,[]),'needsReview');
  // an unresolved ambiguous flight direction blocks; an inherited / picked one does not
  const direction={label:'BKK → TLV',startAt:'s',endAt:'e'};
  assert(hasReviewBlockers({location:'',startAt:'s',endAt:'e',details:{directionCandidates:[direction]}}));
  assert(!hasReviewBlockers({location:'BKK → TLV',startAt:'s',endAt:'e',details:{directionCandidates:[direction]}}));
  assert(!hasReviewBlockers({location:'',details:{directionCandidates:[direction],directionPickIndex:0}}));
});

// ---- a stuck "processing" must not spin or block forever (found on the real QA Trip: four such sources)
test('stale processing: a source whose analysis never finished becomes Failed (retry/delete), never an eternal spinner',()=>{
  const now=Date.parse('2026-10-06T12:00:00Z');
  const fresh={processingState:'processing',processingStartedAt:'2026-10-06T11:58:00Z'};
  const old={processingState:'processing',processingStartedAt:new Date(now-STALE_PROCESSING_MS-1000).toISOString()};
  const legacy={processingState:'processing'};
  assert.equal(isProcessingLive(fresh,now),true);assert.equal(isProcessingLive(old,now),false);assert.equal(isProcessingLive(legacy,now),false);
  assert.equal(sourceImportState(fresh,{now}),'processing');
  assert.equal(sourceImportState(old,{now}),'failed');assert.equal(sourceImportState(legacy,{now}),'failed');
  assert.equal(isConfirmBlocked([old,legacy],now),false,'a dead analysis must not keep the review screen locked');
  assert.equal(isConfirmBlocked([fresh],now),true);
  assert(app.includes('source.processingStartedAt=new Date().toISOString()'),'a new analysis stamps its start');
});

test('lost update: the analysis outcome is written to the live source, not a copy detached by a remote snapshot',()=>{
  const body=app.slice(app.indexOf('async function runSmartAnalysis('),app.indexOf('async function smartIngest('));
  assert(body.includes('const live=()=>sourceById(source.id)||source;'));
  assert(body.includes("Object.assign(live(),{status:targetItem?'מצורף — חילוץ ממתין לאישור':'ממתין לאישור',processingState:'proposal_ready'"),'success outcome');
  assert(body.includes("processingState:'failed',processingError:String(error.message||error)});save();"),'failure outcome');
  assert(body.includes('live().participantIds=resolvedParticipantIds'),'participant auto-link');
  // nothing after the first await may mutate the captured object directly any more
  const afterAwait=body.slice(body.indexOf('try{'));
  assert(!/\n\s+source\.(status|processingState|processingError|participantIds)=/.test(afterAwait),'no direct writes to the captured source after the await');
});

// ---- S7 interaction rule (V6-F11) ----------------------------------------------------------------
test('interaction rule: a confirming action is blocked while Processing, and while the state is unknown',()=>{
  const live={processingState:'processing',processingStartedAt:new Date().toISOString()};
  assert.equal(isConfirmBlocked([live]),true);
  assert.equal(isConfirmBlocked([{processingState:'proposal_ready'},live]),true);
  assert.equal(isConfirmBlocked([{processingState:'mystery'}]),true,'unknown stays disabled rather than guessing');
  for(const known of ['saved_only','proposal_ready','failed','attached_only'])assert.equal(isConfirmBlocked([{processingState:known}]),false,known);
  assert.equal(isConfirmBlocked([{}]),false,'a legacy source that never went through Smart Import is not blocked');
  assert.equal(isConfirmBlocked([]),false);assert.equal(isConfirmBlocked(undefined),false);
});
test('interaction rule: wired into the review screen, its submit handler and the busy intake modals',()=>{
  const review=app.slice(app.indexOf('function suggestionView('),app.indexOf('const BAGGAGE_LABELS'));
  assert(review.includes("const confirmBlocked=isConfirmBlocked(sources)"));
  assert(review.includes('name="decision" value="approve"${disabled}')&&review.includes('name="decision" value="save"${disabled}'),'both confirming buttons carry the disabled attribute');
  assert(app.includes("else if(form.id==='suggestion-form'){const suggestion=suggestionById(form.dataset.id);if(!suggestion||isConfirmBlocked("),'a submit that slips through (Enter key) is ignored silently, never a false "no document selected"');
  const busy=app.slice(app.indexOf('function analyzingModal('),app.indexOf('function analyzingModal(')+700);
  // Beta 0.8 Phase 2.1 (P2-F1): the busy modal shows the LARGE palm; the disabled המשך rule is unchanged.
  assert(busy.includes('largePalm(')&&busy.includes('disabled aria-disabled="true">המשך</button>'),'the busy modal keeps a visibly disabled המשך');
  assert(app.includes('async function smartIngest(){\n  if(ingestBusy)return;')&&app.includes('async function attachIngest(itemId){\n  if(ingestBusy)return;'));
  assert.match(css,/\.btn\[disabled\],\.btn\[aria-disabled="true"\]\{background:var\(--bg\);color:var\(--muted\)/,'visibly muted');
});

// ---- refinement items -----------------------------------------------------------------------------
test('V6-F14: Hotel notes carry at most a handful of items and point at the full record',()=>{
  const lines=Array.from({length:12},(unused,i)=>`שדה ${i}: ערך ${i}`);
  const scoped=scopeNoteLines(lines);
  assert.equal(scoped.length,NOTES_ITEM_LIMIT+1);
  assert.deepEqual(scoped.slice(0,NOTES_ITEM_LIMIT),lines.slice(0,NOTES_ITEM_LIMIT));
  assert.match(scoped.at(-1),/^ועוד 7 פרטים — /);
  assert.deepEqual(scopeNoteLines(lines.slice(0,5)),lines.slice(0,5),'five or fewer pass through untouched');
  assert.deepEqual(scopeNoteLines(['a','a','b']),['a','b'],'duplicates collapse');
  assert.deepEqual(scopeNoteLines(undefined),[]);
  const adapter=read('../src/smart-import-adapter.js');
  assert(adapter.includes("proposed.notes=scopeNoteLines(noteLines).join('\\n');"));
  assert(adapter.includes('proposed.details.smartImportFields=[...(draft.fields||[]),...fallbackEvidenceFields];'),'the complete extraction is still kept (evidence panel), only the notes text is scoped');
});
test('V6-F16: one unified "Add document" action with a single file picker for images or PDFs',()=>{
  const modal=app.slice(app.indexOf('function attachmentModal('),app.indexOf('function qrPanel('));
  // Already true since V6-F38 (fix pass 4) -- pinned here because the scope lists it for Phase 2.
  // Beta 0.8 Phase 2.3 (P22-F10): the picker is the shared fileDrop() -- one input, rendered once.
  assert(modal.includes('${fileDrop()}')&&(app.match(/<input id="source-file" type="file"/g)||[]).length===1,'a single file picker');
  assert(app.includes("const FILE_ACCEPT='application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff';")&&app.includes('accept="${FILE_ACCEPT}"'),'it accepts either an image or a PDF');
  assert(!/>s*(תמונה|PDF)s*</.test(modal),'no separate Photo / PDF first-level choice');
});
test('Flight route label: the single departure airport code; the map search is unchanged',()=>{
  assert.equal(flightRouteDeparture('BKK → TLV'),'BKK');
  assert.equal(flightRouteDeparture(' TLV - BKK '),'TLV');
  assert.equal(flightRouteDeparture('Bangkok Suvarnabhumi'),'','a place name is never altered');
  assert.equal(flightRouteDeparture('BKK'),'');assert.equal(flightRouteDeparture(''),'');assert.equal(flightRouteDeparture(undefined),'');
  assert(app.includes("function locationLabel(item){return item.type==='flight'?flightRouteDeparture(mapSearchLocation(item))||mapSearchLocation(item)||item.location:item.location}"));
  assert(app.includes("link(navHref,'pin',esc(locationLabel(item)),'fact-underline')"),'the detail page shows the label (as the inline map link, Beta 0.8 Phase 2.2)');
  assert(app.includes('mapsUrl(mapSearchLocation(item))'),'navigation still resolves through mapSearchLocation');
});
test('one-click accept-new-value: each conflicting field offers use-new / keep-saved as buttons',()=>{
  const panel=app.slice(app.indexOf('function mergeCandidatePanel('),app.indexOf('// 0.6.7: computed lookup'));
  assert(panel.includes('data-choice="accept">שימוש בערך החדש</button>')&&panel.includes('data-choice="keep">השארת הערך השמור</button>'));
  assert(!panel.includes('type="radio"'),'no longer a radio pair the reader has to discover');
  assert(app.includes("else if(action==='resolve-merge-candidate'){"),'same resolver as before -- the stored-value contract is untouched');
  assert(panel.includes('<dt>הערך השמור</dt>')&&panel.includes('<dt>הערך החדש</dt>'),'old and new are shown side by side');
});
test('V6-F80: a needs-review warning offers "not correct" next to "confirm as correct"',()=>{
  assert.equal(needsReviewFormField('startDate'),'startAt');
  assert.equal(needsReviewFormField('bookingReference'),'confirmationNumber');
  assert.equal(needsReviewFormField('departureAirport'),'location');
  assert.equal(needsReviewFormField('somethingElse'),'somethingElse');
  const row=app.slice(app.indexOf('function warningRow('),app.indexOf('const MERGE_CANDIDATE_LABELS'));
  assert(row.includes('>אישור כנכון</button>')&&row.includes('data-action="needs-review-edit"')&&row.includes('לא נכון — לתקן'));
  const action=app.slice(app.indexOf("else if(action==='needs-review-edit')"),app.indexOf('// V6-F74: confirms a still-live'));
  assert(action.includes("state.modal={type:'edit-item',itemId:button.dataset.id}")&&action.includes('input?.focus()'),'it takes the reader to the flagged field');
});
test('V7-F15 / P12-F5 (superseded by P2-F4 in Phase 2.1): ONE card, each document once -- see tests/beta-0-8-phase-2-1.mjs',()=>{
  const section=app.slice(app.indexOf('function ticketsAndDocumentsSection('),app.indexOf('// Beta 0.8 Phase 2 (G1) / Phase 2.1 (P2-F4): the item detail page'));
  assert(section.includes('<h3>${heading}</h3>'),'one card with one heading');
  assert(app.includes('id="item-documents"')&&section.includes("'id=\"item-tickets\"'")||section.includes('id="item-tickets"'),'the item-tickets anchor Today scrolls to is kept');
});
test('P12-F5: ticket coverage is derived from confirmed documents, per participant',()=>{
  const participants=[{id:'a',name:'א'},{id:'b',name:'ב'},{id:'c',name:'ג',active:false},{id:'d',name:'ד',active:false}];
  const none=computeTicketCoverage([],participants);
  assert.deepEqual(none.people.map(person=>person.id),['a','b'],'inactive participants are not listed');
  assert.equal(none.coveredCount,0);
  const sources=[{ticketConfirmed:true,participantIds:['a','c']},{ticketConfirmed:false,participantIds:['b']}];
  const result=computeTicketCoverage(sources,participants);
  assert.deepEqual(result.people.map(person=>person.id),['a','b','c'],'a deactivated participant who already holds a ticket stays visible');
  assert.deepEqual([...result.coveredIds].sort(),['a','c']);
  assert.equal(result.coveredCount,2);
  assert.equal(result.confirmed.length,1,'an unconfirmed document is not coverage');
  assert.equal(computeTicketCoverage(undefined,undefined).coveredCount,0);
});
test('V7-F16: a confirmed ticket can be un-confirmed (and "used" is cleared with it)',()=>{
  const handler=app.slice(app.indexOf("else if(action==='source-unconfirm-ticket')"),app.indexOf('// S7 Failed pill'));
  assert(handler.includes('source.ticketConfirmed=false;source.ticketUsed=false;save();render()'));
  // Beta 0.8 Phase 2.1: the undo now lives in the slide's "⋯" menu.
  const slide=app.slice(app.indexOf('function ticketSlideHtml('),app.indexOf('function ticketCarousel('));
  assert(slide.includes("confirmed?menuButton('source-unconfirm-ticket',source,'ביטול אישור')"));
  assert(app.includes("else if(action==='source-confirm-ticket'){const source=state.sources.find(candidate=>candidate.id===button.dataset.id);if(source){source.ticketConfirmed=true;save();render()}}"),'the confirm action itself is untouched');
});
test('CR-005: removing an Editor confirms that it worked',()=>{
  const handler=app.slice(app.indexOf("else if(action==='remove-editor')"),app.indexOf("else if(action==='admin-revoke')"));
  assert(handler.includes('await removeEditorByEmail(state.trip.id,button.dataset.email);notify(`${button.dataset.email} הוסר מהטיול`)'));
  assert(handler.indexOf('notify(')<handler.indexOf('catch'),'the confirmation sits on the success path only');
});
test('S7 Failed: "מחק" is an explicit hard delete that also removes the stored original and every link',()=>{
  const handler=app.slice(app.indexOf("else if(action==='source-delete')"),app.indexOf("else if(action==='source-unlink')"));
  assert(handler.includes('confirm(')&&handler.includes('deleteAttachment(source.storagePath)')&&handler.includes('item.sourceIds=item.sourceIds.filter(id=>id!==source.id)')&&handler.includes('state.sources=state.sources.filter(candidate=>candidate.id!==source.id)'));
});

// ---- P12-F1 / P12-F2 ------------------------------------------------------------------------------
test('P12-F1: the build string and the "Beta X.Y.Z" label are isolated with <bdi>',()=>{
  assert(app.includes('<bdi>${esc(appVersionLabel())}</bdi>${buildVersionLabel()?` · בנייה <bdi>${esc(buildVersionLabel())}</bdi>`:\'\'}'),'About');
  assert(app.includes('`<bdi>${appVersionLabel()}</bdi> · Hotel + Flight Smart Import`'),'the header fallback');
  assert(main.includes('<p class="auth-kicker"><bdi>${appVersionLabel()}</bdi></p>'),'sign-in');
  assert.match(css,/bdi,\.bidi\{unicode-bidi:isolate\}/);
});
test('P12-F2: inactive participants are never offered for new assignments; existing ones stay, greyed and removable',()=>{
  const participants=[{id:'a',name:'א'},{id:'b',name:'ב',active:false},{id:'c',name:'ג',active:true}];
  assert.deepEqual(pickerParticipants(participants).map(person=>person.id),['a','c']);
  assert.deepEqual(pickerParticipants(participants,['b']).map(person=>person.id),['a','b','c'],'an existing assignment to a deactivated participant is kept');
  assert.deepEqual(pickerParticipants(participants,['zzz']).map(person=>person.id),['a','c']);
  assert.deepEqual(pickerParticipants(undefined),[]);
  const helper=app.slice(app.indexOf('function participantCheckboxes('),app.indexOf('const participantName='));
  assert(helper.includes('pickerParticipants(state.participants,[...ids])')&&helper.includes('(לא פעיל)')&&helper.includes("ids.has(participant.id)?'checked':''"),'greyed label, still a checkbox the reader can untick');
  for(const picker of ['function participantAssignmentField(p){','function packingItemModal(){','function sourceParticipantsModal(){']){
    const start=app.indexOf(picker);assert(start>-1,picker);
    assert(app.slice(start,start+2600).includes('participantCheckboxes('),`${picker} must use the shared picker`);
  }
  assert(!/state\.participants\.map\(participant=>`<label class="checkbox-field">/.test(app),'no picker builds its own checkbox list any more');
  assert(app.includes('state.participants.filter(participant=>participant.active!==false))'),'auto-linking a document skips inactive participants');
});

// ---- G1 screens -----------------------------------------------------------------------------------
test('G1 forms: grouped, label-wrapped, single column on a phone; every field name is unchanged',()=>{
  const fields=app.slice(app.indexOf('function proposalFields('),app.indexOf('async function refreshMyInvitation'));
  for(const name of ['type','title','transportMode','provider','confirmationNumber','location','website','phone','email','startAt','endAt','notes'])assert(fields.includes(`name="${name}"`),`field ${name} must survive the redesign`);
  for(const legend of ['פרטים כלליים','הזמנה','מיקום וקשר','מועדים','שיוך','הערות'])assert(fields.includes(`'${legend}'`)||fields.includes(`<legend>${legend}</legend>`),`group ${legend}`);
  assert(fields.includes('<label class="field"><span class="field-label">'),'labels wrap their inputs');
  assert.match(css,/\.form-grid\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:0 12px\}\s*@media\(min-width:560px\)\{\.form-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/,'one column on a phone, two only where there is room');
  assert.match(css,/\.field input,\.field select,\.field textarea\{min-height:44px/,'44px tap targets');
  for(const form of ['edit-item-form','participant-form','shopping-form','location-form','task-form','packing-item-form'])assert(app.includes(`id="${form}"`),form);
  assert(app.includes('<div class="form-actions"><button class="btn">שמירה</button></div></form></section></div>`;'),'sticky save in the participant/packing/shopping forms');
});
test('G1 buttons: the primary action is --ink, terracotta is no longer every button\'s fill',()=>{
  assert.match(css,/\n\.btn\{background:var\(--ink\);color:#fff;border:1px solid var\(--ink\);min-height:44px/);
  assert.match(css,/\.btn\.secondary,\.btn\.ghost,\.btn\.warn\{background:var\(--surface\);color:var\(--ink\)/);
  assert.match(css,/\.badge\{[^}]*background:var\(--surface\)/,'a default chip no longer takes the (aliased) terracotta soft fill');
});
test('G1 sign-in: matches the tokens; "התחברות עם Google" is not terracotta-filled',()=>{
  assert(main.includes('<button class="btn auth-button" id="google-sign-in" type="button">התחברות עם Google</button>'));
  const signIn=foundation.slice(foundation.indexOf('Beta 0.8 Phase 2 (G1): the sign-in'));
  assert.match(signIn,/\.auth-page\{background:var\(--bg\)\}/);
  assert.match(signIn,/\.auth-card\{[^}]*border:1px solid var\(--border\)/);
  assert(!/auth-button[^{]*\{[^}]*(accent|green|#C86442)/i.test(css+foundation),'no rule gives the sign-in button an accent/green fill');
  assert(!/\.auth-page\{[^}]*linear-gradient/.test(signIn));
});
test('G1 Trip Center / Packing: Tabler icons on tiles, spacing and card tokens',()=>{
  assert(app.includes('<span class="ico">${typeIcon(key)}</span><b>${type.label}</b>'));
  assert(app.includes("[view,icon,label,count])=>`<button class=\"tile\" data-route=\"${view}\"><span class=\"ico\">${icon}</span>")&&app.includes("tabler('dice')")&&app.includes("tabler('bag')")&&app.includes("tabler('checklist')")&&app.includes("tabler('cart')"));
  assert.match(css,/\.tile\{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:96px;padding:16px;border:1px solid var\(--border\);border-radius:16px;background:var\(--surface\)/);
  assert.match(css,/\.row\{min-height:64px;padding:12px 16px;border:1px solid var\(--border\);border-radius:16px;background:var\(--surface\)/);
  assert.match(css,/\.pack-row-wrapper\{display:flex;flex-wrap:wrap;[^}]*border:1px solid var\(--border\);border-radius:16px;background:var\(--surface\)\}/,'packing rows wrap on a narrow phone instead of overflowing');
  assert.match(css,/\.progress span\{background:var\(--ink\)\}/);
  // Beta 0.8 Phase 2.1 (P2-F5): packing rows are compact tap-to-edit rows now (no inline edit/delete buttons).
  assert(app.includes('<button class="task-compact-main" data-action="pack-edit"'));
  assert(app.includes("class=\"ti icon-directional row-chevron\""),'the row chevron mirrors under RTL');
});
test('G1 item detail: header, fact list, bordered contact actions, ticket section, page actions',()=>{
  const detail=app.slice(app.indexOf('function detailView('),app.indexOf('// V6-F37 (fix pass 4)'));
  for(const part of ['<header class="detail-head">','<dl class="detail-facts">',"${backRow('center',item.type,",'ticketsAndDocumentsSection(item,sources)','<div class="form-actions detail-actions">'])assert(detail.includes(part),part);
  assert(detail.includes("detailFact('מספר הזמנה',item.confirmationNumber?`<bdi>${esc(item.confirmationNumber)}</bdi>`:'')"),'booking numbers are isolated');
  // Beta 0.8 Phase 2.2 (P21-F2/F3): map / website / phone / e-mail are inline links on their fact rows, not separate buttons.
  for(const icon of ["'pin'","'world'","'phone'","'mail'"])assert(detail.includes(icon),icon);
  assert(!detail.includes('detail-links'),'no separate contact buttons any more');
  assert.match(css,/\.fact dt\{flex:0 0 92px/);
  assert.match(css,/\.form-actions\.detail-actions\{position:static/,'the page actions do not hide behind the fixed bottom nav');
});

let failed=0;
for(const [name,fn] of tests){
  try{await fn();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,4).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 2 tests passed`);
