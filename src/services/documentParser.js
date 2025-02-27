export function parseDocument(html, ooXmlData = null) {
    if (!html) return null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (ooXmlData) {
      const documentStructure = processDocumentXml(ooXmlData.documentXml);
      const styleInfo = processStylesXml(ooXmlData.stylesXml);
      const numberingInfo = processNumberingXml(ooXmlData.numbering);
      applyOoXmlEnhancements(doc, { documentStructure, styleInfo, numberingInfo });
    }
    
    const headings = extractHeadings(doc);
    processNumbering(doc);
    processLists(doc);
    processTables(doc);
    processParagraphs(doc);
    
    const processedHtml = doc.body.innerHTML;
    
    return {
      content: processedHtml,
      headings,
    };
}

function extractHeadings(doc) {
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headings = [];
  
  headingElements.forEach((element, index) => {
    const level = parseInt(element.tagName.substring(1), 10);
    const id = `heading-${index}`;
    element.id = id;
    
    headings.push({
      id,
      text: element.textContent,
      level,
    });
  });
  
  return headings;
}

function processNumbering(doc) {
  const numberedElements = doc.querySelectorAll('[class*="numbering-"]');
  
  const counters = {
    decimal: {},
    lowerLetter: {},
    upperLetter: {},
    lowerRoman: {},
    upperRoman: {}
  };
  
  const formatters = {
    lowerLetter: num => String.fromCharCode(96 + (num % 26 || 26)),
    upperLetter: num => String.fromCharCode(64 + (num % 26 || 26)),
    lowerRoman: num => {
      const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return romanNumerals[num - 1] || num;
    },
    upperRoman: num => {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      return romanNumerals[num - 1] || num;
    }
  };
  
  numberedElements.forEach(element => {
    const numId = element.getAttribute('data-ooxml-num-id') || '1';
    const level = parseInt(element.getAttribute('data-ooxml-level') || '0', 10);
    
    let format = 'decimal';
    if (element.classList.contains('numbering-lowerLetter')) format = 'lowerLetter';
    else if (element.classList.contains('numbering-upperLetter')) format = 'upperLetter';
    else if (element.classList.contains('numbering-lowerRoman')) format = 'lowerRoman';
    else if (element.classList.contains('numbering-upperRoman')) format = 'upperRoman';
    
    if (!counters[format][numId]) counters[format][numId] = {};
    if (!counters[format][numId][level]) counters[format][numId][level] = 0;
    
    counters[format][numId][level]++;
    
    for (let i = level + 1; i < 10; i++) {
      if (counters[format][numId][i]) counters[format][numId][i] = 0;
    }
    
    let counterValue;
    if (format === 'decimal') {
      counterValue = counters[format][numId][level];
    } else {
      counterValue = formatters[format](counters[format][numId][level]);
    }
    
    element.setAttribute('data-ooxml-num-counter', counterValue);
  });
  
  const potentialNumberedElements = doc.querySelectorAll('p');
  
  potentialNumberedElements.forEach(element => {
    const text = element.textContent;
    const numberingMatch = text.match(/^(\d+(\.\d+)*\.)\s/);
    
    if (numberingMatch) {
      const prefix = numberingMatch[1];
      const level = (prefix.match(/\./g) || []).length;
      const numberingSpan = doc.createElement('span');
      numberingSpan.className = 'numbering';
      numberingSpan.textContent = prefix + ' ';
      element.textContent = text.substring(prefix.length).trim();
      element.insertBefore(numberingSpan, element.firstChild);
      element.classList.add('numbered-item', `level-${level}`);
    }
  });
}

function processLists(doc) {
  const ulElements = doc.querySelectorAll('ul');
  ulElements.forEach(ul => {
    ul.classList.add('list-disc', 'pl-5', 'mb-4');
  });
  
  const olElements = doc.querySelectorAll('ol');
  olElements.forEach(ol => {
    ol.classList.add('list-decimal', 'pl-5', 'mb-4');
  });
  
  const liElements = doc.querySelectorAll('li');
  liElements.forEach(li => {
    li.classList.add('mb-1');
  });
}

