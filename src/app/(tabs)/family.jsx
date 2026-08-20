import { View, Text, StyleSheet } from 'react-native';

export default function Family(){
    return (
        <View style={styles.container}>
            <Text>This is family page</Text>
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
