import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDateRange,quickAccessTasks,uniqueRecordsById} from '../src/operational-data.js';

const app=fs.readFileSync('src/v5-app.js','utf8');
const main=fs.readFileSync('src/main.js','utf8');
const styles=fs.readFileSync('src/styles.css','utf8');
const netlify=fs.readFileSync('netlify.toml','utf8');

assert(main.includes('<p class="auth-kicker">Alpha 0.6.3</p>'));
assert(!main.includes('V4 — Smart Ingestion'));

const flight={id:'flight-1',type:'flight'};
const insurance={id:'insurance-1',type:'insurance'};
assert.deepEqual(uniqueRecordsById([undefined,flight,null,insurance,flight],5),[flight,insurance]);
assert.deepEqual(uniqueRecordsById([undefined,insurance],5),[insurance]);
assert(app.includes('uniqueRecordsById([op.currentHotel,op.nextTransport,...op.critical].filter'));

assert(app.includes('function timelineCalendar(bounds)'));
assert(app.includes("if(view==='timeline'&&state.view!=='timeline')"));
assert(app.includes("state.timelineMode='day'"));
assert(app.includes("state.timelineMode!=='week'"));
assert(!app.includes("['calendar','📅','Calendar']"));
assert(!app.includes('function calendar()'));

assert(app.includes('requiredLabel'));
assert(app.includes('aria-required="true"'));
assert(styles.includes('.required-note'));

assert.deepEqual(normalizeDateRange('2026-01-12T10:00','2026-01-10T10:00'),{start:'2026-01-12T10:00',end:'2026-01-12T10:00'});
assert.deepEqual(normalizeDateRange('2026-01-12T10:00','2026-01-12T10:00'),{start:'2026-01-12T10:00',end:'2026-01-12T10:00'});
assert.deepEqual(normalizeDateRange('2026-01-12T10:00','2026-01-15T10:00'),{start:'2026-01-12T10:00',end:'2026-01-15T10:00'});

assert(app.includes('data-action="reset-trip-data"'));
assert(app.includes('data-action="delete-current-trip"'));
assert(app.includes('async function resetCurrentTrip(removeTrip)'));
assert(app.includes("if(removeTrip)localStorage.removeItem(KEY)"));

assert(app.includes("if(action==='create'){state.modal={type:'intake',source:'manual'};render()}"));
assert(app.includes("proposalFields({type:'hotel'"));

const orderedTasks=quickAccessTasks([
  {id:'undated',done:false,dueDate:''},
  {id:'future-later',done:false,dueDate:'2026-08-20'},
  {id:'today',done:false,dueDate:'2026-08-06'},
  {id:'overdue',done:false,dueDate:'2026-08-05'},
  {id:'future-near',done:false,dueDate:'2026-08-07'},
  {id:'complete',done:true,dueDate:'2026-08-04'},
],'2026-08-06',4);
assert.deepEqual(orderedTasks.map(task=>task.id),['overdue','today','future-near','future-later']);
assert(app.includes("quickAccessTasks(eligibleTasks,today(),3)"));
assert(app.includes('כל המשימות'));
assert(app.includes("else if(action==='task-edit')"));
assert(app.includes("existing=state.tasks.find(task=>task.id===form.dataset.id)"));
assert(app.includes("proposalFields(item,{alwaysWebsite:true})"));
assert(!app.includes('פעולה זו אינה משפיעה על טיולים אחרים'));
assert(styles.includes('overflow-wrap:anywhere'));
assert.match(netlify,/Cross-Origin-Opener-Policy\s*=\s*"same-origin-allow-popups"/);
assert(app.includes("const visibleTypes=Object.entries(ITEM_TYPES).filter(([key])=>key!=='link')"));
assert(!app.includes("['locations','📍','מיקומים'"));
assert(!app.includes('source-link-title'));
assert(app.includes("['link','🔗 קישור']"));
assert(app.includes('function smartImportPanel(source)'));
assert(app.includes('function confirmOutOfRangeSave(values)'));
assert(app.includes("if(!confirmOutOfRangeSave(values)){if(form.id==='edit-item-form')"));
assert(main.includes('if (!navigator.onLine && hasLocalTrip())'));
assert(main.includes("window.addEventListener('online'"));

console.log('V5 Alpha 0.5.4 correction tests passed.');
