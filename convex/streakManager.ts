import { internalMutation } from "./_generated/server";

export const resetInactiveStreaks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const today = new Date().toISOString().split("T")[0];

    for (const profile of profiles) {
      if (profile.lastActiveDate && profile.lastActiveDate !== today && profile.streak > 0) {
        // Check if they were active yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (profile.lastActiveDate !== yesterdayStr) {
          await ctx.db.patch(profile._id, { streak: 0 });
        }
      }
    }
  },
});
