/**
 * Forum Controller
 *
 * Public threads → visible to every member of the organization.
 * Private threads → only visible to participants.
 */

import { Request, Response } from 'express';
import { ForumThread, ForumMessage } from '../models/forum.model';
import User from '../models/user.model';
import ApiResponse from '../utils/api-response';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/api-error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Populate options shared by many thread queries */
const threadPopulate = [
  { path: 'createdBy', select: 'email role preferredLanguage' },
  { path: 'participants', select: 'email role preferredLanguage' },
];

/** Attach the last message & unread count to a thread object */
async function attachMeta(thread: any, userId: string) {
  const obj = thread.toObject ? thread.toObject() : thread;
  const lastMessage = await ForumMessage.findOne({ threadId: obj._id })
    .sort({ createdAt: -1 })
    .populate('senderId', 'email role')
    .lean();
  const participantIds =
    thread.type === 'public'
      ? (await User.find({ organizationId: thread.organizationId, isActive: true }).select('_id').lean()).map((u) => u._id.toString())
      : (thread.participants || []).map((p: any) => (typeof p === 'object' ? p._id?.toString() : p.toString()));
  // For public threads count all messages after the user joined (simplification: all messages)
  const unreadCount = 0; // Can be extended with a read-receipts collection later
  return { ...obj, lastMessage, unreadCount, participantCount: participantIds.length };
}

// ---------------------------------------------------------------------------
// Thread CRUD
// ---------------------------------------------------------------------------

/** GET /forum/threads?type=public|private — List threads the current user has access to */
export const listThreads = async (req: Request, res: Response) => {
  const { type, page = '1', limit = '30' } = req.query;
  const userId = req.user!.userId;
  const orgId = req.user!.organizationId;

  if (!orgId) throw new BadRequestError('You are not associated with any organization');

  const filter: Record<string, unknown> = { organizationId: orgId };

  if (type === 'public') {
    filter.type = 'public';
  } else if (type === 'private') {
    filter.type = 'private';
    filter.participants = userId;
  }
  // If no type filter, return both public threads + private threads the user is in

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 30));

  const query =
    type === 'public'
      ? { organizationId: orgId, type: 'public' }
      : type === 'private'
        ? { organizationId: orgId, type: 'private', participants: userId }
        : {
            organizationId: orgId,
            $or: [{ type: 'public' }, { type: 'private', participants: userId }],
          };

  const [threads, total] = await Promise.all([
    ForumThread.find(query)
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate(threadPopulate)
      .lean(),
    ForumThread.countDocuments(query),
  ]);

  const enriched = await Promise.all(threads.map((t) => attachMeta(t, userId)));

  return ApiResponse.paginated(res, enriched, { page: pageNum, limit: limitNum, total }, 'Threads retrieved');
};

/** POST /forum/threads — Create a new thread */
export const createThread = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.user!.organizationId;

  if (!orgId) throw new BadRequestError('You are not associated with any organization');

  const { type, title, participants } = req.body;

  if (!type || !['public', 'private'].includes(type)) {
    throw new BadRequestError('Type must be "public" or "private"');
  }

  if (type === 'public' && !title?.trim()) {
    throw new BadRequestError('Public threads require a title');
  }

  // For private threads, participants must be provided
  let participantIds: string[] = [userId];
  if (type === 'private') {
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new BadRequestError('Private threads require at least one participant besides yourself');
    }
    // Deduplicate and ensure creator is included
    participantIds = [...new Set([userId, ...participants])];

    // Validate all participants belong to the same organization
    const users = await User.find({
      _id: { $in: participantIds },
      organizationId: orgId,
      isActive: true,
    }).select('_id');

    if (users.length !== participantIds.length) {
      throw new BadRequestError('One or more participants are not valid members of your organization');
    }
  }

  const thread = await ForumThread.create({
    organizationId: orgId,
    type,
    title: title?.trim() || '',
    createdBy: userId,
    participants: type === 'private' ? participantIds : [],
    lastMessageAt: new Date(),
  });

  await thread.populate(threadPopulate);

  return ApiResponse.created(res, thread, 'Thread created');
};

