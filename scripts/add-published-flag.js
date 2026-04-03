#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDir = path.join(process.cwd(), 'src/content/posts');

// Get all MDX files
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));

console.log(`Found ${files.length} files. Processing...`);

let updated = 0;
let skipped = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(fileContent);

  // Check if published already exists
  if (parsed.data.published !== undefined) {
    console.log(`⏭️  ${file} - published flag already exists`);
    skipped++;
    return;
  }

  // Add published flag
  parsed.data.published = true;

  // Reconstruct file content
  const newContent = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ ${file}`);
  updated++;
});

console.log(`\n✨ Complete: ${updated} updated, ${skipped} skipped`);
