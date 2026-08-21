import { Tabs, useRouter } from "expo-router";
import CustomTabBar from '../../components/CustomTabBar';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from "react";

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    async function checkIfTokenExists(){
      const token = await SecureStore.getItemAsync("token");
      
      console.log('from root');
      console.log(token);
      if(String(token) == '') router.replace('/login');
    }
    checkIfTokenExists();
  }, []);

  return (
      <Tabs 
        screenOptions={{
          tabBarActiveTintColor: '#1c1c1cff',
          headerShown: false
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      > 
        <Tabs.Screen name="index" options={{ title: 'Map' }} />
        <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
        <Tabs.Screen name="report" options={{ title: 'Report' }} />
        <Tabs.Screen name="family" options={{ title: 'Family' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
  );
}
