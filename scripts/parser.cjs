const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '../temp_manual_src/TurismoSucreManual_Usuario_TurismoSucre_v2.html');
const srcImagesDir = path.join(__dirname, '../temp_manual_src/images');
const destImagesDir = path.join(__dirname, '../src/assets/images');
const destDocsDir = path.join(__dirname, '../src/content/docs/manual');

// Create directories if they do not exist
if (!fs.existsSync(destImagesDir)) {
  fs.mkdirSync(destImagesDir, { recursive: true });
}
if (!fs.existsSync(destDocsDir)) {
  fs.mkdirSync(destDocsDir, { recursive: true });
}

// 1. Copy images
if (fs.existsSync(srcImagesDir)) {
  console.log('Copying images...');
  const files = fs.readdirSync(srcImagesDir);
  files.forEach(file => {
    const srcFile = path.join(srcImagesDir, file);
    const destFile = path.join(destImagesDir, file);
    fs.copyFileSync(srcFile, destFile);
  });
  console.log(`Copied ${files.length} images.`);
} else {
  console.log('No source images directory found.');
}

// 2. Read HTML
console.log('Reading HTML file...');
const htmlContent = fs.readFileSync(srcHtmlPath, 'utf8');

// 3. Extract CSS style classes for bold and italic
const styleStart = htmlContent.indexOf('<style type="text/css">');
const styleEnd = htmlContent.indexOf('</style>', styleStart);
const styleCss = htmlContent.substring(styleStart + '<style type="text/css">'.length, styleEnd);

const classRegex = /\.([a-z0-9_-]+)\{([^}]+)\}/gi;
let match;
const classStyles = {};
while ((match = classRegex.exec(styleCss)) !== null) {
  const className = match[1];
  const rulesStr = match[2];
  const rules = {};
  rulesStr.split(';').forEach(rule => {
    const parts = rule.split(':');
    if (parts.length === 2) {
      rules[parts[0].trim()] = parts[1].trim();
    }
  });
  classStyles[className] = rules;
}

const boldClasses = new Set();
const italicClasses = new Set();

for (const [className, rules] of Object.entries(classStyles)) {
  if (rules['font-weight'] === '700' || rules['font-weight'] === 'bold') {
    boldClasses.add(className);
  }
  if (rules['font-style'] === 'italic') {
    italicClasses.add(className);
  }
}

console.log('Detected Bold Classes:', Array.from(boldClasses));
console.log('Detected Italic Classes:', Array.from(italicClasses));

