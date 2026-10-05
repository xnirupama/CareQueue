import {Redirect} from 'expo-router';
import {useStore} from '../services/store';
import {ActivityIndicator} from 'react-native';
export default function Index(){const {isLive,ready,user,state}=useStore();if(!ready)return <ActivityIndicator/>;if(isLive&&!user)return <Redirect href="/account"/>;return <Redirect href={{pathname:'/screen/[id]',params:{id:state.role==='patient'?'16-7':state.role==='staff'?'138-4':'35-168'}}}/>;}
