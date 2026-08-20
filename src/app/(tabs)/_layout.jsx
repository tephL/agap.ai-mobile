import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
      <Tabs screenOptions={{
            tabBarActiveTintColor: '#1c1c1cff'
      }}> 
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="about" options={{ title: 'About' }} />
      </Tabs>
  );
}
