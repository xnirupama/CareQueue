import {Pressable,StyleSheet,Text} from 'react-native';
import Svg,{Path} from 'react-native-svg';

export function BackButton({onPress,disabled=false,label='Back',iconOnly=false}:{onPress:()=>void;disabled?:boolean;label?:string;iconOnly?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Returns to the previous screen or its parent." accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,iconOnly&&s.iconButton,(pressed||disabled)&&s.dimmed]}>
  <Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden><Path d="M15 18l-6-6 6-6" fill="none" stroke="#09386b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>{!iconOnly?<Text style={s.label}>{label}</Text>:null}
 </Pressable>;
}
const s=StyleSheet.create({button:{minHeight:44,minWidth:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,alignSelf:'flex-start',borderRadius:12},iconButton:{backgroundColor:'#f1f6f5',borderRadius:14,borderWidth:1,borderColor:'#e5eeea'},label:{fontFamily:'Inter_600SemiBold',fontSize:13,color:'#09386b'},dimmed:{opacity:.5}});