// Helpers for HTML decoding and cleaning
function decodeHtml(html) {
  return html
    .replace(/&Aacute;/g, 'Á')
    .replace(/&aacute;/g, 'á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&eacute;/g, 'é')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&iacute;/g, 'í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&times;/g, '×')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8505;/g, 'ℹ')
    .replace(/&#9888;/g, '⚠')
    .replace(/&#10003;/g, '✓')
    .replace(/&#10007;/g, '✗')
    .replace(/&ordm;/g, 'º')
    .replace(/&ordf;/g, 'ª')
    .replace(/&deg;/g, '°');
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD') // normalize accents
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-'); // replace spaces with dashes
}

// 4. Split HTML by H1 headings
const h1Positions = [];
const openH1 = '<h1';
const closeH1 = '</h1>';
let pos = 0;

while (true) {
  const startIdx = htmlContent.indexOf(openH1, pos);
  if (startIdx === -1) break;
  
  const endIdx = htmlContent.indexOf(closeH1, startIdx);
  if (endIdx === -1) break;
  
  const tagEndIdx = htmlContent.indexOf('>', startIdx);
  const innerHtml = htmlContent.substring(tagEndIdx + 1, endIdx);
  const cleanTitle = decodeHtml(innerHtml.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '));
  
  h1Positions.push({
    startIdx,
    endIdx: endIdx + closeH1.length,
    title: cleanTitle
  });
  
  pos = endIdx + closeH1.length;
}

console.log(`Found ${h1Positions.length} H1 sections.`);

// 5. Process and convert each section
let sectionIndex = 1;

h1Positions.forEach((h1, idx) => {
  // Skip "TABLA DE CONTENIDOS" as Starlight has its own native sidebar navigation
  if (h1.title.toUpperCase().includes('TABLA DE CONTENIDOS')) {
    console.log(`Skipping index section: ${h1.title}`);
    return;
  }
  
  const nextH1 = h1Positions[idx + 1];
  const sectionEnd = nextH1 ? nextH1.startIdx : htmlContent.indexOf('</body>');
  let sectionHtml = htmlContent.substring(h1.startIdx, sectionEnd);
  
  // Format title (e.g., "1. INTRODUCCIÓN" -> "Introducción")
  let title = h1.title;
  const numPrefixMatch = title.match(/^\d+\.\s*(.*)/);
  if (numPrefixMatch) {
    title = numPrefixMatch[1].trim();
  }
  
  // Create filename (e.g., "01-introduccion.md")
  const paddedIndex = String(sectionIndex).padStart(2, '0');
  const slug = slugify(title);
  const filename = `${paddedIndex}-${slug}.md`;
  
  console.log(`Processing Section ${paddedIndex}: "${title}" -> ${filename}`);
  
  // Let's do content cleanup and conversions
  
  // A. CONVERT CALLOUT TABLES
  // Replace tables of size 1x2 that act as callouts
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  sectionHtml = sectionHtml.replace(tableRegex, (fullTableHtml) => {
    // Check background colors of columns
    // We search for td classes inside
    const cells = [];
    const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(fullTableHtml)) !== null) {
      const cellHtml = tdMatch[0];
      const cellContent = tdMatch[1];
      const classMatch = cellHtml.match(/class="([^"]+)"/i);
      const classes = classMatch ? classMatch[1].split(' ') : [];
      let bg = null;
      for (const cls of classes) {
        if (classStyles[cls] && classStyles[cls]['background-color']) {
          bg = classStyles[cls]['background-color'];
        }
      }
      cells.push({ content: cellContent, bg });
    }
    
    // Check if it matches a callout style
    const isCallout = cells.length === 2 && cells.some(c => c.bg && c.bg !== '#ffffff');
    if (isCallout) {
      const isWarning = cells.some(c => c.bg === '#b05000' || c.bg === '#fff3e0');
      const alertType = isWarning ? 'caution' : 'note';
      
      // Clean content of the second cell (the text)
      let textContent = cells[1].content;
      textContent = textContent.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      textContent = decodeHtml(textContent);
      
      // Strip leading icon if any (like "⚠️" or "ℹ️")
      textContent = textContent.replace(/^(ℹ|⚠|⚠️)\s*\|\s*/i, '');
      textContent = textContent.replace(/^(ℹ|⚠|⚠️)\s*/i, '');
      
      return `\n\n:::${alertType}\n${textContent}\n:::\n\n`;
    }
    
    // For standard tables: clean all classes/styles
    let cleanedTable = fullTableHtml
      .replace(/<table\b[^>]*>/gi, '<table class="manual-table">')
      .replace(/<tr\b[^>]*>/gi, '<tr>')
      .replace(/<td\b[^>]*class="([^"]+)"[^>]*>/gi, (m, cls) => {
        // preserve colspan and rowspan
        const colspan = m.match(/colspan="(\d+)"/i);
        const rowspan = m.match(/rowspan="(\d+)"/i);
        let tag = '<td';
        if (colspan) tag += ` ${colspan[0]}`;
        if (rowspan) tag += ` ${rowspan[0]}`;
        return tag + '>';
      })
      .replace(/<td\b[^>]*>/gi, '<td>')
      .replace(/<th\b[^>]*>/gi, '<th>')
      .replace(/<tbody\b[^>]*>/gi, '<tbody>')
      .replace(/<thead\b[^>]*>/gi, '<thead>');
      
    return cleanedTable;
  });
  
  // B. CONVERT HEADINGS (H2, H3, H4, H5, H6)
  // Skip H1 since it is the section title itself
  sectionHtml = sectionHtml.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '');
  
  // Replace H2
  sectionHtml = sectionHtml.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (m, inner) => {
    const text = decodeHtml(inner.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '));
    // Remove number prefix if present (e.g. "1.1 Módulos" -> "Módulos")
    const cleanText = text.replace(/^\d+\.\d+\s*/, '');
    return `\n\n## ${cleanText}\n\n`;
  });
  
  // Replace H3
  sectionHtml = sectionHtml.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (m, inner) => {
    const text = decodeHtml(inner.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '));
    return `\n\n### ${text}\n\n`;
  });
  
  // C. PROCESS SPANS (BOLD & ITALIC)
  // Find spans and tag them
  sectionHtml = sectionHtml.replace(/<span\b[^>]*class="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi, (m, classStr, inner) => {
    const classes = classStr.split(' ');
    let isBold = false;
    let isItalic = false;
    
    for (const cls of classes) {
      if (boldClasses.has(cls)) isBold = true;
      if (italicClasses.has(cls)) isItalic = true;
    }
    
    let result = inner;
    if (isBold) result = `<strong>${result}</strong>`;
    if (isItalic) result = `<em>${result}</em>`;
    return result;
  });
  
  // Strip all other span tags
  sectionHtml = sectionHtml.replace(/<span\b[^>]*>/gi, '').replace(/<\/span>/gi, '');
  
  // D. PROCESS IMAGES
  // Example: <img src="images/image33.jpg" ...> -> ![Manual Image](../../../assets/images/image33.jpg)
  sectionHtml = sectionHtml.replace(/<img\b[^>]+src="images\/([^"]+)"[^>]*>/gi, (m, imgName) => {
    return `\n\n![Captura de Pantalla](../../../assets/images/${imgName})\n\n`;
  });
  
  // E. CONVERT STRONG & EM TO MARKDOWN
  sectionHtml = sectionHtml
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
    
  // F. CLEAN LISTS (STRIP CLASSES)
  sectionHtml = sectionHtml
    .replace(/<ul\b[^>]*>/gi, '\n\n<ul>')
    .replace(/<ol\b[^>]*>/gi, '\n\n<ol>')
    .replace(/<li\b[^>]*>/gi, '<li>');
    
  // G. CLEAN PARAGRAPHS
  // Strip styles and classes, keeping simple tags
  sectionHtml = sectionHtml.replace(/<p\b[^>]*>/gi, '\n\n<p>').replace(/<\/p>/gi, '</p>\n');
  
  // Clean up inline styles of other elements
  sectionHtml = sectionHtml.replace(/style="[^"]*"/gi, '');
  
  // Convert HTML tags to raw text where appropriate, but we can write standard markdown.
  // Wait, let's convert simple `<p>` tags to just normal text blocks.
  // Replacing <p>Text</p> with Text.
  sectionHtml = sectionHtml.replace(/<p>([\s\S]*?)<\/p>/gi, '$1');
  
  // Remove duplicate newlines
  sectionHtml = sectionHtml.replace(/\n{3,}/g, '\n\n');
  
  // Decode HTML entities
  let cleanContent = decodeHtml(sectionHtml).trim();
  
  // H. FIX LINK REFERENCES
  // Google Docs generates links to internal headings like href="#h.30j0zgc".
  // Starlight sidebar handles headings natively, so we can convert internal document links
  // to simply text or remove the anchor hash if it's broken.
  // Let's strip href="#" or hash links unless they link to a header we know.
  // For simplicity, we convert <a href="#...">Text</a> to **Text** if it's internal,
  // or just clean up the <a> tags.
  cleanContent = cleanContent.replace(/<a\b[^>]*href="#[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '**$1**');
  // External links: keep them as Markdown links [Text](URL)
  cleanContent = cleanContent.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  
  // Let's do a final pass to remove any leftover empty HTML tags
  cleanContent = cleanContent.replace(/<p>\s*<\/p>/gi, '');
  cleanContent = cleanContent.replace(/<div>\s*<\/div>/gi, '');
  
  // Assemble Astro Starlight Markdown Page
  const markdownPage = `---
title: "${title}"
---

${cleanContent}
`;
  
  fs.writeFileSync(path.join(destDocsDir, filename), markdownPage);
  sectionIndex++;
});

console.log('Conversion completed! All sections written to src/content/docs/');
