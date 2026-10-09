import {AbhayaLibre_700Bold} from '@expo-google-fonts/abhaya-libre';
import {Stack} from 'expo-router';
import {useFonts,Inter_400Regular,Inter_400Regular_Italic,Inter_500Medium,Inter_600SemiBold,Inter_700Bold,Inter_800ExtraBold,Inter_900Black} from '@expo-google-fonts/inter';
import {ActivityIndicator,View,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StoreProvider,useStore} from '../services/store';
import {CareQueueMark} from '../components/WelcomeArt';
function Loading(){return <View style={{flex:1,justifyContent:'center',alignItems:'center',gap:18,backgroundColor:'#f5f9f7'}}><CareQueueMark size={64}/><Text style={{fontFamily:'Inter_700Bold',fontSize:24,color:'#09386b'}}>CareQueue</Text><ActivityIndicator color="#09386b" accessibilityLabel="Loading CareQueue"/></View>;}
function Navigation(){const {booted,onboardingComplete,ready,isLive,user,authPending}=useStore();if(!booted)return <Loading/>;return <View style={{flex:1}}><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}>
 <Stack.Protected guard={onboardingComplete&&ready&&!authPending&&(!isLive||Boolean(user))}>
  <Stack.Screen name="index"/><Stack.Screen name="account"/><Stack.Screen name="manage"/><Stack.Screen name="display"/><Stack.Screen name="screen/[id]"/><Stack.Screen name="scan"/>
 </Stack.Protected>
 <Stack.Protected guard={onboardingComplete&&(!ready||!isLive||!user||authPending)}>
  <Stack.Screen name="login"/><Stack.Screen name="register"/><Stack.Screen name="forgot-password"/>
 </Stack.Protected>
 <Stack.Screen name="onboarding"/>
 </Stack>{!ready&&!authPending?<View style={{position:'absolute',top:0,left:0,right:0,bottom:0}}><Loading/></View>:null}</View>;}
export default function Layout(){const [loaded,error]=useFonts({AbhayaLibre_700Bold,Inter_400Regular,Inter_400Regular_Italic,Inter_500Medium,Inter_600SemiBold,Inter_700Bold,Inter_800ExtraBold,Inter_900Black});if(error)return <Text>CareQueue could not load its fonts.</Text>;if(!loaded)return <Loading/>;return <SafeAreaProvider><StoreProvider><Navigation/></StoreProvider></SafeAreaProvider>;}
