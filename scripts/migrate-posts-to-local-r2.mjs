#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPostsDir = path.join(root, 'src', 'content', 'posts');
const draftsDir = path.join(root, 'drafts', 'writing');
const destDir = path.join(root, '.local', 'r2', 'posts');

const dryRun = process.argv.includes('--dry-run');
const source = process.argv.find(arg => arg.startsWith('--source='))?.split('=')[1];

console.log(`\n📂 Migrating posts to .local/r2/posts/`);
console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
if (source) console.log(`Source: ${source}`);
console.log('');

const idMap = new Map(); // Track IDs to detect conflicts
const results = { migrated: 0, skipped: 0, conflicts: 0 };

/**
 * Process MDX file and move to new location
 */
function migrateFile(srcPath, fileName, isDraft) {
  const id = fileName.replace(/\.mdx$/, '');

  // Check for conflicts
  if (idMap.has(id)) {
    console.log(`⚠️  CONFLICT: "${id}" exists in both posts and drafts. Using posts version, skipping drafts.`);
    results.conflicts++;
    return;
  }
  idMap.set(id, true);

  const destPostDir = path.join(destDir, id);
  const destPath = path.join(destPostDir, 'article.mdx');

  try {
    let content = fs.readFileSync(srcPath, 'utf8');
    const parsed = matter(content);

    // Ensure published flag
    if (!parsed.data.published) {
      parsed.data.published = isDraft ? false : true;
    }

    // Rewrite image paths: /images/blog/{id}/{file} → /posts/{id}/img/{file}
    const imagePathRegex = /src="\/images\/blog\/([^/]+)\/([^"]+)"/g;
    content = matter.stringify(parsed.content, parsed.data);
    content = content.replace(imagePathRegex, 'src="/posts/$1/img/$2"');

    if (dryRun) {
      console.log(`✅ [DRY-RUN] ${srcPath} → ${destPath}`);
      results.migrated++;
      return;
    }

    // Create directory structure
    fs.mkdirSync(path.join(destPostDir, 'img'), { recursive: true });

    // Write file
    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`✅ ${id}`);
    results.migrated++;
  } catch (err) {
    console.error(`❌ Failed to migrate ${id}: ${err.message}`);
  }
}

/**
 * Main migration logic
 */
function main() {
  if (!fs.existsSync(srcPostsDir) && !fs.existsSync(draftsDir)) {
    console.log('❌ No source directories found');
    return;
  }

  // Create destination directory
  if (!dryRun && !fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Migrate src/content/posts/ first (takes priority)
  if (fs.existsSync(srcPostsDir) && (!source || source === 'posts')) {
    console.log('📄 Migrating src/content/posts/ ...\n');
    const files = fs.readdirSync(srcPostsDir).filter(f => f.endsWith('.mdx'));
    for (const file of files) {
      migrateFile(path.join(srcPostsDir, file), file, false);
    }
  }

  // Migrate drafts/writing/
  if (fs.existsSync(draftsDir) && (!source || source === 'drafts')) {
    console.log('\n📝 Migrating drafts/writing/ ...\n');
    const files = fs.readdirSync(draftsDir).filter(f => f.endsWith('.mdx'));
    for (const file of files) {
      migrateFile(path.join(draftsDir, file), file, true);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Migrated: ${results.migrated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Conflicts: ${results.conflicts}`);
  console.log('='.repeat(60) + '\n');

  if (dryRun) {
    console.log('✨ DRY RUN COMPLETE. No files were actually written.');
    console.log('   Run without --dry-run to execute the migration.\n');
  } else {
    console.log('✨ Migration complete!');
    console.log(`   Total posts in .local/r2/posts/: ${fs.readdirSync(destDir).length}\n`);
  }
}

main();
