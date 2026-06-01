import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  size?: number;
}

/**
 * Steading brand mark — teal sprout on amber rounded square.
 * Built from plain Views so react-native-svg is not required.
 */
export function SteadingLogo({ size = 80 }: Props) {
  const s = size;
  const r = s * 0.215; // corner radius (~22% matches the SVG rx="112/512")

  return (
    <View style={[styles.bg, { width: s, height: s, borderRadius: r, backgroundColor: "#d97706" }]}>

      {/* Stem */}
      <View style={[styles.abs, {
        width: s * 0.067,
        height: s * 0.27,
        backgroundColor: "#0d9488",
        borderRadius: s * 0.05,
        bottom: s * 0.115,
        left: s * 0.467,
      }]} />

      {/* Left leaf */}
      <View style={[styles.abs, {
        width: s * 0.33,
        height: s * 0.195,
        backgroundColor: "#0d9488",
        borderTopLeftRadius: s * 0.18,
        borderTopRightRadius: s * 0.03,
        borderBottomLeftRadius: s * 0.03,
        borderBottomRightRadius: s * 0.18,
        bottom: s * 0.355,
        left: s * 0.1,
        transform: [{ rotate: "-22deg" }],
      }]} />

      {/* Right leaf */}
      <View style={[styles.abs, {
        width: s * 0.33,
        height: s * 0.195,
        backgroundColor: "#0d9488",
        borderTopLeftRadius: s * 0.03,
        borderTopRightRadius: s * 0.18,
        borderBottomLeftRadius: s * 0.18,
        borderBottomRightRadius: s * 0.03,
        bottom: s * 0.355,
        right: s * 0.1,
        transform: [{ rotate: "22deg" }],
      }]} />

      {/* Central shoot */}
      <View style={[styles.abs, {
        width: s * 0.1,
        height: s * 0.22,
        backgroundColor: "#0d9488",
        borderTopLeftRadius: s * 0.07,
        borderTopRightRadius: s * 0.07,
        borderBottomLeftRadius: s * 0.025,
        borderBottomRightRadius: s * 0.025,
        bottom: s * 0.445,
        left: s * 0.45,
      }]} />

    </View>
  );
}

const styles = StyleSheet.create({
  bg: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  abs: { position: "absolute" },
});
