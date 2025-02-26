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