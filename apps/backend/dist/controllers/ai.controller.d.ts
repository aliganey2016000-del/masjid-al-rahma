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
import { Request, Response } from 'express';
export declare const generateFromText: (req: Request, res: Response) => Promise<Response>;
export declare const generateFromDocument: (req: Request, res: Response) => Promise<Response>;
export declare const generateQuiz: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=ai.controller.d.ts.map