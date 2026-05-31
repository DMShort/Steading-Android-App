import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import type { SeedPacket } from "../../types";

const UNITS = ["seeds", "g", "packets"] as const;

function expiryStatus(expiry?: string) {
  if (!expiry) return null;
  const d = new Date(expiry);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { label: "Expired", color: "#dc2626" };
  if (days <= 30) return { label: `Expires in ${days}d`, color: "#d97706" };
  return { label: `Exp ${d.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`, color: "#a8a29e" };
}

export function SeedBankScreen() {
  const qc = useQueryClient();
  const [adjustPacket, setAdjustPacket] = useState<SeedPacket | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustMode, setAdjustMode] = useState<"use" | "add">("use");
  const [addVisible, setAddVisible] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "", variety: "", quantity: "", unit: "seeds" as typeof UNITS[number],
    expiryDate: "", source: "",
  });

  const { data: packets = [], isRefetching, refetch } = useQuery({
    queryKey: ["seeds"],
    queryFn: () => api.seeds.list() as Promise<SeedPacket[]>,
  });

  const updatePacket = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.seeds.update(id, data),
    onMutate: async ({ id, data }: { id: string; data: any }) => {
      await qc.cancelQueries({ queryKey: ["seeds"] });
      const prev = qc.getQueryData<SeedPacket[]>(["seeds"]);
      qc.setQueryData<SeedPacket[]>(["seeds"], old =>
        (old ?? []).map(p => p.id === id ? { ...p, ...data } : p)
      );
      return { prev };
    },
    onError: async (_e, { id, data }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["seeds"], ctx.prev);
      await enqueue({ resource: "seeds", action: "update", entityId: id, data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["seeds"] }),
  });

  const createPacket = useMutation({
    mutationFn: (data: object) => api.seeds.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["seeds"] });
      const prev = qc.getQueryData<SeedPacket[]>(["seeds"]);
      const optimistic: SeedPacket = { id: `tmp-${Date.now()}`, ...data };
      qc.setQueryData<SeedPacket[]>(["seeds"], old => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["seeds"], ctx.prev);
      await enqueue({ resource: "seeds", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["seeds"] }),
  });

  function confirmAdjust() {
    if (!adjustPacket) return;
    const delta = parseFloat(adjustDelta);
    if (!delta || delta <= 0) { Alert.alert("Invalid amount", "Enter a positive number."); return; }
    const newQty = Math.max(0, adjustPacket.quantity + (adjustMode === "add" ? delta : -delta));
    updatePacket.mutate({ id: adjustPacket.id, data: { quantity: newQty } });
    setAdjustPacket(null);
  }

  function handleAdd() {
    const qty = parseFloat(newForm.quantity);
    if (!newForm.name.trim() || !qty) { Alert.alert("Required", "Name and quantity are required."); return; }
    createPacket.mutate({
      name: newForm.name.trim(),
      variety: newForm.variety.trim() || undefined,
      quantity: qty,
      unit: newForm.unit,
      expiryDate: newForm.expiryDate || undefined,
      source: newForm.source.trim() || undefined,
    });
    setAddVisible(false);
    setNewForm({ name: "", variety: "", quantity: "", unit: "seeds", expiryDate: "", source: "" });
  }

  const sorted = [...packets].sort((a, b) => {
    const aExpired = a.expiryDate && new Date(a.expiryDate) < new Date();
    const bExpired = b.expiryDate && new Date(b.expiryDate) < new Date();
    if (aExpired && !bExpired) return -1;
    if (!aExpired && bExpired) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={sorted}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0d9488" />}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Seed Bank</Text>
            <Text style={styles.subheading}>{packets.length} varieties</Text>
          </View>
        }
        renderItem={({ item: packet }) => {
          const expiry = expiryStatus(packet.expiryDate);
          const empty = packet.quantity === 0;
          return (
            <View style={[styles.packetCard, empty && styles.packetCardEmpty]}>
              <Text style={styles.packetEmoji}>🌱</Text>
              <View style={styles.packetInfo}>
                <Text style={styles.packetName}>
                  {packet.name}{packet.variety ? ` · ${packet.variety}` : ""}
                </Text>
                <View style={styles.packetMeta}>
                  {expiry && <Text style={[styles.expiryLabel, { color: expiry.color }]}>{expiry.label}</Text>}
                  {packet.source && <Text style={styles.sourceLabel}>{packet.source}</Text>}
                </View>
              </View>
              <View style={styles.packetRight}>
                <Text style={[styles.packetQty, empty && styles.packetQtyEmpty]}>
                  {packet.quantity} {packet.unit}
                </Text>
                <View style={styles.packetBtns}>
                  <TouchableOpacity
                    style={[styles.useBtn, empty && styles.useBtnDisabled]}
                    onPress={() => { if (!empty) { setAdjustPacket(packet); setAdjustMode("use"); setAdjustDelta(""); } }}
                    disabled={empty}
                  >
                    <Text style={[styles.useBtnText, empty && styles.useBtnTextDisabled]}>Plant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={() => { setAdjustPacket(packet); setAdjustMode("add"); setAdjustDelta(""); }}>
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>No seeds in bank</Text>
            <Text style={styles.emptyHint}>Tap + to add a seed packet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Adjust quantity modal */}
      <Modal visible={!!adjustPacket} animationType="fade" transparent onRequestClose={() => setAdjustPacket(null)}>
        <View style={styles.overlay}>
          <View style={styles.adjustCard}>
            <Text style={styles.adjustTitle}>{adjustPacket?.name}</Text>
            <Text style={styles.adjustCurrent}>
              In stock: {adjustPacket?.quantity} {adjustPacket?.unit}
            </Text>
            <View style={styles.adjustModeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, adjustMode === "use" && styles.modeBtnActive]}
                onPress={() => setAdjustMode("use")}
              >
                <Text style={[styles.modeBtnText, adjustMode === "use" && styles.modeBtnTextActive]}>🌱 Planted</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, adjustMode === "add" && styles.modeBtnAddActive]}
                onPress={() => setAdjustMode("add")}
              >
                <Text style={[styles.modeBtnText, adjustMode === "add" && styles.modeBtnTextActive]}>+ Added</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.adjustInput}
              value={adjustDelta}
              onChangeText={setAdjustDelta}
              placeholder="Amount"
              placeholderTextColor="#a8a29e"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.adjustActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdjustPacket(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmAdjust}>
                <Text style={styles.confirmBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add packet modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Seed Packet</Text>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={[styles.saveText, (!newForm.name || !newForm.quantity) && styles.saveDisabled]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
            <View style={styles.row}>
              <View style={styles.twoThirds}>
                <Text style={styles.label}>Crop Name *</Text>
                <TextInput style={styles.input} value={newForm.name} onChangeText={v => setNewForm(p => ({ ...p, name: v }))} placeholder="e.g. Tomato" placeholderTextColor="#a8a29e" autoFocus />
              </View>
              <View style={styles.third}>
                <Text style={styles.label}>Variety</Text>
                <TextInput style={styles.input} value={newForm.variety} onChangeText={v => setNewForm(p => ({ ...p, variety: v }))} placeholder="e.g. Roma" placeholderTextColor="#a8a29e" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput style={styles.input} value={newForm.quantity} onChangeText={v => setNewForm(p => ({ ...p, quantity: v }))} placeholder="0" placeholderTextColor="#a8a29e" keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.unitRow}>
                  {UNITS.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitChip, newForm.unit === u && styles.unitChipActive]} onPress={() => setNewForm(p => ({ ...p, unit: u }))}>
                      <Text style={[styles.unitText, newForm.unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Expiry Date <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.input} value={newForm.expiryDate} onChangeText={v => setNewForm(p => ({ ...p, expiryDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#a8a29e" keyboardType="numbers-and-punctuation" />

            <Text style={styles.label}>Source <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.input} value={newForm.source} onChangeText={v => setNewForm(p => ({ ...p, source: v }))} placeholder="e.g. Diggers Club, saved seed" placeholderTextColor="#a8a29e" />
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
  packetCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  packetCardEmpty: { opacity: 0.5 },
  packetEmoji: { fontSize: 26, width: 36, textAlign: "center" },
  packetInfo: { flex: 1 },
  packetName: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  packetMeta: { flexDirection: "row", gap: 8, marginTop: 3, flexWrap: "wrap" },
  expiryLabel: { fontSize: 11, fontWeight: "600" },
  sourceLabel: { fontSize: 11, color: "#a8a29e" },
  packetRight: { alignItems: "flex-end", gap: 4 },
  packetQty: { fontSize: 15, fontWeight: "700", color: "#0d9488" },
  packetQtyEmpty: { color: "#a8a29e" },
  packetBtns: { flexDirection: "row", gap: 6 },
  useBtn: { backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#99f6e4" },
  useBtnText: { fontSize: 12, color: "#0d9488", fontWeight: "600" },
  useBtnDisabled: { borderColor: "#e7e5e4", backgroundColor: "#f5f5f4" },
  useBtnTextDisabled: { color: "#a8a29e" },
  addBtn: { backgroundColor: "#fffbeb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#fde68a", minWidth: 30, alignItems: "center" },
  addBtnText: { fontSize: 14, color: "#d97706", fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#78716c" },
  emptyHint: { fontSize: 14, color: "#a8a29e", marginTop: 6 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#0d9488", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { fontSize: 30, color: "#fff", lineHeight: 34 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  adjustCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  adjustTitle: { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  adjustCurrent: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  adjustModeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  modeBtnActive: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  modeBtnAddActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  modeBtnText: { fontSize: 14, color: "#78716c", fontWeight: "500" },
  modeBtnTextActive: { color: "#1c1917", fontWeight: "700" },
  adjustInput: { backgroundColor: "#f5f5f4", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", padding: 14, fontSize: 24, fontWeight: "700", textAlign: "center", color: "#1c1917", marginBottom: 16 },
  adjustActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#f5f5f4" },
  cancelBtnText: { fontSize: 15, color: "#78716c", fontWeight: "600" },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#0d9488" },
  confirmBtnText: { fontSize: 15, color: "#fff", fontWeight: "700" },
  modal: { flex: 1, backgroundColor: "#fafaf9" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: "#fff" },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  cancelText: { fontSize: 16, color: "#78716c" },
  saveText: { fontSize: 16, fontWeight: "700", color: "#0d9488" },
  saveDisabled: { color: "#d6d3d1" },
  modalForm: { padding: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  optional: { fontSize: 11, fontWeight: "400", color: "#a8a29e", textTransform: "none" },
  input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  twoThirds: { flex: 2 },
  third: { flex: 1 },
  unitRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  unitChipActive: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  unitText: { fontSize: 12, color: "#78716c" },
  unitTextActive: { color: "#0d9488", fontWeight: "600" },
});
