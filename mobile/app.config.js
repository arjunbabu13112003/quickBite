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

// Automatically write/update the .env file with the dynamic local IP address
try {
  fs.writeFileSync('.env', `EXPO_PUBLIC_API_BASE_URL=http://${localIp}:5000\n`, 'utf8');
  console.log(`[AppConfig] Successfully wrote EXPO_PUBLIC_API_BASE_URL=http://${localIp}:5000 to .env`);
} catch (e) {
  console.error('[AppConfig] Failed to write .env file:', e);
}

module.exports = {
  name: "QuickBite Mobile App",
  slug: "quickbite-mobile-app",
  scheme: "quickbitemobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true
  },
  android: {
    backgroundColor: "#ffffff",
    package: "com.anonymous.quickbitemobileapp",
    googleServicesFile: "./google-services.json"
  },
  plugins: [
    "@maplibre/maplibre-react-native"
  ],
  extra: {
    backendIp: localIp,
    eas: {
      projectId: "86b6a378-0cb9-470f-aa16-1f6cc79e6f3d"
    }
  }
};
