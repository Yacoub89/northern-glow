import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminDocuments() {
  const docs = useQuery(api.documents.listAll);
  const [selectedDocId, setSelectedDocId] = useState<Id<"documents"> | null>(null);
  const sigs = useQuery(api.documents.getSignatures, selectedDocId ? { documentId: selectedDocId } : "skip");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [pdfMode, setPdfMode] = useState(false);
  const [pickedPdf, setPickedPdf] = useState<{ name: string; uri: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDoc = useMutation(api.documents.create);
  const removeDoc = useMutation(api.documents.remove);

  const resetCreate = () => {
    setNewTitle(""); setNewDesc(""); setNewContent("");
    setPdfMode(false); setPickedPdf(null);
  };

  const handlePickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets[0]) setPickedPdf({ name: result.assets[0].name, uri: result.assets[0].uri });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      if (pdfMode && pickedPdf) {
        const uploadUrl = await generateUploadUrl();
        const resp = await fetch(pickedPdf.uri);
        const blob = await resp.blob();
        const uploadResp = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: blob });
        const { storageId } = await uploadResp.json();
        await createDoc({ title: newTitle.trim(), description: newDesc.trim() || undefined, fileStorageId: storageId });
      } else {
        await createDoc({ title: newTitle.trim(), description: newDesc.trim() || undefined, content: newContent.trim() });
      }
      resetCreate(); setShowCreate(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (docId: Id<"documents">, title: string) => {
    Alert.alert("Delete Document", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await removeDoc({ documentId: docId }); if (selectedDocId === docId) setSelectedDocId(null); }
        catch (e: any) { Alert.alert("Error", e.message); }
      }},
    ]);
  };

  const canCreate = pdfMode ? !!newTitle.trim() && !!pickedPdf : !!newTitle.trim() && !!newContent.trim();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.pageHeader}>
        <Text style={s.title}>Documents</Text>
        <Pressable style={s.addBtn} onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? "close" : "add"} size={16} color="#fff" />
          <Text style={s.addBtnText}>{showCreate ? "Cancel" : "New Document"}</Text>
        </Pressable>
      </View>

      {/* Create form */}
      {showCreate && (
        <View style={s.createCard}>
          <Text style={s.createTitle}>New Document</Text>
          <View style={s.toggle}>
            <Pressable style={[s.toggleBtn, !pdfMode && s.toggleActive]} onPress={() => setPdfMode(false)}>
              <Text style={[s.toggleText, !pdfMode && s.toggleTextActive]}>Write Text</Text>
            </Pressable>
            <Pressable style={[s.toggleBtn, pdfMode && s.toggleActive]} onPress={() => setPdfMode(true)}>
              <Text style={[s.toggleText, pdfMode && s.toggleTextActive]}>Upload PDF</Text>
            </Pressable>
          </View>

          <Text style={s.fieldLabel}>Title</Text>
          <TextInput style={s.fieldInput} value={newTitle} onChangeText={setNewTitle} placeholder='e.g. "Liability Waiver"' placeholderTextColor={Colors.textMuted} />
          <Text style={[s.fieldLabel, { marginTop: 12 }]}>Description (optional)</Text>
          <TextInput style={s.fieldInput} value={newDesc} onChangeText={setNewDesc} placeholder="Short summary" placeholderTextColor={Colors.textMuted} />

          {pdfMode ? (
            <>
              <Text style={[s.fieldLabel, { marginTop: 12 }]}>PDF File</Text>
              <Pressable style={s.pickBtn} onPress={handlePickPdf}>
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
                <Text style={s.pickBtnText}>{pickedPdf ? pickedPdf.name : "Choose PDF…"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[s.fieldLabel, { marginTop: 12 }]}>Content</Text>
              <TextInput style={[s.fieldInput, s.contentInput]} value={newContent} onChangeText={setNewContent}
                placeholder="Full document text…" placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />
            </>
          )}

          <Pressable style={[s.createBtn, (!canCreate || creating) && { opacity: 0.4 }]} onPress={handleCreate} disabled={!canCreate || creating}>
            <Text style={s.createBtnText}>{creating ? "Creating…" : "Create Document"}</Text>
          </Pressable>
        </View>
      )}

      {/* Table */}
      {docs === undefined ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.layout}>
          <View style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={[s.cell, s.head, { flex: 2 }]}>Title</Text>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Type</Text>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Signatures</Text>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Created</Text>
              <Text style={[s.cell, s.head, { width: 80 }]}></Text>
            </View>
            {docs.length === 0 ? (
              <View style={s.emptyRow}><Text style={s.emptyText}>No documents yet</Text></View>
            ) : docs.map((doc) => (
              <Pressable
                key={doc._id}
                style={[s.tableRow, selectedDocId === doc._id && s.selectedRow]}
                onPress={() => setSelectedDocId(selectedDocId === doc._id ? null : doc._id)}
              >
                <View style={{ flex: 2 }}>
                  <Text style={[s.cell, { color: Colors.text, fontWeight: "600" }]} numberOfLines={1}>{doc.title}</Text>
                  {doc.description ? <Text style={[s.cell, { fontSize: 12, marginTop: 2 }]} numberOfLines={1}>{doc.description}</Text> : null}
                </View>
                <Text style={[s.cell, { flex: 1 }]}>{doc.fileStorageId ? "PDF" : "Text"}</Text>
                <Text style={[s.cell, { flex: 1, color: (doc as any).signatureCount > 0 ? Colors.success : Colors.textMuted, fontWeight: "600" }]}>
                  {(doc as any).signatureCount}
                </Text>
                <Text style={[s.cell, { flex: 1 }]}>{formatDate(doc.createdAt)}</Text>
                <Pressable style={s.deleteBtn} onPress={() => handleDelete(doc._id, doc.title)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </Pressable>
              </Pressable>
            ))}
          </View>

          {/* Signatures panel */}
          {selectedDocId && (
            <View style={s.sigPanel}>
              <Text style={s.sigPanelTitle}>Signatures</Text>
              {sigs === undefined ? (
                <ActivityIndicator color={Colors.primary} />
              ) : sigs.length === 0 ? (
                <Text style={s.emptyText}>No signatures yet</Text>
              ) : (
                sigs.map((sig) => (
                  <View key={sig._id} style={s.sigRow}>
                    <View style={s.sigAvatar}>
                      <Text style={s.sigAvatarText}>{sig.signatureName[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sigName}>{sig.signatureName}</Text>
                      <Text style={s.sigMeta}>{sig.userName} · {formatDate(sig.signedAt)}</Text>
                    </View>
                    <View style={s.sigBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={s.sigBadgeText}>Signed</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 32, paddingBottom: 60 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  createCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 20, marginBottom: 24 },
  createTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 16 },
  toggle: { flexDirection: "row", backgroundColor: Colors.background, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4, alignSelf: "flex-start" },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  toggleTextActive: { color: "#fff" },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 4, outlineStyle: "none" } as any,
  contentInput: { height: 120, textAlignVertical: "top" },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, borderStyle: "dashed", padding: 14, marginBottom: 4 },
  pickBtnText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  createBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  layout: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  tableCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.background, alignItems: "center" },
  tableRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + "66", alignItems: "center" },
  selectedRow: { backgroundColor: Colors.primary + "0f" },
  cell: { fontSize: 14, color: Colors.textSecondary },
  head: { fontWeight: "700", color: Colors.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  deleteBtn: { width: 80, alignItems: "center", padding: 6 },
  emptyRow: { padding: 24, alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  sigPanel: { width: 280, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  sigPanelTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 14 },
  sigRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sigAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + "22", justifyContent: "center", alignItems: "center" },
  sigAvatarText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },
  sigName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  sigMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sigBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  sigBadgeText: { fontSize: 12, color: Colors.success, fontWeight: "600" },
});
