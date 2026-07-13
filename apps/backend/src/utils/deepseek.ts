/**
 * DeepSeek Client — turns raw lesson source text into clean semantic HTML.
 *
 * Requires DEEPSEEK_API_KEY in the environment. Get a key at
 * https://platform.deepseek.com — never expose it to the frontend.
 */

import axios from 'axios';
import { BadRequestError, InternalServerError } from './api-error';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Keep the prompt bounded so a huge document upload can't blow past
// request/token limits — DeepSeek's context window is much larger than this,
// this is purely a defensive cap on our side.
const MAX_SOURCE_CHARS = 24000;

const SYSTEM_PROMPT = `You are an expert Islamic studies curriculum writer. You convert raw source material into a single, polished LMS lesson.

Return ONLY clean, semantic HTML for the lesson body — no markdown, no code fences, no <html>/<head>/<body> wrapper, and no commentary before or after the HTML.

Structure the output using:
- <h2> for major sections, <h3> for sub-sections
- <p> for explanatory paragraphs
- <ul>/<li> for bullet points, <ol>/<li> for sequential or numbered steps
- <strong> for key terms and important emphasis
- <blockquote> for direct Qur'an ayat, hadith, or definitions — cite the source inside the blockquote where it is known from the source material (e.g. "— Surah Al-Baqarah, 2:255")

Keep the tone clear, respectful, and appropriate for students. Do not invent religious rulings, hadith, or Qur'an citations that are not present in or directly implied by the source text — if the source material is thin, expand pedagogically (definitions, context, examples) without fabricating religious sources.`;

export async function generateLessonHtml(sourceText: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new InternalServerError('AI lesson generation is not configured on this server (missing DEEPSEEK_API_KEY).');
  }

  const trimmed = (sourceText || '').trim();
  if (!trimmed) {
    throw new BadRequestError('No source text to generate a lesson from.');
  }

  const clipped =
    trimmed.length > MAX_SOURCE_CHARS
      ? `${trimmed.slice(0, MAX_SOURCE_CHARS)}\n\n[...source truncated for length...]`
      : trimmed;

  let response;
  try {
    response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Write a complete lesson from this source material:\n\n${clipped}` },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      }
    );
  } catch (err: any) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    throw new InternalServerError(`DeepSeek request failed${status ? ` (${status})` : ''}: ${detail}`);
  }

  const raw: string = response.data?.choices?.[0]?.message?.content || '';
  const html = stripCodeFences(raw);
  if (!html) {
    throw new InternalServerError('DeepSeek returned an empty response. Please try again.');
  }
  return html;
}

/** Defensive cleanup in case the model wraps its answer in a markdown fence despite instructions. */
function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|html)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

// ---------------------------------------------------------------------------
// AI Quiz Generator — turns source material into structured, typed questions
// ---------------------------------------------------------------------------

export interface QuestionCountSpec {
  type: string;
  count: number;
}

/** Exact JSON shape required per question type — embedded directly in the prompt. */
const QUESTION_SHAPES = `
"mcq": { "type": "mcq", "question": string, "options": string[] (at least 2), "correctIndex": number (0-based index into options), "explanation": string, "points": number }
"true_false": { "type": "true_false", "question": string, "correctAnswer": boolean, "explanation": string, "points": number }
"matching": { "type": "matching", "question": string, "pairs": [{ "left": string, "right": string }] (at least 2 pairs), "explanation": string, "points": number }
"ordering": { "type": "ordering", "question": string, "items": string[] (at least 2, already in the CORRECT sequence), "explanation": string, "points": number }
"picture_choice": { "type": "picture_choice", "question": string, "choices": [{ "image": "", "label": string }] (at least 2; ALWAYS leave "image" as an empty string — a human adds real images later), "correctIndex": number, "explanation": string, "points": number }
"swipe_sort": { "type": "swipe_sort", "question": string, "leftLabel": string, "rightLabel": string, "cards": [{ "text": string, "correctSide": "left" | "right" }] (at least 2), "explanation": string, "points": number }
"listen_write": { "type": "listen_write", "question": string, "audioUrl": "" (ALWAYS empty string — a human adds real audio later), "correctText": string, "hint": string, "explanation": string, "points": number }
"fill_blank": { "type": "fill_blank", "question": string, "textTemplate": string (a sentence using "___" for each blank), "blanks": string[] (one correct word per "___", in left-to-right order), "distractors": string[] (2-4 decoy words for the word bank), "explanation": string, "points": number }
"word_scramble": { "type": "word_scramble", "question": string, "answer": string (the word/phrase to unscramble), "hint": string, "explanation": string, "points": number }
"sentence_build": { "type": "sentence_build", "question": string, "words": string[] (the sentence's words in the CORRECT order), "distractors": string[] (2-4 decoy words), "explanation": string, "points": number }
`.trim();

export async function generateQuizQuestions(
  sourceText: string,
  customInstructions: string,
  counts: QuestionCountSpec[]
): Promise<any[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new InternalServerError('AI quiz generation is not configured on this server (missing DEEPSEEK_API_KEY).');
  }

  const trimmed = (sourceText || '').trim();
  if (!trimmed) {
    throw new BadRequestError('No source material to generate quiz questions from.');
  }

  const validCounts = (counts || []).filter((c) => c && c.type && c.count > 0);
  if (validCounts.length === 0) {
    throw new BadRequestError('Select at least one question type and count.');
  }

  const clipped =
    trimmed.length > MAX_SOURCE_CHARS
      ? `${trimmed.slice(0, MAX_SOURCE_CHARS)}\n\n[...source truncated for length...]`
      : trimmed;

  const countsList = validCounts.map((c) => `- exactly ${c.count} question(s) of type "${c.type}"`).join('\n');
  const totalRequested = validCounts.reduce((sum, c) => sum + c.count, 0);

  const systemPrompt = `You are an expert quiz writer for an Islamic studies LMS aimed at school-age students. You turn source material into a set of gamified, interactive quiz questions.

Return ONLY a single JSON object of the shape {"questions": [...]} — no markdown, no code fences, no commentary before or after.

Each element of "questions" must be one object matching EXACTLY the shape for its type (all fields required unless noted):

${QUESTION_SHAPES}

Generation rules:
- Generate EXACTLY these counts, no more, no less (total ${totalRequested} questions):
${countsList}
- Every question must be answerable directly from the SOURCE MATERIAL provided by the user — do not invent facts, hadith, or Qur'an citations not present in or directly implied by it.
- Keep language clear, friendly, and age-appropriate.
- Vary the specific facts/angles tested across questions of the same type so they don't repeat each other.${
    customInstructions?.trim() ? `\n- Additional instructions from the teacher: ${customInstructions.trim()}` : ''
  }`;

  let response;
  try {
    response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SOURCE MATERIAL:\n\n${clipped}` },
        ],
        temperature: 0.6,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 90_000,
      }
    );
  } catch (err: any) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    throw new InternalServerError(`DeepSeek request failed${status ? ` (${status})` : ''}: ${detail}`);
  }

  const raw: string = response.data?.choices?.[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new InternalServerError('DeepSeek returned malformed JSON. Please try again.');
  }

  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questions.length === 0) {
    throw new InternalServerError('DeepSeek did not return any questions. Please try again.');
  }

  return questions.map((q: any) => ({
    ...q,
    explanation: q.explanation || '',
    points: typeof q.points === 'number' && q.points > 0 ? q.points : 1,
  }));
}
