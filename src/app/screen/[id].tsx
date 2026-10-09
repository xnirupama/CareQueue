import {useCallback,useMemo,useState} from 'react';
import {useLocalSearchParams,useRouter,Redirect} from 'expo-router';
import {View,Text,Pressable,Platform,useWindowDimensions,StyleSheet,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import screensData from '../../data/screens.json';
import type {DesignScreen,DesignNode} from '../../data/types';
import {DesignRenderer,fieldDefaults} from '../../components/DesignRenderer';
import {useStore} from '../../services/store';
import {logout} from '../../services/firebase';
import {exportReport} from '../../services/report';
import {commandForAction} from '../../services/navigation';
const screens=screensData as unknown as Record<string,DesignScreen>;
function gatherFields(node:DesignNode,fields:Record<string,string>){if(node.component==='CareQueueField'&&node.props)fields[node.props.label||'Phone number']=node.props.value||'';node.children?.forEach(n=>gatherFields(n,fields));}
const defaults:Record<string,Record<string,string>>={patient:{...fieldDefaults.patient},staff:{...fieldDefaults.staff},admin:{}};
for(const screen of Object.values(screens))gatherFields(screen.tree,defaults[screen.role]);
let drafts={...defaults};
export default function Screen(){const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),{width}=useWindowDimensions();const {isLive,state,ready,user,connected,error,setError,execute,update,setRole}=useStore();const screenId=id?.replace('-',':'),screen=screens[screenId];const [fields,setFields]=useState(()=>({...drafts[screen?.role||'patient']})),[busy,setBusy]=useState(false);

 const onField=useCallback((label:string,value:string)=>{setFields(f=>({...f,[label]:value}));drafts[state.role]={...drafts[state.role],[label]:value};},[state.role]);
 const onAction=useCallback(async(label:string,to?:string)=>{if(busy)return;setError('');setBusy(true);try{
  if(to==='139:376'){const selected=label.match(/A\d{3,6}/)?.[0];if(selected)update({selectedToken:selected});}
  if(/Toggle SMS/i.test(label)){update({sms:!state.sms});return;}
  if(/Toggle app alerts/i.test(label)){update({appAlerts:!state.appAlerts});return;}
  if(/Sinhala|සිංහල/.test(label))update({language:'si'});
  if(/Tamil|தமிழ்/.test(label))update({language:'ta'});
  if(label==='English language')update({language:'en'});
  if(/large text|text size/i.test(label)&&!to){update({largeText:!state.largeText});return;}
  if(to==='151:769'&&Platform.OS!=='web'){router.push('/scan');return;}
  if(to==='157:1337'){await exportReport(state,!isLive);}
  if(to==='16:95'&&state.ticketStatus==='missed')to='16:227';
  if(to==='16:95'&&state.nowServing===state.myToken&&state.myToken!=='—')to='18:636';
  if(to==='16:95'&&state.recovery==='pending')to='160:1464';
  if(to==='151:835'&&state.appAlerts&&Platform.OS!=='web'){const permission=await Notifications.requestPermissionsAsync();if(permission.status!=='granted'){update({appAlerts:false});setError('App notifications are disabled. You can still follow your queue here.');return;}}
  const command=commandForAction(screenId,label,to);if(command)await execute(command,{...fields,...command==='priority'?{'Token':state.selectedToken||state.queue.find(q=>q.status==='waiting')?.token||'A121'}:{}});
  if(to==='154:1237'&&screenId==='140:1066')await execute('offline',fields);
  if(to==='16:95'&&/connect/i.test(label)){const entered=screenId==='151:769'?(state.scannedToken||state.myToken):(fields['Queue number']||state.myToken);if(entered.toUpperCase().trim()!==state.myToken)throw Error('This token does not match your registered visit. Ask Counter 03 for assistance.');}
  if(to==='18:599'&&/retrieve|queue details/i.test(label)){const token=fields['Queue token']||fields['Token number']||fields['Queue reference'];if(token&&isLive)throw Error('Your hospital-issued token appears automatically after registration.');}
  if(to&&screens[to]){router.push({pathname:'/screen/[id]',params:{id:to.replace(':','-')}});return;}
  if(/close notifications/i.test(label)){router.back();return;}
  if(/save|request|confirm|apply|publish|download|scan|review/i.test(label))throw Error('This action needs additional service setup. Open Help for assistance.');
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}},[busy,state,update,screenId,fields,execute,router,setError,isLive]);
 const ctx=useMemo(()=>({screen,state,fields,onField,onAction,busy,isLive,scale:Platform.OS==='web'&&width>=720?1:Math.min(width,600)/375}),[screen,state,fields,onField,onAction,busy,width,isLive]);
 if(!ready)return <ActivityIndicator/>;if(!screen)return <View style={s.toolbar}><Text>Screen unavailable.</Text><Pressable onPress={()=>router.replace('/')}><Text>Return home</Text></Pressable></View>;
 if(isLive&&!user)return <Redirect href="/account"/>;
 if(screen.role==='admin'&&(!isLive||!user||state.role!=='admin'))return <Redirect href="/admin-login"/>;if(isLive&&screen.role!==state.role)return <Redirect href="/"/>;
 return <SafeAreaView style={s.page} edges={['top','bottom']}><View style={s.shell}>
 {Platform.OS==='web'&&width>=720?<View style={s.toolbar}><Text style={s.logo}>CareQueue</Text><Text style={s.meta}>{isLive?'Connected account':'Demo · sample data'}</Text>{!isLive?<View style={s.roles}>{(['patient','staff'] as const).map(role=><Pressable key={role} accessibilityRole="button" style={[s.role,state.role===role&&s.selected]} onPress={()=>{setFields({...drafts[role]});setRole(role);router.replace({pathname:'/screen/[id]',params:{id:role==='patient'?'16-7':role==='staff'?'138-4':'35-168'}});}}><Text style={s.roleText}>{role}</Text></Pressable>)}</View>:null}<Text style={s.meta}>{screen.name}</Text><Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={s.roleText}>← Previous screen</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>router.push('/account')}><Text style={s.roleText}>Account & demo roles</Text></Pressable>{isLive?<Pressable onPress={()=>logout()}><Text style={s.roleText}>Sign out</Text></Pressable>:null}</View>:null}
 <View style={[s.device,(Platform.OS!=='web'||width<720)&&{flex:1,width:'100%',height:'100%',borderRadius:0,borderWidth:0}]}><DesignRenderer node={screen.tree} ctx={ctx} root/>{!connected?<View style={s.connection}><Text accessibilityRole="alert" style={s.errorText}>Offline: last known queue. Ask the counter for assistance.</Text></View>:null}<Pressable accessibilityRole="button" accessibilityLabel="Account and demo roles" onLongPress={()=>router.push('/account')} onPress={()=>router.push('/account')} delayLongPress={500} style={{position:'absolute',top:0,left:0,width:140*ctx.scale,height:76*ctx.scale}} />{error?<View style={s.error}><Text accessibilityRole="alert" style={s.errorText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={()=>setError('')}><Text style={s.errorText}>Dismiss</Text></Pressable></View>:null}</View>
 </View></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#e9eff5'},shell:{flex:1,flexDirection:Platform.OS==='web'?'row':'column',justifyContent:'center',alignItems:Platform.OS==='web'?'center':'stretch',gap:32},device:{width:375,height:844,backgroundColor:'#f8fafc',borderRadius:24,borderWidth:1,borderColor:'#ccdbe3',overflow:'hidden'},toolbar:{width:250,gap:20,padding:24},logo:{fontFamily:'Inter_700Bold',color:'#09386b',fontSize:24},meta:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18,color:'#52697a'},roles:{flexDirection:'row',gap:6},role:{padding:10,borderRadius:10,backgroundColor:'white'},selected:{backgroundColor:'#d6ebf2'},roleText:{fontFamily:'Inter_600SemiBold',fontSize:12,color:'#09386b'},connection:{position:'absolute',top:36,left:12,right:12,padding:12,backgroundColor:'#fff7e2',borderRadius:12},error:{position:'absolute',bottom:80,left:12,right:12,padding:16,borderRadius:12,backgroundColor:'#fff7e2',gap:8},errorText:{fontFamily:'Inter_500Medium',fontSize:13,color:'#ad4a0a'}});
