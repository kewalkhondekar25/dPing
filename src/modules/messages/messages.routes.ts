import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as messagesController from './messages.controller';

const router = Router();

// POST /api/v1/messages/send — any authenticated user
router.post('/send', authenticate, messagesController.sendMessage);

// GET /api/v1/messages/conversations — authenticated
router.get('/conversations', authenticate, messagesController.getConversations);

// GET /api/v1/messages/conversations/:user_id — authenticated
router.get('/conversations/:user_id', authenticate, messagesController.getMessageThread);

// PATCH /api/v1/messages/conversations/:user_id/read — authenticated
router.patch('/conversations/:user_id/read', authenticate, messagesController.markConversationAsRead);

// PATCH /api/v1/messages/:message_id/read — authenticated
router.patch('/:message_id/read', authenticate, messagesController.markAsRead);

export default router;
