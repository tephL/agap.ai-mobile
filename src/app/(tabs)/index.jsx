import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";
import * as Location from 'expo-location';
import { useEffect, useState } from "react";
import { Map, Camera, UserLocation } from '@maplibre/maplibre-react-native';

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.7740, 12.8797]; 

// "positron" and "dataviz" are the cleanest, most "app-like" MapTiler styles.
// streets-v2 works too but reads more like Google Maps default.
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

export default function Index() {
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null
  });

  async function getUserLocation(){
    return await Location.getCurrentPositionAsync();
  }

  setInterval(() => {
    
  }, 1000 * 10);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
      if (status !== "granted") console.log('permission denied');
    })();

    (async () => {
      const locationData = await getUserLocation();
      const { coords: { latitude, longitude } } = locationData;
      setUserLocation({latitude: latitude, longitude: longitude});
    })();
  }, []);


  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.dropdownWrap} pointerEvents="box-none">
        <LiveNotificationDropdown />
      </SafeAreaView>

      <Map
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassViewPosition={3}   
        rotateEnabled={true}
        pitchEnabled={true}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: PH_CENTER,
            zoomLevel: 6,
          }}
          bounds={PH_BOUNDS}
          maxBounds={PH_BOUNDS}
          minZoom={6}
          maxZoom={20}
          animationMode="flyTo"
          animationDuration={1200}
          trackUserLocation={locationGranted ? "default" : undefined}
        />
        {locationGranted && (
          <UserLocation
            visible={true}
            animated={true}
            showsUserHeadingIndicator={true}
            renderMode="native"
          />
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    }, 
    map: { flex: 1 },
});
