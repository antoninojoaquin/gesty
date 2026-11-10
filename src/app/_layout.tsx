import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DATABASE_NAME, initDatabase } from '@/db/setup';
import { colors, fontAssets } from '@/theme';

// Keep the splash screen up until fonts are loaded and the database is migrated.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && fontError == null) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <App />
    </SQLiteProvider>
  );
}

/** Rendered only after SQLiteProvider finished `onInit` (migrations). */
function App() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </>
  );
}
