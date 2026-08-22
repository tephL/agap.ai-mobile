import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getCurrentUserId } from "@/services/currentUser";
import { clearForUser } from "@/services/familyRepo";

export default function Profile(){
    const router = useRouter();

    async function handleLogout(){
        const token = await SecureStore.getItemAsync("token");
        console.log(token);

        // Wipe this user's offline snapshot before the token is gone, so a
        // different account can never see stale cached family data.
        const userId = await getCurrentUserId();
        if (userId != null) {
            try { await clearForUser(userId); } catch {}
        }

        await SecureStore.deleteItemAsync("token");
        console.log(token);
        router.replace('/login');
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handleLogout}>
                <Text>Logout</Text>
            </TouchableOpacity>
            <Text>Hello this is your profile</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        alignContent: 'center', 
        justifyContent: 'center'
    }
});
