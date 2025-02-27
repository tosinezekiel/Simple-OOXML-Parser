<script setup>
import { ref } from 'vue';
import LoadingIndicator from './LoadingIndicator.vue';
import { parseDocument, extractTextFromRunsWithFormatting } from '../services/documentParser';

const emit = defineEmits(['parsed-document', 'loading', 'error']);
const fileInput = ref(null);
const dragActive = ref(false);
const fileName = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const handleFileSelect = async (event) => {
  const file = event.target.files[0] || event.dataTransfer.files[0];
  
  if (!file) {
    return;
  }
  
  if (!file.name.endsWith('.xml')) {
    errorMessage.value = 'Please upload a valid .xml file.';
    return;
  }
  
  fileName.value = file.name;
  await processFile(file);
};

const processFile = async (file) => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    emit('loading', true);
    emit('error', '');
    
    const text = await file.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'application/xml');
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }
    
    console.log('XML parsed successfully');
    
    const isDocumentXmlContent = xmlDoc.querySelector('w\\:document, document') !== null;
    
    let processedDocument;
    
    if (isDocumentXmlContent) {
      processedDocument = {
        content: processOoxmlStructure(xmlDoc),
        headings: extractOoxmlHeadings(xmlDoc)
      };
    } else {
      processedDocument = processXmlDocument(xmlDoc);
    }
    
    emit('parsed-document', processedDocument);
    emit('loading', false);
  } catch (error) {
    console.error('Error processing document:', error);
    errorMessage.value = `Failed to process document: ${error.message}`;
    emit('error', errorMessage.value);
    emit('parsed-document', null);
  } finally {
    isLoading.value = false;
  }
};

const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = false;
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = false;
  handleFileSelect(e);
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const clearError = () => {
  errorMessage.value = '';
};

const processXmlDocument = (xmlDoc) => {
  const rootElement = xmlDoc.documentElement;
  const rootNodeName = rootElement.nodeName;

  console.log(`Root element: ${rootNodeName}`);

  const isOoxmlDocument = rootNodeName === 'w:document' || 
                         rootElement.namespaceURI?.includes('openxmlformats') ||
                         rootNodeName === 'document';
  
  const isOoxmlRelationships = rootNodeName === 'Relationships' || 
                              rootElement.getAttribute('xmlns')?.includes('relationships');
  
  const isOoxmlPackage = rootNodeName === 'pkg:package' || 
                        rootElement.getAttribute('xmlns:pkg')?.includes('xmlPackage');
  
  let content = '';
  let headings = [];
  
  if (isOoxmlPackage) {
    content = processOoxmlPackage(xmlDoc);
    headings = extractOoxmlPackageHeadings(xmlDoc);
  } else if (isOoxmlRelationships) {
    content = processOoxmlRelationships(xmlDoc);
    headings = extractOoxmlRelationshipHeadings(xmlDoc);
  } else if (isOoxmlDocument) {
    content = processOoxmlStructure(xmlDoc);
    headings = extractOoxmlHeadings(xmlDoc);
  } else {
    content = processGenericXml(xmlDoc);
    headings = extractGenericXmlHeadings(xmlDoc);
  }
  
  return {
    content,
    headings
  };
};

