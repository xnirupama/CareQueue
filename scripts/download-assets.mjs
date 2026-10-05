import fs from 'node:fs';
const assets=JSON.parse(fs.readFileSync('design/assets.json'));
const entries=Object.entries(assets);let count=0;
for(let i=0;i<entries.length;i+=12)await Promise.all(entries.slice(i,i+12).map(async([name,url])=>{
 const target=`assets/figma/${name}`;if(fs.existsSync(target)&&fs.statSync(target).size>0)return;
 const response=await fetch(url);if(!response.ok)throw Error(`${name}: ${response.status}`);
 fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));count++;
}));
console.log(`${count} original assets downloaded. ${entries.length} local asset slots verified.`);
