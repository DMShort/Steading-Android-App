import React, { useState, useEffect } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import type { Animal } from "../../types";

const SPECIES = ["Chicken", "Cow", "Pig", "Sheep", "Goat", "Duck", "Turkey", "Rabbit", "Horse", "Other"];
const SEX_OPTIONS = ["Female", "Male", "Unknown"];

interface Props {
  visible: boolean;
  animal?: Animal | null;
  onSave: (data: object) => void;
  onClose: () => void;
}

export function AnimalFormModal({ visible, animal, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Chicken");
  const [customSpecies, setCustomSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("Female");
  const [tag, setTag] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (animal) {
      setName(animal.name);
      const knownSpecies = SPECIES.find(s => s.toLowerCase() === animal.species.toLowerCase());
      setSpecies(knownSpecies ?? "Other");
      setCustomSpecies(knownSpecies ? "" : animal.species);
      setBreed(animal.breed ?? "");
      setSex(animal.sex ?? "Female");
      setTag(animal.tag ?? "");
      setDob(animal.dob ? animal.dob.slice(0, 10) : "");
      setNotes(animal.notes ?? "");
    } else {
      setName(""); setSpecies("Chicken"); setCustomSpecies(""); setBreed("");
      setSex("Female"); setTag(""); setDob(""); setNotes("");
    }
  }, [animal, visible]);

  function handleSave() {
    if (!name.trim()) return;
    const resolvedSpecies = species === "Other" ? customSpecies.trim() || "Other" : species;
    onSave({
      name: name.trim(),
      species: resolvedSpecies,
      breed: breed.trim() || undefined,
      sex,
      tag: tag.trim() || undefined,
      dob: dob || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>{animal ? "Edit Animal" : "New Animal"}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.save, !name.trim() && styles.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="e.g. Bessie" placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>Species</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {SPECIES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, species === s && styles.chipActive]}
                onPress={() => setSpecies(s)}
              >
                <Text style={[styles.chipText, species === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {species === "Other" && (
            <TextInput style={styles.input} value={customSpecies} onChangeText={setCustomSpecies}
              placeholder="Specify species" placeholderTextColor="#a8a29e" />
          )}

          <Text style={styles.label}>Sex</Text>
          <View style={styles.sexRow}>
            {SEX_OPTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, sex === s && styles.chipActive]}
                onPress={() => setSex(s)}
              >
                <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Breed</Text>
              <TextInput style={styles.input} value={breed} onChangeText={setBreed}
                placeholder="Optional" placeholderTextColor="#a8a29e" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Tag / ID</Text>
              <TextInput style={styles.input} value={tag} onChangeText={setTag}
                placeholder="Optional" placeholderTextColor="#a8a29e" />
            </View>
          </View>

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput style={styles.input} value={dob} onChangeText={setDob}
            placeholder="YYYY-MM-DD" placeholderTextColor="#a8a29e" />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
            placeholder="Optional notes…" placeholderTextColor="#a8a29e" multiline numberOfLines={3} />
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
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  chipRow: { marginBottom: 8 },
  sexRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4", marginRight: 8,
  },
  chipActive: { backgroundColor: "#059669", borderColor: "#059669" },
  chipText: { fontSize: 14, color: "#78716c" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
});
