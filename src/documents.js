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

// Beta 0.8.1 -- which items hold a document, and what deleting it for good has to say.
export const linkedItemsOf=(source,items)=>(items||[]).filter(item=>(item.sourceIds||[]).includes(source.id));
// One label per linked item: its name, plus its type in brackets when ANOTHER item in the trip has the same name. [] = linked to nothing.
export function linkageLabels(source,items,typeLabel=type=>type){
  return linkedItemsOf(source,items).map(item=>{
    const shared=(items||[]).some(other=>other.id!==item.id&&other.title===item.title);
    return shared?`${item.title} (${typeLabel(item.type)})`:item.title;
  });
}
// The confirmation before a hard delete of a document -- one wording for every place a document can be deleted from. It always names what is lost and
// that it cannot be undone; every linked item is named; a confirmed ticket additionally names the people whose coverage goes with it.
export function sourceDeleteMessage(source,linkedItems=[],participants=[]){
  const lines=[`למחוק את ${source.name||source.url||'המסמך'} לצמיתות? המסמך והקובץ יימחקו ולא ניתן יהיה לשחזר אותם.`];
  if(linkedItems.length)lines.push(`${linkedItems.length>1?'המסמך מקושר לפריטים':'המסמך מקושר לפריט'}: ${linkedItems.map(item=>item.title).join(', ')} — הקישור יוסר ${linkedItems.length>1?'מכולם':'ממנו'}.`);
  if(source.ticketConfirmed){
    const names=(source.participantIds||[]).map(id=>participants.find(person=>person.id===id)?.name).filter(Boolean);
    lines.push(`המסמך מאושר ככיסוי כרטיס עבור ${names.join(', ')||'משתתף'} — מחיקתו תבטל גם את הכיסוי.`);
  }
  return lines.join('\n\n');
}
