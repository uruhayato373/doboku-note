#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDir = path.join(process.cwd(), 'src/content/posts');

// Get all MDX files
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));

console.log(`Found ${files.length} files. Processing...`);

let updated = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(fileContent);

  if (!parsed.data.subCategory) {
    return; // Skip if no subCategory
  }

  // Move subCategory to tags
  const subCat = parsed.data.subCategory;
  const existingTags = parsed.data.tags || [];

  // Add subCategory as a tag if not already present
  if (!existingTags.includes(subCat)) {
    parsed.data.tags = [subCat, ...existingTags];
  }

  // Remove subCategory field
  delete parsed.data.subCategory;

  // Reconstruct file content
  const newContent = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ ${file}`);
  updated++;
});

console.log(`\n✨ Complete: ${updated} updated`);
