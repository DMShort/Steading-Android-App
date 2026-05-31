import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📶 Offline — changes will sync when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#1c1917",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: { color: "#fff", fontSize: 12, fontWeight: "500" },
});
