import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import type { Member } from "../../types";

const CATEGORIES = ["garden", "animals", "inventory", "general"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  garden: "🌱", animals: "🐔", inventory: "📦", general: "✅",
};
const PRIORITY_COLOURS: Record<string, string> = {
  low: "#a8a29e", medium: "#f59e0b", high: "#ef4444",
};

interface Props {
  visible: boolean;
  members: Member[];
  onSave: (data: {
    title: string;
    category: string;
    priority: string;
    dueDate?: string;
    description?: string;
    assignedToId?: string;
  }) => void;
  onClose: () => void;
}

function memberLabel(m: Member) {
  return m.displayName ?? m.user.name ?? m.user.email;
}

export function TaskFormModal({ visible, members, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("general");
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");

  function reset() {
    setTitle(""); setCategory("general"); setPriority("medium");
    setDueDate(""); setDescription(""); setAssignedToId("");
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      category,
      priority,
      dueDate: dueDate || undefined,
      description: description.trim() || undefined,
      assignedToId: assignedToId || undefined,
    });
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>New Task</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.save, !title.trim() && styles.saveDisabled]}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#a8a29e"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={styles.chipIcon}>{CATEGORY_ICONS[c]}</Text>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  priority === p && { backgroundColor: PRIORITY_COLOURS[p] + "22", borderColor: PRIORITY_COLOURS[p] },
                ]}
                onPress={() => setPriority(p)}
              >
                <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOURS[p] }]} />
                <Text style={[styles.priorityText, priority === p && { color: PRIORITY_COLOURS[p], fontWeight: "600" }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Assign to */}
          {members.length > 0 && (
            <>
              <Text style={styles.label}>Assign To <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.memberChip, assignedToId === "" && styles.memberChipActive]}
                  onPress={() => setAssignedToId("")}
                >
                  <Text style={[styles.memberChipText, assignedToId === "" && styles.memberChipTextActive]}>
                    Anyone
                  </Text>
                </TouchableOpacity>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, assignedToId === m.id && styles.memberChipActive]}
                    onPress={() => setAssignedToId(m.id)}
                  >
                    <Text style={[styles.memberChipText, assignedToId === m.id && styles.memberChipTextActive]}>
                      {memberLabel(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Due date */}
          <Text style={styles.label}>Due Date <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#a8a29e"
            keyboardType="numbers-and-punctuation"
          />

          {/* Notes */}
          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Any extra details…"
            placeholderTextColor="#a8a29e"
            multiline
            numberOfLines={3}
          />

          <View style={styles.offlineTip}>
            <Text style={styles.offlineTipText}>
              📶 Tasks save instantly and sync when you're back online
            </Text>
          </View>
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
  save: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  saveDisabled: { color: "#d6d3d1" },
  form: { padding: 20, gap: 4 },
  titleInput: {
    fontSize: 20, fontWeight: "600", color: "#1c1917",
    borderBottomWidth: 2, borderBottomColor: "#d97706",
    paddingVertical: 12, marginBottom: 24,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  optional: { fontSize: 11, fontWeight: "400", color: "#a8a29e", textTransform: "none" },
  input: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4",
  },
  chipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 14, color: "#78716c" },
  chipTextActive: { color: "#d97706", fontWeight: "600" },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4",
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 14, color: "#78716c" },
  memberChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4",
  },
  memberChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  memberChipText: { fontSize: 14, color: "#78716c" },
  memberChipTextActive: { color: "#d97706", fontWeight: "600" },
  offlineTip: {
    marginTop: 24, backgroundColor: "#fffbeb", borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: "#fde68a",
  },
  offlineTipText: { fontSize: 12, color: "#92400e", textAlign: "center" },
});
