import { View, Text, StyleSheet } from 'react-native';

export default function Profile(){
    return (
        <View style={styles.container}>
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
