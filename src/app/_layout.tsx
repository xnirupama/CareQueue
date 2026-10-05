import {AbhayaLibre_700Bold} from '@expo-google-fonts/abhaya-libre';
import {Stack} from 'expo-router';
import {useFonts,Inter_400Regular,Inter_400Regular_Italic,Inter_500Medium,Inter_600SemiBold,Inter_700Bold,Inter_800ExtraBold,Inter_900Black} from '@expo-google-fonts/inter';
import {ActivityIndicator,View,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StoreProvider} from '../services/store';
export default function Layout(){const [loaded,error]=useFonts({AbhayaLibre_700Bold,Inter_400Regular,Inter_400Regular_Italic,Inter_500Medium,Inter_600SemiBold,Inter_700Bold,Inter_800ExtraBold,Inter_900Black});if(error)return <Text>CareQueue could not load its fonts.</Text>;if(!loaded)return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color="#09386b" /></View>;return <SafeAreaProvider><StoreProvider><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}} /></StoreProvider></SafeAreaProvider>;}
