import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSuggestions,validateSource} from '../src/ingestion.js';

const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8');

assert(app.includes("choices=[['manual','✍️ ידני'],['file','📄 PDF'],['photo','📷 תמונה'],['link','🔗 קישור'],['json','⬆️ JSON'],['qr','▦ QR']]"));
assert(app.includes('ניתוח והצעת פריט'));
assert(app.includes('שמירת המקור בלבד — ללא AI'));
assert(app.includes('function smartIngest()'));
assert(app.includes('function attachIngest(itemId)'));
assert(app.includes('המקור המקורי נשמר ולא נוצר פריט'));
assert(app.includes('צירוף בלבד — ללא AI'));
assert(app.includes('צירוף וחילוץ מידע להצעה'));
assert(manifest.includes('Family Trips Alpha 0.6.3'));

assert.equal(validateSource({kind:'file',file:{name:'booking.pdf',type:'application/pdf',size:1024}}).ok,true);
assert.equal(validateSource({kind:'file',file:{name:'ticket.jpg',type:'image/jpeg',size:1024}}).ok,false);
assert.equal(validateSource({kind:'photo',file:{name:'camera.jpg',type:'image/jpeg',size:1024}}).ok,false);

const partial=createSuggestions({
  id:'pdf-partial',
  kind:'file',
  name:'booking.pdf',
  type:'application/pdf',
  text:'Hotel: Example Stay',
  tripStartDate:'',
  extractionWarnings:['קליטת PDF היא ניסיונית — יש לבדוק כל שדה לפני אישור.'],
},new Date('2026-08-12T00:00:00Z'))[0];
assert.equal(partial.proposed.startAt,'');
assert(partial.warnings.some(warning=>String(warning).includes('ניסיונית')));

const centerStart=app.indexOf('function center()');
const centerEnd=app.indexOf('function sourceRow',centerStart);
const centerCode=app.slice(centerStart,centerEnd);
assert(centerCode.indexOf('הצעות פעילות') < centerCode.indexOf('archive-at-bottom'));
assert(centerCode.indexOf('<div class="actions"><button class="btn" data-action="create">הוספה</button></div>') < centerCode.indexOf('archive-at-bottom'));

assert(app.includes("if(!confirmOutOfRangeSave(values)){if(form.id==='edit-item-form'){state.modal={type:'edit-item',itemId:form.dataset.id};render()}return}"));

console.log('V5 Alpha 0.5.6 preserved intake-scope reset tests passed.');
