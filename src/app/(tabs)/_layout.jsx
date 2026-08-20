import { Tabs } from "expo-router";
import CustomTabBar from '../../components/CustomTabBar';

export default function RootLayout() {
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