import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as messagesService from './messages.service';
import { sendSuccess, sendCreated } from '../../utils/response';

const sendMessageSchema = z.object({
  receiver_id: z.string().uuid('receiver_id must be a valid UUID'),
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(2000, 'Message content must be at most 2000 characters'),
});

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = sendMessageSchema.parse(req.body);
    const message = await messagesService.sendMessage({
      sender_id: req.user!.id,
      receiver_id: input.receiver_id,
      content: input.content,
    });
    sendCreated(res, { message }, 'Message sent successfully');
  } catch (err) {
    next(err);
  }
}

export async function getConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversations = await messagesService.getConversations(req.user!.id);
    sendSuccess(res, conversations);
  } catch (err) {
    next(err);
  }
}

export async function getMessageThread(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user_id = String(req.params.user_id);
    const thread = await messagesService.getMessageThread(req.user!.id, user_id);
    sendSuccess(res, thread);
  } catch (err) {
    next(err);
  }
}

export async function markConversationAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user_id = String(req.params.user_id);
    const result = await messagesService.markConversationAsRead(req.user!.id, user_id);
    sendSuccess(res, result, 200, 'Conversation marked as read');
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message_id = String(req.params.message_id);
    const message = await messagesService.markMessageAsRead(message_id, req.user!.id);
    sendSuccess(res, { message }, 200, 'Message marked as read');
  } catch (err) {
    next(err);
  }
}
