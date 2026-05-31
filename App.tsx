import React from "react";
import { View, StyleSheet } from "react-native";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { QueryProvider } from "./src/providers/QueryProvider";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";

function AppShell() {
  const { isOnline } = useNetworkStatus();
  return (
    <View style={styles.root}>
      {!isOnline && <OfflineBanner />}
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AppShell />
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
