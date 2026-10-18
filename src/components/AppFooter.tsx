import {Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {usePathname,useRouter} from 'expo-router';
import Svg,{Path,Circle} from 'react-native-svg';
import {useStore} from '../services/store';
import {activeFooterTab,footerDestination,footerTabs,type FooterTab} from '../services/footer-navigation';

function TabIcon({tab,color}:{tab:FooterTab;color:string}){
 const paths:Partial<Record<FooterTab,string>>={home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',queue:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',visit:'M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2',alerts:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',patients:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M15 3a4 4 0 0 1 0 8',requests:'M9 5H6a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-3M9 3h6v4H9zM8 12h8M8 16h5',incidents:'m12 3 9 17H3zM12 9v5M12 17h.01'};
 return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[tab]?<Path d={paths[tab]}/>:<><Circle cx={5} cy={12} r={1.5}/><Circle cx={12} cy={12} r={1.5}/><Circle cx={19} cy={12} r={1.5}/></>}{tab==='patients'?<Circle cx={9} cy={7} r={4}/>:null}</Svg>;
}
export function AppFooter({screenId,disabled=false,style}:{screenId?:string;disabled?:boolean;style?:StyleProp<ViewStyle>}){
 const router=useRouter(),pathname=usePathname(),{state,isLive,user,ready,accountProfile}=useStore();
 if(!ready||(isLive&&!user)||(isLive&&accountProfile?.accountType==='staff'&&state.role==='patient')||['/login','/patient-login','/staff-login','/admin-login','/register','/forgot-password','/onboarding'].includes(pathname))return null;
 const selected=activeFooterTab(state.role,pathname,screenId);
 function open(tab:FooterTab){
  const target=footerDestination(state.role,tab,state);
  if('path' in target){if(pathname!==target.path)router.replace(target.path);return;}
  if((screenId||pathname.split('/').at(-1)||'').replace('-',':')!==target.screenId)router.replace({pathname:'/screen/[id]',params:{id:target.screenId.replace(':','-')}});
 }
 return <View accessibilityRole="tablist" accessibilityLabel={`${state.role} navigation`} style={[s.bar,style]}>{footerTabs[state.role].map(tab=>{
  const active=tab.id===selected;
  return <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={()=>open(tab.id)} style={({pressed})=>[s.tab,active&&s.active,pressed&&s.pressed,disabled&&{opacity:.5}]}>
   <View style={[s.indicator,{backgroundColor:active?'#397460':'transparent'}]}/><TabIcon tab={tab.id} color={active?'#09386b':'#647b87'}/><Text style={[s.label,active&&s.activeLabel]}>{tab.label}</Text>
  </Pressable>;
 })}</View>;
}
const s=StyleSheet.create({bar:{flexDirection:'row',paddingHorizontal:8,paddingTop:7,paddingBottom:8,minHeight:76,gap:4,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#e1e9e5',boxShadow:'0 -3px 16px rgba(9, 56, 107, 0.04)'},tab:{flex:1,minWidth:0,minHeight:60,alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:2,paddingVertical:5,borderRadius:14},active:{backgroundColor:'#e4f2eb'},indicator:{position:'absolute',top:0,width:16,height:3,borderRadius:3},label:{fontFamily:'Inter_500Medium',fontSize:10,lineHeight:15,color:'#52697a',textAlign:'center'},activeLabel:{fontFamily:'Inter_700Bold',color:'#09386b'},pressed:{opacity:.7}});