function processTables(doc) {
  const tables = doc.querySelectorAll('table');
  
  tables.forEach(table => {
    table.classList.add('w-full', 'border-collapse', 'mb-4');
    
    const thElements = table.querySelectorAll('th');
    thElements.forEach(th => {
      th.classList.add('border', 'border-gray-300', 'p-2', 'bg-gray-100');
    });
    
    const tdElements = table.querySelectorAll('td');
    tdElements.forEach(td => {
      td.classList.add('border', 'border-gray-300', 'p-2');
    });
  });
}

function processParagraphs(doc) {
  const paragraphs = doc.querySelectorAll('p');
  
  paragraphs.forEach(p => {
    p.classList.add('mb-4');
    const style = p.getAttribute('style') || '';
    
    if (style.includes('margin-left')) {
      const marginLeftMatch = style.match(/margin-left:\s*(\d+)pt/);
      
      if (marginLeftMatch) {
        const marginInPt = parseInt(marginLeftMatch[1], 10);
        const indentLevel = Math.ceil(marginInPt / 36);
        
        if (indentLevel > 0) {
          p.classList.add(`indent-${Math.min(indentLevel, 5)}`);
        }
      }
    }
    
    if (style.includes('text-align: center')) {
      p.classList.add('text-center');
    } else if (style.includes('text-align: right')) {
      p.classList.add('text-right');
    } else if (style.includes('text-align: justify')) {
      p.classList.add('text-justify');
    }
  });
}

export const extractTextFromRunsWithFormatting = (paragraph) => {
    if (!paragraph) return '';
  
    const runs = paragraph.querySelectorAll('w\\:r, r');
    let formattedText = '';
    
    runs.forEach(run => {
      const rPr = run.querySelector('w\\:rPr, rPr');
      
      const textElements = run.querySelectorAll('w\\:t, t');
      let text = '';
      textElements.forEach(t => {
        const preserveSpace = t.getAttribute('xml:space') === 'preserve';
        text += preserveSpace ? t.textContent : t.textContent.trim();
      });
      
      if (run.querySelector('w\\:br, br')) {
        formattedText += '<br>';
        return;
      }
      
      if (!text.trim()) return;
      
      if (rPr) {
        if (rPr.querySelector('w\\:b, b')) {
          text = `<strong>${text}</strong>`;
        }
        
        if (rPr.querySelector('w\\:i, i')) {
          text = `<em>${text}</em>`;
        }
        
        if (rPr.querySelector('w\\:u, u')) {
          text = `<span style="text-decoration: underline;">${text}</span>`;
        }
        
        if (rPr.querySelector('w\\:strike, strike')) {
          text = `<span style="text-decoration: line-through;">${text}</span>`;
        }
        
        const color = rPr.querySelector('w\\:color, color');
        if (color) {
          const colorVal = color.getAttribute('w:val') || color.getAttribute('val');
          if (colorVal && colorVal !== 'auto') {
            text = `<span style="color: #${colorVal};">${text}</span>`;
          }
        }
        
        const highlight = rPr.querySelector('w\\:highlight, highlight');
        if (highlight) {
          const highlightVal = highlight.getAttribute('w:val') || highlight.getAttribute('val');
          if (highlightVal) {
            text = `<span style="background-color: ${highlightVal};">${text}</span>`;
          }
        }
        
        const sz = rPr.querySelector('w\\:sz, sz');
        if (sz) {
          const sizeVal = sz.getAttribute('w:val') || sz.getAttribute('val');
          if (sizeVal) {
            const fontSize = parseInt(sizeVal) / 2;
            text = `<span style="font-size: ${fontSize}pt; color: #222;">${text}</span>`;
          }
        }
      }
      
      formattedText += text;
    });
    
    return formattedText || '&nbsp;';
};

