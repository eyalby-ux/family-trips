// Beta 0.8 Phase 3.1 (P3-F13): the pure logic behind Trip Center -> מסמכים -- what each source is (pending / attached / ticket /
// link / failed / unassigned), the filter chips with their live counts, and the summary line. The DOM lives in v5-app.js.
export const DOC_FILTERS=[['all','הכול'],['pending','ממתין לאישור'],['attached','מצורף'],['unassigned','לא משויך'],['tickets','כרטיסים'],['links','קישורים'],['failed','נכשל']];

// items: every item; suggestions: every suggestion; stateName: the source's Smart Import status ('failed', 'processing', ... or '').
export function documentFlags(source,{items=[],suggestions=[],stateName=''}={}){
  const attached=items.some(item=>(item.sourceIds||[]).includes(source.id));
  const ticket=Boolean(source.ticketConfirmed)||(attached&&(source.participantIds||[]).length>0);
  const pending=suggestions.some(suggestion=>['pending','deferred'].includes(suggestion.status)&&(suggestion.sourceIds||[suggestion.sourceId]).includes(source.id));
  return {attached,ticket,pending,link:source.kind==='link',failed:stateName==='failed',unassigned:!attached&&!ticket};
}
const MATCH={all:()=>true,pending:flags=>flags.pending,attached:flags=>flags.attached,unassigned:flags=>flags.unassigned,tickets:flags=>flags.ticket,links:flags=>flags.link,failed:flags=>flags.failed};
export const documentMatchesFilter=(flags,filter)=>(MATCH[filter]||MATCH.all)(flags);

// entries: [{source,flags}] -> a count per filter (every chip shows its own).
export function documentCounts(entries){
  return Object.fromEntries(DOC_FILTERS.map(([key])=>[key,entries.filter(entry=>documentMatchesFilter(entry.flags,key)).length]));
}
export function documentSummary(counts){
  const base=counts.all===1?'מסמך אחד':`${counts.all} מסמכים`;
  return counts.pending?`${base} · ${counts.pending===1?'אחד ממתין':`${counts.pending} ממתינים`} לאישור`:base;
}
