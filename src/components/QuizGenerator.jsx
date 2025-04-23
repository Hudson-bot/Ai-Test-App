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
  const recognitionRef = useRef(null);

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

      if (!data.questions) {
        throw new Error('No questions received from server');
      }

      const qArray = data.questions
        .split('\n')
        .filter((q) => q.trim().length > 3);

      if (qArray.length === 0) {
        throw new Error('No valid questions generated');
      }

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
    speechSynthesis.cancel(); // stop previous speech
    speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(interim);

      if (finalTranscript) {
        setResponses((prev) => [...prev, finalTranscript]);
        setLiveTranscript('');
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setResponses((prev) => [...prev, '[Could not understand response]']);
      setLiveTranscript('');
    };

    recognition.onend = () => {
      if (!finalTranscript) {
        setResponses((prev) => [...prev, '[Could not understand response]']);
        setLiveTranscript('');
      }

      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 1000);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  useEffect(() => {
    if (quizStarted && currentQuestionIndex < questions.length) {
      const q = questions[currentQuestionIndex];
      speak(q);
      setTimeout(startListening, 3000);
    }
  }, [currentQuestionIndex, quizStarted]);

  const renderQuizSection = () => {
    if (currentQuestionIndex >= questions.length) {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-2">Quiz Completed 🎉</h2>
          {questions.map((q, i) => (
            <div key={i} className="mb-4">
              <p className="font-bold">{q}</p>
              <p className="text-sm text-gray-700">Your Answer: {responses[i]}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-lg font-bold mb-2">Question {currentQuestionIndex + 1}</h2>
        <p className="mb-2">{questions[currentQuestionIndex]}</p>
        <p className="text-sm text-gray-500 italic mb-1">Listening for your answer...</p>
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
