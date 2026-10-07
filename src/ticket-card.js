// Beta 0.8 Phase 2.1 (P2-F4): the pure rules behind the item page's single "כרטיסים ומסמכים" card (approved
// mockup docs/design/mockups/P2-F4_*). Free of DOM and imports so they run in plain Node.

export const TICKET_ITEM_TYPES=Object.freeze(['flight','activity','car']);

// A ticket slide is a document linked to at least one participant, on a ticket-eligible item -- confirmed or not
// yet confirmed alike. Every other document goes in the "מסמכים נוספים" list. Each document lands in exactly one.
export function partitionItemDocuments(itemType,sources){
  const eligible=TICKET_ITEM_TYPES.includes(itemType);
  const tickets=[],others=[];
  for(const source of sources||[])(eligible&&(source.participantIds||[]).length?tickets:others).push(source);
  return {tickets,others};
}

// How the card presents its tickets: nothing, one card, or a carousel (2 or more).
export const ticketPresentation=count=>count>=2?'carousel':count===1?'single':'none';

// Seat / gate detail shown on a slide, read from what Smart Import extracted for the item: the holder entry whose
// name matches one of the slide's participants. '' when nothing matches (the slide then shows no detail line).
const norm=value=>String(value||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);
const sameName=(a,b)=>{const left=norm(a),right=norm(b);return left.length&&right.length&&(left.every(word=>right.includes(word))||right.every(word=>left.includes(word)))};
export function ticketHolderDetail(item,names){
  const details=item?.details||{};
  const holders=item?.type==='flight'?(details.passengers||[]).map(passenger=>({name:passenger.name,text:[passenger.seat?`מושב ${passenger.seat}`:'',passenger.eTicketNumber?`כרטיס ${passenger.eTicketNumber}`:''].filter(Boolean).join(' · ')})):(details.ticketHolders||[]).map(holder=>({name:holder.name,text:[holder.seatOrSection,holder.ticketNumber?`כרטיס ${holder.ticketNumber}`:''].filter(Boolean).join(' · ')}));
  for(const name of names||[]){const match=holders.find(holder=>sameName(holder.name,name)&&holder.text);if(match)return match.text}
  return '';
}

// The summary line: "כרטיסים: N מתוך M משתתפים" and who is still without one. `coverage` is computeTicketCoverage's result.
export function coverageSummary(coverage){
  const total=coverage.people.length;
  return {covered:coverage.coveredCount,total,percent:total?Math.round(coverage.coveredCount/total*100):0,missing:coverage.people.filter(person=>!coverage.coveredIds.has(person.id)).map(person=>person.name)};
}

// Beta 0.8 Phase 2.2 (P21-F11): the holder name on a slide is ONE line. One person -> the full name; two -> their first names;
// more -> the first person's first name and a count ("אייל +2"), like the participant chip.
export function ticketHolderLabel(people){
  const list=(people||[]).filter(Boolean);
  const first=person=>String(person.name).trim().split(/\s+/)[0];
  if(!list.length)return '';
  if(list.length===1)return String(list[0].name).trim();
  if(list.length===2)return list.map(first).join(', ');
  return `${first(list[0])} +${list.length-1}`;
}
