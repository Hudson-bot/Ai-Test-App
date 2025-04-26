const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');
const { storeGeneratedQA, getStoredAnswer } = require('../services/idealAnswers');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

router.post('/score', async (req, res) => {
    try {
        const { questions, answers } = req.body;
        
        // Enhanced validation
        if (!Array.isArray(questions) || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Questions and answers must be arrays' });
        }

        if (questions.length === 0 || answers.length === 0) {
            return res.status(400).json({ message: 'Questions and answers cannot be empty' });
        }

        if (questions.length !== answers.length) {
            return res.status(400).json({ message: 'Number of questions and answers must match' });
        }

        const results = [];
        
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i] || !answers[i]) {
                continue; // Skip empty questions or answers
            }

            const completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "You are an expert technical interviewer. Generate an ideal answer and evaluate the candidate's response."
                }, {
                    role: "user",
                    content: `Question: ${questions[i]}\nCandidate's Answer: ${answers[i]}`
                }],
                temperature: 0.7,
                max_tokens: 500
            });

            const response = completion.data.choices[0].message.content;
            const analysis = parseAIResponse(response);
            
            // Store the ideal answer for future reference
            storeGeneratedQA(questions[i], analysis.correctAnswer);

            results.push({
                question: questions[i],
                userAnswer: answers[i],
                analysis
            });
        }

        res.json({ 
            results,
            summary: {
                totalQuestions: questions.length,
                averageScore: results.reduce((acc, curr) => acc + curr.analysis.score, 0) / results.length
            }
        });
    } catch (error) {
        console.error('Scoring error:', error);
        res.status(500).json({ 
            message: 'Error processing scoring request',
            error: error.message 
        });
    }
});

function parseAIResponse(response) {
    // Basic parsing of AI response
    return {
        score: extractScore(response) || 0,
        feedback: extractFeedback(response) || 'No feedback provided',
        correctAnswer: extractAnswer(response) || 'No ideal answer available'
    };
}

function extractScore(text) {
    const scoreMatch = text.match(/\b(?:score:?\s*)?(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\b/i);
    return scoreMatch ? parseFloat(scoreMatch[1]) : 0;
}

function extractFeedback(text) {
    const feedbackMatch = text.match(/feedback:?(.*?)(?:\n|$)/i);
    return feedbackMatch ? feedbackMatch[1].trim() : '';
}

function extractAnswer(text) {
    const answerMatch = text.match(/ideal answer:?(.*?)(?:\n|$)/i);
    return answerMatch ? answerMatch[1].trim() : '';
}

module.exports = router;
