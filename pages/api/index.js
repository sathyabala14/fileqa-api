import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import unzipper from 'unzipper';
import csv from 'csv-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

function findCsvFileRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    console.log('Checking:', fullPath);
    if (entry.isDirectory()) {
      const found = findCsvFileRecursive(fullPath);
      if (found) return found;
    } else if (entry.name.toLowerCase().endsWith('.csv')) {
      console.log('Found CSV:', fullPath);
      return fullPath;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    const question = fields.question;
    const file = files.file;

    if (!question || !file) {
      return res.status(400).json({ error: 'Missing question or file' });
    }

    const zipPath = file.filepath || file.path;
    if (!zipPath) {
      return res.status(400).json({ error: 'Uploaded file path is missing.' });
    }
    const dir = fs.mkdtempSync(path.join('/tmp', 'unzipped-'));

    let answer = '';

    try {
      console.log('Zip path:', zipPath);
      console.log('Unzipping to:', dir);

      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: dir }))
        .promise();

      const allFiles = fs.readdirSync(dir);
      console.log('Files after unzip:', allFiles);

      const csvPath = findCsvFileRecursive(dir);

      if (!csvPath) {
        return res.status(400).json({ error: 'No CSV file found in zip.' });
      }

      console.log('CSV path to read:', csvPath);

      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            if (row.answer) {
              answer = row.answer;
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (!answer) {
        return res.status(400).json({ error: 'Answer column not found or empty.' });
      }

      return res.status(200).json({ answer });
    } catch (err) {
      console.error('Processing error:', err);
      return res.status(500).json({ error: 'Error processing file' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

