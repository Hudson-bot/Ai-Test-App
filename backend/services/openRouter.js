const axios = require('axios');
require('dotenv').config();

// 🔹 Function to generate questions from GitHub link and skills
async function generateQuestionsFromSkills(githubLink, skills) {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error('OpenRouter API key is not configured');
        }

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "openai/gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a technical interviewer generating questions based on skills and GitHub profile."
                    },
                    {   
                        role: "user",
                        content: `Generate 5 technical interview questions based on these skills: ${skills.join(', ')} and GitHub profile: ${githubLink}`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': `http://localhost:${process.env.PORT || 5000}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data || !response.data.choices || !response.data.choices[0]) {
            throw new Error('Invalid response from OpenRouter API');
        }

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error('Failed to generate questions: ' + (error.response?.data?.error?.message || error.message));
    }
}

// 🔹 Function to analyze user answer to a question
async function analyzeAnswer(question, answer) {
    const prompt = `
You are a technical interviewer.
Analyze the following response to the given technical question and provide brief feedback.

Question: "${question}"
Answer: "${answer}"

Give a score out of 10 and a short explanation why.
    `;

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': `http://localhost:${process.env.PORT || 5000}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('OpenRouter feedback error:', error.response?.data || error.message);
        throw new Error('Failed to analyze response');
    }
}

module.exports = {
    generateQuestionsFromSkills,
    analyzeAnswer
};
