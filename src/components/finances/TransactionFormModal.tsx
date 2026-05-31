import React, { useState, useEffect } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const EXPENSE_CATEGORIES = ["feed", "veterinary", "seeds", "tools", "fuel", "repairs", "utilities", "other"];
const INCOME_CATEGORIES = ["produce_sale", "livestock_sale", "eggs", "dairy", "services", "grants", "other"];

interface Props {
  visible: boolean;
  type: "income" | "expense";
  onSave: (data: object, receiptUri?: string) => void;
  onClose: () => void;
}

export function TransactionFormModal({ visible, type, onSave, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(type === "income" ? "produce_sale" : "feed");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [counterparty, setCounterparty] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUri, setReceiptUri] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setDescription(""); setAmount("");
      setCategory(type === "income" ? "produce_sale" : "feed");
      setDate(new Date().toISOString().slice(0, 10));
      setCounterparty(""); setNotes(""); setReceiptUri(undefined);
    }
  }, [visible, type]);

  function handleReceiptPick() {
    Alert.alert("Add Receipt", "Choose source", [
      {
        text: "Camera",
        onPress: () => launchCamera({ mediaType: "photo", quality: 0.7 }, res => {
          if (res.assets?.[0]?.uri) setReceiptUri(res.assets[0].uri);
        }),
      },
      {
        text: "Photo Library",
        onPress: () => launchImageLibrary({ mediaType: "photo", quality: 0.7 }, res => {
          if (res.assets?.[0]?.uri) setReceiptUri(res.assets[0].uri);
        }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleSave() {
    if (!description.trim() || !amount) return;
    const data: Record<string, any> = {
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      date,
      notes: notes.trim() || undefined,
    };
    if (type === "income") {
      data.buyer = counterparty.trim() || undefined;
    } else {
      data.supplier = counterparty.trim() || undefined;
    }
    onSave(data, receiptUri);
  }

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isValid = description.trim() && parseFloat(amount) > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>
            {type === "income" ? "Add Income" : "Add Expense"}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={!isValid}>
            <Text style={[styles.save, !isValid && styles.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Description *</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription}
            placeholder={type === "income" ? "e.g. Egg sales" : "e.g. Chicken feed"}
            placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>Amount (AUD) *</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {categories.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && (type === "income" ? styles.chipIncome : styles.chipExpense)]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                  {c.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate}
            placeholder="YYYY-MM-DD" placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>{type === "income" ? "Buyer" : "Supplier"}</Text>
          <TextInput style={styles.input} value={counterparty} onChangeText={setCounterparty}
            placeholder="Optional" placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
            placeholder="Optional notes…" placeholderTextColor="#a8a29e" multiline numberOfLines={3} />

          <Text style={styles.label}>Receipt</Text>
          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeReceipt} onPress={() => setReceiptUri(undefined)}>
                <Text style={styles.removeReceiptText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.receiptButton} onPress={handleReceiptPick}>
              <Text style={styles.receiptButtonText}>📷  Attach receipt photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
  title: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  cancel: { fontSize: 16, color: "#78716c" },
  save: { fontSize: 16, fontWeight: "600", color: "#059669" },
  saveDisabled: { color: "#d6d3d1" },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#78716c", marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917",
  },
  textArea: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4", marginRight: 8,
  },
  chipIncome: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  chipExpense: { backgroundColor: "#fff1f2", borderColor: "#fda4af" },
  chipText: { fontSize: 14, color: "#78716c", textTransform: "capitalize" },
  chipTextActive: { fontWeight: "600", color: "#1c1917" },
  receiptButton: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4",
    borderStyle: "dashed", padding: 18, alignItems: "center",
  },
  receiptButtonText: { fontSize: 15, color: "#059669", fontWeight: "500" },
  receiptPreview: { borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e7e5e4" },
  receiptImage: { width: "100%", height: 200 },
  removeReceipt: {
    backgroundColor: "#fef2f2", padding: 10, alignItems: "center",
    borderTopWidth: 1, borderTopColor: "#fecaca",
  },
  removeReceiptText: { color: "#dc2626", fontSize: 14, fontWeight: "500" },
});
