import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { formatTimestamp } from "../../utils/date";
import { useAppDialog } from "../../components/AppDialog";

// ─── Signature Pad ────────────────────────────────────────────────────────────

type SigPadProps = {
  onSigned: (pathsJson: string) => void;
  onClear: () => void;
};

function SignaturePad({ onSigned, onClear }: SigPadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef("");
  const [liveD, setLiveD] = useState("");

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentPath.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setLiveD(currentPath.current);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentPath.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setLiveD(currentPath.current);
    },
    onPanResponderRelease: () => {
      if (!currentPath.current) return;
      const done = [...paths, currentPath.current];
      setPaths(done);
      currentPath.current = "";
      setLiveD("");
      onSigned(JSON.stringify(done));
    },
  });

  const clear = () => {
    setPaths([]);
    currentPath.current = "";
    setLiveD("");
    onClear();
  };

  return (
    <View style={padStyles.container}>
      <View style={padStyles.row}>
        <Text style={padStyles.label}>Draw your signature</Text>
        <Pressable style={padStyles.clearBtn} onPress={clear}>
          <Ionicons name="refresh" size={13} color={Colors.textSecondary} />
          <Text style={padStyles.clearText}>Clear</Text>
        </Pressable>
      </View>
      <View style={padStyles.canvas} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFillObject}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke="#FFFFFF"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {liveD ? (
            <Path
              d={liveD}
              stroke="#FFFFFF"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {paths.length === 0 && !liveD && (
          <Text style={padStyles.placeholder}>Sign here</Text>
        )}
      </View>
    </View>
  );
}

