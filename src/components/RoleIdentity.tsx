import {Image,StyleSheet,Text,View} from 'react-native';
import type {LoginPortal} from '../services/account-access';

export const roleAppearance={
 patient:{label:'Patient',hint:'Your visit, in your hands',detail:'Your token, visits & caregiver sharing',tint:'#edf6f0',accent:'#38795f',border:'#d7e8dd',image:require('../../assets/role-portraits/patient.jpg')},
 staff:{label:'Hospital staff',hint:'Here for the care team',detail:'Patient registration & queue operations',tint:'#edf3fa',accent:'#37658f',border:'#dce6f0',image:require('../../assets/role-portraits/staff.jpg')},
 admin:{label:'Administrator',hint:'A clear view of hospital operations',detail:'Staff access, updates & reports',tint:'#faf3e9',accent:'#826337',border:'#ece2d2',image:require('../../assets/role-portraits/admin.jpg')},
} as const;

// These are decorative role illustrations, never a signed-in user's profile photo.
export function RoleAvatar({role,size=64}:{role:LoginPortal;size?:number}){
 const content=roleAppearance[role];
 return <View style={{width:size+6,height:size+6,padding:3,borderRadius:(size+6)/2,backgroundColor:'white',borderWidth:1,borderColor:content.border}}>
  <Image source={content.image} accessible={false} resizeMode="cover" style={{width:size-2,height:size-2,borderRadius:(size-2)/2,backgroundColor:content.tint}}/>
 </View>;
}

export function RoleIdentityCard({role}:{role:LoginPortal}){
 const content=roleAppearance[role];
 return <View style={[s.identity,{backgroundColor:content.tint,borderColor:content.border}]}>
  <RoleAvatar role={role} size={54}/><View style={s.copy}><Text style={[s.eyebrow,{color:content.accent}]}>SIGNING IN AS</Text><Text style={s.label}>{content.label}</Text><Text style={s.hint}>{content.hint}</Text></View>
 </View>;
}

const s=StyleSheet.create({identity:{flexDirection:'row',alignItems:'center',gap:14,padding:14,borderRadius:20,borderWidth:1},copy:{flex:1,gap:3},eyebrow:{fontFamily:'Inter_700Bold',fontSize:9,lineHeight:13,letterSpacing:1.2},label:{fontFamily:'Inter_700Bold',fontSize:17,lineHeight:23,color:'#09386b'},hint:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18,color:'#52697a'}});
