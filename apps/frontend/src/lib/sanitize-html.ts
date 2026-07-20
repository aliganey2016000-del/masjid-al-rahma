import DOMPurify from 'dompurify';

// Shared allowlist for lesson/course rich-text content. Used both when a
// teacher/admin saves content (course-builder.api.ts) and at every place
// that content is later rendered via dangerouslySetInnerHTML — sanitizing
// only on save isn't enough, since content saved before this fix (or by a
// future bypass) would otherwise still be rendered unsanitized.
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'code', 'pre', 'hr',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'colspan', 'rowspan'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
};

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty || '', RICH_TEXT_CONFIG);
}
