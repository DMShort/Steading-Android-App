import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import type { Crop } from "../../types";

const STATUSES = ["planned", "growing"] as const;
type Status = typeof STATUSES[number];

interface Props {
  visible: boolean;
  bedId: string;
  bedName: string;
  onSave: (data: { bedId: string; cropId: string; startDate: string; status: Status }) => void;
  onClose: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PlantingFormModal({ visible, bedId, bedName, onSave, onClose }: Props) {
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(todayISO);
  const [status, setStatus] = useState<Status>("growing");

  const { data: crops = [], isLoading } = useQuery({
    queryKey: ["crops"],
    queryFn: () => api.crops.list() as Promise<Crop[]>,
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = crops.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  function reset() {
    setSelectedCrop(null);
    setSearch("");
    setStartDate(todayISO());
    setStatus("growing");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!selectedCrop) return;
    onSave({ bedId, cropId: selectedCrop.id, startDate, status });
    reset();
  }

  const canSave = !!selectedCrop && !!startDate;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Add Planting</Text>
            <Text style={styles.subtitle}>{bedName}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={!canSave}>
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Status + Date row */}
        <View style={styles.metaRow}>
          <View style={styles.metaField}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, status === s && styles.statusChipActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                    {s === "growing" ? "🌱 Growing" : "📅 Planned"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.metaField}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.dateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a8a29e"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Selected crop banner */}
        {selectedCrop && (
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedEmoji}>{selectedCrop.emoji ?? "🌿"}</Text>
            <Text style={styles.selectedName}>{selectedCrop.name}</Text>
            <TouchableOpacity onPress={() => setSelectedCrop(null)}>
              <Text style={styles.clearCrop}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Crop search */}
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Crop</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search crops…"
            placeholderTextColor="#a8a29e"
            returnKeyType="search"
          />
        </View>

        {isLoading ? (
          <ActivityIndicator color="#d97706" style={styles.loader} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item: crop }) => (
              <TouchableOpacity
                style={[styles.cropRow, selectedCrop?.id === crop.id && styles.cropRowSelected]}
                onPress={() => setSelectedCrop(crop)}
              >
                <Text style={styles.cropEmoji}>{crop.emoji ?? "🌿"}</Text>
                <View style={styles.cropInfo}>
                  <Text style={styles.cropName}>{crop.name}</Text>
                  <Text style={styles.cropCategory}>{crop.category}</Text>
                </View>
                {selectedCrop?.id === crop.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.noResults}>No crops match "{search}"</Text>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafaf9" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: "#fff",
  },
  headerCenter: { alignItems: "center" },
  title: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  subtitle: { fontSize: 12, color: "#78716c", marginTop: 1 },
  cancel: { fontSize: 16, color: "#78716c" },
  save: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  saveDisabled: { color: "#d6d3d1" },
  metaRow: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  metaField: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  statusRow: { flexDirection: "row", gap: 6 },
  statusChip: {
    flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4",
  },
  statusChipActive: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  statusText: { fontSize: 12, color: "#78716c" },
  statusTextActive: { color: "#0d9488", fontWeight: "600" },
  dateInput: {
    backgroundColor: "#f5f5f4", borderRadius: 8, borderWidth: 1, borderColor: "#e7e5e4",
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, color: "#1c1917",
  },
  selectedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdfa", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#99f6e4",
  },
  selectedEmoji: { fontSize: 20 },
  selectedName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0f766e" },
  clearCrop: { fontSize: 16, color: "#6b7280", padding: 4 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: "#fff" },
  searchInput: {
    backgroundColor: "#f5f5f4", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4",
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1c1917",
  },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  cropRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: "#fff", marginBottom: 6,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  cropRowSelected: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  cropEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  cropInfo: { flex: 1 },
  cropName: { fontSize: 15, fontWeight: "500", color: "#1c1917" },
  cropCategory: { fontSize: 12, color: "#a8a29e", textTransform: "capitalize", marginTop: 1 },
  checkmark: { fontSize: 16, color: "#0d9488", fontWeight: "700" },
  noResults: { textAlign: "center", color: "#a8a29e", marginTop: 24, fontSize: 14 },
});
