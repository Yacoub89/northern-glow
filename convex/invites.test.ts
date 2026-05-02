/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertGym } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── invites.createGymWithAdmin ────────────────────────────────────────────────

describe("invites.createGymWithAdmin", () => {
  test("super-admin without a gym can create one and become admin", async () => {
    process.env.NORTHERNGLOW_SUPERADMIN_EMAILS = "founder@test.com";
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Founder", email: "founder@test.com" })
    );
    const identity = { subject: `${userId}|session` };

    const gymId = await t.withIdentity(identity).mutation(api.invites.createGymWithAdmin, {
      gymName: "Iron Works",
      tagline: "Stronger every day",
      primaryColor: "#FF0000",
      timezone: "America/Vancouver",
    });

    const gym = await t.run((ctx) => ctx.db.get(gymId));
    expect(gym?.name).toBe("Iron Works");

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.gymId).toBe(gymId);
    expect(user?.role).toBe("admin");
  });

  test("non-super-admin cannot create a gym", async () => {
    process.env.NORTHERNGLOW_SUPERADMIN_EMAILS = "founder@test.com";
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Random", email: "random@test.com" })
    );
    const identity = { subject: `${userId}|session` };

    await expect(
      t.withIdentity(identity).mutation(api.invites.createGymWithAdmin, {
        gymName: "Sneaky Gym",
        tagline: "...",
        primaryColor: "#000",
        timezone: "UTC",
      })
    ).rejects.toThrow("Unauthorized");
  });

  test("super-admin already in a gym cannot create another", async () => {
    process.env.NORTHERNGLOW_SUPERADMIN_EMAILS = "founder@test.com";
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, {
      role: "admin",
      email: "founder@test.com",
    });

    await expect(
      t.withIdentity(identity).mutation(api.invites.createGymWithAdmin, {
        gymName: "Second Gym",
        tagline: "...",
        primaryColor: "#000",
        timezone: "UTC",
      })
    ).rejects.toThrow("You are already part of a gym");
  });
});

// ── invites.superAdminCreateGym ──────────────────────────────────────────────

describe("invites.superAdminCreateGym", () => {
  test("creates a client gym and invite without linking the super-admin", async () => {
    const previous = process.env.NORTHERNGLOW_SUPERADMIN_EMAILS;
    process.env.NORTHERNGLOW_SUPERADMIN_EMAILS = "founder@test.com";

    try {
      const t = convexTest(schema, modules);
      const userId = await t.run((ctx) =>
        ctx.db.insert("users", { name: "Founder", email: "founder@test.com" })
      );
      const identity = { subject: `${userId}|session` };

      const gymId = await t.withIdentity(identity).mutation(api.invites.superAdminCreateGym, {
        gymName: "Client Gym",
        tagline: "Powered by NorthernGlow",
        primaryColor: "#1BBFBF",
        timezone: "America/Toronto",
        adminEmail: "owner@test.com",
      });

      const superAdmin = await t.run((ctx) => ctx.db.get(userId));
      expect(superAdmin?.gymId).toBeUndefined();
      expect(superAdmin?.role).toBeUndefined();

      const invite = await t.run((ctx) =>
        ctx.db
          .query("gymInvites")
          .withIndex("by_gym_email", (q) =>
            q.eq("gymId", gymId).eq("email", "owner@test.com")
          )
          .first()
      );
      expect(invite?.status).toBe("pending");
      expect(invite?.role).toBe("admin");
    } finally {
      if (previous === undefined) {
        delete process.env.NORTHERNGLOW_SUPERADMIN_EMAILS;
      } else {
        process.env.NORTHERNGLOW_SUPERADMIN_EMAILS = previous;
      }
    }
  });
});

// ── invites.send ──────────────────────────────────────────────────────────────

describe("invites.send", () => {
  test("coach can send an invite", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "coach" });

    await t.withIdentity(identity).mutation(api.invites.send, {
      email: "newathlete@test.com",
      role: "athlete",
    });

    const invite = await t.run((ctx) =>
      ctx.db
        .query("gymInvites")
        .withIndex("by_gym_email", (q) =>
          q.eq("gymId", gymId).eq("email", "newathlete@test.com")
        )
        .first()
    );
    expect(invite?.status).toBe("pending");
    expect(invite?.role).toBe("athlete");
  });

  test("normalises email to lower case", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });

    await t.withIdentity(identity).mutation(api.invites.send, {
      email: "Coach@Example.COM",
      role: "coach",
    });

    const invite = await t.run((ctx) =>
      ctx.db
        .query("gymInvites")
        .withIndex("by_gym_email", (q) =>
          q.eq("gymId", gymId).eq("email", "coach@example.com")
        )
        .first()
    );
    expect(invite).toBeTruthy();
  });

  test("re-sending to the same email expires the old invite", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });

    await t.withIdentity(identity).mutation(api.invites.send, { email: "dup@test.com", role: "athlete" });
    await t.withIdentity(identity).mutation(api.invites.send, { email: "dup@test.com", role: "coach" });

    const invites = await t.run((ctx) =>
      ctx.db
        .query("gymInvites")
        .withIndex("by_gym_email", (q) => q.eq("gymId", gymId).eq("email", "dup@test.com"))
        .collect()
    );

    const pending = invites.filter((i) => i.status === "pending");
    const expired = invites.filter((i) => i.status === "expired");
    expect(pending).toHaveLength(1);
    expect(expired).toHaveLength(1);
    expect(pending[0].role).toBe("coach");
  });

  test("athlete cannot send invites", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.invites.send, { email: "x@test.com", role: "athlete" })
    ).rejects.toThrow("Unauthorized");
  });
});

