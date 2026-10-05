import fs from 'node:fs';
import path from 'node:path';
import {parse} from '@babel/parser';
const base=process.cwd();
const metadata=[0,1,2].flatMap(i=>JSON.parse(fs.readFileSync(`design/map-${i}.json`)).frames.map(n=>({...n,role:['patient','staff','admin'][i]})));
const links=[0,1,2].flatMap(i=>JSON.parse(fs.readFileSync(`design/links-${i}.json`)));
const conditional=JSON.parse(fs.readFileSync("design/conditional-links.json"));
const assets={};const screens={};
function evalNode(n, env){
 if(!n)return undefined;
 if(n.type==='StringLiteral'||n.type==='NumericLiteral'||n.type==='BooleanLiteral')return n.value;
 if(n.type==='Identifier')return env[n.name];
 if(n.type==='TemplateLiteral')return n.quasis.map((q,i)=>q.value.cooked+(n.expressions[i]?evalNode(n.expressions[i],env)??'':'')).join('');
 if(n.type==='JSXExpressionContainer')return evalNode(n.expression,env);
 if(n.type==='LogicalExpression'){const a=evalNode(n.left,env);return n.operator==='||'?a||evalNode(n.right,env):a&&evalNode(n.right,env);}
 if(n.type==='BinaryExpression'){const a=evalNode(n.left,env),b=evalNode(n.right,env);if(n.operator==='===')return a===b;if(n.operator==='!==')return a!==b;}
 if(n.type==='ConditionalExpression')return evalNode(evalNode(n.test,env)?n.consequent:n.alternate,env);
 if(n.type==='NullLiteral')return null;
 if(n.type==='ObjectExpression')return Object.fromEntries(n.properties.map(p=>[p.key.name||p.key.value,evalNode(p.value,env)]));
 if(n.type==='ArrayExpression')return n.elements.map(x=>evalNode(x,env));
 if(n.type==='JSXElement'||n.type==='JSXFragment')return n;
 throw Error('Unsupported expression '+n.type);
}
for(const meta of metadata){
 const file=`design/context/${meta.id.replace(':','-')}.txt`;
 const source=fs.readFileSync(meta.id==='16:95'?'design/queue-context.txt':file,'utf8').split('SUPER CRITICAL:')[0];
 const ast=parse(source,{sourceType:'module',plugins:['typescript','jsx']});const env={},functions={};let main;
 for(const statement of ast.program.body){
  if(statement.type==='VariableDeclaration')for(const d of statement.declarations)env[d.id.name]=evalNode(d.init,env);
  if(statement.type==='FunctionDeclaration')functions[statement.id.name]=statement;
  if(statement.type==='ExportDefaultDeclaration')main=statement.declaration;
 }
 function expand(n,scope=env,prefix=''){
  if(!n)return null;
  if(n.type==='JSXText'){const value=n.value.replace(/\s+/g,' ').trim();return value?{tag:'text',text:value}:null;}
  if(n.type==='JSXExpressionContainer'){const v=evalNode(n.expression,scope);return typeof v==='object'?expand(v,scope,prefix):v==null||typeof v==='boolean'?null:{tag:'text',text:String(v),binding:n.expression.type==='Identifier'?n.expression.name:undefined};}
  if(n.type==='JSXFragment')return {tag:'fragment',children:n.children.map(c=>expand(c,scope,prefix)).filter(Boolean)};
  const tag=n.openingElement.name.name,props={};
  for(const a of n.openingElement.attributes)if(a.type==='JSXAttribute')props[a.name.name]=a.value?evalNode(a.value,scope):true;
  if(functions[tag]){
   const fn=functions[tag],local={...env};const param=fn.params[0];
   if(param?.type==='ObjectPattern')for(const p of param.properties){const key=p.key.name;local[key]=Object.hasOwn(props,key)?props[key]:p.value.type==='AssignmentPattern'?evalNode(p.value.right,env):undefined;}
   for(const statement of fn.body.body)if(statement.type==='VariableDeclaration')for(const d of statement.declarations)local[d.id.name]=evalNode(d.init,local);
   const returned=fn.body.body.find(x=>x.type==='ReturnStatement').argument;
   const tree=expand(returned,local,prefix+tag+'.');tree.component=tag;tree.props={};
   if(param?.type==='ObjectPattern')for(const p of param.properties)if(p.key.name!=='className')tree.props[p.key.name]=local[p.key.name];
   // Instance names and labels determine the corresponding prototype action.
   tree.actionLabel=props.label||props.title;tree.key=prefix+tag+'.'+(props.label||props.title||props.value||'');
   return tree;
  }
  const tree={tag,classes:props.className||'',id:props['data-node-id'],name:props['data-name'],css:props.style,children:n.children.map(c=>expand(c,scope,prefix)).filter(Boolean)};
  if(tag==='img'){const url=props.src;if(!url)throw Error('Missing image');const key=path.basename(new URL(url).pathname);assets[key]=url;tree.asset=key;tree.alt=props.alt;}
  if(tree.css?.maskImage){const url=tree.css.maskImage.match(/url\("(.*)"\)/)?.[1];if(url){const key=path.basename(new URL(url).pathname);assets[key]=url;tree.maskAsset=key;}delete tree.css;}
  return tree;
 }
 if(!main)throw Error('Missing code '+meta.id);
 const tree=expand(main.body.body.find(x=>x.type==='ReturnStatement').argument);
 const edges=links.filter(l=>l[3]===meta.id).map(([id,name,to])=>({id,name,to,branches:conditional.find(c=>c.id===id)?.branches}));
 screens[meta.id]={...meta,tree,edges};
}
fs.writeFileSync('src/data/screens.json',JSON.stringify(screens));
fs.writeFileSync('design/assets.json',JSON.stringify(assets,null,2));
fs.mkdirSync('assets/figma',{recursive:true});
fs.writeFileSync('src/data/assets.ts','// Original Figma assets. Downloaded locally; no expiring URLs.\nexport const assets: Record<string, number> = {\n'+Object.keys(assets).map(k=>`  '${k}': require('../../assets/figma/${k}'),`).join('\n')+'\n};\n');
console.log(`Imported ${Object.keys(screens).length} screens, ${Object.values(screens).reduce((n,s)=>n+s.edges.length,0)} current button connections, ${Object.keys(assets).length} original assets.`);
