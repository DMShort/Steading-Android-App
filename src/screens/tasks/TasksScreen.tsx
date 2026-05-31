import React from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import type { Task } from "../../types";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#a8a29e",
};

export function TasksScreen() {
  const qc = useQueryClient();

  const { data: tasks = [], isRefetching, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list() as Promise<Task[]>,
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

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={pending}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
        ListHeaderComponent={
          <Text style={styles.heading}>Tasks ({pending.length} pending)</Text>
        }
        renderItem={({ item: task }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
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
                  onPress={() => toggleTask.mutate({ id: task.id, completed: false })}
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
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4", flexDirection: "row", alignItems: "center",
  },
  taskCardDone: { opacity: 0.5 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: "#d6d3d1", marginRight: 12,
  },
  checkboxDone: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: "#059669", marginRight: 12,
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
