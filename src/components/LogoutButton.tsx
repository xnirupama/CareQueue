import {useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import Svg,{Path} from 'react-native-svg';
import {useStore} from '../services/store';
import {accountError} from '../services/authentication';

export function LogoutButton({disabled=false}:{disabled?:boolean}){
 const {isLive,user,logOut,authPending}=useStore(),router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function handleLogout(){if(busy)return;setBusy(true);setError('');try{await logOut();router.replace('/login');}catch(e){setError(accountError(e));}finally{setBusy(false);}}
 if(!isLive||!user)return null;
 return <View style={s.wrapper}><Pressable accessibilityRole="button" accessibilityLabel="Log Out" accessibilityState={{disabled:disabled||busy||authPending,busy}} disabled={disabled||busy||authPending} onPress={handleLogout} style={({pressed})=>[s.button,(pressed||disabled||busy)&&{opacity:.6}]}>
  {busy?<ActivityIndicator size="small" color="#8a3740"/>:<Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#8a3740" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><Path d="M9 5H4v14h5m5-14 7 7-7 7m-7-7h14"/></Svg>}<Text style={s.label}>Log Out</Text>
 </Pressable>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}</View>;
}
const s=StyleSheet.create({wrapper:{alignSelf:'flex-end',maxWidth:150},button:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,borderRadius:12},label:{fontFamily:'Inter_600SemiBold',fontSize:11,lineHeight:17,color:'#8a3740'},error:{fontSize:11,lineHeight:16,color:'#8a3740'}});
