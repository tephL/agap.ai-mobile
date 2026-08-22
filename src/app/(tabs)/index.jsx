import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from "react";
import { Map, Camera, UserLocation, GeoJSONSource, Layer, Images } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from "expo-router";

// services
import { uploadUserLocation } from '../../services/usersService.js';
import { fetchFamilyLocation, getFamilyPositions, setFamilyPositions } from "../../services/familyLocation.js";

// components
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";


const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.7740, 12.8797]; 
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;


export default function Index() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
      if (status !== "granted") console.log('permission denied');
    })();
  }, []);


  useFocusEffect(
    useCallback(() => {
      const sendLocation = async () => {
        const locationData = await Location.getCurrentPositionAsync();
        const { coords: { latitude, longitude } } = locationData;

        setUserLocation({
          latitude: latitude, 
          longitude: longitude
        });

        try{
          const logLocation = await uploadUserLocation({ latitude, longitude });
          console.log('sent location');
          console.log(logLocation);
        } catch(e){
          console.error(e.response?.data);
          console.error(e.response?.status);
          console.error(e.config?.data);
        }
      };

      async function fetchingFamilyLocations(){
        try{ 
          const { data } = await fetchFamilyLocation();
          for(const member of data) {
            const { last_seen, longitude, latitude, user_id } = member;
            const timestampMs = new Date(last_seen).getTime();
            await setFamilyPositions({ latitude, longitude, millisec: timestampMs, user_id });
          }
        } catch(e){
          console.log(e);
        }
      }

      getFamilyPositions();
      sendLocation();
      fetchingFamilyLocations();
      const familyFetchInterval = setInterval(fetchingFamilyLocations, 1000 * 60);
      const sendInterval = setInterval(sendLocation, 1000 * 30);

      return () => 
        { 
          clearInterval(sendInterval);
          clearInterval(familyFetchInterval);
        }
    }, [])
  );


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

        <Images images={{ pin: require('../../assets/images/mappinny2.png') }} />
        <GeoJSONSource id="userLocationSource" data={pointGeojson}>
          <Layer
            type="symbol"
            id="userLocationLayer"
            layout={{
              'icon-image': 'pin',
              'icon-allow-overlap': true,
              'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                5, 0.3,
                10, 0.6,
                16, 1.0,
              ],
            }}
          />
        </GeoJSONSource>

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

const pointGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'user-marker',
      geometry: {
        type: 'Point',
        coordinates: [120.858151, 14.904649,], // [lng, lat] order
      },
      properties: {
        name: 'You', // or member.first_name
      },
    },
  ],
};

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
    marker: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#4287f5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3, // Android shadow
    }
});
