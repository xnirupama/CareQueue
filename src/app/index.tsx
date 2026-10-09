import {Redirect} from 'expo-router';
import {useStore} from '../services/store';
import {ActivityIndicator} from 'react-native';
export default function Index(){const {isLive,ready,user,state,onboardingComplete,accountProfile,adminSession}=useStore();if(!onboardingComplete)return <Redirect href="/onboarding"/>;if(!ready)return <ActivityIndicator/>;if(isLive&&!user)return <Redirect href="/login"/>;if(state.role==='admin'&&(!isLive||!adminSession))return <Redirect href="/admin-login"/>;if(isLive&&accountProfile?.accountType==='staff'&&state.role==='patient')return <Redirect href="/staff-pending"/>;return <Redirect href={{pathname:'/screen/[id]',params:{id:state.role==='patient'?'16-7':state.role==='staff'?'138-4':'35-168'}}}/>;}
