import { View, StyleSheet, Text } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen(){
    return (
        <>
        <Stack.Screen options={{ title: "Not found" }} />
        <View style={styles.container}>
            <Text>This route has not been found</Text>
            <Link href='/' style={styles.link}>Go back to home</Link>
        </View>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center'
    }, 
    link: {
        color: 'blue',
        textDecorationLine: 'underline',
        fontSize: 40
    }
});
