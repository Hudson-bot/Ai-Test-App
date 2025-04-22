import { useState } from 'react';
import axios from 'axios';

export default function QuizGenerator() {
  const [url, setUrl] = useState('');
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState('');
  const [loading, setLoading] = useState(false);

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
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setQuestions(data.questions || 'No questions generated.');
    } catch (err) {
      console.error('Error generating questions:', err);
      setQuestions('Failed to generate questions.');
    }

    setLoading(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">GitHub & Resume Quiz Generator</h1>

      <input
        className="border p-2 w-full mb-3"
        placeholder="Enter GitHub Repo or Profile URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
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
        {loading ? 'Generating...' : 'Generate Questions'}
      </button>

      <pre className="mt-4 whitespace-pre-wrap">{questions}</pre>
    </div>
  );
}