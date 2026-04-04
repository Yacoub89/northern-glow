import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name !== undefined && { name: params.name as string }),
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        // Existing user: update profile fields but never touch role.
        await ctx.db.patch(args.existingUserId, args.profile);
        return args.existingUserId;
      }
      // New user: default role to athlete.
      return await ctx.db.insert("users", {
        ...args.profile,
        role: "athlete" as const,
      });
    },
  },
});
