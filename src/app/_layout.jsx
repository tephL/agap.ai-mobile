import { Stack } from "expo-router";

export default function RootLayout(){
    return (
        <Stack>
            <Stack.Screen 
                name="(auth)/login" 
                options={{ headerShown: false, presentation: "card", animation: "fade_from_bottom"}}
            />
            <Stack.Screen 
                name="(auth)/register" 
                options={{ headerShown: false, presentation: "modal", animation: "fade_from_bottom"}}
            />
            <Stack.Screen 
                name="(auth)/personal-info" 
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="camera"
                options={{ headerShown: false, presentation: "fullScreenModal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
                name="camera-preview"
                options={{ headerShown: false, presentation: "fullScreenModal", animation: "slide_from_bottom" }}
            />
        </Stack>
    )
}