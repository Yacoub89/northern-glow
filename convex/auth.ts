import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";
import { internal } from "./_generated/api";

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

      if (args.existingUserId) {
        // Existing user: update profile fields but never touch role.
        await ctx.db.patch(args.existingUserId, { ...profile, ...verifiedAt });
        return args.existingUserId;
      }
      // New user: default role to athlete.
      const userId = await ctx.db.insert("users", {
        ...profile,
        ...verifiedAt,
        role: "athlete" as const,
      });
      // Send welcome email (fires after the mutation commits).
      if (profile.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.scheduler.runAfter(0, (internal as any).email.sendWelcomeEmail, {
          email: profile.email as string,
          name: profile.name as string | undefined,
        });
      }
      return userId;
    },
  },
});
