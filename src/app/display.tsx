import {ScrollView,Text,StyleSheet,View} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {useStore} from '../services/store';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BackButton} from '../components/BackButton';
import {navigateBack} from '../services/back-navigation';

export default function Display(){
 const {state,isLive,user,connected}=useStore(),router=useRouter();
 if(isLive&&!user)return <Redirect href="/account"/>;
 return <SafeAreaView style={s.container}><View style={s.navigation}><BackButton onPress={()=>navigateBack(router,'/')}/></View><ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>CareQueue · General OPD</Text><Text style={s.label}>{isLive?'Connected service':'Demonstration'} · {connected?state.serviceStatus:'Offline · last known information'}</Text><Text style={s.label}>Now serving</Text><Text style={s.token}>{state.nowServing}</Text><Text style={s.label}>Room 04 · Follow staff instructions</Text><Text style={s.label}>Updated: {state.updatedAt?new Date(state.updatedAt).toLocaleString('en-GB',{timeZone:'Asia/Colombo'}):'No service update yet'}</Text><Text style={s.label}>For assistance, ask the registration counter. This display shows tokens only.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#f8fafc'},navigation:{paddingHorizontal:24,paddingTop:8},page:{flexGrow:1,padding:32,alignItems:'center',justifyContent:'center',gap:24},title:{fontFamily:'Inter_700Bold',fontSize:28,color:'#09386b',textAlign:'center'},token:{fontFamily:'Inter_900Black',fontSize:88,color:'#09386b'},label:{fontFamily:'Inter_500Medium',fontSize:21,lineHeight:30,textAlign:'center',color:'#141f2b'}});
