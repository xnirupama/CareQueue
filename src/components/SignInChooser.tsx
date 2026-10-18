import {useState} from 'react';
import {Text,View,Pressable,StyleSheet} from 'react-native';
import {Redirect,useLocalSearchParams,useRouter} from 'expo-router';
import Svg,{Path} from 'react-native-svg';
import {MobileAccountShell,Notice,ActionButton} from './AccountUI';
import {RoleAvatar,roleAppearance} from './RoleIdentity';
import {portalPath,type LoginPortal} from '../services/account-access';
import {navigateBack} from '../services/back-navigation';
import {useStore} from '../services/store';

const roles=['patient','staff','admin'] as const;
export default function SignInChooser(){
 const router=useRouter(),{isLive,user,ready,error,setError,setDataMode}=useStore();
 const params=useLocalSearchParams<{registered?:string;email?:string;accountType?:string}>();
 const [hoveredRole,setHoveredRole]=useState<LoginPortal|null>(null);
 if(isLive&&user&&ready)return <Redirect href="/"/>;
 if(params.registered==='1')return <Redirect href={{pathname:portalPath(params.accountType==='staff'?'staff':'patient'),params:{registered:'1',email:params.email||''}}}/>;
 const open=(role:LoginPortal)=>{setError('');router.push(portalPath(role));};
 function demo(role:'patient'|'staff'){setDataMode(false,role);router.replace('/');}
 return <MobileAccountShell appearance="welcome" eyebrow="YOUR HOSPITAL COMPANION" title="Care starts here." subtitle="Choose your role to sign in." onBack={()=>navigateBack(router,'/onboarding')}>
  <Notice message={error}/>
  <View style={s.roleList}>{roles.map(role=>{const content=roleAppearance[role];return <Pressable key={role} accessibilityRole="button" accessibilityLabel={`${content.label} sign in`} accessibilityHint={content.detail} onPress={()=>open(role)} onHoverIn={()=>setHoveredRole(role)} onHoverOut={()=>setHoveredRole(null)} style={({pressed})=>[s.roleCard,{borderColor:content.border},(hoveredRole===role||pressed)&&{backgroundColor:content.tint,borderColor:content.accent},pressed&&s.pressed]}>
   <RoleAvatar role={role} size={58}/><View style={s.roleCopy}><Text style={s.roleTitle}>{content.label}</Text><Text style={s.roleDetail}>{content.detail}</Text></View>
   <View style={[s.arrow,{backgroundColor:content.tint}]}><Svg width={16} height={16} viewBox="0 0 24 24" aria-hidden><Path d="m9 5 7 7-7 7" fill="none" stroke={content.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg></View>
  </Pressable>;})}</View>
  <View style={s.signup}><ActionButton label="Create an account" onPress={()=>router.push('/register')}/><Text style={s.signupCaption}>New here? Register as a patient or hospital staff.</Text></View>
  <View style={s.demo}><View style={s.demoHeading}><View style={s.line}/><Text style={s.demoCaption}>Just taking a look?</Text><View style={s.line}/></View><View style={s.demoButtons}>{(['patient','staff'] as const).map(role=><Pressable key={role} accessibilityRole="button" accessibilityLabel={`${role==='patient'?'Patient':'Staff'} demo`} onPress={()=>demo(role)} style={({pressed})=>[s.demoButton,pressed&&{backgroundColor:'#e8f0ed'}]}><Text style={s.demoText}>{role==='patient'?'Patient':'Staff'} demo</Text><Text style={s.demoArrow} aria-hidden>↗</Text></Pressable>)}</View></View>
 </MobileAccountShell>;
}

const s=StyleSheet.create({
 roleList:{gap:10},roleCard:{flexDirection:'row',alignItems:'center',gap:12,padding:12,minHeight:90,borderWidth:1,borderRadius:22,backgroundColor:'white',boxShadow:'0 4px 16px rgba(9, 56, 107, 0.04)'},pressed:{transform:[{scale:.985}]},roleCopy:{flex:1,gap:4},roleTitle:{fontFamily:'Inter_700Bold',fontSize:16,lineHeight:22,color:'#09386b',letterSpacing:-.3},roleDetail:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18,color:'#52697a'},arrow:{width:28,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'},
 signup:{gap:8,marginTop:2},signupCaption:{fontFamily:'Inter_400Regular',fontSize:11,lineHeight:16,color:'#52697a',textAlign:'center'},demo:{gap:10,marginTop:2},demoHeading:{flexDirection:'row',alignItems:'center',gap:12},line:{height:1,backgroundColor:'#dce7e3',flex:1},demoCaption:{fontFamily:'Inter_400Regular',fontSize:11,lineHeight:16,color:'#52697a'},demoButtons:{flexDirection:'row',gap:12},demoButton:{flex:1,minHeight:44,borderRadius:12,backgroundColor:'#eef4f1',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:10},demoText:{fontFamily:'Inter_600SemiBold',fontSize:12,lineHeight:18,color:'#295747'},demoArrow:{fontSize:16,color:'#295747'},
});
