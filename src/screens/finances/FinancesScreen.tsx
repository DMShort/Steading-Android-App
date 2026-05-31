import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import { TransactionFormModal } from "../../components/finances/TransactionFormModal";
import type { Expense, IncomeRecord } from "../../types";

type TxType = "income" | "expense";
type Transaction = (Expense | IncomeRecord) & { type: TxType };

export function FinancesScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<TxType>("expense");

  const { data: expenses = [], isRefetching: expRefetching, refetch: refetchExp } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.finances.expenses() as Promise<Expense[]>,
  });

  const { data: income = [], isRefetching: incRefetching, refetch: refetchInc } = useQuery({
    queryKey: ["income"],
    queryFn: () => api.finances.income() as Promise<IncomeRecord[]>,
  });

  const isRefetching = expRefetching || incRefetching;
  function refetch() { refetchExp(); refetchInc(); }

  const createExpense = useMutation({
    mutationFn: (data: object) => api.finances.createExpense(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const prev = qc.getQueryData<Expense[]>(["expenses"]);
      qc.setQueryData<Expense[]>(["expenses"], old => [
        { id: `tmp-${Date.now()}`, category: "", amount: 0, description: "", date: "", ...data },
        ...(old ?? []),
      ]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["expenses"], ctx.prev);
      await enqueue({ resource: "expenses", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const createIncome = useMutation({
    mutationFn: (data: object) => api.finances.createIncome(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["income"] });
      const prev = qc.getQueryData<IncomeRecord[]>(["income"]);
      qc.setQueryData<IncomeRecord[]>(["income"], old => [
        { id: `tmp-${Date.now()}`, category: "", amount: 0, description: "", date: "", ...data },
        ...(old ?? []),
      ]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["income"], ctx.prev);
      await enqueue({ resource: "income", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.finances.deleteExpense(id),
    onMutate: async (id) => {
      const prev = qc.getQueryData<Expense[]>(["expenses"]);
      qc.setQueryData<Expense[]>(["expenses"], old => (old ?? []).filter(e => e.id !== id));
      return { prev };
    },
    onError: async (_e, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["expenses"], ctx.prev);
      await enqueue({ resource: "expenses", action: "delete", entityId: id });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const deleteIncome = useMutation({
    mutationFn: (id: string) => api.finances.deleteIncome(id),
    onMutate: async (id) => {
      const prev = qc.getQueryData<IncomeRecord[]>(["income"]);
      qc.setQueryData<IncomeRecord[]>(["income"], old => (old ?? []).filter(i => i.id !== id));
      return { prev };
    },
    onError: async (_e, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["income"], ctx.prev);
      await enqueue({ resource: "income", action: "delete", entityId: id });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });

  async function handleSave(data: object, receiptUri?: string) {
    setModalVisible(false);

    let finalData = data;
    if (receiptUri) {
      try {
        const uploadResult = await api.receipts.upload(receiptUri) as { url: string };
        finalData = { ...data, receiptUrl: uploadResult.url };
      } catch {
        // proceed without receipt if upload fails
      }
    }

    if (modalType === "income") {
      createIncome.mutate(finalData);
    } else {
      createExpense.mutate(finalData);
    }
  }

  function confirmDelete(tx: Transaction) {
    Alert.alert("Delete Transaction", `Delete "${tx.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          if (tx.type === "income") deleteIncome.mutate(tx.id);
          else deleteExpense.mutate(tx.id);
        },
      },
    ]);
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth));
  const monthIncome = income.filter(i => i.date?.startsWith(thisMonth));
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthIncome.reduce((s, i) => s + i.amount, 0);
  const net = totalIncome - totalExpenses;

  const allTransactions: Transaction[] = [
    ...income.map(i => ({ ...i, type: "income" as TxType })),
    ...expenses.map(e => ({ ...e, type: "expense" as TxType })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 50);

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={allTransactions}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#d97706" />}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Finances</Text>
            <Text style={styles.subheading}>This month</Text>
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
            <View style={styles.addRow}>
              <TouchableOpacity
                style={[styles.addBtn, styles.addIncome]}
                onPress={() => { setModalType("income"); setModalVisible(true); }}
              >
                <Text style={styles.addBtnText}>+ Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, styles.addExpense]}
                onPress={() => { setModalType("expense"); setModalVisible(true); }}
              >
                <Text style={styles.addBtnText}>+ Expense</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.transactionsHeader}>Recent Transactions</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.transactionRow} onLongPress={() => confirmDelete(item)}>
            <View style={[styles.dot, item.type === "income" ? styles.dotIncome : styles.dotExpense]} />
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDesc}>{item.description}</Text>
              <Text style={styles.transactionMeta}>
                {item.category.replace(/_/g, " ")} · {item.date}
              </Text>
            </View>
            <Text style={[styles.transactionAmount, item.type === "income" ? styles.incomeAmount : styles.expenseAmount]}>
              {item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptyHint}>Tap + Income or + Expense to get started</Text>
          </View>
        }
      />

      <TransactionFormModal
        visible={modalVisible}
        type={modalType}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 2 },
  subheading: { fontSize: 13, color: "#78716c", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  incomeCard: { backgroundColor: "#f0fdf4", borderColor: "#fde68a" },
  expenseCard: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  netPositive: { backgroundColor: "#f0fdf4", borderColor: "#fde68a" },
  netNegative: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  summaryLabel: { fontSize: 11, color: "#78716c", fontWeight: "500", marginBottom: 4 },
  summaryAmount: { fontSize: 16, fontWeight: "700" },
  incomeAmount: { color: "#16a34a" },
  expenseAmount: { color: "#dc2626" },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  addIncome: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac" },
  addExpense: { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fda4af" },
  addBtnText: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  transactionsHeader: { fontSize: 15, fontWeight: "600", color: "#1c1917", marginBottom: 10 },
  transactionRow: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e7e5e4",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  dotIncome: { backgroundColor: "#16a34a" },
  dotExpense: { backgroundColor: "#dc2626" },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: "500", color: "#1c1917" },
  transactionMeta: { fontSize: 12, color: "#a8a29e", marginTop: 1, textTransform: "capitalize" },
  transactionAmount: { fontSize: 14, fontWeight: "600" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15, fontWeight: "500" },
  emptyHint: { color: "#d6d3d1", fontSize: 13, marginTop: 4 },
});
