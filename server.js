import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Path to the JSON file that will store PDF metadata
const DB_FILE_PATH = path.join(__dirname, 'db', 'pdfs.json');

// Ensure the db directory exists
if (!fs.existsSync(path.join(__dirname, 'db'))) {
  fs.mkdirSync(path.join(__dirname, 'db'));
}

// Initialize the database file if it doesn't exist
if (!fs.existsSync(DB_FILE_PATH)) {
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify({ pdfs: [] }));
}

// Helper function to read the database
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { pdfs: [] };
  }
}

// Helper function to write to the database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

// API endpoint to handle file uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Get metadata from request body
    const { title, category, description } = req.body;
    
    // Create PDF metadata object
    const pdfData = {
      id: Date.now().toString(),
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      title: title || req.file.originalname.replace('.pdf', ''),
      category: category || 'Uncategorized',
      description: description || '',
      uploadDate: new Date().toISOString(),
      sources: 1
    };

    // Read current database
    const db = readDB();
    
    // Add new PDF to the database
    db.pdfs.push(pdfData);
    
    // Write updated database back to file
    writeDB(db);

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: 'Server error processing the upload' });
  }
});

// API endpoint to get all PDFs
app.get('/api/pdfs', (req, res) => {
  try {
    const db = readDB();
    res.status(200).json(db.pdfs);
  } catch (error) {
    console.error('Error retrieving PDFs:', error);
    res.status(500).json({ error: 'Server error retrieving PDFs' });
  }
});

// API endpoint to get a single PDF by ID
app.get('/api/pdfs/:id', (req, res) => {
  try {
    const db = readDB();
    const pdf = db.pdfs.find(p => p.id === req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    res.status(200).json(pdf);
  } catch (error) {
    console.error('Error retrieving PDF:', error);
    res.status(500).json({ error: 'Server error retrieving PDF' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
}); 