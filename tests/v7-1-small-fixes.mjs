import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterAndSortTasks,quickAccessTasks,taskDueRank,TASK_DUE_SCOPES,TASK_PRIORITY_RANK} from '../src/operational-data.js';

// src/v5-app.js cannot be imported under this project's plain-Node harness (it's a browser
// entrypoint with DOM/window side effects at module scope), so its own rendering/wiring is
// verified by source-inspection here, mirroring the established pattern throughout this test
// suite (e.g. tests/v6-7-insurance-import.mjs).
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const operationalSrc=fs.readFileSync(new URL('../src/operational-data.js',import.meta.url),'utf8');

// ---------------------------------------------------------------------------------------------
// 0.7.1 item 1 -- Task creation from the global floating "+". Previously only tasksView()'s own
// "משימה חדשה" button (data-action="task-add") could open the task-creation modal at all; the
// global "+" (data-action="create") always opened intakeModal(), whose manual-creation type
// dropdown is driven entirely by ITEM_TYPES, which Tasks were never a member of (state.tasks is a
// wholly separate array/shape from state.items -- title/owner/mode/dueDate/done, no provider/
// confirmationNumber/location). Fixed by adding a button to intakeModal()'s own choice bar that
// reuses the exact same task-add action tasksView() already uses -- the global click listener is a
// single delegated dispatcher keyed only on data-action, gated by no modal state, so this needed
// no new rendering or save logic of its own.
// ---------------------------------------------------------------------------------------------
function test_0_7_1_task_creation_reachable_from_global_add(){
  const modalFn=app.slice(app.indexOf('function intakeModal(){'),app.indexOf('function intakeModal(){')+8000);
  assert(modalFn.includes('const taskChoice=`<button data-action="task-add">✅ משימה</button>`;'),'intakeModal must offer a Task choice that reuses the existing task-add action');
  assert(modalFn.includes('${taskChoice}</div>${body}'),'the Task choice button must actually be rendered into the modal\'s choice bar, not just defined');
  console.log('PASS: 0.7.1 item 1 -- Task is now a selectable, creatable type from the global floating "+", reusing the existing task-creation modal rather than a new one');
}

// ---------------------------------------------------------------------------------------------
// 0.7.1 item 2 -- Today page packing-list shortcut. Explicit Product Owner decision: packing/
// equipment items must NOT compete for Quick Access's top-3 urgent slots the way Tasks do; instead
// a stable shortcut link to the full Packing list, mirroring the existing "כל המשימות" overflow-
// link pattern. The Quick Access section's own visibility condition had to widen too (previously
// gated on quickContent alone), since a day with no tasks/quick items must not hide this shortcut.
// ---------------------------------------------------------------------------------------------
function test_0_7_1_today_packing_shortcut_does_not_crowd_quick_access(){
  const todayFn=app.slice(app.indexOf('function todayView(){'),app.indexOf('function timelineCalendar('));
  assert(todayFn.includes("const packingShortcut=state.packing.some(list=>(list.items||[]).length)?'<button class=\"btn ghost\" data-route=\"packing\">ציוד</button>':'';"),'todayView must define a packing shortcut that links to the packing route, shown only when a packing list actually has items');
  assert(todayFn.includes('${(quickContent||packingShortcut)?'),'the Quick Access section\'s own visibility must be widened to include packingShortcut, not gated on quickContent alone -- otherwise a day with no urgent tasks/quick items would hide the packing shortcut too');
  assert(!todayFn.includes('quick.map(item=>`<button class="tile compact-tile" data-route="detail" data-id="${item.id}">'.replace('quick.map','packing.map')),'packing items themselves must never be rendered as individual Quick Access tiles -- only the shortcut link, per the explicit Product Owner decision not to crowd out the most urgent tasks');
  console.log('PASS: 0.7.1 item 2 -- Today\'s Quick Access now offers a stable packing-list shortcut (not individual packing items), visible even on a day with no urgent tasks or quick-access items');
}

