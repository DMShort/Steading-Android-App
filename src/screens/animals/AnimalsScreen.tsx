import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { api } from "../../services/api";
import type { Animal } from "../../types";

export function AnimalsScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadAnimals(); }, []);

  async function loadAnimals() {
    try {
      setAnimals(await api.animals.list() as Animal[]);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAnimals();
    setRefreshing(false);
  }

  const bySpecies = animals.reduce<Record<string, Animal[]>>((acc, a) => {
    (acc[a.species] ??= []).push(a);
    return acc;
  }, {});

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={Object.entries(bySpecies)}
      keyExtractor={([species]) => species}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      ListHeaderComponent={
        <Text style={styles.heading}>Animals ({animals.length})</Text>
      }
      renderItem={({ item: [species, group] }) => (
        <View style={styles.section}>
          <Text style={styles.speciesLabel}>{species} · {group.length}</Text>
          {group.map(animal => (
            <TouchableOpacity key={animal.id} style={styles.card}>
              <Text style={styles.animalName}>{animal.name}</Text>
              <Text style={styles.animalMeta}>
                {[animal.breed, animal.sex, animal.tag].filter(Boolean).join(" · ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No animals yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 16 },
  section: { marginBottom: 20 },
  speciesLabel: { fontSize: 13, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  animalName: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  animalMeta: { fontSize: 13, color: "#78716c", marginTop: 2 },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15 },
});
