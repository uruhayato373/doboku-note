#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.join(__dirname, '..', '.claude', 'pdfs');

const pdfs = [
  {
    year: '令和7年度',
    filename: '技術士_令和7年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_3.pdf'
  },
  {
    year: '令和6年度',
    filename: '技術士_令和6年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_4.pdf'
  },
  {
    year: '令和5年度',
    filename: '技術士_令和5年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_5.pdf'
  },
  {
    year: '令和4年度',
    filename: '技術士_令和4年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_6.pdf'
  },
  {
    year: '令和3年度',
    filename: '技術士_令和3年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_7.pdf'
  },
  {
    year: '令和2年度',
    filename: '技術士_令和2年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_8.pdf'
  },
  {
    year: '令和1年度',
    filename: '技術士_令和1年度_択一試験_正答.pdf',
    url: 'https://www.engineer.or.jp/c_topics/003/attached/attach_3935_9.pdf'
  }
];

function downloadFileWithCurl(url, outputPath) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-L',
      '-o', outputPath,
      '-w', '%{http_code}',
      url
    ]);

    let stderr = '';
    let stdout = '';

    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    curl.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0) {
          resolve(stats.size);
        } else {
          reject(new Error('Downloaded file is empty'));
        }
      } else {
        reject(new Error(`curl failed: ${stderr || `exit code ${code}`}`));
      }
    });

    curl.on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadPdfs() {
  // Ensure output directory exists
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    console.log(`Created directory: ${pdfDir}`);
  }

  let successCount = 0;
  let failCount = 0;

  console.log(`\nStarting PDF downloads to: ${pdfDir}\n`);

  for (let i = 0; i < pdfs.length; i++) {
    const pdf = pdfs[i];
    const filePath = path.join(pdfDir, pdf.filename);
    const progress = `[${i + 1}/${pdfs.length}]`;

    try {
      console.log(`${progress} Downloading ${pdf.year}...`);

      const fileSize = await downloadFileWithCurl(pdf.url, filePath);
      const sizeKB = (fileSize / 1024).toFixed(2);
      console.log(`${progress} ✓ Downloaded: ${pdf.filename} (${sizeKB} KB)`);

      successCount++;
    } catch (error) {
      console.error(`${progress} ✗ Error downloading ${pdf.year}:`);
      console.error(`    URL: ${pdf.url}`);
      console.error(`    Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Download complete: ${successCount}/${pdfs.length} successful`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  if (failCount === 0) {
    console.log('All PDFs downloaded successfully!');
    process.exit(0);
  } else {
    console.log(`${failCount} PDF(s) failed to download.`);
    process.exit(1);
  }
}

downloadPdfs();
