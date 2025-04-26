const idealAnswers = {
    javascript: {
        concepts: {
            'What is closure?': 'A closure is a function that has access to variables in its outer lexical scope, even after the outer function has returned. It helps in data privacy and maintaining state.',
            'Explain promises': 'Promises are objects representing eventual completion/failure of an asynchronous operation. They have states (pending, fulfilled, rejected) and methods like .then() and .catch() for handling results.',
            'What is event bubbling?': 'Event bubbling is the process where an event triggers on the deepest target element, then bubbles up through its ancestor elements in the DOM hierarchy.',
        },
        coding: {
            'How to handle async operations?': 'Async operations can be handled using: 1) Promises with .then()/.catch(), 2) async/await syntax, or 3) callbacks. Async/await is the modern preferred approach for cleaner, more readable code.',
            'Explain error handling': 'Error handling in JavaScript uses try/catch blocks. For async code, use .catch() with promises or try/catch with async/await. Always handle both synchronous and asynchronous errors.',
        }
    },
    react: {
        concepts: {
            'What is Virtual DOM?': 'Virtual DOM is a lightweight copy of the actual DOM. React uses it to optimize rendering by comparing virtual DOMs and updating only the necessary parts of the actual DOM.',
            'Explain React hooks': 'Hooks are functions that allow using state and lifecycle features in functional components. Common hooks include useState, useEffect, useContext, and useRef.',
        }
    }
};

function getIdealAnswer(question) {
    // Search through all categories
    for (const category of Object.values(idealAnswers)) {
        for (const subcategory of Object.values(category)) {
            for (const [key, value] of Object.entries(subcategory)) {
                if (isQuestionSimilar(key, question)) {
                    return value;
                }
            }
        }
    }
    return null;
}

function isQuestionSimilar(storedQuestion, askedQuestion) {
    // Convert both questions to lowercase and remove punctuation
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '');
    const stored = normalize(storedQuestion);
    const asked = normalize(askedQuestion);
    
    // Check if questions are similar enough
    return stored.includes(asked) || asked.includes(stored);
}

// Cache for dynamically generated QA pairs
const dynamicAnswersCache = new Map();

function storeGeneratedQA(question, answer) {
    dynamicAnswersCache.set(question.toLowerCase(), answer);
}

function getStoredAnswer(question) {
    // First check dynamic cache
    const cachedAnswer = dynamicAnswersCache.get(question.toLowerCase());
    if (cachedAnswer) return cachedAnswer;

    // Then check predefined answers
    return getIdealAnswer(question);
}

function clearCache() {
    dynamicAnswersCache.clear();
}

module.exports = {
    getIdealAnswer,
    idealAnswers,
    storeGeneratedQA,
    getStoredAnswer,
    clearCache
};
