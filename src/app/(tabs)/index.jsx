<<<<<<< HEAD
import { Text, View, StyleSheet } from "react-native";
import { Link } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";
=======
import { View, StyleSheet } from "react-native";
import * as Location from 'expo-location';
import { useEffect } from "react";
import { Map, Camera, UserLocation } from '@maplibre/maplibre-react-native';

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2]; 
>>>>>>> 7b84ac3 (feat(map): map via maplibre)

export default function Index() {
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") console.log('permission denied');
    })();
  }, []);

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <SafeAreaView style={styles.dropdownWrap} pointerEvents="box-none">
        <LiveNotificationDropdown />
      </SafeAreaView>
      <Text style={styles.text}>Welcome to the map</Text>
      <Link href="/(auth)/login" style={styles.button}>Go to Non-existing page</Link>
=======
      <Map mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`}>
        <Camera
          bounds={PH_BOUNDS}
          maxBounds={PH_BOUNDS}
          minZoom={6}
          maxZoom={20}
          trackUserLocation="default"
        />
        <UserLocation visible={true} />
      </Map>
>>>>>>> 7b84ac3 (feat(map): map via maplibre)
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    dropdownWrap: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
    },
    text:{
        color: "#f3eee3ff", 
    }, 
    button: {
        textDecorationLine: 'underline',
        fontSize: 20,
        color: 'blue'
    }
=======
  container: { flex: 1 },
>>>>>>> 7b84ac3 (feat(map): map via maplibre)
});
