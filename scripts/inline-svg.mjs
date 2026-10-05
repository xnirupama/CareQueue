import fs from 'node:fs';
const assets=Object.keys(JSON.parse(fs.readFileSync('design/assets.json','utf8'))).filter(name=>name.endsWith('.svg'));
const xml=Object.fromEntries(assets.map(name=>{let value=fs.readFileSync(`assets/figma/${name}`,'utf8');const prefix=name.slice(0,-4);for(const id of [...value.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])){value=value.replaceAll(`id="${id}"`,`id="${prefix}-${id}"`).replaceAll(`url(#${id})`,`url(#${prefix}-${id})`).replaceAll(`href="#${id}"`,`href="#${prefix}-${id}"`);}return[name,value]}));
fs.writeFileSync('src/data/svg.json',JSON.stringify(xml));
console.log(`Embedded ${assets.length} original SVGs for reliable offline native rendering.`);
