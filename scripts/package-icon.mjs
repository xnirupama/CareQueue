import fs from 'node:fs';
import sharp from 'sharp';
const screens=JSON.parse(fs.readFileSync('src/data/screens.json','utf8'));
let source;
function walk(n){if(n.component==='CareQueueIconQueue')source=n.children.find(c=>c.asset)?.asset;n.children?.forEach(walk)}
walk(screens['16:95'].tree);
if(!source)throw Error('Original Figma queue icon is missing');
const icon=await sharp(`assets/figma/${source}`).resize(672,672).png().toBuffer();
await sharp({create:{width:1024,height:1024,channels:4,background:'#f0f7ff'}}).composite([{input:icon,left:176,top:176}]).flatten({background:'#f0f7ff'}).png().toFile('assets/icon.png');
await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:icon,left:176,top:176}]).png().toFile('assets/adaptive-icon.png');
await sharp('assets/icon.png').resize(64,64).png().toFile('assets/favicon.png');
console.log('Packaged original Figma CareQueue queue icon.');
