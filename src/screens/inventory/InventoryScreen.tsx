import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import type { InventoryItem } from "../../types";

const CATEGORY_EMOJI: Record<string, string> = {
  feed: "🌾", fuel: "⛽", seeds: "🌱", tools: "🔧",
  fertiliser: "🪣", chemicals: "🧴", medical: "💊", other: "📦",
};

const CATEGORIES = ["feed", "fuel", "seeds", "tools", "fertiliser", "chemicals", "medical", "other"];

function isLowStock(item: InventoryItem) {
  return item.minQuantity != null && item.quantity <= item.minQuantity;
}

export function InventoryScreen() {
  const qc = useQueryClient();
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustMode, setAdjustMode] = useState<"use" | "restock">("use");
  const [addVisible, setAddVisible] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", category: "other", quantity: "", unit: "units", minQuantity: "" });

  const { data: items = [], isRefetching, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.inventory.list() as Promise<InventoryItem[]>,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.inventory.update(id, data),
    onMutate: async ({ id, data }: { id: string; data: any }) => {
      await qc.cancelQueries({ queryKey: ["inventory"] });
      const prev = qc.getQueryData<InventoryItem[]>(["inventory"]);
      qc.setQueryData<InventoryItem[]>(["inventory"], old =>
        (old ?? []).map(i => i.id === id ? { ...i, ...data } : i)
      );
      return { prev };
    },
    onError: async (_e, { id, data }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["inventory"], ctx.prev);
      await enqueue({ resource: "inventory", action: "update", entityId: id, data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const createItem = useMutation({
    mutationFn: (data: object) => api.inventory.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["inventory"] });
      const prev = qc.getQueryData<InventoryItem[]>(["inventory"]);
      const optimistic: InventoryItem = { id: `tmp-${Date.now()}`, ...data };
      qc.setQueryData<InventoryItem[]>(["inventory"], old => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["inventory"], ctx.prev);
      await enqueue({ resource: "inventory", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  function openAdjust(item: InventoryItem, mode: "use" | "restock") {
    setAdjustItem(item);
    setAdjustMode(mode);
    setAdjustDelta("");
  }

  function confirmAdjust() {
    if (!adjustItem) return;
    const delta = parseFloat(adjustDelta);
    if (!delta || delta <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    const newQty = Math.max(0, adjustItem.quantity + (adjustMode === "restock" ? delta : -delta));
    updateItem.mutate({ id: adjustItem.id, data: { quantity: newQty } });
    setAdjustItem(null);
  }

  function handleAdd() {
    const qty = parseFloat(newForm.quantity);
    if (!newForm.name.trim() || !qty) {
      Alert.alert("Required", "Name and quantity are required.");
      return;
    }
    createItem.mutate({
      name: newForm.name.trim(),
      category: newForm.category,
      quantity: qty,
      unit: newForm.unit,
      minQuantity: newForm.minQuantity ? parseFloat(newForm.minQuantity) : undefined,
    });
    setAddVisible(false);
    setNewForm({ name: "", category: "other", quantity: "", unit: "units", minQuantity: "" });
  }

  const lowStockItems = items.filter(isLowStock);
  const sorted = [...items].sort((a, b) => {
    if (isLowStock(a) && !isLowStock(b)) return -1;
    if (!isLowStock(a) && isLowStock(b)) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={sorted}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#d97706" />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Inventory</Text>
              {lowStockItems.length > 0 && (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{lowStockItems.length} low</Text>
                </View>
              )}
            </View>
            <Text style={styles.subheading}>Tap an item to use or restock</Text>
          </View>
        }
        renderItem={({ item }) => {
          const low = isLowStock(item);
          const emoji = CATEGORY_EMOJI[item.category] ?? "📦";
          return (
            <View style={[styles.itemCard, low && styles.itemCardLow]}>
              <Text style={styles.itemEmoji}>{emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
                {low && <Text style={styles.lowLabel}>⚠ Low stock</Text>}
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemQty, low && styles.itemQtyLow]}>
                  {item.quantity} {item.unit}
                </Text>
                {item.minQuantity != null && (
                  <Text style={styles.itemMin}>min {item.minQuantity}</Text>
                )}
                <View style={styles.adjustBtns}>
                  <TouchableOpacity style={styles.useBtn} onPress={() => openAdjust(item, "use")}>
                    <Text style={styles.useBtnText}>Use</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.restockBtn} onPress={() => openAdjust(item, "restock")}>
                    <Text style={styles.restockBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔧</Text>
            <Text style={styles.emptyText}>No inventory items</Text>
            <Text style={styles.emptyHint}>Tap + to add your first item</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Adjust quantity modal */}
      <Modal visible={!!adjustItem} animationType="fade" transparent onRequestClose={() => setAdjustItem(null)}>
        <View style={styles.overlay}>
          <View style={styles.adjustCard}>
            <Text style={styles.adjustTitle}>{adjustItem?.name}</Text>
            <Text style={styles.adjustCurrent}>
              Current: {adjustItem?.quantity} {adjustItem?.unit}
            </Text>
            <View style={styles.adjustModeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, adjustMode === "use" && styles.modeBtnActive]}
                onPress={() => setAdjustMode("use")}
              >
                <Text style={[styles.modeBtnText, adjustMode === "use" && styles.modeBtnTextActive]}>Used</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, adjustMode === "restock" && styles.modeBtnRestockActive]}
                onPress={() => setAdjustMode("restock")}
              >
                <Text style={[styles.modeBtnText, adjustMode === "restock" && styles.modeBtnTextActive]}>Restocked</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.adjustInput}
              value={adjustDelta}
              onChangeText={setAdjustDelta}
              placeholder={`Amount ${adjustMode === "use" ? "used" : "added"}`}
              placeholderTextColor="#a8a29e"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.adjustActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdjustItem(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmAdjust}>
                <Text style={styles.confirmBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add item modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Item</Text>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={[styles.saveText, (!newForm.name || !newForm.quantity) && styles.saveDisabled]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={newForm.name} onChangeText={v => setNewForm(p => ({ ...p, name: v }))} placeholder="e.g. Chicken feed" placeholderTextColor="#a8a29e" autoFocus />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, newForm.category === c && styles.catChipActive]} onPress={() => setNewForm(p => ({ ...p, category: c }))}>
                  <Text style={styles.catEmoji}>{CATEGORY_EMOJI[c]}</Text>
                  <Text style={[styles.catText, newForm.category === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput style={styles.input} value={newForm.quantity} onChangeText={v => setNewForm(p => ({ ...p, quantity: v }))} placeholder="0" placeholderTextColor="#a8a29e" keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Unit</Text>
                <TextInput style={styles.input} value={newForm.unit} onChangeText={v => setNewForm(p => ({ ...p, unit: v }))} placeholder="kg, L, bags…" placeholderTextColor="#a8a29e" />
              </View>
            </View>

            <Text style={styles.label}>Low Stock Alert <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.input} value={newForm.minQuantity} onChangeText={v => setNewForm(p => ({ ...p, minQuantity: v }))} placeholder="Alert when below this amount" placeholderTextColor="#a8a29e" keyboardType="decimal-pad" />
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  alertBadge: { backgroundColor: "#fef2f2", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#fecaca" },
  alertBadgeText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  subheading: { fontSize: 13, color: "#78716c", marginBottom: 16 },
  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  itemCardLow: { borderColor: "#fecaca", backgroundColor: "#fff9f9" },
  itemEmoji: { fontSize: 26, width: 36, textAlign: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  itemCategory: { fontSize: 12, color: "#a8a29e", textTransform: "capitalize", marginTop: 1 },
  lowLabel: { fontSize: 11, color: "#dc2626", fontWeight: "600", marginTop: 2 },
  itemRight: { alignItems: "flex-end", gap: 4 },
  itemQty: { fontSize: 16, fontWeight: "700", color: "#1c1917" },
  itemQtyLow: { color: "#dc2626" },
  itemMin: { fontSize: 11, color: "#a8a29e" },
  adjustBtns: { flexDirection: "row", gap: 6, marginTop: 2 },
  useBtn: { backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#fed7aa" },
  useBtnText: { fontSize: 12, color: "#d97706", fontWeight: "600" },
  restockBtn: { backgroundColor: "#fffbeb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#fde68a", minWidth: 30, alignItems: "center" },
  restockBtnText: { fontSize: 14, color: "#d97706", fontWeight: "700" },
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  adjustCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  adjustTitle: { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  adjustCurrent: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  adjustModeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  modeBtnActive: { backgroundColor: "#fff7ed", borderColor: "#d97706" },
  modeBtnRestockActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  modeBtnText: { fontSize: 14, color: "#78716c", fontWeight: "500" },
  modeBtnTextActive: { color: "#d97706", fontWeight: "700" },
  adjustInput: { backgroundColor: "#f5f5f4", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", padding: 14, fontSize: 24, fontWeight: "700", textAlign: "center", color: "#1c1917", marginBottom: 16 },
  adjustActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#f5f5f4" },
  cancelBtnText: { fontSize: 15, color: "#78716c", fontWeight: "600" },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#d97706" },
  confirmBtnText: { fontSize: 15, color: "#fff", fontWeight: "700" },
  modal: { flex: 1, backgroundColor: "#fafaf9" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: "#fff" },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  cancelText: { fontSize: 16, color: "#78716c" },
  saveText: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  saveDisabled: { color: "#d6d3d1" },
  modalForm: { padding: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  optional: { fontSize: 11, fontWeight: "400", color: "#a8a29e", textTransform: "none" },
  input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  catChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  catEmoji: { fontSize: 14 },
  catText: { fontSize: 13, color: "#78716c" },
  catTextActive: { color: "#d97706", fontWeight: "600" },
});
