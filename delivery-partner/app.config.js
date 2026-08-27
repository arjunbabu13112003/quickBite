const os = require('os');
const fs = require('fs');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();

// Automatically write/update the .env file with the dynamic local IP address if not already present
try {
  let existingUrl = '';
  if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    const match = content.match(/EXPO_PUBLIC_API_BASE_URL=(.+)/);
    if (match && match[1] && match[1].trim() !== '') {
      existingUrl = match[1].trim();
    }
  }
  
  if (existingUrl) {
    console.log(`[AppConfig] Using existing EXPO_PUBLIC_API_BASE_URL=${existingUrl} from .env`);
  } else {
    fs.writeFileSync('.env', `EXPO_PUBLIC_API_BASE_URL=http://${localIp}:5000\n`, 'utf8');
    console.log(`[AppConfig] Successfully wrote EXPO_PUBLIC_API_BASE_URL=http://${localIp}:5000 to .env`);
  }
} catch (e) {
  console.error('[AppConfig] Failed to write/read .env file:', e);
}

module.exports = {
  name: "QuickBite Partner",
  slug: "quickbite-partner",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "deliverypartner",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon"
  },
  android: {
    package: "com.quickbite.deliverypartner",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png"
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "POST_NOTIFICATIONS",
      "RECEIVE_BOOT_COMPLETED"
    ]
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76
      }
    ],
    "expo-secure-store",
    "expo-task-manager",
    [
      "expo-location",
      {
        locationAlwaysPermission: "Allow QuickBite Partner to access your location in the background to share live delivery tracking with customers.",
        locationAlwaysAndWhenInUsePermission: "Allow QuickBite Partner to access your location to track active deliveries even when minimized.",
        isAndroidBackgroundLocationEnabled: true
      }
    ],
    "@maplibre/maplibre-react-native"
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  extra: {
    backendIp: localIp
  }
};
