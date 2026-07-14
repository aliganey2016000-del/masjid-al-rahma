"use strict";
/**
 * Course Content Model
 *
 * Stores the curriculum for a course: chapters containing lessons, quizzes,
 * and assignments. Supports drag-and-drop ordering.
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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const attachmentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
}, { _id: false });
const lessonSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, default: 'lesson', enum: ['lesson'] },
    content: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    videoDuration: { type: Number, default: 0 },
    featuredImage: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    order: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    duration: { type: Number, default: 0 },
}, { timestamps: true });
const questionSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: [
            'mcq', 'true_false', 'matching', 'ordering', 'picture_choice',
            'swipe_sort', 'listen_write', 'fill_blank', 'word_scramble', 'sentence_build',
        ],
        default: 'mcq',
    },
    question: { type: String, required: true, trim: true },
    explanation: { type: String, default: '' },
    points: { type: Number, default: 1, min: 0 },
    // mcq / picture_choice
    options: { type: [String], default: undefined },
    correctIndex: { type: Number, min: 0 },
    // true_false
    correctAnswer: { type: Boolean },
    // matching
    pairs: {
        type: [
            {
                left: { type: String, trim: true },
                right: { type: String, trim: true },
            },
        ],
        default: undefined,
    },
    // ordering — stored already in the correct sequence
    items: { type: [String], default: undefined },
    // picture_choice
    choices: {
        type: [
            {
                image: { type: String, trim: true },
                label: { type: String, trim: true },
            },
        ],
        default: undefined,
    },
    // swipe_sort — swipe each card left/right into one of two buckets
    leftLabel: { type: String, trim: true },
    rightLabel: { type: String, trim: true },
    cards: {
        type: [
            {
                text: { type: String, trim: true },
                correctSide: { type: String, enum: ['left', 'right'] },
            },
        ],
        default: undefined,
    },
    // listen_write — play audio, student types what they heard
    audioUrl: { type: String, trim: true },
    correctText: { type: String, trim: true },
    hint: { type: String, trim: true },
    // fill_blank — sentence with `___` markers, filled from a word bank
    textTemplate: { type: String, trim: true },
    blanks: { type: [String], default: undefined },
    distractors: { type: [String], default: undefined }, // shared with sentence_build
    // word_scramble — unscramble the letters of `answer`
    answer: { type: String, trim: true },
    // sentence_build — drag word chips into this correct order
    words: { type: [String], default: undefined },
}, { _id: true });
const quizSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, default: 'quiz', enum: ['quiz'] },
    description: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    passingScore: { type: Number, default: 60, min: 0, max: 100 },
    timeLimit: { type: Number, default: 0 },
    order: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    duration: { type: Number, default: 0 },
}, { timestamps: true });
const assignmentSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, default: 'assignment', enum: ['assignment'] },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    maxScore: { type: Number, default: 100 },
    allowedFileTypes: { type: [String], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    order: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    duration: { type: Number, default: 0 },
}, { timestamps: true });
const chapterSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    collapsed: { type: Boolean, default: false },
    items: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
}, { timestamps: true });
const courseContentSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        unique: true,
        index: true,
    },
    chapters: { type: [chapterSchema], default: [] },
    totalDuration: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    totalAssignments: { type: Number, default: 0 },
    lastSaved: { type: Date, default: Date.now },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
});
// ---------------------------------------------------------------------------
// Pre-save hook — compute totals
// ---------------------------------------------------------------------------
courseContentSchema.pre('save', function (next) {
    let totalDuration = 0;
    let totalLessons = 0;
    let totalQuizzes = 0;
    let totalAssignments = 0;
    for (const chapter of this.chapters) {
        for (const item of chapter.items) {
            totalDuration += item.duration || 0;
            if (item.type === 'lesson')
                totalLessons++;
            else if (item.type === 'quiz')
                totalQuizzes++;
            else if (item.type === 'assignment')
                totalAssignments++;
        }
    }
    this.totalDuration = totalDuration;
    this.totalLessons = totalLessons;
    this.totalQuizzes = totalQuizzes;
    this.totalAssignments = totalAssignments;
    this.lastSaved = new Date();
    next();
});
// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
const CourseContent = mongoose_1.default.model('CourseContent', courseContentSchema);
exports.default = CourseContent;
//# sourceMappingURL=course-content.model.js.map