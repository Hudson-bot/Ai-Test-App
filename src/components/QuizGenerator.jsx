import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function QuizGenerator() {
  const [url, setUrl] = useState('');
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!resume || !url) {
      alert('Please provide both GitHub URL and resume file.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('githubLink', url);

    try {
      const { data } = await axios.post('http://localhost:5000/api/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!data.questions) throw new Error('No questions received from server');

      const qArray = data.questions
        .split('\n')
        .filter((q) => q.trim().length > 3);

      if (qArray.length === 0) throw new Error('No valid questions generated');

      setQuestions(qArray);
      setQuizStarted(true);
    } catch (err) {
      console.error('Error generating questions:', err);
      alert(`Failed to generate questions: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setTimeout(startListening, 1000); // Start listening 1 second after speaking ends
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }

    setIsListening(true);
    setTimeLeft(60);

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = transcript;
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(interim || finalTranscript);
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion(finalTranscript);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleNextQuestion = (transcript = '') => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Save response
    setResponses((prev) => [...prev, transcript || liveTranscript || '[No answer provided]']);
    setLiveTranscript('');
    setIsListening(false);
    
    // Move to next question
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  useEffect(() => {
    if (quizStarted && currentQuestionIndex < questions.length) {
      const q = questions[currentQuestionIndex];
      speak(q);
    }

    if (quizStarted && currentQuestionIndex === questions.length) {
      // All questions done – submit for scoring
      scoreResponses();
    }
  }, [currentQuestionIndex, quizStarted]);

  const scoreResponses = async () => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/score', {
        questions,
        answers: responses
      });

      if (!data.results) {
        throw new Error('No results received');
      }

      setResults(data.results);
      setShowResults(true);
    } catch (err) {
      console.error('Error scoring quiz:', err);
      alert('Failed to score your answers. Please try again.');
    }
  };

  const renderResults = () => (
    <div>
      <h2 className="text-xl font-bold mb-3">Results & Feedback 🧠</h2>
      {results.map((result, i) => (
        <div key={i} className="mb-4 border p-3 rounded bg-white shadow">
          <p className="font-semibold text-blue-700 mb-1">Q{i + 1}: {result.question}</p>
          <p className="text-gray-700 mb-1">Your Answer: {result.userAnswer}</p>
          <p className="text-green-600 font-medium mb-1">
            Score: {result.analysis.score}/10
          </p>
          <p className="text-sm text-gray-600 mb-1 italic">
            Feedback: {result.analysis.feedback}
          </p>
          <p className="text-sm text-purple-700">
            ✅ Ideal Answer: {result.analysis.correctAnswer}
          </p>
        </div>
      ))}
    </div>
  );

  const renderQuizSection = () => {
    if (currentQuestionIndex >= questions.length) {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-2">Quiz Completed 🎉</h2>
          {showResults ? renderResults() : <p>Analyzing your answers...</p>}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-lg font-bold mb-2">Question {currentQuestionIndex + 1}</h2>
        <p className="mb-2">{questions[currentQuestionIndex]}</p>
        {isSpeaking ? (
          <p className="text-sm text-gray-500 italic mb-1">Please wait while the question is being read...</p>
        ) : (
          <div>
            <p className="text-sm text-gray-500 italic mb-1">
              {isListening ? `Time remaining: ${timeLeft}s` : 'Please speak your answer...'}
            </p>
            {isListening && (
              <button
                onClick={() => handleNextQuestion()}
                className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
              >
                Next Question →
              </button>
            )}
          </div>
        )}
        {liveTranscript && (
          <div className="border p-2 text-gray-800 bg-gray-100 rounded mb-2">
            <p className="text-sm">🗣️ <strong>Live:</strong> {liveTranscript}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">GitHub & Resume Quiz</h1>

      {!quizStarted ? (
        <>
          <input
            className="border p-2 w-full mb-3"
            placeholder="Enter GitHub Repo or Profile URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <input
            type="file"
            accept=".pdf"
            className="border p-2 w-full mb-3"
            onChange={handleFileChange}
          />

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Generating Questions...' : 'Start Quiz'}
          </button>
        </>
      ) : (
        <div>{renderQuizSection()}</div>
      )}
    </div>
  );
}
