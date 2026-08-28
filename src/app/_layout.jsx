import { Stack } from "expo-router";
import { ClusterProvider } from "../context/ClusterContext";

export default function RootLayout() {
  return (
    <ClusterProvider>
      <Stack>
      {/* Main tabs (Home, Family, About) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Auth screens */}
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/personal-info" options={{ headerShown: false }} />

      {/* Admin screens (guarded) */}
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />

      {/* Family Manager Screens*/}
      <Stack.Screen
        name="create-family"
        options={{
          title: "Create Family",
          headerShadowVisible: false,
          headerShown: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="invite-member"
        options={{
          title: "Invite Member",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="invitations"
        options={{
          title: "Pending Invitations",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {/* Dispatcher Screens */}
      <Stack.Screen
        name="team-detail"
        options={{
          title: "Team Detail",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="create-team"
        options={{
          title: "Create Team",
          headerShadowVisible: false,
          headerShown: true,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="relocate-team"
        options={{
          title: "Relocate Team",
          headerShadowVisible: false,
          headerShown: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="cluster-detail"
        options={{
          title: "Cluster Detail",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="report-detail"
        options={{
          title: "Report Detail",
          headerShadowVisible: false,
          headerTintColor: "#182033",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      
      {/* Reporting Screens */}
      <Stack.Screen
          name="camera"
          options={{ headerShown: false, presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
          name="camera-preview"
          options={{ headerShown: false, presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      </Stack>
    </ClusterProvider>
  );
}