const processOoxmlPackage = (xmlDoc) => {
  let html = '<div class="document-content ooxml-package">';
  html += '<h2 class="text-xl font-bold mb-4 text-gray-400">OOXML Package Structure</h2>';
  
  const parts = xmlDoc.querySelectorAll('pkg\\:part, part');
  
  if (parts.length === 0) {
    html += '<p class="text-red-500">No package parts found in the XML file.</p>';
  } else {
    html += '<div class="package-parts">';
    
    html += `
      <table class="w-full border-collapse mb-6">
        <thead>
          <tr class="bg-gray-100">
            <th class="border border-gray-300 p-2 text-left text-gray-600">Part Name</th>
            <th class="border border-gray-300 p-2 text-left text-gray-600">Content Type</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    parts.forEach(part => {
      const partName = part.getAttribute('pkg:name') || '';
      const contentType = part.getAttribute('pkg:contentType') || '';
      
      html += `
        <tr>
          <td class="border border-gray-300 p-2">${partName}</td>
          <td class="border border-gray-300 p-2">${contentType}</td>
        </tr>
      `;
      
      const xmlData = part.querySelector('pkg\\:xmlData, xmlData');
      if (xmlData && xmlData.firstElementChild) {
        const childElement = xmlData.firstElementChild;
        
        if (childElement.nodeName === 'Relationships' || 
            childElement.getAttribute('xmlns')?.includes('relationships')) {
          html += `
            <tr>
              <td colspan="2" class="border border-gray-300 p-2 bg-gray-50">
                <div class="font-semibold mb-2">Relationships in ${partName}:</div>
                ${processOoxmlRelationships(childElement.ownerDocument, childElement)}
              </td>
            </tr>
          `;
        }
      }
    });
    
    html += '</tbody></table>';
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  return html;
};

const extractOoxmlPackageHeadings = (xmlDoc) => {
  const headings = [];
  
  headings.push({
    id: 'package-structure',
    text: 'OOXML Package Structure',
    level: 1
  });
  
  const parts = xmlDoc.querySelectorAll('pkg\\:part, part');
  
  parts.forEach((part, index) => {
    const partName = part.getAttribute('pkg:name') || `Part ${index + 1}`;
    const headingId = `package-part-${index}`;
    
    headings.push({
      id: headingId,
      text: partName,
      level: 2
    });
  });
  
  return headings;
};

const processOoxmlRelationships = (xmlDoc, relationshipsElement = null) => {
  const relationships = relationshipsElement || xmlDoc.querySelector('Relationships');
  
  if (!relationships) {
    return '<p class="text-red-500">No relationships found in the XML file.</p>';
  }
  
  let html = '';
  
  const relationshipElements = relationships.querySelectorAll('Relationship');
  
  if (relationshipElements.length === 0) {
    html += '<p>No relationships defined.</p>';
  } else {
    html += `<div class="table-container">`;
    html += `
      <table class="w-full border-collapse mb-4 stack-on-mobile">
        <thead>
          <tr class="bg-gray-100">
            <th class="border border-gray-300 p-2 text-left text-gray-600">ID</th>
            <th class="border border-gray-300 p-2 text-left text-gray-600 hidden sm:table-cell">Type</th>
            <th class="border border-gray-300 p-2 text-left text-gray-600">Target</th>
            <th class="border border-gray-300 p-2 text-left text-gray-600 hidden sm:table-cell">Mode</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    const relationshipsByType = {};
    
    relationshipElements.forEach(rel => {
      const id = rel.getAttribute('Id') || '';
      const type = rel.getAttribute('Type') || '';
      const target = rel.getAttribute('Target') || '';
      const targetMode = rel.getAttribute('TargetMode') || 'Internal';
      
      const typeName = type.split('/').pop() || type;
      
      if (!relationshipsByType[typeName]) {
        relationshipsByType[typeName] = [];
      }
      
      relationshipsByType[typeName].push({
        id,
        type,
        target,
        targetMode
      });
    });
    
    const sortedTypes = Object.keys(relationshipsByType).sort();
    
    let currentType = '';
    
    sortedTypes.forEach(typeName => {
      const relationships = relationshipsByType[typeName];
      
      relationships.forEach(rel => {
        if (currentType !== typeName) {
          html += `
            <tr class="bg-blue-50">
              <td colspan="4" class="border border-gray-300 p-2 font-semibold">${typeName}</td>
            </tr>
          `;
          currentType = typeName;
        }
        
        const isExternal = rel.targetMode === 'External';
        const targetClass = isExternal ? 'text-blue-600' : '';
        
        html += `
          <tr>
            <td class="border border-gray-300 p-2" data-label="ID">${rel.id}</td>
            <td class="border border-gray-300 p-2 text-xs hidden sm:table-cell" data-label="Type">${rel.type}</td>
            <td class="border border-gray-300 p-2 ${targetClass}" data-label="Target">${rel.target}</td>
            <td class="border border-gray-300 p-2 hidden sm:table-cell" data-label="Mode">${rel.targetMode}</td>
          </tr>
        `;
      });
    });
    
    html += '</tbody></table>';
  }
  
  return html;
};

const extractOoxmlRelationshipHeadings = (xmlDoc) => {
  const headings = [];
  
  headings.push({
    id: 'ooxml-relationships',
    text: 'OOXML Relationships',
    level: 1
  });
  
  const relationships = xmlDoc.querySelectorAll('Relationship');
  const typeGroups = new Set();
  
  relationships.forEach(rel => {
    const type = rel.getAttribute('Type') || '';
    const typeName = type.split('/').pop() || type;
    typeGroups.add(typeName);
  });
  
  Array.from(typeGroups).sort().forEach((typeName, index) => {
    const headingId = `relationship-type-${index}`;
    
    headings.push({
      id: headingId,
      text: typeName,
      level: 2
    });
  });
  
  return headings;
};