function processDocumentXml(xmlString) {
  if (!xmlString) return {};
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const body = xmlDoc.querySelector('w\\:body, body');
  if (!body) return {};
  
  const paragraphs = body.querySelectorAll('w\\:p, p');
  const paragraphData = [];
  
  paragraphs.forEach((paragraph, index) => {
    const pPr = paragraph.querySelector('w\\:pPr, pPr');
    const pStyle = pPr?.querySelector('w\\:pStyle, pStyle');
    const styleId = pStyle?.getAttribute('w:val') || '';
    
    const numPr = pPr?.querySelector('w\\:numPr, numPr');
    const numId = numPr?.querySelector('w\\:numId, numId')?.getAttribute('w:val') || '';
    const ilvl = numPr?.querySelector('w\\:ilvl, ilvl')?.getAttribute('w:val') || '';
    
    const ind = pPr?.querySelector('w\\:ind, ind');
    const leftIndent = ind?.getAttribute('w:left') || '';
    const firstLineIndent = ind?.getAttribute('w:firstLine') || '';
    const hangingIndent = ind?.getAttribute('w:hanging') || '';
    
    const jc = pPr?.querySelector('w\\:jc, jc');
    const alignment = jc?.getAttribute('w:val') || '';
    
    const runs = paragraph.querySelectorAll('w\\:r, r');
    const runData = [];
    
    runs.forEach(run => {
      const rPr = run.querySelector('w\\:rPr, rPr');
      const text = run.querySelector('w\\:t, t')?.textContent || '';
      
      const bold = rPr?.querySelector('w\\:b, b') !== null;
      const italic = rPr?.querySelector('w\\:i, i') !== null;
      const underline = rPr?.querySelector('w\\:u, u') !== null;
      const strike = rPr?.querySelector('w\\:strike, strike') !== null;
      
      runData.push({
        text,
        formatting: { bold, italic, underline, strike }
      });
    });
    
    paragraphData.push({
      id: `p-${index}`,
      style: styleId,
      numbering: { numId, level: ilvl },
      indentation: { 
        left: leftIndent, 
        firstLine: firstLineIndent, 
        hanging: hangingIndent 
      },
      alignment,
      runs: runData
    });
  });
  
  return {
    paragraphs: paragraphData
  };
}

