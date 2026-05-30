import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { api } from "../../services/api";
import type { Expense, IncomeRecord } from "../../types";

export function FinancesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [e, i] = await Promise.all([
        api.finances.expenses() as Promise<Expense[]>,
        api.finances.income() as Promise<IncomeRecord[]>,
      ]);
      setExpenses(e);
      setIncome(i);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth));
  const monthIncome = income.filter(i => i.date.startsWith(thisMonth));
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthIncome.reduce((s, i) => s + i.amount, 0);
  const net = totalIncome - totalExpenses;

  const allTransactions = [
    ...income.map(i => ({ ...i, type: "income" as const })),
    ...expenses.map(e => ({ ...e, type: "expense" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={allTransactions.slice(0, 30)}
      keyExtractor={t => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Finances</Text>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.incomeCard]}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryAmount, styles.incomeAmount]}>${totalIncome.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryCard, styles.expenseCard]}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryAmount, styles.expenseAmount]}>${totalExpenses.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryCard, net >= 0 ? styles.netPositive : styles.netNegative]}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={[styles.summaryAmount, net >= 0 ? styles.incomeAmount : styles.expenseAmount]}>
                {net >= 0 ? "+" : ""}{net.toFixed(2)}
              </Text>
            </View>
          </View>
          <Text style={styles.transactionsHeader}>Recent Transactions</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.transactionRow}>
          <View style={[styles.dot, item.type === "income" ? styles.dotIncome : styles.dotExpense]} />
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDesc}>{item.description}</Text>
            <Text style={styles.transactionMeta}>
              {item.category.replace("_", " ")} · {item.date}
            </Text>
          </View>
          <Text style={[styles.transactionAmount, item.type === "income" ? styles.incomeAmount : styles.expenseAmount]}>
            {item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  incomeCard: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  expenseCard: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  netPositive: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  netNegative: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  summaryLabel: { fontSize: 11, color: "#78716c", fontWeight: "500", marginBottom: 4 },
  summaryAmount: { fontSize: 16, fontWeight: "700" },
  incomeAmount: { color: "#16a34a" },
  expenseAmount: { color: "#dc2626" },
  transactionsHeader: { fontSize: 15, fontWeight: "600", color: "#1c1917", marginBottom: 10 },
  transactionRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  dotIncome: { backgroundColor: "#16a34a" },
  dotExpense: { backgroundColor: "#dc2626" },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: "500", color: "#1c1917" },
  transactionMeta: { fontSize: 12, color: "#a8a29e", marginTop: 1, textTransform: "capitalize" },
  transactionAmount: { fontSize: 14, fontWeight: "600" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15 },
});
