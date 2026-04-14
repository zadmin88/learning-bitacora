import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reset streaks daily at midnight UTC for users who didn't write or review
crons.daily(
  "reset-streaks",
  { hourUTC: 0, minuteUTC: 0 },
  internal.streakManager.resetInactiveStreaks
);

export default crons;
