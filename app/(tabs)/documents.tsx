import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DocumentsScreen() {
  const me = useQuery(api.users.getMe);
  const isCoach = me?.role === "coach" || me?.role === "admin";

  const coachDocs = useQuery(api.documents.listAll, isCoach ? {} : "skip");
  const memberDocs = useQuery(api.documents.listMine, me !== undefined && !isCoach ? {} : "skip");

  // Signatures modal state (coach)
  const [sigsDocId, setSigsDocId] = useState<Id<"documents"> | null>(null);
  const sigs = useQuery(
    api.documents.getSignatures,
    sigsDocId ? { documentId: sigsDocId } : "skip"
  );

  // Create modal state (coach)
  const [createVisible, setCreateVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  // Sign modal state (member)
  const [signDoc, setSignDoc] = useState<{
    _id: Id<"documents">;
    title: string;
    description?: string | null;
    content: string;
  } | null>(null);
  const [sigName, setSigName] = useState("");
  const [signing, setSigning] = useState(false);

  const createDoc = useMutation(api.documents.create);
  const signDoc2 = useMutation(api.documents.sign);
  const removeDoc = useMutation(api.documents.remove);

  const docs = isCoach ? coachDocs : memberDocs;

  const pendingCount = !isCoach
    ? (memberDocs ?? []).filter((d) => !d.signed).length
    : 0;

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      await createDoc({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        content: newContent.trim(),
      });
      setNewTitle("");
      setNewDesc("");
      setNewContent("");
      setCreateVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSign = async () => {
    if (!signDoc || !sigName.trim()) return;
    setSigning(true);
    try {
      await signDoc2({ documentId: signDoc._id, signatureName: sigName.trim() });
      setSignDoc(null);
      setSigName("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSigning(false);
    }
  };

  const handleDelete = (docId: Id<"documents">, title: string) => {
    Alert.alert("Delete Document", `Delete "${title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeDoc({ documentId: docId });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  if (me === undefined || docs === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          {!isCoach && pendingCount > 0 && (
            <Text style={styles.pendingBadge}>{pendingCount} pending signature{pendingCount > 1 ? "s" : ""}</Text>
          )}
        </View>
        {isCoach && (
          <Pressable style={styles.newBtn} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        )}
      </View>

      {docs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            {isCoach ? "No documents yet.\nTap New to create one." : "No documents to sign yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const signed = !isCoach && (item as any).signed;
            const sigCount = isCoach ? (item as any).signatureCount : null;
            return (
              <Pressable
                style={[styles.card, signed && styles.cardSigned]}
                onPress={() => {
                  if (isCoach) {
                    setSigsDocId(item._id);
                  } else if (!signed) {
                    setSignDoc(item);
                    setSigName(me?.name ?? "");
                  }
                }}
                onLongPress={() => isCoach && handleDelete(item._id, item.title)}
              >
                <View style={styles.cardLeft}>
                  <Ionicons
                    name={signed ? "checkmark-circle" : "document-text-outline"}
                    size={22}
                    color={signed ? Colors.success : Colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    {isCoach ? (
                      <Text style={styles.cardMeta}>{sigCount} signed · {formatDate(item.createdAt)}</Text>
                    ) : signed ? (
                      <Text style={[styles.cardMeta, { color: Colors.success }]}>
                        Signed {formatDate((item as any).signedAt)}
                      </Text>
                    ) : (
                      <Text style={[styles.cardMeta, { color: Colors.warning }]}>Tap to read & sign</Text>
                    )}
                  </View>
                </View>
                {!signed && !isCoach && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                )}
                {isCoach && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Sign Modal (member) */}
      <Modal visible={!!signDoc} transparent animationType="slide" onRequestClose={() => setSignDoc(null)}>
        <Pressable style={styles.overlay} onPress={() => setSignDoc(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{signDoc?.title}</Text>
          {signDoc?.description ? (
            <Text style={styles.sheetDesc}>{signDoc.description}</Text>
          ) : null}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator>
            <Text style={styles.contentText}>{signDoc?.content}</Text>
          </ScrollView>
          <Text style={styles.sheetLabel}>Type your full name to sign</Text>
          <TextInput
            style={styles.sheetInput}
            value={sigName}
            onChangeText={setSigName}
            placeholder="Full name"
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
          />
          <Pressable
            style={[styles.signBtn, (!sigName.trim() || signing) && { opacity: 0.5 }]}
            onPress={handleSign}
            disabled={!sigName.trim() || signing}
          >
            <Ionicons name="pencil" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.signBtnText}>{signing ? "Signing…" : "I Agree & Sign"}</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Signatures Modal (coach) */}
      <Modal
        visible={!!sigsDocId}
        transparent
        animationType="slide"
        onRequestClose={() => setSigsDocId(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSigsDocId(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Signatures</Text>
          {sigs === undefined ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : sigs.length === 0 ? (
            <Text style={styles.emptyText}>No one has signed yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {sigs.map((sig) => (
                <View key={sig._id} style={styles.sigRow}>
                  <View>
                    <Text style={styles.sigName}>{sig.signatureName}</Text>
                    <Text style={styles.sigUser}>{sig.userName}</Text>
                  </View>
                  <Text style={styles.sigDate}>{formatDate(sig.signedAt)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Create Modal (coach) */}
      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setCreateVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>New Document</Text>

          <Text style={styles.sheetLabel}>Title</Text>
          <TextInput
            style={styles.sheetInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder='e.g. "Liability Waiver"'
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          <Text style={[styles.sheetLabel, { marginTop: 12 }]}>Description (optional)</Text>
          <TextInput
            style={styles.sheetInput}
            value={newDesc}
            onChangeText={setNewDesc}
            placeholder="Short summary shown in the list"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[styles.sheetLabel, { marginTop: 12 }]}>Content</Text>
          <TextInput
            style={[styles.sheetInput, styles.contentInput]}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="Full document text that members will read before signing…"
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.signBtn, (!newTitle.trim() || !newContent.trim() || creating) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || !newContent.trim() || creating}
          >
            <Text style={styles.signBtnText}>{creating ? "Creating…" : "Create Document"}</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  pendingBadge: { fontSize: 13, color: Colors.warning, fontWeight: "600", marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSigned: { borderColor: Colors.success + "44" },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  sheetDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  sheetLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentScroll: {
    maxHeight: 200,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  contentInput: { height: 140, marginBottom: 0 },
  signBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Sig rows
  sigRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sigName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  sigUser: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sigDate: { fontSize: 12, color: Colors.textSecondary },
});
