import React, { useState, useEffect } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import type { Bed } from "../../types";

const COLORS = [
  "#16a34a", "#059669", "#0891b2", "#7c3aed", "#db2777",
  "#ea580c", "#ca8a04", "#65a30d", "#0284c7", "#9333ea",
];

interface Props {
  visible: boolean;
  bed?: Bed | null;
  onSave: (data: { name: string; width: number; height: number; color: string; notes: string }) => void;
  onClose: () => void;
}

export function BedFormModal({ visible, bed, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState("1");
  const [height, setHeight] = useState("1");
  const [color, setColor] = useState(COLORS[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (bed) {
      setName(bed.name);
      setWidth(String(bed.width));
      setHeight(String(bed.height));
      setColor(bed.color);
      setNotes(bed.notes ?? "");
    } else {
      setName(""); setWidth("1"); setHeight("1"); setColor(COLORS[0]); setNotes("");
    }
  }, [bed, visible]);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      width: parseFloat(width) || 1,
      height: parseFloat(height) || 1,
      color,
      notes: notes.trim(),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{bed ? "Edit Bed" : "New Bed"}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.save, !name.trim() && styles.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. North Bed"
            placeholderTextColor="#a8a29e"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Width (m)</Text>
              <TextInput
                style={styles.input}
                value={width}
                onChangeText={setWidth}
                keyboardType="decimal-pad"
                placeholder="1.2"
                placeholderTextColor="#a8a29e"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Length (m)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="2.4"
                placeholderTextColor="#a8a29e"
              />
            </View>
          </View>

          <Text style={styles.label}>Colour</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes about this bed…"
            placeholderTextColor="#a8a29e"
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafaf9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    backgroundColor: "#fff",
  },
  title: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  cancel: { fontSize: 16, color: "#78716c" },
  save: { fontSize: 16, fontWeight: "600", color: "#059669" },
  saveDisabled: { color: "#d6d3d1" },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#78716c", marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1c1917",
  },
  textArea: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: "#1c1917" },
});
