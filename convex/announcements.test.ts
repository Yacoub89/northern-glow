/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

describe("announcements", () => {
  test("coach can create and athletes can read active announcements", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity: coachIdentity } = await seedGymAndUser(t, { role: "coach" });
    const athleteId = await t.run((ctx) =>
      ctx.db.insert("users", {
        gymId,
        name: "Athlete",
        email: "athlete-announcements@test.com",
        role: "athlete",
      })
    );
    const athleteIdentity = { subject: `${athleteId}|session` };

    await t.withIdentity(coachIdentity).mutation(api.announcements.create, {
      title: "New gym number",
      body: "Call 613-800-9671.",
      startDate: "2099-05-01",
      endDate: "2099-05-08",
      pinned: true,
    });

    const active = await t.withIdentity(athleteIdentity).query(api.announcements.listActive, {
      date: "2099-05-04",
    });
    const expired = await t.withIdentity(athleteIdentity).query(api.announcements.listActive, {
      date: "2099-05-09",
    });

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ title: "New gym number", body: "Call 613-800-9671." });
    expect(expired).toHaveLength(0);
  });

  test("athlete cannot create announcements", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.announcements.create, {
        title: "Nope",
        body: "Nope",
        startDate: "2099-05-01",
      })
    ).rejects.toThrow("Unauthorized");
  });

  test("rejects an end date before the start date", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });

    await expect(
      t.withIdentity(identity).mutation(api.announcements.create, {
        title: "Bad dates",
        body: "Nope",
        startDate: "2099-05-08",
        endDate: "2099-05-01",
      })
    ).rejects.toThrow("End date must be after the start date");
  });
});
