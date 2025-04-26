const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateQuestionsFromSkills } = require('./services/openRouter');
const pdfParse = require('pdf-parse');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Multer configuration
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

// Skills database
const SKILLS_DATABASE = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express',
    'Python', 'Java', 'SQL', 'MongoDB', 'Git', 'Docker',
    'AWS', 'REST API', 'GraphQL', 'Data Structures'
];

// Routes
app.post('/api/upload-resume', (req, res) => {
    upload(req, res, async (err) => {
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

            const pdfData = await pdfParse(req.files.resume[0].buffer);
            const skills = SKILLS_DATABASE.filter(skill => {
                const regex = new RegExp(`\\b${skill}\\b`, 'i');
                return regex.test(pdfData.text);
            });

            if (skills.length === 0) {
                return res.status(400).json({
                    error: 'No recognizable skills found in resume'
                });
            }

            const questions = await generateQuestionsFromSkills(req.body.githubLink, skills);
            res.json({ success: true, questions, detectedSkills: skills });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

module.exports = app;