// ---------------------------------------------------------------------------------------------
// 0.7.1 item 3 (V5-F09) -- category-level Add presets the current category's item type. Previously
// the category-scoped "הוספה" button (center(), the category-detail view) used the exact same
// data-action="create" as the global "+", so the manual-creation form always defaulted to 'hotel'
// regardless of which category Add was opened from. Fixed by reading the ambient state.category
// directly in intakeModal()'s manual-form branch: route() resets state.category to null on every
// navigation except entering a category-detail view via data-cat (always a genuine ITEM_TYPES key,
// since the 'games'/'packing'/'tasks'/'shopping' operational tiles use a wholly separate data-route/
// state.view path and never touch state.category at all), so it's always either a valid preset or
// unset (global "+", falls through to the original 'hotel' default) -- no extra validation needed.
// ---------------------------------------------------------------------------------------------
function test_0_7_1_category_add_presets_current_category_type(){
  assert(app.includes("proposalFields({type:state.category||'hotel',title:''"),'the manual-creation form must default its type to state.category when set, falling back to \'hotel\' only when unset (the global "+" case, where state.category is always null per route())');
  assert(app.includes("state.category=options.category||null;"),'route() must keep resetting state.category to null on every navigation that isn\'t a category-detail view, which is what makes reading it directly in intakeModal() safe -- it can never leak a stale category from a previous view');
  assert(app.includes('data-action="create">הוספה</button>'),'the category-detail view\'s own Add button must still exist and still use the shared "create" action -- this fix works by presetting the type ambiently, not by giving this button a new action or a new form');
  console.log('PASS: 0.7.1 item 3 (V5-F09) -- category-level Add now presets the current category\'s item type in the manual-creation form, falling back to \'hotel\' only for the global "+" (no category context); the user can still change the type, since the full dropdown is unchanged');
}

