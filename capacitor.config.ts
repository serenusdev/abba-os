import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.web.pondokabdurrahmanbinauf.app',
  appName: 'Pondok OS',
  // webDir hanya dipakai sebagai fallback — app berjalan dari live server URL
  webDir: 'out',
  server: {
    // Live URL mode: Capacitor membungkus web app yang sudah berjalan di Vercel.
    // Tidak perlu static export, semua Server Action tetap berfungsi normal.
    url: 'https://abba-os-eight.vercel.app',
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
