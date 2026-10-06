// Beta 0.8 Phase 2 (design spec V7 S7, "Smart Import processing states"): the ONE status pill, used by
// the Intake Inbox rows, an item's Documents/Tickets area and the proposal review screen. Kept free of
// DOM and of imports so the state mapping and the markup can be tested directly in plain Node.
// Every string this file renders is a constant of its own; callers pass already-escaped text/markup
// for `subtext` and `actions` only.

export const IMPORT_STATES=Object.freeze(['queued','processing','partial','needsReview','failed','attached','rejected']);

export const IMPORT_LABELS=Object.freeze({
  queued:'ממתין בתור',processing:'מנתח…',partial:'חלקי',needsReview:'דורש בדיקה',failed:'נכשל',attached:'צורף',rejected:'נדחה',
});

// S7: three fixed phrases, cross-faded about every 2 seconds (see .import-phrases in styles.css).
export const PROCESSING_PHRASES=Object.freeze(['קורא את המסמך','מזהה פרטים','מכין טיוטה']);

export const PARTIAL_SUBTEXT='חלק מהפרטים זוהו במקור';

// Tabler outline paths (MIT), the same single-stroke style as every other icon in the app.
const CIRCLE='<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>';
const ICONS={
  queued:`${CIRCLE}<path d="M12 7v5l3 3"/>`,
  partial:`${CIRCLE}<path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>`,
  needsReview:`${CIRCLE}<path d="M12 8v4"/><path d="M12 16h.01"/>`,
  failed:`${CIRCLE}<path d="M10 10l4 4m0 -4l-4 4"/>`,
  attached:'<path d="M5 12l5 5l10 -10"/>',
  rejected:`${CIRCLE}<path d="M5.7 5.7l12.6 12.6"/>`,
};

// The Processing icon -- the spec's second and final "no illustrations" exception, within its boxed
// limits: one 24px outline glyph, one stroke weight, --ink plus exactly two --accent coconuts, no
// gradient/shading. The trunk is fixed; only the frond group (fronds + coconuts) sways, around the
// crown at (12 9), +-6deg over 2.2s ease-in-out looping (.palm-fronds in styles.css).
const PALM='<svg class="import-palm" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">'
  +'<path class="palm-trunk" d="M12 22c0 -5 .8 -9 0 -13"/>'
  +'<g class="palm-fronds"><path d="M12 9c-2 -4 -6 -5 -9 -3"/><path d="M12 9c2 -4 6 -5 9 -3"/><path d="M12 9c-4 0 -7 3 -8 6"/><path d="M12 9c4 0 7 3 8 6"/>'
  +'<circle class="palm-coconut" cx="10.4" cy="10.6" r="1.4"/><circle class="palm-coconut" cx="13.6" cy="10.6" r="1.4"/></g></svg>';

const icon=name=>`<svg class="import-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${ICONS[name]}</svg>`;

// Source `processingState` values the app knows about (v5-app.js: runSmartAnalysis, attachIngest,
// smart-import-adapter's saveOnlySource). `undefined` is legitimate (a legacy source that never went
// through Smart Import); a value outside this list is genuinely unknown.
const KNOWN_SOURCE_STATES=['saved_only','processing','proposal_ready','failed','attached_only'];

// A single source's state, or null when it has nothing to show. `proposal_ready` shows nothing here:
// the proposal itself (suggestionImportState) carries partial / needs-review from then on. `attached`
// is the spec's transient confirmation, so it is only reported while `flashAttached` is true.
export function sourceImportState(source,{flashAttached=false}={}){
  switch(source?.processingState){
    case 'processing':return 'processing';
    case 'failed':return 'failed';
    case 'saved_only':return 'queued';
    case 'attached_only':return flashAttached?'attached':null;
    default:return null;
  }
}

// S7 interaction rule: a confirming action is blocked while any source is Processing, and also when a
// source's state is defined but unknown ("if the underlying state is genuinely unknown, the action
// stays disabled rather than guessing"). A legacy source with no processingState never blocks.
export function isSourceStateBlocking(source){
  const stateName=source?.processingState;
  return stateName==='processing'||(stateName!==undefined&&stateName!==null&&!KNOWN_SOURCE_STATES.includes(stateName));
}
export function isConfirmBlocked(sources){return (sources||[]).some(isSourceStateBlocking)}

// What still needs the reviewer's decision before approval: a field flagged needs-review, a conflicting
// merge candidate, or an ambiguous flight direction nobody has picked (or inherited) yet.
export function hasReviewBlockers(proposed){
  const details=proposed?.details||{};
  if((details.needsReviewFields||[]).length)return true;
  if(Object.keys(details.mergeCandidates||{}).length)return true;
  const candidates=details.directionCandidates||[];
  if(candidates.length){
    const picked=Number.isInteger(details.directionPickIndex);
    const inherited=candidates.some(candidate=>candidate.label===proposed.location&&candidate.startAt===proposed.startAt&&candidate.endAt===proposed.endAt);
    if(!picked&&!inherited)return true;
  }
  return false;
}

// A draft is "partial" when it can be approved as it stands but some details were not found.
export function isPartialProposal(suggestion){
  const proposed=suggestion?.proposed||{};
  const plainWarnings=(suggestion?.warnings||proposed.warnings||[]).filter(warning=>!(typeof warning==='object'&&warning?.needsReviewRef));
  return suggestion?.confidence==='low'||plainWarnings.length>0||!proposed.startAt;
}

// A suggestion's state. Approved suggestions have become items, so they show nothing; a clean pending
// draft has no pill either (S7 defines seven outcomes and "ready" is not one of them).
export function suggestionImportState(suggestion,sources=[]){
  if(!suggestion)return null;
  if(suggestion.status==='rejected')return 'rejected';
  if(suggestion.status==='approved')return null;
  if(sources.some(source=>source?.processingState==='processing'))return 'processing';
  if(hasReviewBlockers(suggestion.proposed))return 'needsReview';
  if(isPartialProposal(suggestion))return 'partial';
  return null;
}

// `actions` is the Failed state's inline bordered "נסה שוב" / "מחק" markup, built by the caller (it needs
// the caller's data attributes); it is only rendered for `failed`.
export function importStatusPill(stateName,{subtext='',actions=''}={}){
  const label=IMPORT_LABELS[stateName];
  if(!label)return '';
  const processing=stateName==='processing';
  const lead=processing?PALM:icon(stateName);
  const trail=processing?'<span class="import-dots" aria-hidden="true"><i></i><i></i><i></i></span>':'';
  const sub=stateName==='partial'?`<small class="import-subtext">${subtext||PARTIAL_SUBTEXT}</small>`:subtext?`<small class="import-subtext">${subtext}</small>`:'';
  const phrases=processing?`<span class="import-phrases" aria-hidden="true">${PROCESSING_PHRASES.map(phrase=>`<span>${phrase}</span>`).join('')}</span><span class="import-hairline" aria-hidden="true"></span>`:'';
  const inline=stateName==='failed'&&actions?`<span class="import-actions">${actions}</span>`:'';
  const role=processing?' role="status" aria-live="polite"':'';
  return `<span class="import-status import-status-${stateName}" data-import-state="${stateName}"${role}><span class="import-pill">${lead}<span class="import-label">${label}</span>${trail}</span>${sub}${phrases}${inline}</span>`;
}