// ---------------------------------------------------------------------------------------------
// 0.7.1 item 4 -- Task priority (High/Normal/Low, Normal default) + due-date/priority filters,
// combined, with clear/reset and deterministic sorting. taskDueRank/TASK_DUE_SCOPES are shared
// with quickAccessTasks' own pre-existing urgency ranking (extracted from it, not reimplemented),
// so "overdue"/"today" mean the exact same thing in Quick Access and on the Tasks page's own
// filter -- confirmed directly below, not just asserted in a comment.
// ---------------------------------------------------------------------------------------------
function test_0_7_1_task_priority_default_and_rank(){
  assert.deepEqual(TASK_PRIORITY_RANK,{High:0,Normal:1,Low:2},'priority rank must order High before Normal before Low, for deterministic sorting');
  assert(app.includes("priority:'Normal'}"),'a task opened for creation with no existing record must default its priority to Normal');
  assert(app.includes("priority:['High','Normal','Low'].includes(data.get('priority'))?data.get('priority'):'Normal'"),'the task-form submit handler must validate the posted priority against the three real values, defaulting to Normal for anything else (including a missing/tampered field), never trusting the raw form value directly');
  assert(operationalSrc.includes("for(const task of state.tasks)if(!task.priority)task.priority='Normal';"),'every task created before this candidate (with no priority stored at all) must be normalized to Normal on load, not left undefined');
  console.log('PASS: 0.7.1 item 4a -- Task priority defaults to Normal both for new tasks and for every pre-existing task loaded from before this candidate, with a deterministic High/Normal/Low rank for sorting');
}
function test_0_7_1_taskDueRank_matches_quickAccessTasks_own_ranking(){
  const when='2026-08-06';
  assert.equal(taskDueRank({dueDate:'2026-08-05'},when),0,'a past due date must rank as overdue (0)');
  assert.equal(taskDueRank({dueDate:'2026-08-06'},when),1,'today\'s due date must rank as today (1)');
  assert.equal(taskDueRank({dueDate:'2026-08-07'},when),2,'a future due date must rank as upcoming (2)');
  assert.equal(taskDueRank({dueDate:''},when),3,'no due date at all must rank as undated (3), last');
  assert.deepEqual(TASK_DUE_SCOPES,['overdue','today','upcoming','undated'],'the scope name at each rank index must match the filter\'s own scope option values exactly');
  // Directly confirms the sharing claim, not just asserting it: quickAccessTasks' own real ordering
  // (unchanged from before this candidate, still tested by tests/v5-operational.mjs) must be
  // reproducible purely from taskDueRank, proving both now run on one shared ranking definition.
  const tasks=[{id:'undated',done:false,dueDate:''},{id:'future-later',done:false,dueDate:'2026-08-20'},{id:'today',done:false,dueDate:'2026-08-06'},{id:'overdue',done:false,dueDate:'2026-08-05'},{id:'future-near',done:false,dueDate:'2026-08-07'}];
  const byQuickAccess=quickAccessTasks(tasks,when,5).map(task=>task.id);
  const byRankAlone=[...tasks].sort((a,b)=>taskDueRank(a,when)-taskDueRank(b,when)||(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')).map(task=>task.id);
  assert.deepEqual(byQuickAccess,byRankAlone,'quickAccessTasks\' real ordering must be exactly reproducible from taskDueRank alone -- proof the two share one ranking definition, not two independently-maintained notions of "urgent"');
  console.log('PASS: 0.7.1 item 4b -- taskDueRank is the same ranking quickAccessTasks already used (extracted, not reimplemented), confirmed by reproducing its real ordering from the shared function alone');
}
function test_0_7_1_filterAndSortTasks_combines_filters_with_AND(){
  const tasks=[
    {id:'high-overdue',priority:'High',dueDate:'2026-08-01',done:false},
    {id:'high-today',priority:'High',dueDate:'2026-08-06',done:false},
    {id:'normal-overdue',priority:'Normal',dueDate:'2026-08-02',done:false},
    {id:'low-undated',priority:'Low',dueDate:'',done:false},
  ];
  const when='2026-08-06';
  assert.deepEqual(filterAndSortTasks(tasks,{priority:'all',due:'all'},when).map(t=>t.id),['high-overdue','normal-overdue','high-today','low-undated'],'with no filter active, every task must appear, sorted by due-date urgency first, then priority, then due date -- deterministic, not insertion order');
  assert.deepEqual(filterAndSortTasks(tasks,{priority:'High',due:'all'},when).map(t=>t.id),['high-overdue','high-today'],'the priority filter alone must include only High-priority tasks');
  assert.deepEqual(filterAndSortTasks(tasks,{priority:'all',due:'overdue'},when).map(t=>t.id),['high-overdue','normal-overdue'],'the due-date-scope filter alone must include only tasks in that exact scope');
  assert.deepEqual(filterAndSortTasks(tasks,{priority:'High',due:'overdue'},when).map(t=>t.id),['high-overdue'],'both filters together must combine with AND -- only the task matching BOTH conditions, not either');
  assert.deepEqual(filterAndSortTasks(tasks,{priority:'Low',due:'overdue'},when),[],'a combination matching nothing must return an empty list, not fall back to an unfiltered one');
  console.log('PASS: 0.7.1 item 4c -- filterAndSortTasks combines priority and due-date-scope filters with AND, with deterministic due-date-then-priority-then-date sorting');
}
function test_0_7_1_tasksView_wires_filters_and_clear_action(){
  const viewFn=app.slice(app.indexOf('function tasksView(){'),app.indexOf('function taskRow('));
  assert(viewFn.includes('id="task-filter-priority"'),'tasksView must render a priority filter select');
  assert(viewFn.includes('id="task-filter-due"'),'tasksView must render a due-date-scope filter select');
  assert(viewFn.includes("filterAndSortTasks(state.tasks,filters)"),'tasksView must actually apply the combined filter/sort to what it displays, not just render the controls decoratively');
  assert(viewFn.includes("isFiltered?'<button class=\"btn ghost\" data-action=\"task-filter-clear\">איפוס</button>':''"),'a clear/reset control must appear once a filter is active');
  assert(app.includes("else if(action==='task-filter-clear'){state.taskFilters={priority:'all',due:'all'};render()}"),'the clear action must reset both filters back to \'all\', not just one');
  assert(app.includes("else if(event.target.id==='task-filter-priority'){state.taskFilters={...state.taskFilters,priority:event.target.value};render()}"),'the priority select\'s change handler must update state.taskFilters without clobbering the due-date filter already set');
  assert(app.includes("else if(event.target.id==='task-filter-due'){state.taskFilters={...state.taskFilters,due:event.target.value};render()}"),'the due-date select\'s change handler must update state.taskFilters without clobbering the priority filter already set');
  console.log('PASS: 0.7.1 item 4d -- the Tasks page wires both filter selects and the clear action to state.taskFilters, and actually applies the combined result to the displayed list');
}
function test_0_7_1_taskRow_shows_priority_alongside_due_date(){
  const rowFn=app.slice(app.indexOf('function taskRow(task){'));
  assert(rowFn.includes("{High:'גבוהה',Normal:'רגילה',Low:'נמוכה'}[task.priority]"),'taskRow must translate the stored priority value to a displayed label');
  assert(rowFn.includes('badge priority-${task.priority'),'taskRow must render the priority as its own visible badge, alongside the due date already shown, not replacing it');
  console.log('PASS: 0.7.1 item 4e -- each task row shows both its due date (unchanged) and its priority (new), per the acceptance criteria\'s explicit requirement');
}

test_0_7_1_task_creation_reachable_from_global_add();
test_0_7_1_today_packing_shortcut_does_not_crowd_quick_access();
test_0_7_1_category_add_presets_current_category_type();
test_0_7_1_task_priority_default_and_rank();
test_0_7_1_taskDueRank_matches_quickAccessTasks_own_ranking();
test_0_7_1_filterAndSortTasks_combines_filters_with_AND();
test_0_7_1_tasksView_wires_filters_and_clear_action();
test_0_7_1_taskRow_shows_priority_alongside_due_date();
console.log('ALL PASS: 0.7.1 -- all four small independent fixes (global "+" Task creation, Today packing-list shortcut, category-preset Add, Task priority/filters) verified');
