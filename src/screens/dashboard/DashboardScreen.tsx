import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { api } from "../../services/api";
import type { Task, Homestead } from "../../types";

interface StatCard {
  label: string;
  value: string | number;
  color: string;
}

interface Props {
  homestead: Homestead;
}

export function DashboardScreen({ homestead }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [t, o] = await Promise.all([
        api.tasks.list() as Promise<Task[]>,
        api.tasks.overdueCount(),
      ]);
      setTasks(t.filter(t => !t.completed).slice(0, 5));
      setOverdueCount(o.count);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function toggleTask(id: string, completed: boolean) {
    await api.tasks.update(id, { completed });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  }

  const pendingTasks = tasks.filter(t => !t.completed);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      <View style={styles.header}>
        <Text style={styles.homesteadName}>{homestead.name}</Text>
        <Text style={styles.subtitle}>Your homestead at a glance</Text>
      </View>

      {overdueCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ {overdueCount} overdue task{overdueCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending tasks</Text>
          </View>
        ) : (
          pendingTasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => toggleTask(task.id, true)}
            >
              <View style={[styles.taskDot, task.priority === "high" && styles.taskDotHigh, task.priority === "medium" && styles.taskDotMed]} />
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
  header: { marginBottom: 20 },
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
  taskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#d6d3d1",
    marginRight: 12,
  },
  taskDotHigh: { backgroundColor: "#ef4444" },
  taskDotMed: { backgroundColor: "#f59e0b" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, color: "#1c1917", fontWeight: "500" },
  taskDue: { fontSize: 12, color: "#a8a29e", marginTop: 2 },
  taskCategory: { fontSize: 11, color: "#78716c", textTransform: "capitalize" },
});
