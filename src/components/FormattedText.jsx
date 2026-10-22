import React from 'react';

// Highlight color palette
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Vàng', hex: '#fef08a', bg: 'bg-amber-200/90 dark:bg-amber-400/30', text: 'text-amber-950 dark:text-amber-100', dot: '#fde047' },
  { id: 'green', name: 'Xanh lá', hex: '#bbf7d0', bg: 'bg-emerald-200/90 dark:bg-emerald-400/30', text: 'text-emerald-950 dark:text-emerald-100', dot: '#86efac' },
  { id: 'blue', name: 'Xanh dương', hex: '#bae6fd', bg: 'bg-sky-200/90 dark:bg-sky-400/30', text: 'text-sky-950 dark:text-sky-100', dot: '#7dd3fc' },
  { id: 'purple', name: 'Tím', hex: '#e9d5ff', bg: 'bg-purple-200/90 dark:bg-purple-400/30', text: 'text-purple-950 dark:text-purple-100', dot: '#d8b4fe' },
  { id: 'rose', name: 'Hồng', hex: '#fecdd3', bg: 'bg-rose-200/90 dark:bg-rose-400/30', text: 'text-rose-950 dark:text-rose-100', dot: '#fda4af' },
];

// Text color palette
export const TEXT_COLORS = [
  { id: 'red', name: 'Đỏ', color: '#ef4444' },
  { id: 'blue', name: 'Xanh dương', color: '#3b82f6' },
  { id: 'purple', name: 'Tím', color: '#8b5cf6' },
  { id: 'emerald', name: 'Xanh lá', color: '#10b981' },
  { id: 'amber', name: 'Cam / Hổ phách', color: '#f59e0b' },
];

/**
 * Strips all markdown and formatting tags for plain text usage (TTS, search, etc.)
 */
export function stripFormatting(text) {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Convert markdown to clean HTML for rich text editor initialization
 */
export function convertMarkdownToHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/==([^=]+)==/g, '<span style="background-color: #fef08a; padding: 1px 3px; border-radius: 3px;">$1</span>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

/**
 * Parses multiline rich text / HTML into individual example sentences (max 10)
 */
export function parseExampleHtmlLines(htmlOrText) {
  if (!htmlOrText || !htmlOrText.trim()) return [];

  // Replace block element closures and br with newlines
  const normalized = String(htmlOrText)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<div>/gi, '')
    .replace(/<p>/gi, '')
    .replace(/<li>/gi, '')
    .replace(/&nbsp;/g, ' ');

  let lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Check if line actually has text content (ignoring empty tags)
      const textOnly = line.replace(/<[^>]+>/g, '').trim();
      return textOnly.length > 0;
    });

  // If user entered only 1 line but separated with " - "
  if (lines.length === 1 && (lines[0].includes(' - ') || lines[0].startsWith('- '))) {
    lines = lines[0].split(/\s*[-•]\s+/).map(s => s.trim()).filter(Boolean);
  }

  return lines
    .map(line => {
      // Strip leading bullet symbol e.g. "- ", "• ", "1. " while preserving inner tags
      return line
        .replace(/^([-•]|\*(?!\*))\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim();
    })
    .filter(line => line.replace(/<[^>]+>/g, '').trim().length > 0)
    .slice(0, 10);
}

/**
 * Safely parse DOM nodes into React elements
 */
function renderDomNodes(nodes) {
  if (!nodes || nodes.length === 0) return null;
  return Array.from(nodes).map((node, index) => {
    if (node.nodeType === 3) {
      // Text node
      return node.textContent;
    }
    if (node.nodeType === 1) {
      // Element node
      const tag = node.tagName.toLowerCase();
      const children = renderDomNodes(node.childNodes);

      if (tag === 'strong' || tag === 'b') {
        return <strong key={index} className="font-bold text-inherit">{children}</strong>;
      }
      if (tag === 'em' || tag === 'i') {
        return <em key={index} className="italic text-inherit">{children}</em>;
      }
      if (tag === 'u') {
        return (
          <u key={index} className="underline decoration-indigo-500/80 decoration-1.5 underline-offset-2">
            {children}
          </u>
        );
      }
      if (tag === 'del' || tag === 's' || tag === 'strike') {
        return <del key={index} className="line-through opacity-75">{children}</del>;
      }
      if (tag === 'mark') {
        const customClass = node.getAttribute('class') || '';
        const style = {};
        if (node.style.backgroundColor) style.backgroundColor = node.style.backgroundColor;
        if (node.style.color) style.color = node.style.color;
        return (
          <mark
            key={index}
            style={Object.keys(style).length > 0 ? style : undefined}
            className={`px-1 py-0.5 rounded font-medium ${customClass || (Object.keys(style).length === 0 ? 'bg-amber-200/90 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100' : '')}`}
          >
            {children}
          </mark>
        );
      }
      if (tag === 'span' || tag === 'font') {
        const style = {};
        if (node.style.color) style.color = node.style.color;
        if (node.style.backgroundColor) {
          style.backgroundColor = node.style.backgroundColor;
          style.padding = '1px 4px';
          style.borderRadius = '4px';
        }
        if (node.color) style.color = node.color;
        const customClass = node.getAttribute('class') || '';
        return (
          <span key={index} style={Object.keys(style).length > 0 ? style : undefined} className={customClass || undefined}>
            {children}
          </span>
        );
      }
      // Other tags fallback to rendering children
      return <React.Fragment key={index}>{children}</React.Fragment>;
    }
    return null;
  });
}

/**
 * FormattedText component: safely renders bold, italic, underline, highlight, strikethrough, and colors
 */
export default function FormattedText({ text, className = '' }) {
  if (!text) return null;

  try {
    const raw = String(text);
    // Convert Markdown syntax to HTML
    let html = raw
      .replace(/&/g, '&amp;')
      // Preserve allowed HTML tags
      .replace(/</g, (m, offset) => {
        const rest = raw.slice(offset);
        if (/^<\/?(b|strong|i|em|u|s|del|strike|mark|span|font)((\s+[a-zA-Z-]+="[^"]*")*)\s*\/?>/i.test(rest)) {
          return '<';
        }
        return '&lt;';
      })
      .replace(/>/g, (m, offset) => {
        const before = raw.slice(0, offset + 1);
        if (/<\/?(b|strong|i|em|u|s|del|strike|mark|span|font)((\s+[a-zA-Z-]+="[^"]*")*)\s*>$/i.test(before)) {
          return '>';
        }
        return '&gt;';
      })
      // Markdown transformations
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<span>${html}</span>`, 'text/html');
      const rootNode = doc.body.firstChild;
      return <span className={className}>{renderDomNodes(rootNode.childNodes)}</span>;
    }
    return <span className={className}>{raw}</span>;
  } catch (err) {
    console.warn('FormattedText parse error:', err);
    return <span className={className}>{text}</span>;
  }
}
