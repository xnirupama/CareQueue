import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState} from '../src/data/seed.ts';
import {applyCommand,patientsAhead} from '../src/services/domain.ts';
import {commandForAction} from '../src/services/navigation.ts';
const at='2026-10-05T12:00:00.000Z';
test('patient recovery remains pending until an authorized staff decision',()=>{
 const pending=applyCommand(initialState(),'requestRecovery',{},at,'request');
 assert.equal(pending.recovery,'pending');
 assert.throws(()=>applyCommand(pending,'approveRecovery'),/authorized staff/);
 const approved=applyCommand({...pending,role:'staff'},'approveRecovery',{},at,'approve');
 assert.equal(approved.recovery,'approved');
});
test('registration is atomic, validated and retry safe',()=>{
 const state={...initialState(),role:'staff'};
 assert.throws(()=>applyCommand(state,'register',{'Patient name':''}),/full name/);
 const fields={'Patient name':'Test patient','Phone number':''};
 const next=applyCommand(state,'register',fields,at,'same');
 assert.equal(next.queue.length,state.queue.length+1);
 assert.deepEqual(applyCommand(next,'register',fields,at,'same'),next);
 assert.deepEqual(state.queue.at(-1).token,'A143');
});
test('clinical priority changes the next call and records its reason',()=>{
 const state={...initialState(),role:'staff'};
 assert.throws(()=>applyCommand(state,'priority',{'Patient name':'Long irrelevant name'}),/clinical reason/);
 const next=applyCommand(state,'priority',{'Token':'A123','Reason category':'Clinician-confirmed urgency'},at,'priority');
 const called=applyCommand(next,'callNext',{},at,'call');
 assert.equal(called.nowServing,'A123');
 assert.equal(called.queue.find(q=>q.token==='A119').status,'completed');
 assert.equal(called.queue.find(q=>q.token==='A123').reason,'Clinician-confirmed urgency');
});
test('admin publication requires verification, navigation does not repeat mutations',()=>{
 const admin={...initialState(),role:'admin'};
 assert.throws(()=>applyCommand(admin,'broadcast'),/Verify the incident/);
 const verified=applyCommand(admin,'verifyIncident',{},at,'verify');
 assert.equal(applyCommand(verified,'broadcast',{'Message':'Service delayed'},at,'publish').broadcasts[0].message,'Service delayed');
 assert.equal(commandForAction('35:374','Action / View verified incident','156:3178'),undefined);
 assert.equal(commandForAction('156:921','Action / Return to incident','156:3178'),undefined);
 assert.equal(commandForAction('156:921','Action / Verify incident','156:3178'),'verifyIncident');
 assert.equal(commandForAction('156:3305','Action / Confirm publication','156:3432'),'broadcast');
});
test('current patient is included in the people ahead and caregiver can be revoked',()=>{
 assert.equal(patientsAhead(initialState()),6);
 const authorized=applyCommand(initialState(),'caregiver',{'Caregiver name':'Test caregiver','Phone number':'+94 77 123 4567'},at,'grant');
 assert.equal(authorized.caregiver.name,'Test caregiver');
 assert.equal(applyCommand(authorized,'revokeCaregiver',{},at,'revoke').caregiver,undefined);
});
test('all current design destinations and original assets are available locally',()=>{
 const screens=JSON.parse(fs.readFileSync('src/data/screens.json','utf8'));
 assert.equal(Object.keys(screens).length,74);
 let count=0;
 for(const screen of Object.values(screens)){
  for(const edge of screen.edges){if(edge.to)assert.ok(screens[edge.to],`${screen.id}: missing ${edge.to}`);for(const b of edge.branches||[])assert.ok(screens[b.to],`missing conditional ${b.to}`);}
  function walk(n){for(const key of ['asset','maskAsset'])if(n[key]){assert.ok(fs.statSync(`assets/figma/${n[key]}`).size>0);count++;}n.children?.forEach(walk)}walk(screen.tree);
 }
 assert.ok(count>300);
 assert.ok(!fs.readFileSync('src/data/screens.json','utf8').includes('https://'));
});

test('all 474 current prototype connections resolve to rendered controls',async()=>{
 const {resolveDesignEdge}=await import('../src/services/designNavigation.ts');
 const screens=JSON.parse(fs.readFileSync('src/data/screens.json','utf8'));
 let count=0;
 for(const screen of Object.values(screens)){
  const controls=new Map();
  function walk(node){const edge=resolveDesignEdge(node,screen);if(edge)controls.set(edge.id,edge);node.children?.forEach(walk)}walk(screen.tree);
  for(const edge of screen.edges){assert.deepEqual(controls.get(edge.id),edge,`${screen.id}: unconnected ${edge.name}`);count++;}
 }
 assert.equal(count,474);
 const caregiver=screens['16:154'];let allow;
 function find(node){if(node.props?.label==='Allow queue updates')allow=node;node.children?.forEach(find)}find(caregiver.tree);
 const edge=resolveDesignEdge(allow,caregiver);
 assert.equal(commandForAction(caregiver.id,edge.name,edge.to),'caregiver');
});

test('primary and secondary buttons retain their original visible label',()=>{
 const screens=JSON.parse(fs.readFileSync('src/data/screens.json','utf8'));
 function text(node){return node.text||node.children?.map(text).join('')||'';}
 for(const screen of Object.values(screens)){
  function walk(node){if(node.component==='CareQueueButton')assert.ok(text(node).includes(node.props.label),`${screen.id}: invisible ${node.props.label}`);node.children?.forEach(walk)}walk(screen.tree);
 }
});
