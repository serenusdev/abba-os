import { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://idaroh.pondokabdurrahmanbinauf.web.id';

const config: CapacitorConfig = {
  appId: 'id.web.pondokabdurrahmanbinauf.app',
  appName: 'IDAROH',
  // Web content is loaded from the deployed app; webDir remains a fallback.
  webDir: 'out',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
