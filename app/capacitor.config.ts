import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.iam.life',
  appName: 'Iam',
  webDir: 'dist',
  android: { backgroundColor: '#F6F5F1' },
  // The shell loads the UI from hosting so UI/logic updates need no new APK (native code changes still do).
  server: { url: 'https://lift-os-53d36.web.app', androidScheme: 'https' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_iam', iconColor: '#FF5A36' },
    SplashScreen: { launchShowDuration: 0 },
  },
};
export default config;
