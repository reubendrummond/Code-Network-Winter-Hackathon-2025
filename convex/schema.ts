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
  endedAt: v.optional(v.number()),
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
  }).index("by_mem_created", ["memId", "createdAt"]),

  memMedia: defineTable({
    memId: v.id("mems"),
    storageId: v.id("_storage"),
    uploadedBy: v.string(), // user ID from auth
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(), // in bytes
    format: v.union(v.literal("image"), v.literal("video")),
    uploadedAt: v.number(),
  })
    .index("by_mem", ["memId"])
    .index("by_user", ["uploadedBy"])
    .index("by_mem_user", ["memId", "uploadedBy"]),

  memMediaReactions: defineTable({
    mediaId: v.id("memMedia"),
    userId: v.string(), // user ID from auth
    emojiKey: v.string(), // emoji key (e.g. "heart", "thumbs_up", "heart_eyes")
    createdAt: v.number(),
  })
    .index("by_media", ["mediaId"])
    .index("by_user", ["userId"])
    .index("by_media_user", ["mediaId", "userId"])
    .index("by_media_user_emoji", ["mediaId", "userId", "emojiKey"]), // ensures one of each emoji type per user per media
});

export default schema;
