import { Text,StyleSheet, View } from "react-native";

export default function Assistant(){
    return (
        <View style={styles.container}>
            <Text>Hello this is the assistant</Text>
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
