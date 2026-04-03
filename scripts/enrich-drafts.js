#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const draftDir = path.join(process.cwd(), 'drafts', 'writing');

// Get all MDX files
const files = fs.readdirSync(draftDir).filter(f => f.endsWith('.mdx'));

console.log(`Found ${files.length} draft files. Processing...`);

let updated = 0;
let skipped = 0;

files.forEach(file => {
  const filePath = path.join(draftDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(fileContent);

  // Skip if already has category
  if (parsed.data.category) {
    skipped++;
    return;
  }

  // Determine category based on tags
  const tags = parsed.data.tags || [];
  let category = '技術士（総合技術監理部門）'; // Default

  // Enrich tags
  let newTags = [...new Set(tags)]; // Remove duplicates

  // Add type as a tag if present
  if (parsed.data.type) {
    if (!newTags.includes(parsed.data.type)) {
      newTags.push(parsed.data.type);
    }
  }

  // Add category to tags
  if (!newTags.includes(category)) {
    newTags.push(category);
  }

  parsed.data.category = category;
  parsed.data.tags = newTags;

  // Remove obsolete fields
  delete parsed.data.type;
  delete parsed.data.source;
  delete parsed.data.section;

  // Reconstruct file content
  const newContent = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ ${file}`);
  updated++;
});

console.log(`\n✨ Complete: ${updated} updated, ${skipped} skipped (already has category)`);
