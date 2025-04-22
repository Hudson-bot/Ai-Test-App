require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateQuestionsFromSkills } = require('./services/openRouter');
const pdfParse = require('pdf-parse');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Updated Multer configuration with explicit field names
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
}).fields([
  { name: 'resume', maxCount: 1 },   
  { name: 'githubLink', maxCount: 1 }     
]);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Important for form data handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Skill database
const SKILLS_DATABASE = [
  // Frontend
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'HTML', 'CSS', 'SASS',
  // Backend
  'Node.js', 'Express', 'Python', 'Django', 'Flask', 'Java', 'Spring', 'C#', '.NET',
  // Databases
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  // DevOps
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'CI/CD',
  // Other
  'Git', 'REST API', 'GraphQL', 'Machine Learning', 'Data Structures'
];

// Updated route handler
app.post('/api/upload-resume', (req, res) => {
  upload(req, res, async (err) => {
     console.log('Received files:', req.files); // Debug what files were received
    console.log('Received body:', req.body); // Debug what text fields were received
    try {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files?.resume) {
        return res.status(400).json({ error: 'No resume file uploaded' });
      }

      if (!req.body.githubLink) {
        return res.status(400).json({ error: 'GitHub link is required' });
      }

      // Process PDF
      const pdfData = await pdfParse(req.files.resume[0].buffer);

      // Extract skills
      const skills = SKILLS_DATABASE.filter(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, 'i');
        return regex.test(pdfData.text);
      });

      if (skills.length === 0) {
        return res.status(400).json({
          error: 'No recognizable skills found in resume',
          suggestion: 'Try using more standard skill names'
        });
      }

      // Generate questions
      const questions = await generateQuestionsFromSkills(req.body.githubLink, skills);

      res.json({
        success: true,
        questions,
        detectedSkills: skills
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));