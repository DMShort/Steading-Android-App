import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import { AnimalFormModal } from "../../components/animals/AnimalFormModal";
import type { Animal } from "../../types";

export function AnimalsScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);

  const { data: animals = [], isRefetching, refetch } = useQuery({
    queryKey: ["animals"],
    queryFn: () => api.animals.list() as Promise<Animal[]>,
  });

  const createAnimal = useMutation({
    mutationFn: (data: object) => api.animals.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["animals"] });
      const prev = qc.getQueryData<Animal[]>(["animals"]);
      const optimistic: Animal = { id: `tmp-${Date.now()}`, name: "", species: "", ...data };
      qc.setQueryData<Animal[]>(["animals"], old => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["animals"], ctx.prev);
      await enqueue({ resource: "animals", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["animals"] }),
  });

  const updateAnimal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.animals.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["animals"] });
      const prev = qc.getQueryData<Animal[]>(["animals"]);
      qc.setQueryData<Animal[]>(["animals"], old =>
        (old ?? []).map(a => a.id === id ? { ...a, ...data } : a)
      );
      return { prev };
    },
    onError: async (_e, { id, data }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["animals"], ctx.prev);
      await enqueue({ resource: "animals", action: "update", entityId: id, data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["animals"] }),
  });

  const deleteAnimal = useMutation({
    mutationFn: (id: string) => api.animals.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["animals"] });
      const prev = qc.getQueryData<Animal[]>(["animals"]);
      qc.setQueryData<Animal[]>(["animals"], old => (old ?? []).filter(a => a.id !== id));
      return { prev };
    },
    onError: async (_e, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["animals"], ctx.prev);
      await enqueue({ resource: "animals", action: "delete", entityId: id });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["animals"] }),
  });

  function handleSave(data: object) {
    if (editAnimal) {
      updateAnimal.mutate({ id: editAnimal.id, data });
    } else {
      createAnimal.mutate(data);
    }
    setModalVisible(false);
    setEditAnimal(null);
  }

  function confirmDelete(animal: Animal) {
    Alert.alert("Remove Animal", `Remove "${animal.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteAnimal.mutate(animal.id) },
    ]);
  }

  const bySpecies = animals.reduce<Record<string, Animal[]>>((acc, a) => {
    (acc[a.species] ??= []).push(a);
    return acc;
  }, {});

  const sections = Object.entries(bySpecies);

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={sections}
        keyExtractor={([species]) => species}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
        ListHeaderComponent={
          <Text style={styles.heading}>Animals ({animals.length})</Text>
        }
        renderItem={({ item: [species, group] }) => (
          <View style={styles.section}>
            <Text style={styles.speciesLabel}>{species} · {group.length}</Text>
            {group.map(animal => (
              <TouchableOpacity
                key={animal.id}
                style={styles.card}
                onPress={() => { setEditAnimal(animal); setModalVisible(true); }}
                onLongPress={() => confirmDelete(animal)}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.animalName}>{animal.name}</Text>
                  <Text style={styles.animalMeta}>
                    {[animal.breed, animal.sex, animal.tag].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Text style={styles.editHint}>Tap to edit</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No animals yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first animal</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditAnimal(null); setModalVisible(true); }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <AnimalFormModal
        visible={modalVisible}
        animal={editAnimal}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditAnimal(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 100 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 16 },
  section: { marginBottom: 20 },
  speciesLabel: { fontSize: 13, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4", flexDirection: "row", alignItems: "center",
  },
  cardMain: { flex: 1 },
  animalName: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  animalMeta: { fontSize: 13, color: "#78716c", marginTop: 2 },
  editHint: { fontSize: 10, color: "#d6d3d1" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15, fontWeight: "500" },
  emptyHint: { color: "#d6d3d1", fontSize: 13, marginTop: 4 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#059669", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: { fontSize: 28, color: "#fff", lineHeight: 32 },
});