/** GET /forum/threads/:threadId — Get a single thread with messages */
export const getThread = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user!.userId;
  const orgId = req.user!.organizationId;

  const thread = await ForumThread.findById(threadId).populate(threadPopulate);
  if (!thread) throw new NotFoundError('Thread');

  // Access control
  if (thread.organizationId.toString() !== orgId) throw new ForbiddenError('You do not have access to this thread');
  if (thread.type === 'private') {
    const isParticipant = thread.participants.some(
      (p: any) => (p._id || p).toString() === userId
    );
    if (!isParticipant) throw new ForbiddenError('You are not a participant in this private thread');
  }

  const { page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 50));

  const [messages, total] = await Promise.all([
    ForumMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('senderId', 'email role preferredLanguage')
      .lean(),
    ForumMessage.countDocuments({ threadId }),
  ]);

  const enriched = await attachMeta(thread, userId);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Thread retrieved',
    data: { thread: enriched, messages },
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

/** PATCH /forum/threads/:threadId — Update a thread (title, pin) */
export const updateThread = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user!.userId;

  const thread = await ForumThread.findById(threadId);
  if (!thread) throw new NotFoundError('Thread');
  if (thread.createdBy.toString() !== userId) throw new ForbiddenError('Only the creator can edit this thread');

  const { title, isPinned } = req.body;
  if (title !== undefined) thread.title = title.trim();
  if (isPinned !== undefined) thread.isPinned = !!isPinned;

  await thread.save();
  await thread.populate(threadPopulate);

  return ApiResponse.success(res, thread, 'Thread updated');
};

/** DELETE /forum/threads/:threadId — Delete a thread and its messages */
export const deleteThread = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user!.userId;

  const thread = await ForumThread.findById(threadId);
  if (!thread) throw new NotFoundError('Thread');
  if (thread.createdBy.toString() !== userId) throw new ForbiddenError('Only the creator can delete this thread');

  await Promise.all([
    ForumMessage.deleteMany({ threadId }),
    ForumThread.findByIdAndDelete(threadId),
  ]);

  return ApiResponse.success(res, null, 'Thread deleted');
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** POST /forum/threads/:threadId/messages — Send a message in a thread */
export const createMessage = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user!.userId;
  const orgId = req.user!.organizationId;
  const { content } = req.body;

  if (!content?.trim()) throw new BadRequestError('Message content is required');

  const thread = await ForumThread.findById(threadId);
  if (!thread) throw new NotFoundError('Thread');
  if (thread.organizationId.toString() !== orgId) throw new ForbiddenError('Access denied');

  if (thread.type === 'private') {
    const isParticipant = thread.participants.some((p: any) => (p._id || p).toString() === userId);
    if (!isParticipant) throw new ForbiddenError('You are not a participant in this private conversation');
  }

  const message = await ForumMessage.create({
    threadId,
    senderId: userId,
    content: content.trim(),
  });

  // Update lastMessageAt on the thread
  thread.lastMessageAt = new Date();
  await thread.save();

  await message.populate('senderId', 'email role preferredLanguage');

  return ApiResponse.created(res, message, 'Message sent');
};

/** DELETE /forum/messages/:messageId — Delete own message */
export const deleteMessage = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;

  const message = await ForumMessage.findById(messageId);
  if (!message) throw new NotFoundError('Message');
  if (message.senderId.toString() !== userId) throw new ForbiddenError('You can only delete your own messages');

  await ForumMessage.findByIdAndDelete(messageId);
  return ApiResponse.success(res, null, 'Message deleted');
};

// ---------------------------------------------------------------------------
// Organization Members (for private thread participant selection)
// ---------------------------------------------------------------------------

/** GET /forum/members — List org members for participant selection */
export const listOrgMembers = async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  if (!orgId) throw new BadRequestError('You are not associated with any organization');

  const { search = '', page = '1', limit = '100' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 100));

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    isActive: true,
  };

  if (search) {
    filter.email = { $regex: search, $options: 'i' };
  }

  const [members, total] = await Promise.all([
    User.find(filter)
      .select('email role preferredLanguage')
      .sort({ role: 1, email: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, members, { page: pageNum, limit: limitNum, total }, 'Organization members retrieved');
};