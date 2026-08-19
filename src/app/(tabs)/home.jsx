import { Text, View, StyleSheet } from 'react-native';

export default function AboutScreen(){
    return (
        <View style={styles.background}>
            <Text style={styles.title}>Stephen Astrera</Text>
            <Text style={styles.title}>Goated Dev</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: '#191919ff', 
        flex: 1, 
        alignItems: 'center',
        justifyContent: 'center'
    }, 
    title: {
        color: '#ffffffff'
    }
});
