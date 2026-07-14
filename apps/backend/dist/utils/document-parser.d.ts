/**
 * Document Parser — extracts plain text from an uploaded lesson source file,
 * ready to hand to the DeepSeek prompt.
 *
 * Supported: PDF (.pdf), Word (.docx), PowerPoint (.pptx), Excel (.xlsx/.xls).
 * Legacy pre-2007 binary Office formats (.doc, .ppt) are NOT supported — ask
 * the user to re-save as the modern Open XML format, or paste text instead.
 */
export declare function extractTextFromDocument(buffer: Buffer, filename: string): Promise<string>;
//# sourceMappingURL=document-parser.d.ts.map