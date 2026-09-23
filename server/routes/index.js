import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as ttsCtrl from '../controllers/ttsController.js';
import * as audioCtrl from '../controllers/audioController.js';
import * as videoCtrl from '../controllers/videoController.js';
import * as thumbCtrl from '../controllers/thumbnailController.js';
import * as translateCtrl from '../controllers/translateController.js';
import * as projectCtrl from '../controllers/projectController.js';
import * as promptCtrl from '../controllers/promptController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// public
router.get('/voices', asyncHandler(ttsCtrl.voices));
router.get('/languages', asyncHandler(translateCtrl.languages));
router.post('/tts', asyncHandler(ttsCtrl.tts));
router.post('/audio/mix', asyncHandler(audioCtrl.mix));
router.post('/video/render', asyncHandler(videoCtrl.render));
router.post('/thumbnail/generate', asyncHandler(thumbCtrl.generate));
router.post('/translate', asyncHandler(translateCtrl.translate));

// protected (demo allows anonymous)
router.use(verifyToken);
router.get('/projects', asyncHandler(projectCtrl.list));
router.post('/projects', asyncHandler(projectCtrl.create));
router.get('/projects/:id', asyncHandler(projectCtrl.get));
router.put('/projects/:id', asyncHandler(projectCtrl.update));
router.delete('/projects/:id', asyncHandler(projectCtrl.remove));
router.post('/projects/:id/duplicate', asyncHandler(projectCtrl.duplicate));
router.post('/projects/:id/version', asyncHandler(projectCtrl.version));
router.get('/projects/:id/versions', asyncHandler(projectCtrl.listVersions));

router.get('/prompts', asyncHandler(promptCtrl.list));
router.post('/prompts', asyncHandler(promptCtrl.create));
router.delete('/prompts/:id', asyncHandler(promptCtrl.remove));

export default router;
