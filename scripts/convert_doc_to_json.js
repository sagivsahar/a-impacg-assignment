#!/usr/bin/env node
/*
  Demo converter: PDF/DOCX -> JSON skeleton for regulatory requirements.
  Notes:
  - This is a minimal example to fulfill the assignment's requirement for a processing script.
  - For real extraction, integrate a robust parser and mapping rules.
*/

const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log('Usage: node convert_doc_to_json.js <input.(pdf|docx)> <output.json>');
}

function createOutput(requirements) {
  return {
    source: {
      file: path.basename(inputPath),
      generatedAt: new Date().toISOString(),
    },
    schema: {
      requirement: ['requirement', 'citation', 'category', 'priority', 'source'],
    },
    requirements,
  };
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  printUsage();
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(1);
}

const ext = path.extname(inputPath).toLowerCase();

async function main() {
  let rawText = '';

  try {
    if (ext === '.pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(inputPath);
        const res = await pdfParse(dataBuffer);
        rawText = res.text || '';
      } catch (e) {
        console.error('Missing dependency pdf-parse. Install with: npm i pdf-parse');
        process.exit(1);
      }
    } else if (ext === '.docx') {
      try {
        const mammoth = require('mammoth');
        const res = await mammoth.extractRawText({ path: inputPath });
        rawText = res.value || '';
      } catch (e) {
        console.error('Missing dependency mammoth. Install with: npm i mammoth');
        process.exit(1);
      }
    } else {
      console.error('Unsupported input type. Use PDF or DOCX.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to read input file:', err.message);
    process.exit(1);
  }

  // Very naive heuristic parsing: split by lines and pick potential requirement-like lines
  const lines = rawText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const categories = ['בטיחות אש', 'יציאות חירום', 'בטיחות מזון', 'כללי'];
  const priorities = ['required', 'important', 'low'];

  const requirements = [];
  for (const line of lines) {
    // pick lines that look like bullets or contain keywords
    if (/^-\s|•|בטיחות|יציאות|רישיון|מטף|HACCP|תאורת\sחירום/.test(line)) {
      requirements.push({
        requirement: line.replace(/^[-•]\s?/, ''),
        citation: line.slice(0, 160),
        category: categories[requirements.length % categories.length],
        priority: priorities[requirements.length % priorities.length],
        source: { chapter: 'N/A', section: 'N/A' },
      });
      if (requirements.length >= 25) break; // keep output compact
    }
  }

  const out = createOutput(requirements);
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${requirements.length} requirements to ${outputPath}`);
}

main();
