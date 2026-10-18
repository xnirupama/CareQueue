import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeFooterTab,footerDestination,footerTabs} from '../src/services/footer-navigation.ts';

test('footer tracks staff queue/registration/recovery details rather than the prototype Home state',()=>{
 for(const id of ['139:297','139:376','154:605','154:675','154:889'])assert.equal(activeFooterTab('staff','',id),'queue');
 for(const id of ['139:223','154:453','154:528'])assert.equal(activeFooterTab('staff','',id),'patients');
 for(const id of ['139:445','154:957','154:1025'])assert.equal(activeFooterTab('staff','',id),'requests');
 assert.equal(activeFooterTab('staff','/patient-records'),'patients');
 assert.equal(activeFooterTab('staff','/recovery'),'requests');
});
test('all 74 designed states select exactly one valid role tab, including admin incident and paused queue states',()=>{
 const screens=JSON.parse(fs.readFileSync('src/data/screens.json','utf8'));
 for(const screen of Object.values(screens))assert.equal(footerTabs[screen.role].filter(tab=>tab.id===activeFooterTab(screen.role,`/screen/${screen.id.replace(':','-')}`)).length,1,screen.name);
 assert.equal(activeFooterTab('admin','/screen/405-2123'),'queue');
 assert.equal(activeFooterTab('admin','/screen/156-921'),'incidents');
 assert.equal(activeFooterTab('admin','/staff-approvals'),'more');
 assert.equal(activeFooterTab('patient','/preferences'),'alerts');
 assert.equal(activeFooterTab('patient','/account'),'more');
});
test('footer navigation retains missed/called/pending patient states and verified admin incidents',()=>{
 const state={ticketStatus:'waiting',recovery:'none',incidentVerified:false};
 assert.deepEqual(footerDestination('patient','queue',{...state,ticketStatus:'missed'}),{screenId:'16:227'});
 assert.deepEqual(footerDestination('patient','queue',{...state,ticketStatus:'called'}),{screenId:'18:636'});
 assert.deepEqual(footerDestination('patient','queue',{...state,recovery:'pending'}),{screenId:'160:1464'});
 assert.deepEqual(footerDestination('admin','incidents',{...state,incidentVerified:true}),{screenId:'156:3178'});
 assert.deepEqual(footerDestination('patient','more',state),{path:'/account'});
});
