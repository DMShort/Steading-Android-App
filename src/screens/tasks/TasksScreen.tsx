import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SectionList,
} from "react-native";
import { api } from "../../services/api";
import type { Task } from "../../types";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#a8a29e",
};

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try {
      setTasks(await api.tasks.list() as Task[]);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }

  async function toggleTask(id: string, completed: boolean) {
    await api.tasks.update(id, { completed });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  }

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={pending}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        ListHeaderComponent={
          <Text style={styles.heading}>Tasks ({pending.length} pending)</Text>
        }
        renderItem={({ item: task }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => toggleTask(task.id, !task.completed)}
          >
            <View style={[styles.checkbox, task.completed && styles.checkboxDone]} />
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                {task.title}
              </Text>
              <Text style={styles.taskMeta}>
                {task.category}
                {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
              </Text>
            </View>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          done.length > 0 ? (
            <View>
              <Text style={styles.doneHeader}>Completed ({done.length})</Text>
              {done.slice(0, 5).map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, styles.taskCardDone]}
                  onPress={() => toggleTask(task.id, false)}
                >
                  <View style={styles.checkboxDone} />
                  <Text style={styles.taskTitleDone}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>All caught up! 🎉</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 16 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    flexDirection: "row",
    alignItems: "center",
  },
  taskCardDone: { opacity: 0.5 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d6d3d1",
    marginRight: 12,
  },
  checkboxDone: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#059669",
    marginRight: 12,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: "500", color: "#1c1917" },
  taskTitleDone: { color: "#a8a29e", textDecorationLine: "line-through" },
  taskMeta: { fontSize: 12, color: "#a8a29e", marginTop: 2, textTransform: "capitalize" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  doneHeader: { fontSize: 14, fontWeight: "600", color: "#a8a29e", marginTop: 8, marginBottom: 8 },
  empty: { alignItems: "center", padding: 48 },
  emptyText: { color: "#78716c", fontSize: 16 },
});
