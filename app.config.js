export default {
  "expo": {
    "owner": "airiquos-team",
    "name": "agapai-mobile",
    "slug": "agapai-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "agap_ai",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": "com.tephl.agap_ai",
      "usesCleartextTraffic": true
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "@maplibre/maplibre-react-native", 
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow agap.ai to use your location."
        }
      ], 
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 76
        }
      ],
      "expo-secure-store",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow agap.ai to access your camera to attach a photo to your report.",
          "microphonePermission": false,
          "recordAudioAndroid": false
        }
      ],
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "eas": {
        projectId: "dde62e9a-1fdb-4ad5-bc72-a21e850a6221"
      }
    }
  }
}
