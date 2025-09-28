"use client";
import { useEffect, useState } from "react";

// Define proper types
interface Option {
  OP_ID: number;
  OP_NAME: string;
}

interface QuestionItem {
  Q_ID: string;
  Q_NAME: string;
  Q_ANS: string;
  childItems: Option[];
}

export default function Home() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Enhanced safe JSON parser
  function safeJSONParse(jsonString: string): { items: QuestionItem[] } {
    try {
      return JSON.parse(jsonString);
    } catch {
      // Automatic fix attempts
      const fixAttempts = [
        (str: string) => str.replace(/: \"([^\"]*?)\"([^\"]*?)\"/g, ': "$1\\"$2"'),
        (str: string) => str.replace(/^\uFEFF/, '').trim(),
        (str: string) =>
          str.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) =>
            match.includes('"') && !match.includes('\\"') ? match.replace(/([^\\])"/g, '$1\\"') : match
          ),
      ];

      for (let i = 0; i < fixAttempts.length; i++) {
        try {
          const fixed = fixAttempts[i](jsonString);
          const result = JSON.parse(fixed);
          return result;
        } catch {}
      }

      // Fallback manual parsing
      return manualJSONParse(jsonString);
    }
  }

  // Manual JSON parser as last resort
  function manualJSONParse(text: string): { items: QuestionItem[] } {
    try {
      const itemsMatch = text.match(/"items"\s*:\s*\[(.*)\]\s*\}/s);
      if (!itemsMatch) return { items: [] };

      const itemsContent = itemsMatch[1];
      const questions: QuestionItem[] = [];

      const questionBlocks = itemsContent.split(/\{"Q_ID"/).slice(1);

      questionBlocks.forEach((block) => {
        const fullBlock = `{"Q_ID"${block}`;
        const qIdMatch = fullBlock.match(/"Q_ID"\s*:\s*"([^"]*)"/);
        const qNameMatch = fullBlock.match(/"Q_NAME"\s*:\s*"([^"]*)"/);
        const qAnsMatch = fullBlock.match(/"Q_ANS"\s*:\s*"([^"]*)"/);

        if (qIdMatch && qNameMatch) {
          const childItems: Option[] = [];

          const childItemsMatch = fullBlock.match(/"childItems"\s*:\s*\[(.*?)\]\s*\}/s);
          if (childItemsMatch) {
            const childItemsContent = childItemsMatch[1];
            const optionRegex = /\{"OP_ID":\s*(\d+),\s*"OP_NAME":\s*"([^"]*)"\}/g;
            let optionMatch;
            while ((optionMatch = optionRegex.exec(childItemsContent)) !== null) {
              childItems.push({
                OP_ID: parseInt(optionMatch[1]),
                OP_NAME: optionMatch[2],
              });
            }
          }

          questions.push({
            Q_ID: qIdMatch[1],
            Q_NAME: qNameMatch[1],
            Q_ANS: qAnsMatch ? qAnsMatch[1] : "",
            childItems,
          });
        }
      });

      return { items: questions };
    } catch {
      return { items: [] };
    }
  }

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setError(null);

        const res = await fetch("https://oracleapex.com/ords/imon/hero/question/");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const text = await res.text();
        const data: { items: QuestionItem[] } = safeJSONParse(text);

        if (data.items && Array.isArray(data.items)) {
          setQuestions(data.items);
        } else {
          setError("No questions found in response");
          setQuestions([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  const handleSelect = (qId: string, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Quiz App</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error: {error}</p>
          <button
            onClick={retryFetch}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading questions...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No questions available.</p>
          {!error && (
            <button
              onClick={retryFetch}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          )}
        </div>
      ) : (
        questions.map((q) => (
          <div key={q.Q_ID} className="mb-6 p-4 border rounded-lg shadow">
            <h2 className="font-semibold mb-3 text-lg">{q.Q_NAME}</h2>

            {q.childItems && q.childItems.length > 0 ? (
              <ul className="space-y-2">
                {q.childItems.map((opt) => (
                  <li key={opt.OP_ID}>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`q-${q.Q_ID}`}
                        value={opt.OP_NAME}
                        checked={selectedAnswers[q.Q_ID] === opt.OP_NAME}
                        onChange={() => handleSelect(q.Q_ID, opt.OP_NAME)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="select-none">{opt.OP_NAME}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-red-500 italic">No options available for this question</p>
            )}

            {selectedAnswers[q.Q_ID] && (
              <p
                className={`mt-3 font-medium ${
                  selectedAnswers[q.Q_ID] === q.Q_ANS ? "text-green-600" : "text-red-600"
                }`}
              >
                {selectedAnswers[q.Q_ID] === q.Q_ANS
                  ? "✅ Correct!"
                  : `❌ Wrong. Correct Answer: ${q.Q_ANS}`}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
