import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireAuth, requireCoachOrAdmin } from "./helpers";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCoachOrAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getDocumentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_gym_createdAt", (q) => q.eq("gymId", gymId))
      .order("desc")
      .take(100);
    return await Promise.all(
      docs.map(async (doc) => {
        const sigs = await ctx.db
          .query("documentSignatures")
          .withIndex("by_document", (q) => q.eq("documentId", doc._id))
          .take(500);
        return { ...doc, signatureCount: sigs.length };
      })
    );
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId, gymId } = await requireAuth(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_gym_createdAt", (q) => q.eq("gymId", gymId))
      .order("desc")
      .take(100);
    const mySigs = await ctx.db
      .query("documentSignatures")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(500);
    const signedMap = new Map(mySigs.map((s) => [s.documentId as string, s]));
    return docs.map((doc) => ({
      ...doc,
      signed: signedMap.has(doc._id),
      signedAt: signedMap.get(doc._id)?.signedAt ?? null,
      signatureName: signedMap.get(doc._id)?.signatureName ?? null,
    }));
  },
});

export const getSignatures = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    // Verify document belongs to this gym
    const doc = await ctx.db.get(documentId);
    if (doc?.gymId !== gymId) throw new Error("Document not found");
    const sigs = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .take(500);
    return await Promise.all(
      sigs.map(async (sig) => {
        const user = await ctx.db.get(sig.userId);
        return { ...sig, userName: user?.name ?? user?.email ?? "Unknown" };
      })
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, gymId } = await requireCoachOrAdmin(ctx);
    if (!args.content && !args.fileStorageId) throw new Error("Provide content or a PDF file");
    return await ctx.db.insert("documents", {
      ...args,
      gymId,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const sign = mutation({
  args: {
    documentId: v.id("documents"),
    signatureName: v.string(),
    signatureData: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, signatureName, signatureData }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document_user", (q) =>
        q.eq("documentId", documentId).eq("userId", userId)
      )
      .unique();
    if (existing) throw new Error("Already signed");
    await ctx.db.insert("documentSignatures", {
      documentId,
      userId,
      signatureName,
      signatureData,
      signedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const doc = await ctx.db.get(documentId);
    if (doc?.gymId !== gymId) throw new Error("Document not found");
    if (doc.fileStorageId) {
      await ctx.storage.delete(doc.fileStorageId);
    }
    await ctx.db.delete(documentId);
  },
});
