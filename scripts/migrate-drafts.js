#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const draftDir = path.join(process.cwd(), 'drafts', 'writing');

// Get all MD files
const files = fs.readdirSync(draftDir).filter(f => f.endsWith('.md'));

console.log(`Found ${files.length} draft files. Processing...`);

let processed = 0;
let failed = 0;

files.forEach(file => {
  const filePath = path.join(draftDir, file);
  const fileName = file.replace(/\.md$/, '');

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(fileContent);

    // Add published flag if not exists
    if (!parsed.data.published) {
      parsed.data.published = false;
    }

    // Ensure date field exists (use created or default to today)
    if (!parsed.data.date && !parsed.data.publishedAt) {
      if (parsed.data.created) {
        parsed.data.publishedAt = parsed.data.created;
      } else {
        parsed.data.publishedAt = new Date().toISOString().split('T')[0];
      }
    }

    // Reconstruct file content
    const newContent = matter.stringify(parsed.content, parsed.data);

    // Write as MDX in same location
    const newFilePath = path.join(draftDir, `${fileName}.mdx`);
    fs.writeFileSync(newFilePath, newContent, 'utf8');

    // Delete original MD
    fs.unlinkSync(filePath);

    console.log(`✅ ${file} → ${fileName}.mdx`);
    processed++;
  } catch (err) {
    console.error(`❌ ${file}: ${err.message}`);
    failed++;
  }
});

console.log(`\n✨ Complete: ${processed} processed, ${failed} failed`);
