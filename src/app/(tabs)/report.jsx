import { Text,StyleSheet, View } from "react-native";

export default function ReportScreen(){
    return (
        <View style={styles.container}>
            <Text>Hello report now</Text>
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