const processOoxmlStructure = (xmlDoc) => {
  const bodyElement = 
    xmlDoc.querySelector('w\\:body, body') || 
    xmlDoc.querySelector('pkg\\:package pkg\\:part[pkg\\:name="/word/document.xml"] pkg\\:xmlData w\\:body');
  
  if (!bodyElement) {
    return '<div class="text-red-500">No body element found in the XML file. This may not be a valid Word document.</div>';
  }
  
  let html = '<div class="document-content">';
  
  const sections = xmlDoc.querySelectorAll('w\\:sectPr, sectPr');
  if (sections.length > 0) {
    html += '<div class="document-sections">';
    sections.forEach((section, index) => {
      html += `<div class="document-section" id="section-${index+1}">`;
      html += '</div>';
    });
    html += '</div>';
  }
  
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
    
    if (styleVal.toLowerCase().includes('heading')) {
      const levelMatch = styleVal.match(/\d+$/);
      const level = levelMatch ? levelMatch[0] : '1';
      const headingId = `heading-${index}`;
      
      if (currentList) {
        html += currentList === 'ol' ? '</ol>' : '</ul>';
        currentList = null;
        currentListLevel = -1;
      }
      
      html += `<h${level} id="${headingId}" class="heading">${text}</h${level}>`;
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
        const left = ind.getAttribute('w:left') || ind.getAttribute('left') || '';
        if (left && !isNaN(parseInt(left))) {
          const indentLevel = Math.min(Math.ceil(parseInt(left) / 720), 5);
          indentClass = `indent-${indentLevel}`;
        }
      }
      
      const jc = pPr?.querySelector('w\\:jc, jc');
      const alignment = jc?.getAttribute('w:val') || jc?.getAttribute('val') || '';
      let alignClass = '';
      
      if (alignment === 'center') {
        alignClass = 'text-center';
      } else if (alignment === 'right') {
        alignClass = 'text-right';
      } else if (alignment === 'justify') {
        alignClass = 'text-justify';
      }
      
      if (!text.trim()) {
        html += '<p class="empty-paragraph">&nbsp;</p>';
      } else {
        html += `<p class="text-gray-600 ${indentClass} ${alignClass}">${text}</p>`;
      }
    }
  });
  
  if (currentList) {
    html += currentList === 'ol' ? '</ol>' : '</ul>';
  }
  
  const tables = bodyElement.querySelectorAll('w\\:tbl, tbl');
  tables.forEach(table => {
    html += '<table class="w-full border-collapse mb-4">';
    
    const tblGrid = table.querySelector('w\\:tblGrid, tblGrid');
    const gridCols = tblGrid?.querySelectorAll('w\\:gridCol, gridCol') || [];
    
    const rows = table.querySelectorAll('w\\:tr, tr');
    let firstRow = true;
    
    rows.forEach(row => {
      html += '<tr>';
      
      const cells = row.querySelectorAll('w\\:tc, tc');
      cells.forEach(cell => {
        const tcPr = cell.querySelector('w\\:tcPr, tcPr');
        
        const gridSpan = tcPr?.querySelector('w\\:gridSpan, gridSpan')?.getAttribute('w:val') || 
                         tcPr?.querySelector('w\\:gridSpan, gridSpan')?.getAttribute('val') || '1';
                         
        const vMerge = tcPr?.querySelector('w\\:vMerge, vMerge');
        const rowSpan = vMerge && vMerge.getAttribute('w:val') !== 'restart' ? '2' : '1';
        
        const cellContent = Array.from(cell.querySelectorAll('w\\:p, p'))
          .map(p => extractTextFromRunsWithFormatting(p))
          .join('<br>');
        
        const cellTag = firstRow ? 'th' : 'td';
        
        const spanAttrs = [];
        if (gridSpan !== '1') spanAttrs.push(`colspan="${gridSpan}"`);
        if (rowSpan !== '1') spanAttrs.push(`rowspan="${rowSpan}"`);
        
        html += `<${cellTag} class="border border-gray-300 p-2" ${spanAttrs.join(' ')}>${cellContent}</${cellTag}>`;
      });
      
      html += '</tr>';
      firstRow = false;
    });
    
    html += '</table>';
  });
  
  html += '</div>';
  return html;
}

const extractTextFromRuns = (paragraph) => {
  const runs = paragraph.querySelectorAll('w\\:r, r');
  let text = '';
  
  runs.forEach(run => {
    const textElements = run.querySelectorAll('w\\:t, t');
    textElements.forEach(t => {
      text += t.textContent;
    });
    
    if (run.querySelector('w\\:br, br')) {
      text += '<br>';
    }
  });
  
  return text;
};

