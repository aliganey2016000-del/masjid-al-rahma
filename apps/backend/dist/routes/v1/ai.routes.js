"use strict";
/**
 * AI Routes — /api/v1/ai
 *
 * DeepSeek-backed lesson & quiz generation for the Course Builder's
 * "AI Lesson Generator" and "AI Quiz Generator" modals. Restricted to
 * admin/teacher, same as course content authoring.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const aiController = __importStar(require("../../controllers/ai.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const async_handler_middleware_1 = require("../../middleware/async-handler.middleware");
const api_error_1 = require("../../utils/api-error");
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (_req, file, cb) => {
        const ext = `.${file.originalname.split('.').pop()?.toLowerCase() || ''}`;
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            cb(new api_error_1.BadRequestError(`Unsupported file type "${ext}". Upload a PDF, Word, PowerPoint, or Excel file.`));
            return;
        }
        cb(null, true);
    },
});
const router = (0, express_1.Router)();
// All AI routes require authentication + admin/teacher role
router.use(auth_middleware_1.authMiddleware, role_middleware_1.adminOrTeacher);
// POST /api/v1/ai/generate-lesson  { mode: 'title' | 'notes', title?, notes? }
router.post('/generate-lesson', (0, async_handler_middleware_1.asyncHandler)(aiController.generateFromText));
// POST /api/v1/ai/generate-lesson/document  (multipart/form-data, field name "file")
router.post('/generate-lesson/document', upload.single('file'), (0, async_handler_middleware_1.asyncHandler)(aiController.generateFromDocument));
// POST /api/v1/ai/generate-quiz  { mode: 'content' | 'topic', ..., questionCounts: [{type, count}] }
router.post('/generate-quiz', (0, async_handler_middleware_1.asyncHandler)(aiController.generateQuiz));
exports.default = router;
//# sourceMappingURL=ai.routes.js.map