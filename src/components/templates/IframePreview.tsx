import { useEffect, useRef, useMemo } from "react";
import styles from "./IframePreview.module.scss";

interface IframePreviewProps {
  html: string;
  title?: string;
  className?: string;
}

export const IframePreview = ({ html, title = "Preview", className = "" }: IframePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Create a full HTML document for the iframe
  const fullHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 24px;
      background: #ffffff;
    }
    
    /* Typography */
    h1 { font-size: 2.25rem; font-weight: 700; margin: 1rem 0; }
    h2 { font-size: 1.875rem; font-weight: 700; margin: 0.875rem 0; }
    h3 { font-size: 1.5rem; font-weight: 600; margin: 0.75rem 0; }
    h4 { font-size: 1.25rem; font-weight: 600; margin: 0.625rem 0; }
    h5 { font-size: 1.125rem; font-weight: 500; margin: 0.5rem 0; }
    h6 { font-size: 1rem; font-weight: 500; margin: 0.5rem 0; }
    p { font-size: 1rem; margin: 0.5rem 0; line-height: 1.6; }
    
    /* Lists */
    ul, ol { font-size: 1rem; margin: 0.5rem 0; padding-left: 2rem; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.25rem 0; }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.875rem;
    }
    th, td {
      border: 1px solid #dee2e6;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    /* Images */
    img {
      max-width: 100%;
      height: auto;
      margin: 1rem 0;
    }
    
    /* Buttons */
    button {
      padding: 0.5rem 1rem;
      background-color: #4361ee;
      color: #ffffff;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }
    
    /* Links */
    a {
      color: #4361ee;
      text-decoration: underline;
    }
    
    /* Container sections */
    .container-section {
      margin: 15px 0;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }
    
    /* Section highlight animation */
    .highlight-section {
      animation: highlight 2s ease-out;
    }
    
    @keyframes highlight {
      0% { background-color: rgba(67, 97, 238, 0.2); }
      100% { background-color: transparent; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Write content to iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
    }
  }, [fullHtml]);

  // Auto-resize iframe to fit content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeObserver = new ResizeObserver(() => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        const height = doc.body.scrollHeight;
        iframe.style.height = `${height + 48}px`; // Add padding
      }
    });

    // Wait for content to load
    const handleLoad = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        resizeObserver.observe(doc.body);
        // Initial height set
        const height = doc.body.scrollHeight;
        iframe.style.height = `${height + 48}px`;
      }
    };

    iframe.addEventListener('load', handleLoad);
    
    // Also try to set height after a small delay for dynamic content
    const timeout = setTimeout(handleLoad, 100);

    return () => {
      resizeObserver.disconnect();
      iframe.removeEventListener('load', handleLoad);
      clearTimeout(timeout);
    };
  }, [fullHtml]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={`${styles.iframe} ${className}`}
      sandbox="allow-same-origin"
      scrolling="no"
    />
  );
};