const extractOoxmlHeadings = (xmlDoc) => {
  const headings = [];
  const bodyElement = xmlDoc.querySelector('w\\:body, body');
  
  if (!bodyElement) return headings;
  
  const paragraphs = bodyElement.querySelectorAll('w\\:p, p');
  paragraphs.forEach((p, index) => {
    const pStyle = p.querySelector('w\\:pStyle, pStyle');
    const styleVal = pStyle?.getAttribute('w:val') || '';
    
    if (styleVal.startsWith('Heading') || styleVal.startsWith('heading')) {
      const level = parseInt(styleVal.replace(/Heading|heading/, '').trim() || '1', 10);
      const headingId = `heading-${index}`;
      
      const text = extractTextFromRuns(p);
      
      headings.push({
        id: headingId,
        text,
        level
      });
    }
  });
  
  return headings;
};

const processGenericXml = (xmlDoc) => {
  let html = '<div class="document-content xml-structure">';
  
  const processNode = (node, depth = 0) => {
    const nodeType = node.nodeType;
    
    if (nodeType === Node.TEXT_NODE) {
      const content = node.textContent.trim();
      if (content) {
        return `<span class="xml-text">${content}</span>`;
      }
      return '';
    }
    
    if (nodeType === Node.ELEMENT_NODE) {
      const tagName = node.nodeName;
      const attributes = Array.from(node.attributes || [])
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ');
      
      const indentClass = `indent-${Math.min(depth, 5)}`;
      
      let elementHtml = '';
      const hasChildren = node.hasChildNodes();
      
      elementHtml += `<div class="${indentClass} xml-element">`;
      elementHtml += `<span class="xml-tag">&lt;${tagName}${attributes ? ' ' + attributes : ''}&gt;</span>`;
      
      if (hasChildren) {
        let childrenHtml = '<div class="xml-content">';
        
        Array.from(node.childNodes).forEach(childNode => {
          childrenHtml += processNode(childNode, depth + 1);
        });
        
        childrenHtml += '</div>';
        elementHtml += childrenHtml;
      }
      
      elementHtml += `<span class="xml-tag">&lt;/${tagName}&gt;</span>`;
      elementHtml += '</div>';
      
      return elementHtml;
    }
    
    return '';
  };
  
  html += processNode(xmlDoc.documentElement);
  html += '</div>';
  
  return html;
};

const extractGenericXmlHeadings = (xmlDoc) => {
  const headings = [];
  
  const rootChildren = xmlDoc.documentElement.children;
  
  Array.from(rootChildren).forEach((node, index) => {
    const headingId = `xml-element-${index}`;
    
    headings.push({
      id: headingId,
      text: node.nodeName,
      level: 1
    });
    
    if (node.children.length > 0) {
      Array.from(node.children)
        .slice(0, 5)
        .forEach((childNode, childIndex) => {
          const childHeadingId = `xml-element-${index}-${childIndex}`;
          
          headings.push({
            id: childHeadingId,
            text: `${node.nodeName} > ${childNode.nodeName}`,
            level: 2
          });
        });
    }
  });
  
  return headings;
};
</script>

<template>
  <div>
    <div v-if="errorMessage" class="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded relative" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ errorMessage }}</span>
      <button @click="clearError" class="absolute top-0 bottom-0 right-0 px-4 py-3">
        <svg class="h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <div 
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative',
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      ]"
      @click="triggerFileInput"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <input 
        ref="fileInput"
        type="file" 
        class="hidden"
        accept=".xml"
        @change="handleFileSelect"
      />
      
      <LoadingIndicator 
        v-if="isLoading" 
        size="large" 
        text="Processing XML file..." 
        :fullscreen="false"
        class="absolute inset-0 bg-white bg-opacity-80 z-10"
      />
      
      <div v-if="!fileName">
        <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mt-4 text-lg font-medium text-gray-700">
          Drag and drop your OOXML XML file here
        </p>
        <p class="mt-2 text-sm text-gray-500">
          Supports document.xml, document.xml.rels, and package XML files
        </p>
        <p class="mt-2 text-sm text-gray-500">
          or click to browse files
        </p>
      </div>
      
      <div v-else class="flex items-center justify-center">
        <svg class="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="text-blue-600 font-medium">{{ fileName }}</span>
        <button
          class="ml-4 text-red-500 hover:text-red-700"
          @click.stop="fileName = ''; emit('parsed-document', null)"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>