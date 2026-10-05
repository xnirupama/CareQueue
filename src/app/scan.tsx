import {useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {useRouter} from 'expo-router';
import {useStore} from '../services/store';
import {parseQueueCode} from '../services/scan';
export default function Scan(){const [permission,requestPermission]=useCameraPermissions();const [error,setError]=useState(''),[scanned,setScanned]=useState(false);const {update}=useStore();const router=useRouter();
 return <View style={s.page}><Text style={s.title}>Scan your queue slip</Text><Text style={s.help}>Hold the CareQueue QR code inside the camera view.</Text>{permission?.granted?<CameraView style={s.camera} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>{if(scanned)return;try{const token=parseQueueCode(data);setScanned(true);update({scannedToken:token});router.replace('/screen/151-769');}catch(e){setError(e instanceof Error?e.message:String(e));}}}/>:<Pressable style={s.button} onPress={requestPermission}><Text style={s.white}>Allow camera to scan</Text></Pressable>}{error?<Text accessibilityRole="alert" style={s.help}>{error}</Text>:null}<Pressable style={s.button} onPress={()=>router.replace('/screen/18-576')}><Text style={s.white}>Enter token manually</Text></Pressable></View>;
}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:20,backgroundColor:'#f8fafc'},title:{fontFamily:'Inter_700Bold',fontSize:28,color:'#09386b'},help:{fontFamily:'Inter_400Regular',fontSize:14,lineHeight:22,color:'#52697a'},camera:{flex:1,borderRadius:24,overflow:'hidden'},button:{padding:16,backgroundColor:'#09386b',borderRadius:16,alignItems:'center'},white:{fontFamily:'Inter_600SemiBold',color:'white'}});
