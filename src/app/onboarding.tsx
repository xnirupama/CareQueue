import {useEffect,useState} from 'react';
import {AccessibilityInfo,Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {useRouter} from 'expo-router';
import {ActionButton,Brand,Notice,TextLink,colors} from '../components/AccountUI';
import WelcomeArt from '../components/WelcomeArt';
import {useStore} from '../services/store';
import {configured} from '../services/firebase';

const slides=[
 {label:'A little less waiting',title:'Your queue.\nYour peace of mind.',description:'See your token and the people ahead, so you can spend less time wondering about your turn.',detail:'Queue updates, all in one place',step:0},
 {label:'A little more clarity',title:'Know your turn.\nFind your way.',description:'Follow the latest staff updates and room directions. When it’s your turn, you’ll know what to do next.',detail:'Stay informed throughout your visit',step:1},
 {label:'Care feels better together',title:'Share the visit.\nKeep control.',description:'Invite a trusted caregiver to follow your token. Choose what to share, and stop sharing whenever you want.',detail:'Your visit. Your choice.',step:2},
];
export default function Onboarding(){
 const router=useRouter(),{completeOnboarding,setDataMode,isLive,user,onboardingComplete}=useStore();
 const [page,setPage]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [fade]=useState(()=>new Animated.Value(1)),slide=slides[page];
 useEffect(()=>{let active=true;AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(!active)return;if(reduced){fade.setValue(1);return;}fade.setValue(0);Animated.timing(fade,{toValue:1,duration:250,useNativeDriver:true}).start();}).catch(()=>fade.setValue(1));AccessibilityInfo.announceForAccessibility(`Welcome screen ${page+1} of 3. ${slides[page].title.replace('\n',' ')}`);return()=>{active=false;fade.stopAnimation();};},[page,fade]);
 async function finish(){if(busy)return;setBusy(true);setMessage('');try{if(!onboardingComplete)setDataMode(configured);await completeOnboarding();router.replace(onboardingComplete&&(!isLive||user)?'/':'/login');}catch{setMessage('Could not save your welcome settings. Please try again.');}finally{setBusy(false);}}
 return <SafeAreaView style={s.page}><LinearGradient colors={['#f3f9f5','#e4f1e9']} style={s.fill}><ScrollView contentContainerStyle={s.scroll}><View style={s.shell}>
  <View style={s.top}><Brand/><TextLink label="Skip" disabled={busy} onPress={finish}/></View>
  <Animated.View style={[s.content,{opacity:fade}]}><View style={s.art}><WelcomeArt step={slide.step}/></View><View style={s.pill}><View style={s.dot}/><Text style={s.pillText}>{slide.detail}</Text></View><Text style={s.eyebrow}>{slide.label}</Text><Text accessibilityRole="header" style={s.title}>{slide.title}</Text><Text style={s.description}>{slide.description}</Text></Animated.View>
  <Notice message={message}/><View style={s.progress}>{slides.map((_,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`Welcome screen ${i+1} of 3`} accessibilityState={{selected:i===page,disabled:busy}} disabled={busy} onPress={()=>setPage(i)} style={s.progressTouch}><View style={[s.progressDot,i===page&&s.activeDot]}/></Pressable>)}</View>
  <View style={s.actions}>{page>0?<View style={s.back}><TextLink label="Back" disabled={busy} onPress={()=>setPage(p=>p-1)}/></View>:null}<View style={s.next}><ActionButton label={page===2?'Get started':'Next'} busy={busy} onPress={page===2?finish:()=>setPage(p=>p+1)}/></View></View>
  <Text style={s.footer}>Made for a calmer hospital visit.</Text>
 </View></ScrollView></LinearGradient></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f3f9f5'},fill:{flex:1},scroll:{flexGrow:1,justifyContent:'center',padding:24},shell:{width:'100%',maxWidth:480,alignSelf:'center',gap:14},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},content:{alignItems:'center',gap:16},art:{height:290,width:'100%',maxWidth:370},pill:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:10,borderRadius:24,backgroundColor:'#ffffffcc'},dot:{width:6,height:6,borderRadius:4,backgroundColor:'#52967d'},pillText:{fontFamily:'Inter_500Medium',fontSize:11,color:colors.navy},eyebrow:{fontFamily:'Inter_600SemiBold',fontSize:12,color:'#397460',marginTop:8},title:{fontFamily:'Inter_800ExtraBold',fontSize:35,lineHeight:42,letterSpacing:-1.2,color:colors.ink,textAlign:'center'},description:{fontFamily:'Inter_400Regular',fontSize:15,lineHeight:25,color:colors.muted,textAlign:'center',maxWidth:350},progress:{flexDirection:'row',justifyContent:'center',gap:2},progressTouch:{minWidth:40,minHeight:44,justifyContent:'center',alignItems:'center'},progressDot:{height:7,width:7,borderRadius:4,backgroundColor:'#bad1c6'},activeDot:{width:25,backgroundColor:colors.navy},actions:{flexDirection:'row',alignItems:'center',gap:12},back:{width:76},next:{flex:1},footer:{fontFamily:'Inter_400Regular',fontSize:11,color:colors.muted,textAlign:'center',marginVertical:8}});