function processOoxmlStructure(xmlDoc) {
  const bodyElement = xmlDoc.querySelector('w\\:body, body');
  if (!bodyElement) {
    return '<div class="text-red-500">No body element found in the XML file.</div>';
  }
  
  let html = '<div class="document-content">';
  
  const paragraphs = bodyElement.querySelectorAll('w\\:p, p');
  let currentList = null;
  let currentListLevel = -1;
  
  paragraphs.forEach((p, index) => {
    const pPr = p.querySelector('w\\:pPr, pPr');
    const pStyle = pPr?.querySelector('w\\:pStyle, pStyle');
    const styleVal = pStyle?.getAttribute('w:val') || '';
    
    const numPr = pPr?.querySelector('w\\:numPr, numPr');
    const numId = numPr?.querySelector('w\\:numId, numId')?.getAttribute('w:val');
    const ilvl = numPr?.querySelector('w\\:ilvl, ilvl')?.getAttribute('w:val') || '0';
    
    const text = extractTextFromRunsWithFormatting(p);
    
    if (styleVal.startsWith('Heading') || styleVal.startsWith('heading')) {
      const level = styleVal.replace(/Heading|heading/, '').trim() || '1';
      const headingId = `heading-${index}`;
      html += `<h${level} id="${headingId}" class="heading">${text}</h${level}>`;
      
      if (currentList) {
        html += currentList === 'ol' ? '</ol>' : '</ul>';
        currentList = null;
        currentListLevel = -1;
      }
    } 
    else if (numPr) {
      const listLevel = parseInt(ilvl, 10);
      
      if (currentList === null) {
        currentList = 'ol';
        currentListLevel = listLevel;
        html += '<ol class="numbered-list">';
      } else if (listLevel > currentListLevel) {
        html += '<ol class="nested-list">';
        currentListLevel = listLevel;
      } else if (listLevel < currentListLevel) {
        for (let i = 0; i < currentListLevel - listLevel; i++) {
          html += '</ol>';
        }
        currentListLevel = listLevel;
      }
      
      html += `<li class="numbered-list-item">${text}</li>`;
    } 
    else {
      if (currentList) {
        html += currentList === 'ol' ? '</ol>' : '</ul>';
        currentList = null;
        currentListLevel = -1;
      }
      
      const ind = pPr?.querySelector('w\\:ind, ind');
      let indentClass = '';
      
      if (ind) {
        const left = ind.getAttribute('w:left') || '';
        if (left) {
          const indentLevel = Math.min(Math.ceil(parseInt(left) / 720), 5);
          indentClass = `indent-${indentLevel}`;
        }
      }
      
      const jc = pPr?.querySelector('w\\:jc, jc');
      const alignment = jc?.getAttribute('w:val') || '';
      let alignClass = '';
      
      if (alignment === 'center') {
        alignClass = 'text-center';
      } else if (alignment === 'right') {
        alignClass = 'text-right';
      } else if (alignment === 'justify') {
        alignClass = 'text-justify';
      }
      
      html += `<p class="${indentClass} ${alignClass}">${text}</p>`;
    }
  });
  
  if (currentList) {
    html += currentList === 'ol' ? '</ol>' : '</ul>';
  }
  
  const tables = bodyElement.querySelectorAll('w\\:tbl, tbl');
  tables.forEach(table => {
    html += '<table class="w-full border-collapse mb-4">';
    
    const rows = table.querySelectorAll('w\\:tr, tr');
    let firstRow = true;
    
    rows.forEach(row => {
      html += '<tr>';
      
      const cells = row.querySelectorAll('w\\:tc, tc');
      cells.forEach(cell => {
        const cellContent = Array.from(cell.querySelectorAll('w\\:p, p'))
          .map(p => extractTextFromRunsWithFormatting(p))
          .join('<br>');
        
        const cellTag = firstRow ? 'th' : 'td';
        html += `<${cellTag} class="border border-gray-300 p-2">${cellContent}</${cellTag}>`;
      });
      
      html += '</tr>';
      firstRow = false;
    });
    
    html += '</table>';
  });
  
  html += '</div>';
  return html;
}

function processStylesXml(xmlString) {
  if (!xmlString) return {};
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const styles = xmlDoc.querySelectorAll('w\\:style, style');
  const styleData = {};
  
  styles.forEach(style => {
    const styleId = style.getAttribute('w:styleId') || '';
    const type = style.getAttribute('w:type') || '';
    const name = style.querySelector('w\\:name, name')?.getAttribute('w:val') || '';
    const pPr = style.querySelector('w\\:pPr, pPr');
    const rPr = style.querySelector('w\\:rPr, rPr');
    
    styleData[styleId] = {
      id: styleId,
      type,
      name,
      hasProperties: pPr !== null || rPr !== null
    };
  });
  
  return styleData;
}

