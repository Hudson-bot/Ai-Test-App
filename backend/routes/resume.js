const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const { generateQuestionsFromSkills } = require('../services/openRouter');

const router = express.Router();
const upload = multer();

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const githubLink = req.body.githubLink;
    const pdfText = await pdfParse(req.file.buffer);
    const resumeText = pdfText.text;

    // Extract skills (simple regex or smarter logic)
    const skills = extractSkillsFromText(resumeText);

    // Now call your question generator logic
    const questions = await generateQuestionsFromSkills(githubLink, skills);

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process resume.' });
  }
});

// Basic skill extraction
function extractSkillsFromText(text) {
  const knownSkills = ['JavaScript', 'React', 'Node.js', 'Python', 'HTML', 'CSS', 'MongoDB', 'Express', 'Machine Learning'];
  return knownSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));
}

module.exports = router;