// ── invites.revoke ────────────────────────────────────────────────────────────

describe("invites.revoke", () => {
  test("coach can revoke a pending invite", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("gymInvites", {
        gymId,
        email: "revoke@test.com",
        inviteCode: "ABC123",
        role: "athlete",
        status: "pending",
        invitedBy: userId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    await t.withIdentity(identity).mutation(api.invites.revoke, { inviteId });

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.status).toBe("expired");
  });

  test("cannot revoke an invite from a different gym", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "admin" });
    const { gymId: gym2, userId: admin2 } = await seedGymAndUser(t, { role: "admin" });

    const inviteId = await t.run((ctx) =>
      ctx.db.insert("gymInvites", {
        gymId: gym2,
        email: "other@test.com",
        inviteCode: "XYZ999",
        role: "athlete",
        status: "pending",
        invitedBy: admin2,
        expiresAt: Date.now() + 86400000,
      })
    );

    await expect(
      t.withIdentity(identity).mutation(api.invites.revoke, { inviteId })
    ).rejects.toThrow("Invite not found");
  });
});

// ── invites.checkAndAccept ────────────────────────────────────────────────────

describe("invites.checkAndAccept", () => {
  test("links user to gym when a valid invite exists", async () => {
    const t = convexTest(schema, modules);
    const gymId = await insertGym(t);
    const adminId = await t.run((ctx) => ctx.db.insert("users", { gymId, role: "admin", name: "Admin" }));

    // Create a new user (no gym yet) with email matching the invite
    const newUserId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "newmember@test.com", name: "New Member" })
    );
    const identity = { subject: `${newUserId}|session` };

    await t.run((ctx) =>
      ctx.db.insert("gymInvites", {
        gymId,
        email: "newmember@test.com",
        inviteCode: "WELCOME1",
        role: "athlete",
        status: "pending",
        invitedBy: adminId,
        expiresAt: Date.now() + 86400000,
      })
    );

    const result = await t.withIdentity(identity).mutation(api.invites.checkAndAccept);
    expect(result.status).toBe("accepted");

    const user = await t.run((ctx) => ctx.db.get(newUserId));
    expect(user?.gymId).toBe(gymId);
    expect(user?.role).toBe("athlete");
  });

  test("returns already_member when user already has a gym", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    const result = await t.withIdentity(identity).mutation(api.invites.checkAndAccept);
    expect(result.status).toBe("already_member");
  });

  test("returns no_invite when no pending invite exists", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "nobody@test.com", name: "Nobody" })
    );
    const identity = { subject: `${userId}|session` };

    const result = await t.withIdentity(identity).mutation(api.invites.checkAndAccept);
    expect(result.status).toBe("no_invite");
  });

  test("returns expired and marks invite when invite has passed its expiry", async () => {
    const t = convexTest(schema, modules);
    const gymId = await insertGym(t);
    const adminId = await t.run((ctx) => ctx.db.insert("users", { gymId, role: "admin", name: "Admin" }));

    const newUserId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "expired@test.com", name: "Expired" })
    );
    const identity = { subject: `${newUserId}|session` };

    await t.run((ctx) =>
      ctx.db.insert("gymInvites", {
        gymId,
        email: "expired@test.com",
        inviteCode: "OLD001",
        role: "athlete",
        status: "pending",
        invitedBy: adminId,
        expiresAt: Date.now() - 1000, // already expired
      })
    );

    const result = await t.withIdentity(identity).mutation(api.invites.checkAndAccept);
    expect(result.status).toBe("expired");
  });
});

// ── invites.list ──────────────────────────────────────────────────────────────

describe("invites.list", () => {
  test("coach can list all gym invites", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });

    await t.run((ctx) =>
      ctx.db.insert("gymInvites", {
        gymId,
        email: "list@test.com",
        inviteCode: "LIST001",
        role: "athlete",
        status: "pending",
        invitedBy: userId,
        expiresAt: Date.now() + 86400000,
      })
    );

    const invites = await t.withIdentity(identity).query(api.invites.list);
    expect(invites.length).toBeGreaterThanOrEqual(1);
    expect(invites.some((i) => i.email === "list@test.com")).toBe(true);
  });

  test("athlete cannot list invites", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).query(api.invites.list)
    ).rejects.toThrow("Unauthorized");
  });
});
