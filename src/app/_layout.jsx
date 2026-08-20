import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Main tabs (Home, Family, About) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Auth screens */}
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/personal-info" options={{ headerShown: false }} />

      {/* Family related screens */}
      <Stack.Screen 
        name="family/create" 
        options={{ title: "Create Family" }} 
      />
      <Stack.Screen 
        name="family/invite" 
        options={{ title: "Invite Member" }} 
      />
      <Stack.Screen 
        name="family/invitations" 
        options={{ title: "Pending Invitations" }} 
      />
    </Stack>
  );
}