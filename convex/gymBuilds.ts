import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const gymSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
  "gym";

const androidPackageSegment = (slug: string) => {
  const segment =
    slug.replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "") || "gym";
  return /^[a-z]/.test(segment) ? segment : `g_${segment}`;
};

const legacyIosBundleIds: Record<string, string> = {
  ocfit: "com.orleanscrossfit.ocfit",
};

/** Returns gym data with resolved asset URLs, used by the /gym-build-config HTTP endpoint. */
export const getGymForBuild = internalQuery({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const gym = await ctx.db.get(gymId);
    if (!gym) return null;

    const [logoUrl, appIconUrl, splashUrl] = await Promise.all([
      gym.logoStorageId ? ctx.storage.getUrl(gym.logoStorageId) : null,
      gym.appIconStorageId ? ctx.storage.getUrl(gym.appIconStorageId) : null,
      gym.splashStorageId ? ctx.storage.getUrl(gym.splashStorageId) : null,
    ]);

    const slug = gymSlug(gym.name);
    const androidSegment = androidPackageSegment(slug);
    const iosBundleId =
      gym.iosBundleId ?? legacyIosBundleIds[slug] ?? `com.northernglow.${slug}`;
    const androidPackage = gym.androidPackage ?? `com.northernglow.${androidSegment}`;

    return {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
      slug,
      bundleId: iosBundleId,
      androidPackage,
      logoUrl,
      appIconUrl,
      splashUrl,
    };
  },
});
