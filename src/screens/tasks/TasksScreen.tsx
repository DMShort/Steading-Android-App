import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import { TaskFormModal } from "../../components/tasks/TaskFormModal";
import type { Task } from "../../types";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#a8a29e",
};

const CATEGORY_ICON: Record<string, string> = {
  garden: "🌱", animals: "🐔", inventory: "📦", general: "✅",
};

export function TasksScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: tasks = [], isRefetching, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list() as Promise<Task[]>,
  });

  const createTask = useMutation({
    mutationFn: (data: object) => api.tasks.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      const optimistic: Task = {
        id: `tmp-${Date.now()}`,
        title: "", category: "general", priority: "medium", completed: false,
        ...data,
      };
      qc.setQueryData<Task[]>(["tasks"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      await enqueue({ resource: "tasks", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.tasks.update(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], old =>
        (old ?? []).map(t => t.id === id ? { ...t, completed } : t)
      );
      return { prev };
    },
    onError: async (_e, { id, completed }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      await enqueue({ resource: "tasks", action: "update", entityId: id, data: { completed } });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  function handleSave(data: object) {
    setModalVisible(false);
    createTask.mutate(data);
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={pending}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Tasks</Text>
            <Text style={styles.count}>{pending.length} pending</Text>
          </View>
        }
        renderItem={({ item: task }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => toggleTask.mutate({ id: task.id, completed: true })}
            activeOpacity={0.7}
          >
            <View style={styles.checkbox} />
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.taskMetaRow}>
                <Text style={styles.categoryIcon}>{CATEGORY_ICON[task.category] ?? "✅"}</Text>
                <Text style={styles.taskMeta}>{task.category}</Text>
                {task.dueDate && (
                  <Text style={styles.taskDue}>
                    · Due {new Date(task.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </Text>
                )}
              </View>
            </View>
            <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          done.length > 0 ? (
            <View style={styles.doneSection}>
              <Text style={styles.doneHeader}>Completed ({done.length})</Text>
              {done.slice(0, 5).map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, styles.taskCardDone]}
                  onPress={() => toggleTask.mutate({ id: task.id, completed: false })}
                >
                  <View style={styles.checkboxDone} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitleDone}>{task.title}</Text>
                    <Text style={styles.taskMeta}>{task.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptyHint}>Tap + to add a new task</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <TaskFormModal
        visible={modalVisible}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  count: { fontSize: 13, color: "#78716c" },
  taskCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4", flexDirection: "row", alignItems: "center",
  },
  taskCardDone: { opacity: 0.5 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: "#d6d3d1", marginRight: 12, flexShrink: 0,
  },
  checkboxDone: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#059669", marginRight: 12, flexShrink: 0,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: "500", color: "#1c1917" },
  taskTitleDone: { fontSize: 15, color: "#a8a29e", textDecorationLine: "line-through" },
  taskMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 3 },
  categoryIcon: { fontSize: 11 },
  taskMeta: { fontSize: 12, color: "#a8a29e", textTransform: "capitalize" },
  taskDue: { fontSize: 12, color: "#a8a29e" },
  priorityBar: { width: 3, height: 36, borderRadius: 2, marginLeft: 10 },
  doneSection: { marginTop: 8 },
  doneHeader: { fontSize: 13, fontWeight: "600", color: "#a8a29e", marginBottom: 8 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#78716c", fontSize: 18, fontWeight: "600" },
  emptyHint: { color: "#a8a29e", fontSize: 14, marginTop: 6 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#059669", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { fontSize: 30, color: "#fff", lineHeight: 34 },
});
