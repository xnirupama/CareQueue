import type {TextStyle, ViewStyle} from 'react-native';
export type DesignStyle=ViewStyle & TextStyle;
const cache=new Map<string,DesignStyle>();
const fontWeights:Record<string,string>={normal:'Inter_400Regular',medium:'Inter_500Medium',semibold:'Inter_600SemiBold',bold:'Inter_700Bold',extrabold:'Inter_800ExtraBold',black:'Inter_900Black'};
function value(v:string):number|string { v=v.replace(/^color:/,'').replace(/var\([^,]+,([^)]*)\)/g,'$1').replaceAll('_',' ');if(v.endsWith('px'))return parseFloat(v);if(v==='0')return 0;return v; }
export function designStyles(classes=''):DesignStyle {
 if(cache.has(classes))return cache.get(classes)!;
 const style:Record<string,unknown>={}; const transforms:Record<string,string|number>[]=[];
 const pairs:Record<string,unknown>={absolute:'absolute',relative:'relative'};
 for(const c of classes.split(' ')){
  if(c in pairs)style.position=pairs[c];
  if(c==='flex')style.flexDirection='row';
  if(c==='flex-col')style.flexDirection='column';
  if(c==='flex-[1_0_0]'){style.flexGrow=1;style.flexShrink=1;style.flexBasis=0;}
  if(c==='shrink-0')style.flexShrink=0;
  if(c.startsWith('items-'))style.alignItems=c.replace('items-','').replace('start','flex-start').replace('end','flex-end');
  if(c.startsWith('justify-'))style.justifyContent=c.replace('justify-','').replace('between','space-between');
  if(c==='overflow-hidden'||c==='overflow-clip')style.overflow='hidden';
  if(c==='border')style.borderWidth=1;
  if(c==='border-2')style.borderWidth=2;
  if(c==='border-4')style.borderWidth=4;
  if(c==='border-t')style.borderTopWidth=1;
  if(c==='border-b')style.borderBottomWidth=1;
  if(c==='bg-white')style.backgroundColor='white';
  if(c==='text-white')style.color='white';
  if(c==='text-center'||c==='text-left'||c==='text-right')style.textAlign=c.slice(5);
  if(c.startsWith('font-')&&fontWeights[c.slice(5)])style.fontFamily=fontWeights[c.slice(5)];
  if(c.includes("Abhaya_Libre")||c.includes('AbhayaLibre'))style.fontFamily='AbhayaLibre_700Bold';
  if(c==='italic')style.fontFamily='Inter_400Regular_Italic';
  if(c==='uppercase')style.textTransform='uppercase';
  if(c.startsWith('opacity-'))style.opacity=parseFloat(c.slice(8))/100;
  if(c==='w-full'||c==='size-full')style.width='100%';
  if(c==='size-full')style.height='100%';
  if(c==='min-w-full')style.minWidth='100%';
  if(c==='min-w-px')style.minWidth=1;
  if(c==='min-h-px')style.minHeight=1;
  if(c==='h-px')style.height=1;
  if(c==='pb-px')style.paddingBottom=1;
  if(c==='mb-0')style.marginBottom=0;
  if(c==='left-0')style.left=0;
  if(c==='right-0')style.right=0;
  if(c==='top-0')style.top=0;
  if(c==='inset-0')Object.assign(style,{top:0,left:0,right:0,bottom:0});
  if(c==='-translate-y-1/2')transforms.push({translateY:'-50%'});
  if(c==='-translate-x-1/2')transforms.push({translateX:'-50%'});
  const m=c.match(/^(.+?)-\[(.*)\]$/);if(!m)continue;
  const [,key,raw]=m,v=value(raw);
  const map:Record<string,string>={w:'width',h:'height','min-w':'minWidth','min-h':'minHeight',gap:'gap',bg:'backgroundColor',border:'borderColor',rounded:'borderRadius','rounded-tl':'borderTopLeftRadius','rounded-tr':'borderTopRightRadius','rounded-bl':'borderBottomLeftRadius','rounded-br':'borderBottomRightRadius',leading:'lineHeight',tracking:'letterSpacing',left:'left',right:'right',top:'top',bottom:'bottom',p:'padding',px:'paddingHorizontal',py:'paddingVertical',pt:'paddingTop',pb:'paddingBottom',pl:'paddingLeft',pr:'paddingRight',mb:'marginBottom'};
  if(map[key]){if(key==='leading'&&(v===0||v==='normal'))continue;if((key==='w'||key==='h')&&v==='min-content')continue;style[map[key]]=v;}
  if(key==='size'){style.width=v;style.height=v;}
  if(key==='text')style[raw.endsWith('px')?'fontSize':'color']=v;
  if(key==='inset'){const vs=String(v).split(' ').map(value);const t=vs[0],r=vs[1]??t,b=vs[2]??t,l=vs[3]??r;Object.assign(style,{top:t,right:r,bottom:b,left:l});}
  if(key==='shadow'||key==='drop-shadow'){style.boxShadow=String(v);}
 }
 if(transforms.length)style.transform=transforms;
 cache.set(classes,style as DesignStyle);return style as DesignStyle;
}
export const textStyleKeys=['fontFamily','fontSize','lineHeight','color','letterSpacing','textAlign','textTransform'] as const;
export function inheritedText(style:DesignStyle):TextStyle {const result:Record<string,unknown>={};for(const key of textStyleKeys)if(style[key]!==undefined)result[key]=style[key];return result;}
export function viewOnly(style:DesignStyle):ViewStyle {const result={...style};for(const key of textStyleKeys)delete result[key];return result;}
