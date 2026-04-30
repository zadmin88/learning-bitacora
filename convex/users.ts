import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { ...user, profile };
  },
});

const VALID_LEVELS = ["beginner", "intermediate", "advanced"];

export const updatePreferences = mutation({
  args: {
    challengeLevel: v.optional(v.string()),
    showSpanish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");

    const updates: Record<string, string | boolean> = {};
    if (args.challengeLevel !== undefined) {
      if (!VALID_LEVELS.includes(args.challengeLevel)) {
        throw new Error("Invalid challenge level");
      }
      updates.challengeLevel = args.challengeLevel;
    }
    if (args.showSpanish !== undefined) {
      updates.showSpanish = args.showSpanish;
    }

    await ctx.db.patch(profile._id, updates);
  },
});

export const ensureProfile = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!existing) {
      await ctx.db.insert("profiles", {
        userId: args.userId,
        streak: 0,
        createdAt: Date.now(),
      });
    }
  },
});
