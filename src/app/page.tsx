"use client";
import { jsonrepair } from "jsonrepair";
import { useEffect, useState } from "react";
import Image from "next/image";
import DeviceInfoComponent from "./components/DeviceInfoComponent";

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
  const [showLoader, setShowLoader] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds

  // Shuffle function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Fetch & shuffle questions
  useEffect(() => {
    const minTime = 4000; // Minimum loader display
    const start = Date.now();

    async function fetchQuestions() {
      try {
        const res = await fetch("https://oracleapex.com/ords/imon/hero/question/");
        const text = await res.text();
        const fixed = jsonrepair(text);
        const data = JSON.parse(fixed);
        const items: QuestionItem[] = (data.items as QuestionItem[]) || [];

        const shuffledQuestions = shuffleArray(items).map((q) => ({
          ...q,
          childItems: shuffleArray(q.childItems),
        }));

        setQuestions(shuffledQuestions);
      } catch (err) {
        console.error("❌ JSON repair failed", err);
        setQuestions([]);
      } finally {
        const elapsed = Date.now() - start;
        const remaining = minTime - elapsed;
        setTimeout(() => setShowLoader(false), remaining > 0 ? remaining : 0);
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  // Timer effect — starts only after loader disappears
  useEffect(() => {
    if (!showLoader && !submitted && questions.length > 0) {
      if (timeLeft <= 0) {
        handleSubmit(true); // auto-submit
        return;
      }
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, showLoader, submitted, questions]);

  const handleChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = (autoSubmit = false) => {
    if (!autoSubmit && questions.some((q) => !answers[q.Q_ID])) {
      setErrorMsg("⚠️ Please answer all questions before submitting!");
      return;
    }
    setErrorMsg("");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    const reshuffled = shuffleArray(questions).map((q) => ({
      ...q,
      childItems: shuffleArray(q.childItems),
    }));
    setQuestions(reshuffled);
    setAnswers({});
    setSubmitted(false);
    setErrorMsg("");
    setTimeLeft(120); // reset timer
    setShowLoader(true);

    // Optional: show loader briefly again
    setTimeout(() => setShowLoader(false), 1000);
  };

  // Calculate score
  const score = submitted
    ? questions.filter((q) => answers[q.Q_ID] === q.Q_ANS).length
    : 0;

  // Format timer as mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">MCQ Quiz</h1>

      {/* Timer */}
      {!submitted && !loading && questions.length > 0 && !showLoader && (
        <div className="text-center mb-4 font-semibold text-lg">
          ⏱ Time Left: {formatTime(timeLeft)}
        </div>
      )}

      {/* Score */}
      {submitted && (
        <div className="text-center my-6">
          <h2 className="text-xl font-bold">
            🎯 Your Score: {score} / {questions.length}
          </h2>
        </div>
      )}

      {/* Loader */}
      {showLoader ? (
        <div className="flex items-center justify-center h-[60vh] text-gray-500">
          <Image src="/loader.gif" alt="Loading..." width={80} height={80} />
        </div>
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
                    <p className="text-green-600 font-medium">
                      ✅ Correct! ({q.Q_ANS})
                    </p>
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

          {/* Buttons */}
          {!submitted ? (
            <>
              {errorMsg && (
                <div className="mb-4 p-3 text-red-700 bg-red-100 border rounded">
                  {errorMsg}
                </div>
              )}
              <button
                onClick={() => handleSubmit(false)}
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
      <DeviceInfoComponent />
    </div>
  );
}
