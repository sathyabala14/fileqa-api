# File QA API

This app exposes an API endpoint to extract answers from a `.zip` file containing a single `extract.csv`.

## How to Use

**POST** `https://your-app.vercel.app/api/`

### Body (multipart/form-data)
- `question`: A natural language question
- `file`: A `.zip` containing `extract.csv` with an `answer` column

### Sample Request

```bash
curl -X POST "https://your-app.vercel.app/api/" \
  -H "Content-Type: multipart/form-data" \
  -F "question=Download and unzip abcd.zip. What is the value in the 'answer' column of the CSV file?" \
  -F "file=@abcd.zip"
