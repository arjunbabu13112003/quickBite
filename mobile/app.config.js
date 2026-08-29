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

let appName = "QuickBite";
try {
  const brandingPath = './branding.generated.json';
  if (fs.existsSync(brandingPath)) {
    const branding = JSON.parse(fs.readFileSync(brandingPath, 'utf8'));
    if (branding && branding.appName) {
      appName = branding.appName;
    }
  }
} catch (e) {
  console.warn('[AppConfig] Could not read branding.generated.json, using default name.');
}

module.exports = {
  name: appName,
  slug: "quickbite-mobile-app",
  icon: "./assets/quickbite-logo.png",
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
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/quickbite-icon-foreground.png",
      backgroundColor: "#FFFFFF"
    }
  },
  plugins: [
    "@maplibre/maplibre-react-native",
    [
      "expo-notifications",
      {
        icon: "./assets/notifications/notification-icon.png",
        color: "#FF5252",
        sounds: ["./assets/sounds/quickbite_alert.wav"]
      }
    ]
  ],
  extra: {
    backendIp: localIp,
    eas: {
      projectId: "cc5a8d68-fc76-4dd6-8ae2-a1e134f091aa"
    }
  }
};
