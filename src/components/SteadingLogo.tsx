import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  size?: number;
  /** "dark" = amber grain (for dark backgrounds), "light" = amber grain (same, both look good) */
  variant?: "dark" | "light";
}

/**
 * Steading wheat mark built from React Native Views.
 * Renders a stem + 4 grain ellipses approximating the SVG wheat mark.
 * No react-native-svg dependency needed.
 */
export function SteadingLogo({ size = 80, variant = "dark" }: Props) {
  const s = size;
  // Whether to show on a gradient amber background (icon style) or bare (nav style)
  const grain = variant === "dark" ? "#fcd34d" : "#d97706";
  const showBg = true; // always show the amber rounded-square bg

  // Scale factor: the SVG viewBox spans 80 units tall (-62 to +18)
  // We want the wheat to fill ~65% of the container height
  const scale = (s * 0.65) / 80;
  const cx = s / 2;
  // Position stem base at 82% from top
  const cy = s * 0.82;

  function y(vy: number) { return cy + vy * scale; }
  function x(vx: number) { return cx + vx * scale; }
  function len(v: number) { return Math.abs(v * scale); }

  return (
    <View style={[styles.bg, {
      width: s, height: s,
      borderRadius: s * 0.218,
      backgroundColor: "#d97706",
    }]}>
      {/* Gradient overlay approximation — darker at edges */}
      <View style={[StyleSheet.absoluteFillObject, {
        borderRadius: s * 0.218,
        backgroundColor: "#92400e",
        opacity: 0.35,
      }]} />

      {/* Stem */}
      <View style={[styles.abs, {
        width: len(1.6),
        height: len(72),
        backgroundColor: "#fff",
        borderRadius: len(1),
        left: cx - len(0.8),
        top: y(-54),
      }]} />

      {/* Upper left branch */}
      <View style={[styles.abs, {
        width: len(20),
        height: len(1.4),
        backgroundColor: "#fff",
        borderRadius: len(0.8),
        left: x(-16),
        top: y(-10) - len(0.7),
        transform: [{ rotate: "-52deg" }],
      }]} />

      {/* Upper right branch */}
      <View style={[styles.abs, {
        width: len(20),
        height: len(1.4),
        backgroundColor: "#fff",
        borderRadius: len(0.8),
        left: x(0),
        top: y(-10) - len(0.7),
        transform: [{ rotate: "52deg" }],
      }]} />

      {/* Lower left branch */}
      <View style={[styles.abs, {
        width: len(15),
        height: len(1.4),
        backgroundColor: "#fff",
        borderRadius: len(0.8),
        left: x(-12),
        top: y(6) - len(0.7),
        transform: [{ rotate: "-56deg" }],
      }]} />

      {/* Lower right branch */}
      <View style={[styles.abs, {
        width: len(15),
        height: len(1.4),
        backgroundColor: "#fff",
        borderRadius: len(0.8),
        left: x(0),
        top: y(6) - len(0.7),
        transform: [{ rotate: "56deg" }],
      }]} />

      {/* Top grain */}
      <View style={[styles.abs, {
        width: len(10),
        height: len(16),
        backgroundColor: "#fff",
        borderRadius: len(6),
        left: x(-5),
        top: y(-66),
      }]} />

      {/* Upper-left grain */}
      <View style={[styles.abs, {
        width: len(9),
        height: len(14),
        backgroundColor: "#fff",
        borderRadius: len(5),
        left: x(-22),
        top: y(-40),
        transform: [{ rotate: "-28deg" }],
      }]} />

      {/* Upper-right grain */}
      <View style={[styles.abs, {
        width: len(9),
        height: len(14),
        backgroundColor: "#fff",
        borderRadius: len(5),
        left: x(13),
        top: y(-40),
        transform: [{ rotate: "28deg" }],
      }]} />

      {/* Lower-left grain */}
      <View style={[styles.abs, {
        width: len(8),
        height: len(13),
        backgroundColor: "#fff",
        borderRadius: len(4.5),
        left: x(-17),
        top: y(-21),
        transform: [{ rotate: "-22deg" }],
      }]} />

      {/* Lower-right grain */}
      <View style={[styles.abs, {
        width: len(8),
        height: len(13),
        backgroundColor: "#fff",
        borderRadius: len(4.5),
        left: x(9),
        top: y(-21),
        transform: [{ rotate: "22deg" }],
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { overflow: "hidden" },
  abs: { position: "absolute" },
});
