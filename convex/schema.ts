import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  mems: defineTable({
    name: v.string(),
    description: v.string(),
    place: v.string(),
    isPublic: v.boolean(),
    creatorId: v.string(),
    joinCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId"]) 
    .index("by_join_code", ["joinCode"]),

  memParticipants: defineTable({
    memId: v.id("mems"),
    userId: v.string(),
    joinedAt: v.number(),
    role: v.union(v.literal("creator"), v.literal("participant")),
  })
    .index("by_mem", ["memId"]) 
    .index("by_user", ["userId"]) 
    .index("by_mem_user", ["memId", "userId"]),

  memNotes: defineTable({
    memId: v.id("mems"),
    userId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_mem", ["memId"]) 
    .index("by_mem_created", ["memId", "createdAt"]),
});

export default schema;
