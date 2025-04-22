const express = require('express');
const axios = require('axios');
const { generateQuestions } = require('../services/openRouter');

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { githubUrl, skills } = req.body;
  const match = githubUrl.match(/github\.com\/([^\/]+)/);

  if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });

  const username = match[1];
  try {
    const { data: repos } = await axios.get(`https://api.github.com/users/${username}/repos`);
    const questions = await generateQuestions(repos, skills);
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch repos or generate questions' });
  }
});

module.exports = router;
