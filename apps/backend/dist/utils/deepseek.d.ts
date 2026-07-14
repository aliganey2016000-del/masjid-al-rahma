/**
 * DeepSeek Client — turns raw lesson source text into clean semantic HTML.
 *
 * Requires DEEPSEEK_API_KEY in the environment. Get a key at
 * https://platform.deepseek.com — never expose it to the frontend.
 */
export declare function generateLessonHtml(sourceText: string): Promise<string>;
export interface QuestionCountSpec {
    type: string;
    count: number;
}
export declare function generateQuizQuestions(sourceText: string, customInstructions: string, counts: QuestionCountSpec[]): Promise<any[]>;
//# sourceMappingURL=deepseek.d.ts.map