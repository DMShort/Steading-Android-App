import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { enqueue } from "../../services/offlineQueue";
import { TaskFormModal } from "../../components/tasks/TaskFormModal";
import { useAuth } from "../../hooks/useAuth";
import type { Task, Member, TaskSubmission } from "../../types";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#a8a29e",
};
const CATEGORY_ICON: Record<string, string> = {
  garden: "🌱", animals: "🐔", inventory: "📦", general: "✅",
};
const LOG_TYPES = [
  { value: "produce",   label: "Produce",   emoji: "🥚" },
  { value: "inventory", label: "Used item",  emoji: "📦" },
] as const;

type Filter = "all" | "mine" | "unassigned";
type LogType = "produce" | "inventory" | null;

const REVIEWER_ROLES = ["owner", "adult", "member"];

function memberLabel(m: Member) {
  return m.displayName ?? m.user.name ?? m.user.email;
}

export function TasksScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  // Submit sheet (child completes task)
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitLogType, setSubmitLogType] = useState<LogType>(null);
  const [submitItemName, setSubmitItemName] = useState("");
  const [submitQty, setSubmitQty] = useState("");
  const [submitUnit, setSubmitUnit] = useState("");

  // Review sheet (adult/owner reviews submission)
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewQty, setReviewQty] = useState("");
  const [reviewUnit, setReviewUnit] = useState("");
  const [reviewItem, setReviewItem] = useState("");

  const { data: tasks = [], isRefetching, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list() as Promise<Task[]>,
  });

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.homestead.members() as Promise<{ members: Member[]; owner: any }>,
    staleTime: 5 * 60 * 1000,
  });

  const members: Member[] = membersData?.members ?? [];
  const myMember = members.find(m => m.user.id === user?.id);
  const myRole = myMember?.role ?? "member";
  const canReview = REVIEWER_ROLES.includes(myRole);
  const isChild = myRole === "child";

  const createTask = useMutation({
    mutationFn: (data: object) => api.tasks.create(data),
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], old => [{ id: `tmp-${Date.now()}`, title: "", category: "general", priority: "medium", completed: false, ...data }, ...(old ?? [])]);
      return { prev };
    },
    onError: async (_e, data, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      await enqueue({ resource: "tasks", action: "create", data });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.tasks.update(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], old => (old ?? []).map(t => t.id === id ? { ...t, completed } : t));
      return { prev };
    },
    onError: async (_e, { id, completed }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      await enqueue({ resource: "tasks", action: "update", entityId: id, data: { completed } });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const submitTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.tasks.submit(id, data),
    onSuccess: (submission: any, { id }) => {
      qc.setQueryData<Task[]>(["tasks"], old =>
        (old ?? []).map(t => t.id === id ? { ...t, submission } : t)
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const reviewTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.tasks.review(id, data),
    onSuccess: (updated: any) => {
      qc.setQueryData<Task[]>(["tasks"], old =>
        (old ?? []).map(t => t.id === updated.id ? { ...t, ...updated } : t)
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const pending = tasks.filter(t => !t.completed && t.submission?.status !== "approved");
  const done = tasks.filter(t => t.completed);
  const pendingReviews = tasks.filter(t => t.submission?.status === "pending");

  const filteredPending = pending.filter(t => {
    if (filter === "mine") return myMember ? t.assignedToId === myMember.id : false;
    if (filter === "unassigned") return !t.assignedToId;
    return true;
  });

  function handleTaskPress(task: Task) {
    // If task is assigned to me and I'm a child → show submit sheet
    if (myMember && task.assignedToId === myMember.id && isChild) {
      if (task.submission?.status === "pending") {
        Alert.alert("Waiting", "This task has been submitted and is waiting for a parent to review it.");
        return;
      }
      setSubmitTask(task);
      setSubmitNotes(""); setSubmitLogType(null); setSubmitItemName(""); setSubmitQty(""); setSubmitUnit("");
      return;
    }
    // Otherwise just toggle
    toggleTask.mutate({ id: task.id, completed: !task.completed });
  }

  function handleSubmit() {
    if (!submitTask) return;
    submitTaskMutation.mutate({
      id: submitTask.id,
      data: {
        notes: submitNotes || undefined,
        logType: submitLogType ?? undefined,
        itemName: submitItemName || undefined,
        quantity: submitQty ? parseFloat(submitQty) : undefined,
        unit: submitUnit || undefined,
      },
    });
    setSubmitTask(null);
  }

  function openReview(task: Task) {
    setReviewTask(task);
    setReviewAction("approve");
    setReviewNotes("");
    setReviewQty(task.submission?.quantity?.toString() ?? "");
    setReviewUnit(task.submission?.unit ?? "");
    setReviewItem(task.submission?.itemName ?? "");
  }

  function handleReview() {
    if (!reviewTask) return;
    reviewTaskMutation.mutate({
      id: reviewTask.id,
      data: {
        action: reviewAction,
        reviewNotes: reviewNotes || undefined,
        quantity: reviewQty ? parseFloat(reviewQty) : undefined,
        unit: reviewUnit || undefined,
        itemName: reviewItem || undefined,
      },
    });
    setReviewTask(null);
  }

  function renderTask(task: Task, completed = false) {
    const mine = !!(myMember && task.assignedToId === myMember.id);
    const submitted = task.submission?.status === "pending";
    const assignee = task.assignedTo ? memberLabel(task.assignedTo)
      : members.find(m => m.id === task.assignedToId) ? memberLabel(members.find(m => m.id === task.assignedToId)!) : null;

    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskCard, mine && styles.taskCardMine, completed && styles.taskCardDone, submitted && styles.taskCardSubmitted]}
        onPress={() => handleTaskPress(task)}
        activeOpacity={0.7}
      >
        {mine && !submitted && <View style={styles.mineIndicator} />}
        {submitted && <View style={styles.submittedIndicator} />}
        <View style={[styles.checkbox, completed && styles.checkboxDone, submitted && styles.checkboxSubmitted]} />
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, completed && styles.taskTitleDone]}>{task.title}</Text>
          <View style={styles.taskMetaRow}>
            <Text style={styles.categoryIcon}>{CATEGORY_ICON[task.category] ?? "✅"}</Text>
            <Text style={styles.taskMeta}>{task.category}</Text>
            {task.dueDate && (
              <Text style={styles.taskDue}>
                · Due {new Date(task.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </Text>
            )}
            {assignee && (
              <Text style={[styles.taskAssignee, mine && styles.taskAssigneeMine]}>
                · {mine ? "You" : assignee}
              </Text>
            )}
          </View>
          {submitted && (
            <Text style={styles.submittedLabel}>⏳ Submitted — waiting for review</Text>
          )}
        </View>
        <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={filteredPending}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#d97706" />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Tasks</Text>
              <Text style={styles.count}>{filteredPending.length} pending</Text>
            </View>

            {/* Pending Reviews banner — adults/owners only */}
            {canReview && pendingReviews.length > 0 && (
              <View style={styles.reviewBanner}>
                <Text style={styles.reviewBannerTitle}>📋 {pendingReviews.length} task{pendingReviews.length !== 1 ? "s" : ""} need your review</Text>
                {pendingReviews.map(t => (
                  <TouchableOpacity key={t.id} style={styles.reviewItem} onPress={() => openReview(t)}>
                    <View style={styles.reviewItemLeft}>
                      <Text style={styles.reviewItemTitle}>{t.title}</Text>
                      <Text style={styles.reviewItemSub}>
                        {t.submission?.submittedBy ? memberLabel(t.submission.submittedBy as Member) : "Someone"} submitted
                        {t.submission?.quantity ? ` · ${t.submission.quantity} ${t.submission.unit} ${t.submission.itemName}` : ""}
                      </Text>
                    </View>
                    <View style={styles.reviewBtn}>
                      <Text style={styles.reviewBtnText}>Review</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Filter chips */}
            <View style={styles.filterRow}>
              {(["all", "mine", "unassigned"] as Filter[]).map(f => (
                <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === "all" ? "All" : f === "mine" ? "Mine" : "Unassigned"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: task }) => renderTask(task)}
        ListFooterComponent={done.length > 0 ? (
          <View style={styles.doneSection}>
            <Text style={styles.doneHeader}>Completed ({done.length})</Text>
            {done.slice(0, 5).map(task => renderTask(task, true))}
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>
              {filter === "mine" ? "Nothing assigned to you" : filter === "unassigned" ? "No unassigned tasks" : "All caught up!"}
            </Text>
            <Text style={styles.emptyHint}>Tap + to add a new task</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <TaskFormModal visible={modalVisible} members={members} onSave={data => { setModalVisible(false); createTask.mutate(data); }} onClose={() => setModalVisible(false)} />

      {/* Submit sheet — shown to child when completing their task */}
      <Modal visible={!!submitTask} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSubmitTask(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setSubmitTask(null)}><Text style={styles.sheetCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.sheetTitle}>Done! Submit Details</Text>
            <TouchableOpacity onPress={handleSubmit}><Text style={styles.sheetSave}>Submit</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTaskName}>{submitTask?.title}</Text>

            <Text style={styles.label}>What did you log? <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.logTypeRow}>
              <TouchableOpacity style={[styles.logTypeChip, submitLogType === null && styles.logTypeChipActive]} onPress={() => setSubmitLogType(null)}>
                <Text style={[styles.logTypeText, submitLogType === null && styles.logTypeTextActive]}>Just notes</Text>
              </TouchableOpacity>
              {LOG_TYPES.map(lt => (
                <TouchableOpacity key={lt.value} style={[styles.logTypeChip, submitLogType === lt.value && styles.logTypeChipActive]} onPress={() => setSubmitLogType(lt.value)}>
                  <Text style={styles.logTypeEmoji}>{lt.emoji}</Text>
                  <Text style={[styles.logTypeText, submitLogType === lt.value && styles.logTypeTextActive]}>{lt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {submitLogType && (
              <>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountRow}>
                  <TextInput style={[styles.input, styles.qtyInput]} value={submitQty} onChangeText={setSubmitQty} placeholder="0" placeholderTextColor="#a8a29e" keyboardType="decimal-pad" />
                  <TextInput style={[styles.input, styles.unitInput]} value={submitUnit} onChangeText={setSubmitUnit} placeholder="kg / units / L" placeholderTextColor="#a8a29e" />
                  <TextInput style={[styles.input, styles.itemInput]} value={submitItemName} onChangeText={setSubmitItemName} placeholder="eggs / chicken feed…" placeholderTextColor="#a8a29e" />
                </View>
              </>
            )}

            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={[styles.input, styles.textArea]} value={submitNotes} onChangeText={setSubmitNotes} placeholder="Any extra details for your parent…" placeholderTextColor="#a8a29e" multiline />

            <View style={styles.submitTip}>
              <Text style={styles.submitTipText}>
                🔔 A parent will review this before it's saved to the records
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review sheet — shown to adult/owner when reviewing a submission */}
      <Modal visible={!!reviewTask} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewTask(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setReviewTask(null)}><Text style={styles.sheetCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.sheetTitle}>Review Submission</Text>
            <TouchableOpacity onPress={handleReview}>
              <Text style={[styles.sheetSave, { color: reviewAction === "approve" ? "#16a34a" : "#ef4444" }]}>
                {reviewAction === "approve" ? "Approve" : "Send Back"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTaskName}>{reviewTask?.title}</Text>

            {reviewTask?.submission && (
              <View style={styles.submissionSummary}>
                <Text style={styles.submissionWho}>
                  {reviewTask.submission.submittedBy ? memberLabel(reviewTask.submission.submittedBy as Member) : "Someone"} completed this
                </Text>
                {(reviewTask.submission.quantity || reviewTask.submission.itemName) && (
                  <Text style={styles.submissionData}>
                    Logged: {reviewTask.submission.quantity} {reviewTask.submission.unit} {reviewTask.submission.itemName}
                  </Text>
                )}
                {reviewTask.submission.notes && (
                  <Text style={styles.submissionNotes}>"{reviewTask.submission.notes}"</Text>
                )}
              </View>
            )}

            <Text style={styles.label}>Action</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, reviewAction === "approve" && styles.actionBtnApprove]} onPress={() => setReviewAction("approve")}>
                <Text style={[styles.actionBtnText, reviewAction === "approve" && styles.actionBtnTextApprove]}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, reviewAction === "reject" && styles.actionBtnReject]} onPress={() => setReviewAction("reject")}>
                <Text style={[styles.actionBtnText, reviewAction === "reject" && styles.actionBtnTextReject]}>↩ Send Back</Text>
              </TouchableOpacity>
            </View>

            {reviewAction === "approve" && reviewTask?.submission?.logType && (
              <>
                <Text style={styles.label}>Amend data <Text style={styles.optional}>(optional — leave to use submitted values)</Text></Text>
                <View style={styles.amountRow}>
                  <TextInput style={[styles.input, styles.qtyInput]} value={reviewQty} onChangeText={setReviewQty} placeholder={reviewTask.submission.quantity?.toString() ?? "Qty"} placeholderTextColor="#a8a29e" keyboardType="decimal-pad" />
                  <TextInput style={[styles.input, styles.unitInput]} value={reviewUnit} onChangeText={setReviewUnit} placeholder={reviewTask.submission.unit ?? "Unit"} placeholderTextColor="#a8a29e" />
                  <TextInput style={[styles.input, styles.itemInput]} value={reviewItem} onChangeText={setReviewItem} placeholder={reviewTask.submission.itemName ?? "Item"} placeholderTextColor="#a8a29e" />
                </View>
              </>
            )}

            <Text style={styles.label}>
              {reviewAction === "approve" ? "Note" : "Reason"} <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder={reviewAction === "approve" ? "Great work! 🎉" : "Please re-count and resubmit…"}
              placeholderTextColor="#a8a29e"
              multiline
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  count: { fontSize: 13, color: "#78716c" },
  reviewBanner: {
    backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "#fde68a",
  },
  reviewBannerTitle: { fontSize: 14, fontWeight: "700", color: "#92400e", marginBottom: 10 },
  reviewItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#fef3c7" },
  reviewItemLeft: { flex: 1 },
  reviewItemTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  reviewItemSub: { fontSize: 12, color: "#78716c", marginTop: 1 },
  reviewBtn: { backgroundColor: "#d97706", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  reviewBtnText: { fontSize: 12, color: "#fff", fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  filterChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  filterText: { fontSize: 13, color: "#78716c", fontWeight: "500" },
  filterTextActive: { color: "#d97706", fontWeight: "700" },
  taskCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#e7e5e4", flexDirection: "row", alignItems: "center",
  },
  taskCardMine: { borderColor: "#fde68a", backgroundColor: "#fffdf7" },
  taskCardSubmitted: { borderColor: "#fcd34d", backgroundColor: "#fffbeb" },
  taskCardDone: { opacity: 0.5 },
  mineIndicator: { width: 3, height: 36, borderRadius: 2, backgroundColor: "#d97706", marginRight: 10 },
  submittedIndicator: { width: 3, height: 36, borderRadius: 2, backgroundColor: "#f59e0b", marginRight: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d6d3d1", marginRight: 12, flexShrink: 0 },
  checkboxDone: { backgroundColor: "#d97706", borderColor: "#d97706" },
  checkboxSubmitted: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: "500", color: "#1c1917" },
  taskTitleDone: { fontSize: 15, color: "#a8a29e", textDecorationLine: "line-through" },
  taskMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 3, flexWrap: "wrap" },
  categoryIcon: { fontSize: 11 },
  taskMeta: { fontSize: 12, color: "#a8a29e", textTransform: "capitalize" },
  taskDue: { fontSize: 12, color: "#a8a29e" },
  taskAssignee: { fontSize: 12, color: "#a8a29e" },
  taskAssigneeMine: { color: "#d97706", fontWeight: "600" },
  submittedLabel: { fontSize: 11, color: "#d97706", fontWeight: "600", marginTop: 4 },
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
    backgroundColor: "#d97706", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { fontSize: 30, color: "#fff", lineHeight: 34 },
  sheet: { flex: 1, backgroundColor: "#fafaf9" },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: "#fff",
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: "#1c1917" },
  sheetCancel: { fontSize: 16, color: "#78716c" },
  sheetSave: { fontSize: 16, fontWeight: "700", color: "#d97706" },
  sheetForm: { padding: 20, gap: 4 },
  sheetTaskName: { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", paddingBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  optional: { fontSize: 11, fontWeight: "400", color: "#a8a29e", textTransform: "none" },
  input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1c1917" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  logTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  logTypeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  logTypeChipActive: { backgroundColor: "#fffbeb", borderColor: "#d97706" },
  logTypeEmoji: { fontSize: 14 },
  logTypeText: { fontSize: 13, color: "#78716c" },
  logTypeTextActive: { color: "#d97706", fontWeight: "600" },
  amountRow: { flexDirection: "row", gap: 8 },
  qtyInput: { width: 70, textAlign: "center" },
  unitInput: { width: 80 },
  itemInput: { flex: 1 },
  submitTip: { marginTop: 20, backgroundColor: "#fef3c7", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#fde68a" },
  submitTipText: { fontSize: 12, color: "#92400e", textAlign: "center" },
  submissionSummary: { backgroundColor: "#f5f5f4", borderRadius: 12, padding: 14, marginBottom: 4 },
  submissionWho: { fontSize: 13, fontWeight: "600", color: "#1c1917", marginBottom: 4 },
  submissionData: { fontSize: 14, fontWeight: "700", color: "#d97706" },
  submissionNotes: { fontSize: 13, color: "#78716c", fontStyle: "italic", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4" },
  actionBtnApprove: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  actionBtnReject: { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
  actionBtnText: { fontSize: 15, color: "#78716c", fontWeight: "600" },
  actionBtnTextApprove: { color: "#16a34a" },
  actionBtnTextReject: { color: "#ef4444" },
});
