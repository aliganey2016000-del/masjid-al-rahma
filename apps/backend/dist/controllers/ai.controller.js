"use strict";
/**
 * AI Controller — DeepSeek-powered lesson & quiz content generation.
 *
 * Lesson generation: three entry points, matching the "AI Lesson Generator"
 * modal's three options: from a title, from pasted notes, and from an
 * uploaded document.
 *
 * Quiz generation: one entry point, matching the "AI Quiz Generator" modal's
 * two options: from existing course content (lessons) or from a custom
 * topic / pasted text, each with a per-type question count matrix.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = exports.generateFromDocument = exports.generateFromText = void 0;
const deepseek_1 = require("../utils/deepseek");
const document_parser_1 = require("../utils/document-parser");
const api_error_1 = require("../utils/api-error");
const api_response_1 = __importDefault(require("../utils/api-response"));
// ---------------------------------------------------------------------------
// POST /api/v1/ai/generate-lesson — mode: 'title' | 'notes'
// ---------------------------------------------------------------------------
const generateFromText = async (req, res) => {
    const { mode, title, notes } = req.body;
    let sourceText;
    if (mode === 'title') {
        if (!title || !title.trim())
            throw new api_error_1.BadRequestError('A lesson title is required to generate from title.');
        sourceText = `Lesson title: "${title.trim()}". Write a full lesson body that thoroughly covers this topic.`;
    }
    else if (mode === 'notes') {
        if (!notes || !notes.trim())
            throw new api_error_1.BadRequestError('Paste some notes or source text first.');
        sourceText = notes;
    }
    else {
        throw new api_error_1.BadRequestError('mode must be "title" or "notes".');
    }
    const html = await (0, deepseek_1.generateLessonHtml)(sourceText);
    return api_response_1.default.success(res, { html }, 'Lesson generated successfully');
};
exports.generateFromText = generateFromText;
// ---------------------------------------------------------------------------
// POST /api/v1/ai/generate-lesson/document — multipart file upload
// ---------------------------------------------------------------------------
const generateFromDocument = async (req, res) => {
    const file = req.file;
    if (!file)
        throw new api_error_1.BadRequestError('No file uploaded.');
    const extractedText = await (0, document_parser_1.extractTextFromDocument)(file.buffer, file.originalname);
    if (!extractedText.trim()) {
        throw new api_error_1.BadRequestError('Could not find any readable text in that document.');
    }
    const html = await (0, deepseek_1.generateLessonHtml)(extractedText);
    return api_response_1.default.success(res, { html }, 'Lesson generated successfully');
};
exports.generateFromDocument = generateFromDocument;
// ---------------------------------------------------------------------------
// POST /api/v1/ai/generate-quiz — mode: 'content' | 'topic'
// ---------------------------------------------------------------------------
const generateQuiz = async (req, res) => {
    const { mode, title, rawText, lessonContents, customInstructions, questionCounts, } = req.body;
    let sourceText;
    if (mode === 'content') {
        if (!Array.isArray(lessonContents) || lessonContents.length === 0) {
            throw new api_error_1.BadRequestError('Select at least one lesson to generate from.');
        }
        sourceText = lessonContents.join('\n\n---\n\n');
    }
    else if (mode === 'topic') {
        if (!rawText || !rawText.trim())
            throw new api_error_1.BadRequestError('Paste some source text or notes first.');
        sourceText = title?.trim() ? `Topic: ${title.trim()}\n\n${rawText}` : rawText;
    }
    else {
        throw new api_error_1.BadRequestError('mode must be "content" or "topic".');
    }
    const questions = await (0, deepseek_1.generateQuizQuestions)(sourceText, customInstructions || '', questionCounts);
    return api_response_1.default.success(res, { questions }, 'Quiz questions generated successfully');
};
exports.generateQuiz = generateQuiz;
//# sourceMappingURL=ai.controller.js.map