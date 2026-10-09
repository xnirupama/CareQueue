import Svg, {Circle, Rect, Path, G, Text as SvgText} from 'react-native-svg';

export function CareQueueMark({size=38}: {size?: number}) {
 return <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}><Rect width="48" height="48" rx="15" fill="#09386b"/><Path d="M21 12h6v9h9v6h-9v9h-6v-9h-9v-6h9z" fill="#b8e5d5"/></Svg>;
}
function Person({x,y,color='#88baa7'}: {x:number;y:number;color?:string}) {
 return <G transform={`translate(${x} ${y})`}><Circle cx="0" cy="0" r="16" fill="#edc6ad"/><Path d="M-17 -3q0-23 18-18q19 0 16 20l-8-12q-7 7-25 10" fill="#193952"/><Path d="M-27 35q0-20 27-20q27 0 27 20v36h-54z" fill={color}/><Path d="M-16 72v36M16 72v36" stroke="#193952" strokeWidth="10" strokeLinecap="round"/></G>;
}
export default function WelcomeArt({step=0}: {step?:number}) {
 return <Svg width="100%" height="100%" viewBox="0 0 360 300" accessible={false}>
  <Circle cx="180" cy="145" r="126" fill={step===1?'#e2effb':'#d5ece2'}/><Circle cx="300" cy="64" r="12" fill="#e6bc65"/><Circle cx="47" cy="189" r="7" fill="#9fc7b7"/>
  <Path d="M44 262h272" stroke="#b6d0c5" strokeWidth="3" strokeLinecap="round"/>
  {step===0?<>
   <Rect x="131" y="34" width="126" height="224" rx="25" fill="#09386b"/><Rect x="138" y="41" width="112" height="208" rx="20" fill="#fff"/><Rect x="165" y="44" width="58" height="10" rx="5" fill="#09386b"/>
   <SvgText x="154" y="82" fill="#607b89" fontSize="10" fontWeight="600">GENERAL OPD</SvgText><SvgText x="154" y="109" fill="#09386b" fontSize="19" fontWeight="700">Your queue,</SvgText><SvgText x="154" y="132" fill="#09386b" fontSize="19" fontWeight="700">at a glance.</SvgText>
   <Rect x="151" y="147" width="87" height="67" rx="12" fill="#e4f2eb"/><SvgText x="194" y="172" textAnchor="middle" fill="#526c65" fontSize="10">YOUR TOKEN</SvgText><SvgText x="194" y="200" textAnchor="middle" fill="#09386b" fontSize="25" fontWeight="700">A125</SvgText>
   <Rect x="217" y="112" width="104" height="49" rx="14" fill="#09386b"/><Circle cx="235" cy="136" r="5" fill="#b8e5d5"/><SvgText x="248" y="132" fill="#fff" fontSize="11" fontWeight="700">3 ahead</SvgText><SvgText x="248" y="147" fill="#c4d9e7" fontSize="9">Stay in the loop</SvgText><Person x={86} y={125}/>
  </>:step===1?<>
   <Rect x="87" y="60" width="198" height="162" rx="19" fill="#09386b"/><Rect x="94" y="67" width="184" height="148" rx="14" fill="#fff"/>
   <SvgText x="113" y="91" fill="#52697a" fontSize="11" fontWeight="600">NOW SERVING</SvgText><SvgText x="113" y="136" fill="#09386b" fontSize="37" fontWeight="700">A119</SvgText><Rect x="110" y="151" width="150" height="43" rx="12" fill="#e7f2fb"/>
   <Path d="M126 169v11m-4-5h8" stroke="#09386b" strokeWidth="2"/><SvgText x="142" y="178" fill="#09386b" fontSize="13" fontWeight="600">Room 04</SvgText>
   <Rect x="202" y="29" width="78" height="38" rx="14" fill="#b8e5d5"/><Path d="m218 49 5 5 11-13" fill="none" stroke="#09386b" strokeWidth="3" strokeLinecap="round"/><SvgText x="240" y="52" fill="#09386b" fontSize="11" fontWeight="700">Ready</SvgText>
   <Path d="M62 239h196" stroke="#91b8d9" strokeWidth="3" strokeDasharray="6 7"/><Path d="m248 232 10 7-10 7" fill="none" stroke="#09386b" strokeWidth="3"/><Person x={62} y={148} color="#90b6d7"/>
  </>:<>
   <Path d="M180 39l59 23v57q0 46-59 75q-59-29-59-75V62z" fill="#09386b"/><Path d="m154 110 18 18 36-43" fill="none" stroke="#b8e5d5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
   <Person x={90} y={141} color="#88baa7"/><Person x={270} y={141} color="#91b7d8"/>
   <Rect x="112" y="209" width="136" height="42" rx="15" fill="#fff"/><Circle cx="131" cy="230" r="9" fill="#d5ece2"/><Path d="m127 230 3 3 5-6" fill="none" stroke="#09386b" strokeWidth="2"/><SvgText x="147" y="234" fill="#09386b" fontSize="11" fontWeight="600">Shared with care</SvgText>
   <Path d="M114 184q66 40 132 0" stroke="#9fc7b7" strokeWidth="3" fill="none" strokeDasharray="5 6"/>
  </>}
 </Svg>;
}
