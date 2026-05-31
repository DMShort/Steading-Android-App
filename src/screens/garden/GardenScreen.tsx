import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import { BedFormModal } from "../../components/garden/BedFormModal";
import { PlantingFormModal } from "../../components/garden/PlantingFormModal";
import type { Bed, Planting } from "../../types";

export function GardenScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editBed, setEditBed] = useState<Bed | null>(null);
  const [plantingModal, setPlantingModal] = useState<{ bedId: string; bedName: string } | null>(null);

  const { data: beds = [], isRefetching, refetch } = useQuery({
    queryKey: ["beds"],
    queryFn: () => api.beds.list() as Promise<Bed[]>,
  });

  const createBed = useMutation({
    mutationFn: (data: object) => api.beds.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["beds"] });
      const prev = qc.getQueryData<Bed[]>(["beds"]);
      const optimistic: Bed = { id: `tmp-${Date.now()}`, plantings: [], ...data };
      qc.setQueryData<Bed[]>(["beds"], old => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["beds"], ctx.prev);
      await enqueue({ resource: "beds", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  const updateBed = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.beds.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["beds"] });
      const prev = qc.getQueryData<Bed[]>(["beds"]);
      qc.setQueryData<Bed[]>(["beds"], old =>
        (old ?? []).map(b => b.id === id ? { ...b, ...data } : b)
      );
      return { prev };
    },
    onError: async (_e, { id, data }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["beds"], ctx.prev);
      await enqueue({ resource: "beds", action: "update", entityId: id, data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  const deleteBed = useMutation({
    mutationFn: (id: string) => api.beds.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["beds"] });
      const prev = qc.getQueryData<Bed[]>(["beds"]);
      qc.setQueryData<Bed[]>(["beds"], old => (old ?? []).filter(b => b.id !== id));
      return { prev };
    },
    onError: async (_e, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["beds"], ctx.prev);
      await enqueue({ resource: "beds", action: "delete", entityId: id });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  const createPlanting = useMutation({
    mutationFn: (data: object) => api.plantings.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["beds"] });
      const prev = qc.getQueryData<Bed[]>(["beds"]);
      const optimistic: Planting = {
        id: `tmp-${Date.now()}`,
        bedId: data.bedId,
        cropId: data.cropId,
        startDate: data.startDate,
        status: data.status,
        crop: { id: data.cropId, name: "…", category: "", sowingMonths: [], harvestMonths: [] },
      };
      qc.setQueryData<Bed[]>(["beds"], old =>
        (old ?? []).map(b => b.id === data.bedId ? { ...b, plantings: [...b.plantings, optimistic] } : b)
      );
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["beds"], ctx.prev);
      await enqueue({ resource: "plantings", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  function handleSave(data: object) {
    if (editBed) {
      updateBed.mutate({ id: editBed.id, data });
    } else {
      createBed.mutate(data);
    }
    setModalVisible(false);
    setEditBed(null);
  }

  function handlePlantingSave(data: { bedId: string; cropId: string; startDate: string; status: string }) {
    setPlantingModal(null);
    createPlanting.mutate(data);
  }

  function confirmDelete(bed: Bed) {
    Alert.alert("Delete Bed", `Delete "${bed.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteBed.mutate(bed.id) },
    ]);
  }

  const activePlantings = beds.reduce(
    (sum, b) => sum + b.plantings.filter(p => p.status === "growing").length, 0
  );

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={beds}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#d97706" />}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Garden</Text>
            <Text style={styles.subheading}>{beds.length} beds · {activePlantings} active plantings</Text>
          </View>
        }
        renderItem={({ item: bed }) => {
          const growing = bed.plantings.filter(p => p.status === "growing");
          return (
            <TouchableOpacity
              style={styles.bedCard}
              onPress={() => { setEditBed(bed); setModalVisible(true); }}
              onLongPress={() => confirmDelete(bed)}
            >
              <View style={[styles.bedColor, { backgroundColor: bed.color }]} />
              <View style={styles.bedInfo}>
                <Text style={styles.bedName}>{bed.name}</Text>
                <Text style={styles.bedSize}>{bed.width}m × {bed.height}m</Text>
                {growing.length > 0 ? (
                  <Text style={styles.bedCrops}>{growing.map(p => p.crop?.name).filter(Boolean).join(", ")}</Text>
                ) : (
                  <Text style={styles.bedEmpty}>No active plantings</Text>
                )}
              </View>
              <View style={styles.bedRight}>
                <Text style={styles.bedCount}>{growing.length} growing</Text>
                <TouchableOpacity
                  style={styles.plantBtn}
                  onPress={() => setPlantingModal({ bedId: bed.id, bedName: bed.name })}
                >
                  <Text style={styles.plantBtnText}>🌱 Plant</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No beds yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first garden bed</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditBed(null); setModalVisible(true); }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <BedFormModal
        visible={modalVisible}
        bed={editBed}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditBed(null); }}
      />

      <PlantingFormModal
        visible={!!plantingModal}
        bedId={plantingModal?.bedId ?? ""}
        bedName={plantingModal?.bedName ?? ""}
        onSave={handlePlantingSave}
        onClose={() => setPlantingModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 100 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 2 },
  subheading: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  bedCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4", flexDirection: "row", alignItems: "center",
  },
  bedColor: { width: 12, height: 12, borderRadius: 4, marginRight: 12 },
  bedInfo: { flex: 1 },
  bedName: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  bedSize: { fontSize: 12, color: "#a8a29e", marginTop: 1 },
  bedCrops: { fontSize: 13, color: "#78716c", marginTop: 3 },
  bedEmpty: { fontSize: 13, color: "#d6d3d1", marginTop: 3 },
  bedRight: { alignItems: "flex-end" },
  bedCount: { fontSize: 12, color: "#d97706", fontWeight: "600", marginBottom: 6 },
  plantBtn: {
    backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: "#99f6e4",
  },
  plantBtnText: { fontSize: 12, color: "#0d9488", fontWeight: "600" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15, fontWeight: "500" },
  emptyHint: { color: "#d6d3d1", fontSize: 13, marginTop: 4 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#d97706", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: { fontSize: 28, color: "#fff", lineHeight: 32 },
});
