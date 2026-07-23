/**
 * Stop & Check AI Generator Modal — generates a batch of structured, typed
 * Stop & Check questions for one Interactive Gate content block, with the
 * same "type + count" matrix and custom instructions as the main AI Quiz
 * Generator (ai-quiz-generator-modal.tsx). Source text is always this
 * block's own content — there's no chapter/lesson picker, since the block
 * is already the scope.
 */

import { useState } from 'react';
import api from '../../../../lib/axios';
import { generateTempId } from '../course-builder.api';
import { normalizeQuestion } from '../course-builder.types';
import { QUESTION_TYPE_META, QUESTION_TYPE_ORDER } from '../quiz-question-meta';
import type { ContentBlockQuestion, QuestionType } from '../course-builder.types';

interface StopCheckAiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockContent: string;
  onGenerated: (questions: ContentBlockQuestion[]) => void;
}

const DEFAULT_COUNT = 3;

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function StopCheckAiGeneratorModal({ isOpen, onClose, blockContent, onGenerated }: StopCheckAiGeneratorModalProps) {
  const [customInstructions, setCustomInstructions] = useState('');
  const [counts, setCounts] = useState<Partial<Record<QuestionType, number>>>({ mcq: DEFAULT_COUNT });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const totalQuestions = Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);
  const hasBlockText = plainText(blockContent).length > 0;

  if (!isOpen) return null;

  const closeUnlessBusy = () => {
    if (!generating) onClose();
  };

  const toggleType = (type: QuestionType) => {
    setCounts((prev) => {
      const next = { ...prev };
      if (type in next) delete next[type];
      else next[type] = DEFAULT_COUNT;
      return next;
    });
  };

  const updateCount = (type: QuestionType, count: number) => {
    setCounts((prev) => ({ ...prev, [type]: Math.max(1, Math.min(20, count || 1)) }));
  };

  const handleGenerate = async () => {
    setError('');

    if (!hasBlockText) {
      setError('Write some paragraph content in this block first so AI can analyze it.');
      return;
    }

    const questionCounts = Object.entries(counts)
      .filter(([, count]) => (count || 0) > 0)
      .map(([type, count]) => ({ type, count }));

    if (questionCounts.length === 0) {
      setError('Check at least one question type and set how many to generate.');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post('/ai/generate-quiz', {
        mode: 'topic',
        rawText: plainText(blockContent),
        customInstructions,
        questionCounts,
      });
      const generated: ContentBlockQuestion[] = (data.data.questions || []).map((q: any) => ({
        ...normalizeQuestion({ ...q, _id: generateTempId() }),
        aiGenerated: true,
      }));
      onGenerated(generated);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate questions. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeUnlessBusy}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--color-surface-primary)] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4 flex-shrink-0">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
            <span className="text-xl">✨</span> Stop & Check AI Generator
          </h3>
          <button
            type="button"
            onClick={closeUnlessBusy}
            disabled={generating}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        {generating ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-5">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-violet-100 dark:border-violet-900/40" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] max-w-sm">
              ✨ Analyzing this block and crafting {totalQuestions} question{totalQuestions === 1 ? '' : 's'}...
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)]">This can take up to a minute for larger requests.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <p className="text-xs text-[var(--color-text-tertiary)]">
              Questions are generated from this content block's own paragraph text.
            </p>

            {/* Custom AI Instructions */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Custom AI Instructions (optional)</label>
              <textarea
                rows={2}
                className="w-full resize-y rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm"
                placeholder='e.g. "Keep it friendly for 8-year-olds" or "Focus on the vocabulary in this paragraph"'
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
              />
            </div>

            {/* Question Type Selector & Count Matrix */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                Question Types & Counts
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUESTION_TYPE_ORDER.map((type) => {
                  const meta = QUESTION_TYPE_META[type];
                  const checked = type in counts;
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        checked ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-950/20' : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]'
                      }`}
                    >
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggleType(type)} className="accent-primary-600 flex-shrink-0" />
                        <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>{meta.icon}</span>
                        <span className="text-sm text-[var(--color-text-primary)] truncate">{meta.label}</span>
                      </label>
                      {checked && (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={counts[type]}
                          onChange={(e) => updateCount(type, parseInt(e.target.value, 10))}
                          className="w-14 flex-shrink-0 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 py-1 text-xs text-center"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {totalQuestions > 0 && (
                <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                  {totalQuestions} question{totalQuestions === 1 ? '' : 's'} will be generated.
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--color-border-default)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!hasBlockText}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ Generate Questions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StopCheckAiGeneratorModal;
