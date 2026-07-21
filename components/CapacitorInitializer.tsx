"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";

export function CapacitorInitializer() {
  useEffect(() => {
    // Only execute this logic if the app is running natively in Capacitor
    if (Capacitor.isNativePlatform()) {
      const initializeNativeFeatures = async () => {
        try {
          // Set the status bar to match the dark navy theme (#0F172A)
          await StatusBar.setStyle({ style: Style.Dark });
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#0F172A' });
          }
          
          // Hide the splash screen once the Next.js app has hydrated
          await SplashScreen.hide();

          // Listen for Network changes
          Network.addListener('networkStatusChange', status => {
            if (!status.connected) {
              console.warn("Network connection lost");
              // Capacitor can redirect to the local offline page
              window.location.href = "error.html";
            }
          });

          // Listen for App State changes
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              // App resumed - could trigger a background sync here if needed
            }
          });

        } catch (error) {
          console.error("Failed to initialize Capacitor plugins:", error);
        }
      };

      initializeNativeFeatures();
    }
  }, []);

  return null;
}
