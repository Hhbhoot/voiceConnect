import express from "express";
import * as chatController from "./chat.controller.js";

const router = express.Router();

router.get("/:userId/:partnerId", chatController.getMessages);
router.post("/:userId/:partnerId/read", chatController.markAsRead);

// Ensure this route doesn't conflict or move it to a separate conversation module if needed.
// But following the index.js logic, it was /api/conversations which is separate.
// I will create a separate route file for conversations or mount this router at /api/chat AND handle conversations here?
// The plan said "Move /api/chat/*, /api/conversations/* logic." to chat module.
// I will export two routers or handle it in index.js mounting.
// Let's keep it simple: export default router; and creating another for conversations?
// Or just put both here and mount carefully.
// The URL structure: /api/chat/:userId/:partnerId matches.
// /api/conversations/:userId does NOT match /api/chat prefix neatly if I mount at /api/chat.
// So I will make this file export multiple things or create conversation.routes.js?
// Or I can just have `router.get('/conversations/:userId')` if mounted at /api?
// But later I will mount it at specific path.
// Let's decide: mount chat routes at /api/chat and conversation routes at /api/conversations.
// So I will create `conversation.routes.js` maybe? Or just `chat.routes.js` exports two routers?
// Simpler: `chat.routes.js` handles `/messages/:userId/:partnerId` (mounted at /api/chat)
// and logic for conversation routes in `chat.controller.js` but routed separately?
// I'll stick to 1 Controller, but maybe 2 route files if needed, or index.js mounts same router twice? No.
// I'll add conversation routes here but path will be relative.
// If I mount at `/api`, then `router.get('/chat/...')` and `router.get('/conversations/...')`.
// But valid modularity usually mounts at feature base.
// I will create `conversation.routes.js` inside `chat` module for clarity.

// Actually, I'll just use `chat.routes.js` and mount it at `/api/chat` for messages,
// and create `conversation.routes.js` for `/api/conversations` using `chat.controller.js`.
// Or just put `conversations` inside `chat` routes with a prefix?
// No, existing API is `/api/conversations/:userId`.
// If I change it to `/api/chat/conversations/:userId` it breaks frontend.
// So I will creates `conversation.routes.js` in `modules/chat/`.

export default router;
