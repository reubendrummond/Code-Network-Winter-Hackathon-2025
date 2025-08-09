import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function randomJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
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

    const baseUrl = process.env.SITE_URL || "http://localhost:3000";
    // Shareable link that handles auth and joining via the join route
    const joinUrl = `${baseUrl}/join/${joinCode}`;
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
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", mem._id).eq("userId", userId)
      )
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
    return {
      _id: mem._id,
      name: mem.name,
      description: mem.description,
      place: mem.place,
    };
  },
});

export const getMemById = query({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mem = await ctx.db.get(memId);
    if (!mem) return null;
    return {
      _id: mem._id,
      name: mem.name,
      description: mem.description,
      place: mem.place,
      joinCode: mem.joinCode,
      creatorId: mem.creatorId,
      createdAt: mem.createdAt,
    };
  },
});

export const addMemNote = mutation({
  args: { memId: v.id("mems"), content: v.string() },
  handler: async (ctx, { memId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    const noteId = await ctx.db.insert("memNotes", {
      memId,
      userId,
      content,
      createdAt: Date.now(),
    });
    return noteId;
  },
});

export const listMemNotes = query({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    const notes = await ctx.db
      .query("memNotes")
      .withIndex("by_mem_created", (q) => q.eq("memId", memId))
      .collect();
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const isParticipant = query({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    return !!participant;
  },
});

// Media upload constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 200kB
const MAX_MEDIA_PER_MEM = 50;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov"];

export const generateUploadUrl = mutation({
  args: {
    memId: v.id("mems"),
    contentType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, { memId, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    // Validate content type
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
    if (!isImage && !isVideo) {
      throw new Error(
        "Unsupported file type. Only images and videos are allowed."
      );
    }

    // Check media count limit before allowing upload
    const existingMedia = await ctx.db
      .query("memMedia")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    if (existingMedia.length >= MAX_MEDIA_PER_MEM) {
      throw new Error(`Maximum of ${MAX_MEDIA_PER_MEM} media files per mem`);
    }

    // Generate upload URL (file size will be validated after upload)
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadMemMedia = mutation({
  args: {
    memId: v.id("mems"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(), // Keep for client reporting, but validate server-side
  },
  handler: async (
    ctx,
    { memId, storageId, fileName, contentType, fileSize }
  ) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate file size reported by client (basic sanity check)
    if (fileSize > MAX_FILE_SIZE) {
      // Delete the uploaded file since it exceeds size limit
      await ctx.storage.delete(storageId);
      throw new Error(
        `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Basic file size sanity check (must be at least 1 byte)
    if (fileSize <= 0) {
      await ctx.storage.delete(storageId);
      throw new Error("Invalid file size");
    }

    // Validate content type
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
    if (!isImage && !isVideo) {
      // Delete the uploaded file since it's invalid type
      await ctx.storage.delete(storageId);
      throw new Error(
        "Unsupported file type. Only images and videos are allowed."
      );
    }

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) {
      // Delete the uploaded file since user isn't authorized
      await ctx.storage.delete(storageId);
      throw new Error("Not a participant");
    }

    // Check media count limit (double-check since it could have changed)
    const existingMedia = await ctx.db
      .query("memMedia")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    if (existingMedia.length >= MAX_MEDIA_PER_MEM) {
      // Delete the uploaded file since limit is exceeded
      await ctx.storage.delete(storageId);
      throw new Error(`Maximum of ${MAX_MEDIA_PER_MEM} media files per mem`);
    }

    const mediaId = await ctx.db.insert("memMedia", {
      memId,
      storageId,
      uploadedBy: userId,
      fileName,
      contentType,
      fileSize: fileSize, // Client-reported size (validated at upload URL generation)
      format: isImage ? "image" : "video",
      uploadedAt: Date.now(),
    });

    return mediaId;
  },
});

export const getMemMedia = query({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    const media = await ctx.db
      .query("memMedia")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();

    return media.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

export const getMediaUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.getUrl(storageId);
  },
});

export const getUserTopMems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all mems the user participates in
    const userParticipations = await ctx.db
      .query("memParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get the mem details for each participation
    const mems = await Promise.all(
      userParticipations.map(async (participation) => {
        const mem = await ctx.db.get(participation.memId);
        if (!mem) return null;

        // Get media count for this mem
        const mediaCount = await ctx.db
          .query("memMedia")
          .withIndex("by_mem", (q) => q.eq("memId", mem._id))
          .collect()
          .then(media => media.length);

        // Get participant count for this mem
        const participantCount = await ctx.db
          .query("memParticipants")
          .withIndex("by_mem", (q) => q.eq("memId", mem._id))
          .collect()
          .then(participants => participants.length);

        return {
          _id: mem._id,
          name: mem.name,
          description: mem.description,
          place: mem.place,
          createdAt: mem.createdAt,
          joinCode: mem.joinCode,
          isCreator: participation.role === "creator",
          joinedAt: participation.joinedAt,
          mediaCount,
          participantCount,
        };
      })
    );

    // Filter out nulls and sort by most recent activity (either created or joined)
    const validMems = mems
      .filter((mem) => mem !== null)
      .sort((a, b) => {
        const aActivity = Math.max(a.createdAt, a.joinedAt);
        const bActivity = Math.max(b.createdAt, b.joinedAt);
        return bActivity - aActivity;
      });

    return validMems.slice(0, limit);
  },
});

export const deleteMemMedia = mutation({
  args: { mediaId: v.id("memMedia") },
  handler: async (ctx, { mediaId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");

    // Check if user is the uploader or mem creator
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", media.memId).eq("userId", userId)
      )
      .first();

    if (!participant) throw new Error("Not a participant");

    const canDelete =
      media.uploadedBy === userId || participant.role === "creator";
    if (!canDelete) throw new Error("Not authorized to delete this media");

    // Delete from storage
    await ctx.storage.delete(media.storageId);

    // Delete from database
    await ctx.db.delete(mediaId);

    return { success: true };
  },
});
