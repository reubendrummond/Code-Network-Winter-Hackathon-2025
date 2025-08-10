import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isValidEmojiKey, getEmojiFromKey } from "./emojiMapping";

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

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

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
      endedAt: (mem as any).endedAt ?? undefined,
    };
  },
});

export const endMemSession = mutation({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mem = await ctx.db.get(memId);
    if (!mem) throw new Error("Mem not found");
    if (mem.creatorId !== userId)
      throw new Error("Only the creator can end the session");
    if (mem?.endedAt) return { endedAt: mem.endedAt };

    await ctx.db.patch(memId, { endedAt: Date.now() });
    return { endedAt: Date.now() };
  },
});

export const isMemEnded = query({
  args: { memId: v.id("mems") },
  handler: async (ctx, { memId }) => {
    const mem = await ctx.db.get(memId);
    return !!mem?.endedAt;
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
const MAX_MEDIA_PER_PERSON = 20;
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

    // Block uploads if mem is ended
    const mem = await ctx.db.get(memId);
    if ((mem as any)?.endedAt) {
      throw new Error("This mem session has ended. Uploads are disabled.");
    }

    // Validate content type
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
    if (!isImage && !isVideo) {
      throw new Error(
        "Unsupported file type. Only images and videos are allowed."
      );
    }

    // Check media count limit before allowing upload (20 per person)
    const participants = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    const maxMediaForMem = participants.length * MAX_MEDIA_PER_PERSON;

    const existingMedia = await ctx.db
      .query("memMedia")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    if (existingMedia.length >= maxMediaForMem) {
      throw new Error(
        `Maximum of ${MAX_MEDIA_PER_PERSON} media files per person (${maxMediaForMem} total for ${participants.length} participants)`
      );
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

    // Block uploads if mem is ended
    const mem = await ctx.db.get(memId);
    if ((mem as any)?.endedAt) {
      await ctx.storage.delete(storageId);
      throw new Error("This mem session has ended. Uploads are disabled.");
    }

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
    const participants = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    const maxMediaForMem = participants.length * MAX_MEDIA_PER_PERSON;

    const existingMedia = await ctx.db
      .query("memMedia")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();
    if (existingMedia.length >= maxMediaForMem) {
      // Delete the uploaded file since limit is exceeded
      await ctx.storage.delete(storageId);
      throw new Error(
        `Maximum of ${MAX_MEDIA_PER_PERSON} media files per person (${maxMediaForMem} total for ${participants.length} participants)`
      );
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

    // Get reactions for all media items
    const mediaWithReactions = await Promise.all(
      media.map(async (mediaItem) => {
        const reactions = await ctx.db
          .query("memMediaReactions")
          .withIndex("by_media", (q) => q.eq("mediaId", mediaItem._id))
          .collect();

        // Group reactions by emoji key and count them
        const reactionsByKey: Record<
          string,
          { count: number; users: string[]; userReacted: boolean }
        > = {};

        reactions.forEach((reaction) => {
          if (!reactionsByKey[reaction.emojiKey]) {
            reactionsByKey[reaction.emojiKey] = {
              count: 0,
              users: [],
              userReacted: false,
            };
          }
          reactionsByKey[reaction.emojiKey].count++;
          reactionsByKey[reaction.emojiKey].users.push(reaction.userId);
          if (reaction.userId === userId) {
            reactionsByKey[reaction.emojiKey].userReacted = true;
          }
        });

        // Convert to array format with emoji keys and emojis
        const reactionsList = Object.entries(reactionsByKey).map(
          ([emojiKey, data]) => ({
            emojiKey,
            emoji: getEmojiFromKey(emojiKey),
            count: data.count,
            users: data.users,
            userReacted: data.userReacted,
          })
        );

        return {
          ...mediaItem,
          reactions: reactionsList,
        };
      })
    );

    return mediaWithReactions.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

export const listMediaComments = query({
  args: { mediaId: v.id("memMedia") },
  handler: async (ctx, { mediaId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");

    // Ensure user is participant of mem for this media
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", media.memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    const comments = await ctx.db
      .query("memMediaComments")
      .withIndex("by_media_created", (q) => q.eq("mediaId", mediaId))
      .collect();
    return comments.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const addMediaComment = mutation({
  args: { mediaId: v.id("memMedia"), content: v.string() },
  handler: async (ctx, { mediaId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", media.memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    // Note: Comments are allowed even if mem ended, per requirement
    const id = await ctx.db.insert("memMediaComments", {
      mediaId,
      userId,
      content,
      createdAt: Date.now(),
    });
    return id;
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
          .then((media) => media.length);

        // Get participant count for this mem
        const participantCount = await ctx.db
          .query("memParticipants")
          .withIndex("by_mem", (q) => q.eq("memId", mem._id))
          .collect()
          .then((participants) => participants.length);

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

export const getMemParticipants = query({
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

    // Get all participants of the mem
    const participants = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();

    // Get user details from auth system for each participant
    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        // Get user info from auth tables
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), p.userId))
          .first();

        // Get media count for this participant
        const mediaCount = await ctx.db
          .query("memMedia")
          .withIndex("by_mem_user", (q) =>
            q.eq("memId", memId).eq("uploadedBy", p.userId)
          )
          .collect()
          .then((media) => media.length);

        return {
          _id: p._id,
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt,
          name: user?.name || "Anonymous",
          email: user?.email,
          image: user?.image,
          mediaCount,
        };
      })
    );

    // Sort by role (creators first) then by joined date
    return participantsWithDetails.sort((a, b) => {
      if (a.role === "creator" && b.role !== "creator") return -1;
      if (b.role === "creator" && a.role !== "creator") return 1;
      return a.joinedAt - b.joinedAt;
    });
  },
});

export const getMemMediaLimit = query({
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

    // Get participant count
    const participants = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem", (q) => q.eq("memId", memId))
      .collect();

    const maxMediaForMem = participants.length * MAX_MEDIA_PER_PERSON;

    return {
      maxMedia: maxMediaForMem,
      perPerson: MAX_MEDIA_PER_PERSON,
      participantCount: participants.length,
    };
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

export const addMediaReaction = mutation({
  args: {
    mediaId: v.id("memMedia"),
    emojiKey: v.string(),
  },
  handler: async (ctx, { mediaId, emojiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get media to verify it exists and get memId
    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", media.memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    // Validate emoji key
    if (!isValidEmojiKey(emojiKey)) {
      throw new Error("Invalid emoji key");
    }

    // Check if user already has this specific emoji reaction
    const existingReaction = await ctx.db
      .query("memMediaReactions")
      .withIndex("by_media_user_emoji", (q) =>
        q.eq("mediaId", mediaId).eq("userId", userId).eq("emojiKey", emojiKey)
      )
      .first();

    if (existingReaction) {
      // Remove existing reaction (toggle off)
      await ctx.db.delete(existingReaction._id);
      return { action: "removed", reactionId: existingReaction._id };
    } else {
      // Create new reaction (toggle on)
      const reactionId = await ctx.db.insert("memMediaReactions", {
        mediaId,
        userId,
        emojiKey,
        createdAt: Date.now(),
      });
      return { action: "added", reactionId };
    }
  },
});

export const removeMediaReaction = mutation({
  args: { mediaId: v.id("memMedia") },
  handler: async (ctx, { mediaId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get media to verify it exists and get memId
    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");

    // Ensure user is participant of mem
    const participant = await ctx.db
      .query("memParticipants")
      .withIndex("by_mem_user", (q) =>
        q.eq("memId", media.memId).eq("userId", userId)
      )
      .first();
    if (!participant) throw new Error("Not a participant");

    // Find and delete user's reaction
    const reaction = await ctx.db
      .query("memMediaReactions")
      .withIndex("by_media_user", (q) =>
        q.eq("mediaId", mediaId).eq("userId", userId)
      )
      .first();

    if (!reaction) throw new Error("No reaction found");

    await ctx.db.delete(reaction._id);
    return { success: true };
  },
});
