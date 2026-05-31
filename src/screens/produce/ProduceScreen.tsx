import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import type { ProduceRecord } from "../../types";

const PRODUCE_TYPES = [
  { label: "Eggs", emoji: "🥚", unit: "units" },
  { label: "Milk", emoji: "🥛", unit: "L" },
  { label: "Honey", emoji: "🍯", unit: "kg" },
  { label: "Wool", emoji: "🧶", unit: "kg" },
  { label: "Vegetables", emoji: "🥬", unit: "kg" },
  { label: "Fruit", emoji: "🍎", unit: "kg" },
  { label: "Herbs", emoji: "🌿", unit: "g" },
  { label: "Cheese", emoji: "🧀", unit: "kg" },
  { label: "Butter", emoji: "🧈", unit: "kg" },
  { label: "Other", emoji: "📦", unit: "units" },
];

const UNITS = ["units", "kg", "g", "L", "mL", "dozen"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function groupByDate(records: ProduceRecord[]) {
  const map = new Map<string, ProduceRecord[]>();
  for (const r of records) {
    const d = r.date.slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(r);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function ProduceScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState(PRODUCE_TYPES[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(PRODUCE_TYPES[0].unit);
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState("");

  const { data: records = [], isRefetching, refetch } = useQuery({
    queryKey: ["produce"],
    queryFn: () => api.produce.list(30) as Promise<ProduceRecord[]>,
  });

  const logProduce = useMutation({
    mutationFn: (data: object) => api.produce.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["produce"] });
      const prev = qc.getQueryData<ProduceRecord[]>(["produce"]);
      const optimistic: ProduceRecord = { id: `tmp-${Date.now()}`, ...data };
      qc.setQueryData<ProduceRecord[]>(["produce"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["produce"], ctx.prev);
      await enqueue({ resource: "produce", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["produce"] }),
  });

  function selectType(t: typeof PRODUCE_TYPES[0]) {
    setSelectedType(t);
    setUnit(t.unit);
  }

  function handleSave() {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      Alert.alert("Invalid quantity", "Please enter a quantity greater than zero.");
      return;
    }
    logProduce.mutate({
      type: selectedType.label.toLowerCase(),
      quantity: qty,
      unit,
      date,
      notes: notes.trim() || undefined,
    });
    setModalVisible(false);
    setQuantity(""); setNotes(""); setDate(todayISO());
  }

  const grouped = groupByDate(records);

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={grouped}
        keyExtractor={([date]) => date}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#d97706" />}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Produce</Text>
            <Text style={styles.subheading}>Last 30 days</Text>
          </View>
        }
        renderItem={({ item: [date, dayRecords] }) => (
          <View style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{formatDay(date)}</Text>
            {dayRecords.map(r => {
              const typeInfo = PRODUCE_TYPES.find(t => t.label.toLowerCase() === r.type) ?? PRODUCE_TYPES[9];
              return (
                <View key={r.id} style={styles.recordRow}>
                  <Text style={styles.recordEmoji}>{typeInfo.emoji}</Text>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordType}>{typeInfo.label}</Text>
                    {r.notes ? <Text style={styles.recordNotes}>{r.notes}</Text> : null}
                  </View>
                  <Text style={styles.recordQty}>{r.quantity} {r.unit}</Text>
                </View>
              );
            })}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🥚</Text>
            <Text style={styles.emptyText}>No produce logged yet</Text>
            <Text style={styles.emptyHint}>Tap + to log today's harvest</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Log modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Produce</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.save, !quantity && styles.saveDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>What did you collect?</Text>
            <View style={styles.typeGrid}>
              {PRODUCE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.typeChip, selectedType.label === t.label && styles.typeChipActive]}
                  onPress={() => selectType(t)}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, selectedType.label === t.label && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TextInput
                style={[styles.input, styles.qtyInput]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor="#a8a29e"
                keyboardType="decimal-pad"
                autoFocus
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a8a29e"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra details…"
              placeholderTextColor="#a8a29e"
              multiline
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  subheading: { fontSize: 13, color: "#78716c", marginTop: 2 },
  dayGroup: { marginBottom: 16 },
  dayLabel: { fontSize: 12, fontWeight: "700", color: "#a8a29e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  recordRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  recordEmoji: { fontSize: 24, width: 32, textAlign: "center" },
  recordInfo: { flex: 1 },
  recordType: { fontSize: 15, fontWeight: "500", color: "#1c1917", textTransform: "capitalize" },
  recordNotes: { fontSize: 12, color: "#a8a29e", marginTop: 1 },
  recordQty: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#78716c" },
  emptyHint: { fontSize: 14, color: "#a8a29e", marginTop: 6 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#d97706", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { fontSize: 30, color: "#fff", lineHeight: 34 },
  modal: { flex: 1, backgroundColor: "#fafaf9" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: "#fff",
  },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  cancel: { fontSize: 16, color: "#78716c" },
  save: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  saveDisabled: { color: "#d6d3d1" },
  modalForm: { padding: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  optional: { fontSize: 11, fontWeight: "400", color: "#a8a29e", textTransform: "none" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4", minWidth: 72,
  },
  typeChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 11, color: "#78716c", fontWeight: "500" },
  typeLabelActive: { color: "#d97706", fontWeight: "700" },
  qtyRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917",
  },
  qtyInput: { width: 100, fontSize: 24, fontWeight: "700", textAlign: "center" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  unitScroll: { flex: 1 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4",
  },
  unitChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  unitText: { fontSize: 14, color: "#78716c" },
  unitTextActive: { color: "#d97706", fontWeight: "600" },
});
