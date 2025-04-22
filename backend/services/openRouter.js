const axios = require('axios');

async function generateQuestionsFromSkills(githubLink, skills) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "google/gemini-pro",
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
                    'HTTP-Referer': 'http://localhost:5000',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
}

module.exports = {
    generateQuestionsFromSkills
};