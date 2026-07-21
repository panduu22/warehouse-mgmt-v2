import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adithyatech.warehouse',
  appName: 'AdithyaTech',
  webDir: 'out',
  server: {
    url: 'https://adithyatech.in',
    cleartext: false, // Enforce HTTPS for production
    errorPath: 'error.html', // Fallback for network failures
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false, // We will manually hide it in CapacitorInitializer when hydrated
      backgroundColor: "#0F172A",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#2563EB",
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2563EB",
    },
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: false, // Prevents the bouncy web view effect on iOS
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
  }
};

export default config;
