"use client";
import { jsonrepair } from "jsonrepair";
import { useEffect, useState } from "react";

interface Option {
  OP_ID: number;
  OP_NAME: string;
}

interface QuestionItem {
  Q_ID: string;
  Q_NAME: string;
  Q_ANS: string;
  ANS_DESC: string;
  childItems: Option[];
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Fisher-Yates shuffle
  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Fetch and shuffle questions once
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch("https://oracleapex.com/ords/imon/hero/question/");
        const text = await res.text();
        const fixed = jsonrepair(text);
        const data = JSON.parse(fixed);

        // Shuffle questions and their options
        const shuffledQuestions = shuffleArray(data.items || []).map((q: QuestionItem) => ({
          ...q,
          childItems: shuffleArray(q.childItems),
        }));

        setQuestions(shuffledQuestions);
      } catch (err) {
        console.error("❌ JSON repair failed", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  const handleChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    // Validation: ensure all questions are answered
    if (questions.some((q) => !answers[q.Q_ID])) {
      setErrorMsg("⚠️ Please answer all questions before submitting!");
      return;
    }
    setErrorMsg("");
    setSubmitted(true);

    // Scroll to top after submit
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Calculate score
  const score = submitted
    ? questions.filter((q) => answers[q.Q_ID] === q.Q_ANS).length
    : 0;

  const handleRestart = () => {
    const reshuffled = shuffleArray(questions).map((q) => ({
      ...q,
      childItems: shuffleArray(q.childItems),
    }));
    setQuestions(reshuffled);
    setAnswers({});
    setSubmitted(false);
    setErrorMsg("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">MCQ Quiz</h1>

      {submitted && (
        <div className="text-center my-6">
          <h2 className="text-xl font-bold">
            🎯 Your Score: {score} / {questions.length}
          </h2>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading questions...</div>
      ) : (
        <>


          {questions.map((q, index) => (
            <div key={q.Q_ID} className="mb-6 p-4 border rounded-lg shadow-sm">
              <h2 className="font-semibold mb-2">
                {index + 1}. {q.Q_NAME}
              </h2>

              <div className="space-y-2">
                {q.childItems.map((op) => (
                  <label key={op.OP_ID} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.Q_ID}`}
                      value={op.OP_NAME}
                      checked={answers[q.Q_ID] === op.OP_NAME}
                      onChange={(e) => handleChange(q.Q_ID, e.target.value)}
                      disabled={submitted}
                    />
                    <span>{op.OP_NAME}</span>
                  </label>
                ))}
              </div>

              {submitted && (
                <div className="mt-3 p-3 rounded-lg text-sm bg-gray-50 border">
                  {answers[q.Q_ID] === q.Q_ANS ? (
                    <p className="text-green-600 font-medium">✅ Correct! ({q.Q_ANS})</p>
                  ) : (
                    <p className="text-red-600 font-medium">
                      ❌ Wrong. Correct answer is: {q.Q_ANS}
                    </p>
                  )}
                  <p className="mt-1 text-gray-700">{q.ANS_DESC}</p>
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <>
                {errorMsg && (
                <div className="mb-4 p-3 text-red-700 bg-red-100 border rounded">
                  {errorMsg}
                </div>
              )}
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Submit
              </button>

            </>
          ) : (
            <button
              onClick={handleRestart}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Restart Quiz
            </button>
          )}
        </>
      )}
    </div>
  );
}
