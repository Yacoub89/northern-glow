import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";
import { MutationCtx } from "./_generated/server";

function normalizeEmail(email: string | undefined): string | null {
  const normalized = email?.toLowerCase().trim();
  return normalized ? normalized : null;
}

function isSuperAdminEmail(email: string): boolean {
  const allowlist = (process.env.NORTHERNGLOW_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email);
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name !== undefined && { name: params.name as string }),
        };
      },
      verify: ResendOTP,
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // @convex-dev/auth passes `emailVerified: boolean` but our schema uses
      // `emailVerificationTime: number` — strip it out and convert.
      const { emailVerified, ...profile } = args.profile;
      const verifiedAt = emailVerified ? { emailVerificationTime: Date.now() } : {};
      const email = normalizeEmail(profile.email as string | undefined);

      if (args.existingUserId) {
        // Existing user: update profile fields but never touch role.
        await ctx.db.patch(args.existingUserId, { ...profile, ...verifiedAt });
        return args.existingUserId;
      }

      if (!email) throw new Error("An invite is required to create an account.");

      const db = (ctx as MutationCtx).db;

      const pendingInvite = await db
        .query("gymInvites")
        .withIndex("by_email", (q) => q.eq("email", email))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("desc")
        .first();

      const hasUsableInvite = pendingInvite !== null && pendingInvite.expiresAt >= Date.now();
      if (!hasUsableInvite && !isSuperAdminEmail(email)) {
        throw new Error("An invite is required to create an account.");
      }

      // New user: default role to athlete. Welcome email is sent later
      // by invites.checkAndAccept once the user is linked to a gym.
      return await ctx.db.insert("users", {
        ...profile,
        email,
        ...verifiedAt,
        role: "athlete" as const,
      });
    },
  },
});
