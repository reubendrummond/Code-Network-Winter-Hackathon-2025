import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function randomJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const createMem = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    place: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // ensure unique join code
    let joinCode = "";
    for (let i = 0; i < 10; i++) {
      const candidate = randomJoinCode();
      const exists = await ctx.db
        .query("mems")
        .withIndex("by_join_code", (q) => q.eq("joinCode", candidate))
        .first();
      if (!exists) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) throw new Error("Could not generate a unique join code");

    const memId = await ctx.db.insert("mems", {
      name: args.name,
      description: args.description,
      place: args.place,
      isPublic: args.isPublic ?? false,
      creatorId: userId,
      joinCode,
      createdAt: Date.now(),
    });

    await ctx.db.insert("memParticipants", {
      memId,
      userId,
      role: "creator",
      joinedAt: Date.now(),
    });

  const baseUrl = process.env.SITE_URL || "http://localhost:3001";
  // Force auth first, then redirect to dashboard with the join code
  const joinUrl = `${baseUrl}/login?redirect=%2Fdashboard&joinCode=${joinCode}`;
  return { memId, name: args.name, joinCode, joinUrl };
  },
});

export const joinMem = mutation({
  args: { joinCode: v.string() },
  handler: async (ctx, { joinCode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mem = await ctx.db
      .query("mems")
      .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
      .first();
    if (!mem) throw new Error("Invalid code");

    const existing = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) => q.eq("memId", mem._id).eq("userId", userId))
      .first();
    if (!existing) {
      await ctx.db.insert("memParticipants", {
        memId: mem._id,
        userId,
        role: "participant",
        joinedAt: Date.now(),
      });
    }

    return { memId: mem._id, name: mem.name };
  },
});

export const getMemByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, { joinCode }) => {
    const mem = await ctx.db
      .query("mems")
      .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
      .first();
    if (!mem) return null;
    return { _id: mem._id, name: mem.name, description: mem.description, place: mem.place };
  },
});
