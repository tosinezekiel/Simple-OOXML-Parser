# FirstRead OOXML Relationship Parser

A Vue.js SPA that allows users to upload, parse, and visualize OOXML (Office Open XML) documents, with a focus on relationship files.

## Features

- Upload and parse OOXML XML files directly in the browser
- Visualize document structure including relationships between document parts
- Display OOXML package structure with content types
- Process document content with formatting preserved
- Responsive design that works on mobile devices and desktops
- Support for different types of XML files in the OOXML format

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tosinezekiel/First-read-OOXML-Parser.git
cd firstread-ooxml-parser
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit:
```
http://localhost:5173
```

### Building for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Usage

1. Open the application in your browser
2. Drag and drop an XML file from an OOXML document (.docx) or click to browse files
   - To extract XML files from a .docx file, rename it to .zip and extract the contents
3. The application will parse the file and display:
   - For relationship files (.rels): A structured view of document relationships
   - For package files: Package structure and embedded relationships
   - For document files: Document content with preserved formatting
4. Use the Table of Contents to navigate through the document
5. Use the Print button to print the content

## Supported File Types

- `document.xml` - Main document content
- `document.xml.rels` - Document relationships
- `_rels/.rels` - Package-level relationships
- Other XML files from OOXML structure

## Project Structure

```
first_read/
├── public/
├── src/
│   ├── components/
│   │   ├── FileUploader.vue   
│   │   ├── DocumentViewer.vue 
│   │   └── LoadingIndicator.vue
│   ├── services/
│   │   └── documentParser.js  
│   ├── App.vue
│   ├── main.js         
│   └── index.css
├── index.html
├── package.json
├── postcss.config.cjs
├── tailwind.config.cjs
├── vite.config.js
└── README.md
```

## Development Notes

- The application uses Vue 3 with the Composition API
- Styling is implemented with Tailwind CSS
- XML parsing is done directly in the browser using the DOMParser API
- No server-side processing is required

# Package Implementation Documentation

## OOXML Parser Implementation

The FirstRead OOXML Parser is designed to extract and display the content of Office Open XML documents directly in the browser. This implementation uses a multi-layered approach to parse and render OOXML documents.

### Core Components

1. **XML Extraction**: The parser first extracts the raw XML content from uploaded files using the browser's built-in APIs.

2. **Structure Detection**: The system analyzes the XML structure to identify whether it's a full OOXML package or individual XML parts (document.xml, document.xml.rels, etc.).

3. **Relationship Mapping**: For relationship files (.rels), the parser extracts and visualizes the connections between different document parts, organizing them by type for better comprehension.

4. **Document Content Processing**: When processing document.xml files, the parser converts the OOXML structure into formatted HTML while preserving:
   - Text formatting (bold, italic, underline, and color)
   - Document structure (paragraphs, headings, sections)
   - Lists with proper numbering and hierarchy
   - Tables with merged cells and formatting
   - Indentation and alignment

### Processing Flow

The OOXML processing pipeline consists of several specialized functions:

- `processFile`: Handles file upload, initial XML parsing, and type detection
- `processXmlDocument`: Determines the XML type and routes to specific processors
- `processOoxmlStructure`: Transforms document.xml content into formatted HTML
- `processOoxmlPackage`: Processes full OOXML packages, showing their structure
- `processOoxmlRelationships`: Visualizes relationship (.rels) files
- `extractTextFromRunsWithFormatting`: Preserves rich text formatting

### Rendering Approach

The implementation uses Tailwind CSS classes for styling and responsive design, ensuring a consistent appearance across devices. The document content is rendered with a focus on readability while maintaining the visual hierarchy of the original document.

Key rendering features include:

- Dynamic table of contents generation from document headings
- Responsive tables that adapt to different screen sizes
- Proper indentation levels matched to the original document
- Color-coded relationship visualization for better comprehension
- Print-friendly output formatting

This browser-based implementation eliminates the need for server-side processing, enhancing privacy and performance while making document analysis accessible to users without specialized software.

## License

[MIT](LICENSE)