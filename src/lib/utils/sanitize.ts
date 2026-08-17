import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Parses markdown text into HTML and sanitizes it using DOMPurify
 * to prevent stored XSS vulnerabilities.
 */
export function sanitizeMarkdown(markdownText: string): string {
  if (!markdownText) return '';

  try {
    const rawHtml = marked.parse(markdownText, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'hr', 'img'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class']
    });
  } catch (err) {
    console.error('Error sanitizing markdown:', err);
    return '';
  }
}
