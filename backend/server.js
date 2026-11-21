/* =====================================================================
   SLIET Question Paper Archive - backend (server.js)

   Endpoints:
     GET    /papers      -> all papers, newest first
     POST   /papers      -> save a new paper (returns 201 + saved paper)
     DELETE /papers/:id  -> delete one paper by its MongoDB _id
   ===================================================================== */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const paperSchema = new mongoose.Schema(
  {
    subject:  { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    examType: { type: String, required: true, enum: ['Minor', 'Major', 'Quiz'] },
    batch:    { type: String, required: true, trim: true },
    level:    { type: String, enum: ['Diploma', 'Degree'], default: 'Diploma' },
    pdfUrl:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Paper = mongoose.model('Paper', paperSchema);

function isValidUrl(text) {
  try {
    const u = new URL(text);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'SLIET Question Paper Archive API is running' });
});

app.get('/papers', async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch papers. Please try again.' });
  }
});

app.post('/papers', async (req, res) => {
  try {
    const body = req.body || {};

    const required = ['subject', 'semester', 'examType', 'batch', 'pdfUrl'];
    const missing = required.filter(
      (field) => body[field] === undefined || String(body[field]).trim() === ''
    );
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }

    if (!isValidUrl(String(body.pdfUrl).trim())) {
      return res.status(400).json({ error: 'pdfUrl must be a valid http:// or https:// link.' });
    }

    const paper = await Paper.create({
      subject:  body.subject,
      semester: body.semester,
      examType: body.examType,
      batch:    body.batch,
      level:    body.level,
      pdfUrl:   body.pdfUrl,
    });

    res.status(201).json(paper);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not save the paper. Please try again.' });
  }
});

app.delete('/papers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Paper not found.' });
    }

    const deleted = await Paper.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Paper not found.' });
    }

    res.json({ message: 'Paper deleted', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete the paper. Please try again.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to your .env file (or Render environment variables).');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