function processNumberingXml(xmlString) {
  if (!xmlString) return {};
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const abstractNums = xmlDoc.querySelectorAll('w\\:abstractNum, abstractNum');
  const abstractNumData = {};
  
  abstractNums.forEach(abstractNum => {
    const abstractNumId = abstractNum.getAttribute('w:abstractNumId') || '';
    const levels = abstractNum.querySelectorAll('w\\:lvl, lvl');
    const levelData = {};
    
    levels.forEach(level => {
      const ilvl = level.getAttribute('w:ilvl') || '';
      const numFmt = level.querySelector('w\\:numFmt, numFmt')?.getAttribute('w:val') || '';
      const lvlText = level.querySelector('w\\:lvlText, lvlText')?.getAttribute('w:val') || '';
      const start = level.querySelector('w\\:start, start')?.getAttribute('w:val') || '';
      
      levelData[ilvl] = {
        level: ilvl,
        format: numFmt,
        text: lvlText,
        start: start
      };
    });
    
    abstractNumData[abstractNumId] = {
      id: abstractNumId,
      levels: levelData
    };
  });
  
  const nums = xmlDoc.querySelectorAll('w\\:num, num');
  const numData = {};
  
  nums.forEach(num => {
    const numId = num.getAttribute('w:numId') || '';
    const abstractNumId = num.querySelector('w\\:abstractNumId, abstractNumId')?.getAttribute('w:val') || '';
    
    numData[numId] = {
      id: numId,
      abstractNumId
    };
  });
  
  return {
    abstractNums: abstractNumData,
    nums: numData
  };
}

function applyOoXmlEnhancements(doc, ooXmlInfo) {
  const { documentStructure, styleInfo, numberingInfo } = ooXmlInfo;
  
  if (!documentStructure?.paragraphs) return;
  
  const paragraphElements = Array.from(doc.querySelectorAll('p'));
  
  documentStructure.paragraphs.forEach((paragraph, index) => {
    if (index >= paragraphElements.length) return;
    
    const pElement = paragraphElements[index];
    
    pElement.setAttribute('data-ooxml-id', paragraph.id);
    
    if (paragraph.style) {
      pElement.setAttribute('data-ooxml-style', paragraph.style);
      
      if (styleInfo[paragraph.style]) {
        const style = styleInfo[paragraph.style];
        
        if (style.name && style.name.startsWith('heading')) {
          const headingLevel = style.name.replace('heading', '').trim();
          if (headingLevel && !isNaN(parseInt(headingLevel))) {
            const headingElement = doc.createElement(`h${headingLevel}`);
            headingElement.innerHTML = pElement.innerHTML;
            
            Array.from(pElement.attributes).forEach(attr => {
              headingElement.setAttribute(attr.name, attr.value);
            });
            
            pElement.parentNode.replaceChild(headingElement, pElement);
          }
        }
      }
    }
    
    if (paragraph.numbering && paragraph.numbering.numId && paragraph.numbering.level) {
      pElement.setAttribute('data-ooxml-num-id', paragraph.numbering.numId);
      pElement.setAttribute('data-ooxml-level', paragraph.numbering.level);
      
      if (numberingInfo?.nums && numberingInfo?.abstractNums) {
        const numInstance = numberingInfo.nums[paragraph.numbering.numId];
        
        if (numInstance && numInstance.abstractNumId) {
          const abstractNum = numberingInfo.abstractNums[numInstance.abstractNumId];
          
          if (abstractNum && abstractNum.levels && abstractNum.levels[paragraph.numbering.level]) {
            const levelInfo = abstractNum.levels[paragraph.numbering.level];
            
            pElement.classList.add(`numbering-${levelInfo.format || 'decimal'}`);
            
            if (levelInfo.text) {
              pElement.setAttribute('data-ooxml-num-text', levelInfo.text);
            }
          }
        }
      }
    }
    
    if (paragraph.indentation) {
      if (paragraph.indentation.left) {
        const leftIndent = parseInt(paragraph.indentation.left, 10);
        if (leftIndent > 0) {
          const indentLevel = Math.ceil(leftIndent / 720);
          pElement.classList.add(`indent-${Math.min(indentLevel, 5)}`);
        }
      }
      
      if (paragraph.indentation.firstLine) {
        pElement.classList.add('first-line-indent');
      } else if (paragraph.indentation.hanging) {
        pElement.classList.add('hanging-indent');
      }
    }
    
    if (paragraph.alignment) {
      switch (paragraph.alignment) {
        case 'center':
          pElement.classList.add('text-center');
          break;
        case 'right':
          pElement.classList.add('text-right');
          break;
        case 'justify':
          pElement.classList.add('text-justify');
          break;
      }
    }
  });
}