const padStyles = StyleSheet.create({
  container: { marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  clearText: { fontSize: 12, color: Colors.textSecondary },
  canvas: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { color: Colors.textMuted, fontSize: 14, pointerEvents: "none" },
});

// ─── Signature Preview (coach view) ──────────────────────────────────────────

function SigPreview({ pathsJson }: { pathsJson: string }) {
  try {
    const paths: string[] = JSON.parse(pathsJson);
    return (
      <View style={previewStyles.box}>
        <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 200 60">
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={Colors.text}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    );
  } catch {
    return null;
  }
}

const previewStyles = StyleSheet.create({
  box: {
    width: 100,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type DocumentListItem = Doc<"documents"> & {
  signatureCount?: number;
  signed?: boolean;
  signedAt?: number | null;
  signatureName?: string | null;
};

export default function DocumentsScreen() {
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const me = useQuery(api.users.getMe);
  const isCoach = me?.role === "coach" || me?.role === "admin";

  const coachDocs = useQuery(api.documents.listAll, isCoach ? {} : "skip");
  const memberDocs = useQuery(api.documents.listMine, me !== undefined && !isCoach ? {} : "skip");

  const [sigsDocId, setSigsDocId] = useState<Id<"documents"> | null>(null);
  const sigs = useQuery(
    api.documents.getSignatures,
    sigsDocId ? { documentId: sigsDocId } : "skip"
  );

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [pdfMode, setPdfMode] = useState(false);
  const [pickedPdf, setPickedPdf] = useState<{ name: string; uri: string } | null>(null);
  const [creating, setCreating] = useState(false);

  // Sign modal
  const [signDoc, setSignDoc] = useState<{
    _id: Id<"documents">;
    title: string;
    description?: string | null;
    content?: string | null;
    fileStorageId?: Id<"_storage"> | null;
  } | null>(null);
  const [sigName, setSigName] = useState("");
  const [sigPaths, setSigPaths] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const pdfUrl = useQuery(
    api.documents.getDocumentUrl,
    signDoc?.fileStorageId ? { documentId: signDoc._id } : "skip"
  );

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDoc = useMutation(api.documents.create);
  const signMutation = useMutation(api.documents.sign);
  const removeDoc = useMutation(api.documents.remove);

  const docs = ((isCoach ? coachDocs : memberDocs) ?? []) as DocumentListItem[];
  const pendingCount = !isCoach ? (memberDocs ?? []).filter((d) => !d.signed).length : 0;

  const resetCreate = () => {
    setNewTitle(""); setNewDesc(""); setNewContent("");
    setPdfMode(false); setPickedPdf(null);
  };

  const handlePickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets[0]) {
      setPickedPdf({ name: result.assets[0].name, uri: result.assets[0].uri });
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    if (pdfMode && !pickedPdf) return;
    if (!pdfMode && !newContent.trim()) return;
    setCreating(true);
    try {
      if (pdfMode && pickedPdf) {
        const uploadUrl = await generateUploadUrl();
        const resp = await fetch(pickedPdf.uri);
        const blob = await resp.blob();
        const uploadResp = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: blob,
        });
        const { storageId } = await uploadResp.json();
        await createDoc({ title: newTitle.trim(), description: newDesc.trim() || undefined, fileStorageId: storageId });
      } else {
        await createDoc({ title: newTitle.trim(), description: newDesc.trim() || undefined, content: newContent.trim() });
      }
      resetCreate();
      setCreateVisible(false);
    } catch (e: any) {
      dialog.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSign = async () => {
    if (!signDoc || !sigName.trim() || !sigPaths) return;
    setSigning(true);
    try {
      await signMutation({
        documentId: signDoc._id,
        signatureName: sigName.trim(),
        signatureData: sigPaths,
      });
      setSignDoc(null);
      setSigName("");
      setSigPaths(null);
    } catch (e: any) {
      dialog.alert("Error", e.message);
    } finally {
      setSigning(false);
    }
  };

  const handleDelete = async (docId: Id<"documents">, title: string) => {
    const confirmed = await dialog.confirm({
      title: "Delete Document",
      message: `Delete "${title}"? This cannot be undone.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeDoc({ documentId: docId });
    } catch (e: any) {
      dialog.alert("Error", e.message);
    }
  };

  if (me === undefined || docs === undefined) {
    return <View style={s.centered}><ActivityIndicator color={primary} size="large" /></View>;
  }

  const canCreate = pdfMode ? !!newTitle.trim() && !!pickedPdf : !!newTitle.trim() && !!newContent.trim();

  return (
    <SafeAreaView style={s.container} edges={[]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Documents</Text>
          {!isCoach && pendingCount > 0 && (
            <Text style={s.pendingBadge}>{pendingCount} pending signature{pendingCount > 1 ? "s" : ""}</Text>
          )}
        </View>
        {isCoach && (
          <Pressable style={[s.newBtn, { backgroundColor: primary }]} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.newBtnText}>New</Text>
          </Pressable>
        )}
      </View>

      {docs.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
          <Text style={s.emptyText}>
            {isCoach ? "No documents yet.\nTap New to create one." : "No documents to sign yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const signed = !isCoach && (item as any).signed;
            const sigCount = isCoach ? (item as any).signatureCount : null;
            const isPdf = !!(item as any).fileStorageId;
            return (
              <Pressable
                style={[s.card, signed && s.cardSigned]}
                onPress={() => {
                  if (isCoach) { setSigsDocId(item._id); }
                  else if (!signed) { setSignDoc(item as any); setSigName(me?.name ?? ""); setSigPaths(null); }
                }}
                onLongPress={() => isCoach && handleDelete(item._id, item.title)}
              >
                <View style={s.cardLeft}>
                  <Ionicons
                    name={signed ? "checkmark-circle" : isPdf ? "document-attach-outline" : "document-text-outline"}
                    size={22}
                    color={signed ? Colors.success : primary}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    {item.description ? <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
                    {isCoach ? (
                      <Text style={s.cardMeta}>{isPdf ? "PDF · " : ""}{sigCount} signed · {formatTimestamp(item.createdAt)}</Text>
                    ) : signed ? (
                      <Text style={[s.cardMeta, { color: Colors.success }]}>Signed {formatTimestamp((item as any).signedAt)}</Text>
                    ) : (
                      <Text style={[s.cardMeta, { color: Colors.warning }]}>Tap to read & sign</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* ── Sign Modal (athlete) ── full screen */}
      <Modal
        visible={!!signDoc}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSignDoc(null)}
      >
        <SafeAreaView style={s.signScreen}>
          {/* Top bar */}
          <View style={s.signHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.signTitle} numberOfLines={1}>{signDoc?.title}</Text>
              {signDoc?.description ? <Text style={s.signSubtitle} numberOfLines={1}>{signDoc.description}</Text> : null}
            </View>
            <Pressable style={s.closeBtn} onPress={() => setSignDoc(null)}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          {/* Document content */}
          <ScrollView style={s.docScroll} contentContainerStyle={{ padding: 20 }}>
            {signDoc?.fileStorageId ? (
              <View style={s.pdfCard}>
                <Ionicons name="document-attach-outline" size={40} color={primary} />
                <Text style={s.pdfCardTitle}>{signDoc.title}</Text>
                <Text style={s.pdfCardHint}>Opens in your browser</Text>
                <Pressable
                  style={[s.openPdfBtn, { backgroundColor: primary }]}
                  onPress={() => pdfUrl && Linking.openURL(pdfUrl)}
                  disabled={!pdfUrl}
                >
                  <Ionicons name="open-outline" size={16} color="#fff" />
                  <Text style={s.openPdfText}>Open PDF to Review</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={s.docText}>{signDoc?.content}</Text>
            )}
          </ScrollView>

          {/* Signature section */}
          <View style={s.signSection}>
            <Text style={s.sheetLabel}>Full name (printed)</Text>
            <TextInput
              style={s.nameInput}
              value={sigName}
              onChangeText={setSigName}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
            <SignaturePad
              onSigned={(paths) => setSigPaths(paths)}
              onClear={() => setSigPaths(null)}
            />
            <Pressable
              style={[s.signBtn, { backgroundColor: primary }, (!sigName.trim() || !sigPaths || signing) && { opacity: 0.4 }]}
              onPress={handleSign}
              disabled={!sigName.trim() || !sigPaths || signing}
            >
              <Ionicons name="pencil" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.signBtnText}>{signing ? "Signing…" : "I Agree & Sign"}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Signatures Modal (coach) */}
      <Modal visible={!!sigsDocId} transparent animationType="slide" onRequestClose={() => setSigsDocId(null)}>
        <Pressable style={s.overlay} onPress={() => setSigsDocId(null)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Signatures</Text>
          {sigs === undefined ? (
            <ActivityIndicator color={primary} style={{ marginTop: 20 }} />
          ) : sigs.length === 0 ? (
            <Text style={s.emptyText}>No one has signed yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {sigs.map((sig) => (
                <View key={sig._id} style={s.sigRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sigName}>{sig.signatureName}</Text>
                    <Text style={s.sigUser}>{sig.userName}</Text>
                    <Text style={s.sigDate}>{formatTimestamp(sig.signedAt)}</Text>
                  </View>
                  {sig.signatureData ? <SigPreview pathsJson={sig.signatureData} /> : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Create Modal (coach) */}
      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCreateVisible(false); resetCreate(); }}
      >
        <Pressable style={s.overlay} onPress={() => { setCreateVisible(false); resetCreate(); }} />
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>New Document</Text>

          <View style={s.toggle}>
            <Pressable style={[s.toggleBtn, !pdfMode && [s.toggleActive, { backgroundColor: primary }]]} onPress={() => setPdfMode(false)}>
              <Ionicons name="document-text-outline" size={14} color={!pdfMode ? "#fff" : Colors.textSecondary} />
              <Text style={[s.toggleText, !pdfMode && s.toggleTextActive]}>Write Text</Text>
            </Pressable>
            <Pressable style={[s.toggleBtn, pdfMode && [s.toggleActive, { backgroundColor: primary }]]} onPress={() => setPdfMode(true)}>
              <Ionicons name="document-attach-outline" size={14} color={pdfMode ? "#fff" : Colors.textSecondary} />
              <Text style={[s.toggleText, pdfMode && s.toggleTextActive]}>Upload PDF</Text>
            </Pressable>
          </View>

          <Text style={s.sheetLabel}>Title</Text>
          <TextInput style={s.sheetInput} value={newTitle} onChangeText={setNewTitle}
            placeholder='e.g. "Liability Waiver"' placeholderTextColor={Colors.textMuted} autoFocus />

          <Text style={[s.sheetLabel, { marginTop: 12 }]}>Description (optional)</Text>
          <TextInput style={s.sheetInput} value={newDesc} onChangeText={setNewDesc}
            placeholder="Short summary shown in the list" placeholderTextColor={Colors.textMuted} />

          {pdfMode ? (
            <>
              <Text style={[s.sheetLabel, { marginTop: 12 }]}>PDF File</Text>
              <Pressable style={[s.pickBtn, { borderColor: primary }]} onPress={handlePickPdf}>
                <Ionicons name="cloud-upload-outline" size={20} color={primary} />
                <Text style={[s.pickBtnText, { color: primary }]} numberOfLines={1}>{pickedPdf ? pickedPdf.name : "Choose PDF from device"}</Text>
              </Pressable>
              {pickedPdf && <Text style={s.pickedHint}>✓ Ready to upload</Text>}
            </>
          ) : (
            <>
              <Text style={[s.sheetLabel, { marginTop: 12 }]}>Content</Text>
              <TextInput style={[s.sheetInput, s.contentInput]} value={newContent} onChangeText={setNewContent}
                placeholder="Full document text that members will read before signing…"
                placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />
            </>
          )}

          <Pressable
            style={[s.signBtn, { backgroundColor: primary }, (!canCreate || creating) && { opacity: 0.4 }]}
            onPress={handleCreate}
            disabled={!canCreate || creating}
          >
            <Text style={s.signBtnText}>{creating ? "Creating…" : "Create Document"}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  pendingBadge: { fontSize: 13, color: Colors.warning, fontWeight: "600", marginTop: 2 },
  newBtn: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border },
  cardSigned: { borderColor: Colors.success + "44" },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: "center", lineHeight: 22 },

  // Sign screen
  signScreen: { flex: 1, backgroundColor: Colors.background },
  signHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  signTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  signSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  docScroll: { flex: 1 },
  docText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  pdfCard: { alignItems: "center", paddingVertical: 40, gap: 12, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  pdfCardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  pdfCardHint: { fontSize: 12, color: Colors.textSecondary },
  openPdfBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  openPdfText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  signSection: { backgroundColor: Colors.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.border },
  nameInput: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  signBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 12 },
  signBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  sheetScroll: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { padding: 24, paddingBottom: 60 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 16 },
  sheetLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  sheetInput: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  contentInput: { height: 140 },

  // Sig rows
  sigRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  sigName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  sigUser: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sigDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Create extras
  toggle: { flexDirection: "row", backgroundColor: Colors.background, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 9 },
  toggleActive: {},
  toggleText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  toggleTextActive: { color: "#fff" },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", padding: 16 },
  pickBtnText: { fontSize: 14, fontWeight: "600", flex: 1 },
  pickedHint: { fontSize: 12, color: Colors.success, marginTop: 6, fontWeight: "600" },
});
