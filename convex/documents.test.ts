/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

describe("documents.sign", () => {
  test("user can sign a document from their gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const documentId = await t.run((ctx) =>
      ctx.db.insert("documents", {
        gymId,
        title: "Waiver",
        content: "Please sign.",
        createdBy: userId,
        createdAt: Date.now(),
      })
    );

    await t.withIdentity(identity).mutation(api.documents.sign, {
      documentId,
      signatureName: "Test User",
    });

    const signature = await t.run((ctx) =>
      ctx.db
        .query("documentSignatures")
        .withIndex("by_document_user", (q) =>
          q.eq("documentId", documentId).eq("userId", userId)
        )
        .first()
    );
    expect(signature?.signatureName).toBe("Test User");
  });

  test("user cannot sign a document from another gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const documentId = await t.run((ctx) =>
      ctx.db.insert("documents", {
        gymId,
        title: "Waiver",
        content: "Please sign.",
        createdBy: userId,
        createdAt: Date.now(),
      })
    );
    const { identity: outsider } = await seedGymAndUser(t, {
      email: "doc-outsider@test.com",
    });

    await expect(
      t.withIdentity(outsider).mutation(api.documents.sign, {
        documentId,
        signatureName: "Outsider",
      })
    ).rejects.toThrow("Document not found");
  });
});

describe("documents.remove", () => {
  test("deletes signatures with the document", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, {
      role: "admin",
    });
    const documentId = await t.run((ctx) =>
      ctx.db.insert("documents", {
        gymId,
        title: "Waiver",
        content: "Please sign.",
        createdBy: userId,
        createdAt: Date.now(),
      })
    );
    await t.run((ctx) =>
      ctx.db.insert("documentSignatures", {
        documentId,
        userId,
        signatureName: "Admin User",
        signedAt: Date.now(),
      })
    );

    await t.withIdentity(identity).mutation(api.documents.remove, { documentId });

    const [doc, signatures] = await t.run(async (ctx) => {
      const sigs = await ctx.db
        .query("documentSignatures")
        .withIndex("by_document", (q) => q.eq("documentId", documentId))
        .collect();
      return [await ctx.db.get(documentId), sigs] as const;
    });
    expect(doc).toBeNull();
    expect(signatures).toHaveLength(0);
  });
});
