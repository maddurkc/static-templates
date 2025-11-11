import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes script tags, event handlers, and other potentially dangerous content
 */
export const sanitizeHTML = (html: string): string => {
  // Configure DOMPurify to be strict
  const config = {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'strong', 'em', 'u', 'b', 'i', 'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  };

  return DOMPurify.sanitize(html, config);
};

/**
 * Validates and sanitizes user input for template variables
 */
export const sanitizeInput = (input: string): string => {
  // Remove any HTML tags from plain text inputs
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};
