import React from 'react';

export function parseInlineMarkdown(str) {
  if (!str) return '';
  // Match bold (**text**) and italics (*text*)
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      const content = token.slice(2, -2);
      return <strong key={i} className="prose-bold">{content}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      const content = token.slice(1, -1);
      return <em key={i} className="prose-italic italic">{content}</em>;
    }
    return token;
  });
}

export function cleanLaTeX(str) {
  if (!str) return '';

  let res = str;
  
  // Replace LaTeX math symbols (handles multiple/escaped backslashes)
  res = res.replace(/\\+rightarrow/g, '→');
  res = res.replace(/\\+leftarrow/g, '←');
  res = res.replace(/\\+times/g, '×');
  res = res.replace(/\\+div/g, '÷');
  res = res.replace(/\\+geq/g, '≥');
  res = res.replace(/\\+leq/g, '≤');
  res = res.replace(/\\+neq/g, '≠');
  res = res.replace(/\\+approx/g, '≈');
  
  // Replace font types
  res = res.replace(/\\+text\{([^}]+)\}/g, '$1');
  res = res.replace(/\\+mathbf\{([^}]+)\}/g, '**$1**');
  res = res.replace(/\\+mathbf\s+(\d)/g, '**$1**');
  res = res.replace(/\\+mathbf\s+([a-zA-Z0-9])/g, '**$1**');
  res = res.replace(/\\+mathrm\{([^}]+)\}/g, '$1');
  res = res.replace(/\\+mathit\{([^}]+)\}/g, '*$1*');
  res = res.replace(/\\+mathsf\{([^}]+)\}/g, '$1');
  res = res.replace(/\\+mathtt\{([^}]+)\}/g, '`$1`');
  
  // Clean up unused formatting macros
  res = res.replace(/\\+(mathbf|mathrm|mathit|mathsf|mathtt|text)/g, '');

  // Strip math enclosing $ signs (e.g. $1 + 7 = 8$ -> 1 + 7 = 8)
  res = res.replace(/\$([^$\n]+)\$/g, '$1');
  
  return res;
}

export function formatInterpretationText(text) {
  if (!text) return null;

  const cleanedText = cleanLaTeX(text);
  const normalizedText = cleanedText.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalizedText.split('\n');
  const elements = [];
  
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Detect if it's a table row (starts with |)
    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        // Parse the table rows
        const rows = tableLines.map(line => {
          const cells = line.split('|').map(c => c.trim());
          if (cells[0] === '') cells.shift();
          if (cells[cells.length - 1] === '') cells.pop();
          return cells;
        });

        // Filter out the separator row (starts with dashes like |---|)
        const hasSeparator = rows[1] && rows[1].every(cell => /^[-:\s]+$/.test(cell));
        const headerRow = rows[0];
        const dataRows = hasSeparator ? rows.slice(2) : rows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="prose-table-wrapper">
            <table className="prose-table">
              <thead>
                <tr>
                  {headerRow.map((cell, idx) => (
                    <th key={idx}>{parseInlineMarkdown(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>{parseInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 2. Otherwise parse as standard line types
    i++;
    if (!trimmed) continue;

    // Horizontal rules
    if (/^[-*─━]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="prose-divider" />);
      continue;
    }

    // Markdown headers ## / ### / ####
    const mdHeaderMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (mdHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {parseInlineMarkdown(mdHeaderMatch[2])}
        </span>
      );
      continue;
    }

    // Section-letter headers: "A) TITLE"
    const sectionLetterMatch = trimmed.match(/^([A-Z])\)\s+(.+)$/);
    if (sectionLetterMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {sectionLetterMatch[1]}) {parseInlineMarkdown(sectionLetterMatch[2])}
        </span>
      );
      continue;
    }

    // ALL-CAPS header ending with colon
    const allCapsHeaderMatch = trimmed.match(/^([A-Z][A-Z0-9\s&()\-–—]+):\s*$/);
    if (allCapsHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {allCapsHeaderMatch[1]}
        </span>
      );
      continue;
    }

    // Blockquotes: curly/smart quotes or > prefix
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('\u201c') && trimmed.endsWith('\u201d')) ||
      trimmed.startsWith('>')
    ) {
      const quoteText = trimmed.startsWith('>') ? trimmed.slice(1).trim() : trimmed;
      elements.push(
        <blockquote key={i} className="prose-blockquote">
          {parseInlineMarkdown(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Sub-bullet: indented with bullet
    const subBulletMatch = rawLine.match(/^\s{2,}[-•*▸►✦◆]\s+(.+)$/);
    if (subBulletMatch) {
      elements.push(
        <div key={i} className="prose-sub-bullet">
          <span>{parseInlineMarkdown(subBulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Top-level bullet
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="prose-bullet-item">
          <span>{parseInlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="prose-numbered-item">
          <span className="prose-num">{numberedMatch[1]}.</span>
          <span>{parseInlineMarkdown(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // KEY: Value lines
    const keyValueMatch = trimmed.match(/^([A-Z][A-Z0-9\s&()\-–—/,]+):\s*(.+)$/);
    if (keyValueMatch && keyValueMatch[1].length <= 50) {
      elements.push(
        <p key={i} className="prose-para">
          <span className="prose-key">{keyValueMatch[1]}:</span>
          {parseInlineMarkdown(keyValueMatch[2])}
        </p>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={i} className="prose-para">
        {parseInlineMarkdown(rawLine)}
      </p>
    );
  }

  return elements;
}
