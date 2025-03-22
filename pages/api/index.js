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

    const zipPath = file.filepath;
    const dir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-'));

    let answer = '';

    try {
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: dir }))
        .promise();

      const csvPath = path.join(dir, 'extract.csv');

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

      return res.status(200).json({ answer });
    } catch (e) {
      return res.status(500).json({ error: 'Error processing file' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

