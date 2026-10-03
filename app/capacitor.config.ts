import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.iam.life',
  appName: 'Iam',
  webDir: 'dist',
  android: { backgroundColor: '#F6F5F1' },
  server: { androidScheme: 'https' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_iam', iconColor: '#FF5A36' },
    SplashScreen: { launchShowDuration: 0 },
  },
};
export default config;
