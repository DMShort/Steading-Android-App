import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

const MENU_ITEMS = [
  { label: "Produce", emoji: "🥚", subtitle: "Log eggs, milk, harvest", screen: "Produce", color: "#fffbeb", border: "#fde68a" },
  { label: "Inventory", emoji: "🔧", subtitle: "Use or restock supplies", screen: "Inventory", color: "#fff7ed", border: "#fed7aa" },
  { label: "Seed Bank", emoji: "🌱", subtitle: "Track seed packets", screen: "Seeds", color: "#f0fdfa", border: "#99f6e4" },
  { label: "Finances", emoji: "💰", subtitle: "Expenses and income", screen: "Finances", color: "#fefce8", border: "#fef08a" },
] as const;

interface Props {
  navigation: any;
}

export function MoreMenuScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>More</Text>
      <Text style={styles.subheading}>Field tools and records</Text>

      <View style={styles.grid}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.card, { backgroundColor: item.color, borderColor: item.border }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 2 },
  subheading: { fontSize: 14, color: "#78716c", marginBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: {
    width: "47%", borderRadius: 16, padding: 20,
    borderWidth: 1.5, alignItems: "flex-start",
  },
  cardEmoji: { fontSize: 36, marginBottom: 10 },
  cardLabel: { fontSize: 17, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: "#78716c", lineHeight: 18 },
});
