"use strict";
/**
 * Document Parser — extracts plain text from an uploaded lesson source file,
 * ready to hand to the DeepSeek prompt.
 *
 * Supported: PDF (.pdf), Word (.docx), PowerPoint (.pptx), Excel (.xlsx/.xls).
 * Legacy pre-2007 binary Office formats (.doc, .ppt) are NOT supported — ask
 * the user to re-save as the modern Open XML format, or paste text instead.
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
exports.extractTextFromDocument = extractTextFromDocument;
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const XLSX = __importStar(require("xlsx"));
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const api_error_1 = require("./api-error");
async function extractTextFromDocument(buffer, filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    switch (ext) {
        case '.pdf':
            return extractFromPdf(buffer);
        case '.docx':
            return extractFromDocx(buffer);
        case '.pptx':
            return extractFromPptx(buffer);
        case '.xlsx':
        case '.xls':
            return extractFromSpreadsheet(buffer);
        case '.doc':
        case '.ppt':
            throw new api_error_1.BadRequestError(`Legacy ${ext} files aren't supported — please re-save as ${ext === '.doc' ? '.docx' : '.pptx'}, or paste the text into the Notes tab instead.`);
        default:
            throw new api_error_1.BadRequestError(`Unsupported file type "${ext || 'unknown'}". Upload a PDF, Word, PowerPoint, or Excel file.`);
    }
}
async function extractFromPdf(buffer) {
    const result = await (0, pdf_parse_1.default)(buffer);
    return result.text || '';
}
async function extractFromDocx(buffer) {
    const result = await mammoth_1.default.extractRawText({ buffer });
    return result.value || '';
}
async function extractFromSpreadsheet(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parts = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim())
            parts.push(`Sheet: ${sheetName}\n${csv}`);
    }
    return parts.join('\n\n');
}
/** .pptx is a zip of per-slide XML files; pull the text out of each <a:t> run. */
async function extractFromPptx(buffer) {
    const zip = new adm_zip_1.default(buffer);
    const slideEntries = zip
        .getEntries()
        .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => slideNumber(a.entryName) - slideNumber(b.entryName));
    const slides = [];
    for (const entry of slideEntries) {
        const xml = entry.getData().toString('utf-8');
        const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]);
        if (texts.length)
            slides.push(texts.join(' '));
    }
    return slides.map((s, i) => `Slide ${i + 1}: ${s}`).join('\n\n');
}
function slideNumber(entryName) {
    return parseInt(entryName.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
}
//# sourceMappingURL=document-parser.js.map