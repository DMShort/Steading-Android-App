import React from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { WeatherWidget } from "../../components/WeatherWidget";
import type { Task, Homestead } from "../../types";

export function DashboardScreen({ homestead }: { homestead: Homestead }) {
  const qc = useQueryClient();

  const { data: tasks = [], isRefetching, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list() as Promise<Task[]>,
  });

  const { data: overdueData } = useQuery({
    queryKey: ["tasks", "overdue-count"],
    queryFn: () => api.tasks.overdueCount(),
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
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const pending = tasks.filter(t => !t.completed).slice(0, 5);
  const overdueCount = overdueData?.count ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.homesteadName}>{homestead.name}</Text>
        <Text style={styles.subtitle}>Your homestead at a glance</Text>
      </View>

      <WeatherWidget homestead={homestead} />

      {overdueCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ {overdueCount} overdue task{overdueCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
        {pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending tasks</Text>
          </View>
        ) : (
          pending.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => toggleTask.mutate({ id: task.id, completed: true })}
            >
              <View style={[
                styles.taskDot,
                task.priority === "high" && styles.taskDotHigh,
                task.priority === "medium" && styles.taskDotMed,
              ]} />
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.dueDate && (
                  <Text style={styles.taskDue}>
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Text style={styles.taskCategory}>{task.category}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  homesteadName: { fontSize: 26, fontWeight: "700", color: "#1c1917" },
  subtitle: { fontSize: 14, color: "#78716c", marginTop: 2 },
  alertBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertText: { color: "#dc2626", fontSize: 14, fontWeight: "500" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#1c1917", marginBottom: 10 },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  emptyText: { color: "#a8a29e", fontSize: 14 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  taskDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#d6d3d1", marginRight: 12 },
  taskDotHigh: { backgroundColor: "#ef4444" },
  taskDotMed: { backgroundColor: "#f59e0b" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, color: "#1c1917", fontWeight: "500" },
  taskDue: { fontSize: 12, color: "#a8a29e", marginTop: 2 },
  taskCategory: { fontSize: 11, color: "#78716c", textTransform: "capitalize" },
});
