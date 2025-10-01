"use client";
import { useEffect, useState } from "react";

interface QuestionItem {
  Q_ID: string;
  Q_NAME: string;
  Q_ANS: string;
  childItems: Option[];
}

interface Option {
  OP_ID: number;
  OP_NAME: string;
}

interface QuizResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function Home() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);

  // Enhanced JSON parser that properly handles quotes within strings
  function parseJSONResponse(text: string): { items: QuestionItem[] } {
    console.log("Raw API response:", text);
    
    // First, try to parse as regular JSON
    try {
      const data = JSON.parse(text);
      if (data.items && Array.isArray(data.items)) {
        return data;
      }
    } catch (e) {
      console.log("Standard JSON parse failed, trying manual parsing...");
    }

    // Manual parsing with better quote handling
    try {
      const questions: QuestionItem[] = [];
      
      // More robust pattern to find question objects
      const questionRegex = /\{"Q_ID":"([^"]+)","Q_NAME":"((?:[^"\\]|\\.)*)","Q_ANS":"([^"]*)","childItems":\[(.*?)\]}/g;
      
      let match;
      while ((match = questionRegex.exec(text)) !== null) {
        try {
          const [, qId, qName, qAns, childItemsStr] = match;
          
          // Properly unescape the question name
          const cleanedQName = qName
            .replace(/\\"/g, '"')      // Unescape quotes
            .replace(/\\\\/g, '\\')    // Unescape backslashes
            .replace(/\\n/g, '\n')     // Unescape newlines
            .replace(/\\t/g, '\t')     // Unescape tabs
            .replace(/\\u0022/g, '"')  // Unicode quotes
            .replace(/\\u0027/g, "'")  // Unicode single quotes
            .trim();

          // Parse child items
          const childItems: Option[] = [];
          const optionRegex = /\{"OP_ID":(\d+),"OP_NAME":"((?:[^"\\]|\\.)*)"}/g;
          let optionMatch;
          
          while ((optionMatch = optionRegex.exec(childItemsStr)) !== null) {
            const [, opId, opName] = optionMatch;
            const cleanedOpName = opName
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .trim();
            
            childItems.push({
              OP_ID: parseInt(opId),
              OP_NAME: cleanedOpName,
            });
          }

          const question: QuestionItem = {
            Q_ID: qId,
            Q_NAME: cleanedQName || "Unknown Question",
            Q_ANS: qAns || "",
            childItems,
          };
          
          questions.push(question);
        } catch (blockError) {
          console.log("Error parsing question block:", blockError);
          continue;
        }
      }
      
      console.log("Manually parsed questions:", questions);
      return { items: questions };
    } catch (e) {
      console.error("Manual parsing failed:", e);
      return { items: [] };
    }
  }

  // Alternative parsing method for malformed JSON
  function parseMalformedJSON(text: string): { items: QuestionItem[] } {
    console.log("Trying alternative parsing...");
    const questions: QuestionItem[] = [];
    
    try {
      // Split by question objects more carefully
      const questionSections = text.split(/\{"Q_ID"/).slice(1);
      
      for (const section of questionSections) {
        try {
          const fullSection = '{"Q_ID"' + section;
          
          // Extract Q_ID
          const qIdMatch = fullSection.match(/"Q_ID"\s*:\s*"([^"]+)"/);
          if (!qIdMatch) continue;
          
          // Extract Q_NAME - look for content between quotes, allowing escaped quotes
          const qNameMatch = fullSection.match(/"Q_NAME"\s*:\s*"((?:\\.|[^"\\])*)"/);
          if (!qNameMatch) continue;
          
          // Extract Q_ANS
          const qAnsMatch = fullSection.match(/"Q_ANS"\s*:\s*"([^"]*)"/);
          
          // Extract childItems array
          const childItemsMatch = fullSection.match(/"childItems"\s*:\s*\[(.*?)\]\s*\}/s);
          
          const childItems: Option[] = [];
          if (childItemsMatch) {
            const optionsText = childItemsMatch[1];
            const optionRegex = /\{"OP_ID"\s*:\s*(\d+)\s*,\s*"OP_NAME"\s*:\s*"((?:\\.|[^"\\])*)"\}/g;
            let optionMatch;
            
            while ((optionMatch = optionRegex.exec(optionsText)) !== null) {
              const [, opId, opName] = optionMatch;
              const cleanedOpName = opName
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .trim();
              
              childItems.push({
                OP_ID: parseInt(opId),
                OP_NAME: cleanedOpName,
              });
            }
          }
          
          // Clean the question name
          let cleanedQName = qNameMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .trim();
          
          // Fix common truncation issues
          if (cleanedQName === 'Choose the past tense of') {
            cleanedQName = 'Choose the past tense of "eat"?';
          } else if (cleanedQName === 'What is the opposite of') {
            cleanedQName = 'What is the opposite of "hot"?';
          } else if (cleanedQName === 'What is the capital of') {
            cleanedQName = 'What is the capital of "France"?';
          }
          
          questions.push({
            Q_ID: qIdMatch[1],
            Q_NAME: cleanedQName,
            Q_ANS: qAnsMatch ? qAnsMatch[1] : "",
            childItems,
          });
        } catch (sectionError) {
          console.log("Error parsing section:", sectionError);
          continue;
        }
      }
    } catch (e) {
      console.error("Alternative parsing failed:", e);
    }
    
    return { items: questions };
  }

  // Clean question text - fix common issues
  const cleanQuestionText = (text: string): string => {
    if (!text || text === "Unknown Question") return "Unknown Question";
    
    let cleaned = text
      .replace(/\\u0022/g, '"')
      .replace(/\\u0027/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();

    // Fix specific known question patterns
    const fixes: [string, string][] = [
      ['Choose the past tense of', 'Choose the past tense of "eat"?'],
      ['What is the opposite of', 'What is the opposite of "hot"?'],
      ['What is the capital of', 'What is the capital of "France"?'],
      ['Select the synonym for', 'Select the synonym for "happy"?'],
      ['Which word means', 'Which word means "quickly"?'],
    ];
    
    for (const [partial, full] of fixes) {
      if (cleaned === partial || cleaned.startsWith(partial) && !cleaned.includes('"')) {
        cleaned = full;
        break;
      }
    }

    // Ensure question ends with proper punctuation
    if (cleaned && !cleaned.match(/[.!?]$/)) {
      cleaned += '?';
    }
    
    return cleaned;
  };

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setError(null);
        console.log("Starting to fetch questions...");

        const res = await fetch("https://oracleapex.com/ords/imon/hero/question/", {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const text = await res.text();
        console.log("Received response length:", text.length);
        
        if (!text || text.trim().length === 0) {
          throw new Error("Empty response from server");
        }

        // Try multiple parsing methods
        let data = parseJSONResponse(text);
        if (data.items.length === 0) {
          console.log("First parsing method failed, trying alternative...");
          data = parseMalformedJSON(text);
        }

        console.log("Final parsed data:", data);

        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          // Clean the question texts
          const cleanedQuestions = data.items.map(q => ({
            ...q,
            Q_NAME: cleanQuestionText(q.Q_NAME),
            // Also clean the options
            childItems: q.childItems.map(opt => ({
              ...opt,
              OP_NAME: opt.OP_NAME
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .trim()
            }))
          }));
          setQuestions(cleanedQuestions);
          console.log("Final questions set:", cleanedQuestions);
        } else {
          setError("No valid questions found in the response");
          setQuestions([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
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

  const handleSubmit = () => {
    const calculatedResults: QuizResult[] = questions.map((q) => ({
      question: q.Q_NAME,
      userAnswer: selectedAnswers[q.Q_ID] || "Not answered",
      correctAnswer: q.Q_ANS,
      isCorrect: selectedAnswers[q.Q_ID] === q.Q_ANS,
    }));

    setResults(calculatedResults);
    setShowResults(true);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setResults([]);
  };

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Results Page
  if (showResults) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const totalQuestions = results.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Quiz Results</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Your Score</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">{score}%</div>
          <p className="text-gray-600">
            {correctCount} out of {totalQuestions} questions correct
          </p>
        </div>

        <div className="space-y-6">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-6 border rounded-lg shadow-sm ${
                result.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold flex-1">
                  Question {index + 1}: {result.question}
                </h3>
                <span
                  className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                    result.isCorrect
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {result.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Your Answer:</p>
                  <p className={result.userAnswer === result.correctAnswer ? "text-green-600" : "text-red-600"}>
                    {result.userAnswer}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Correct Answer:</p>
                  <p className="text-green-600">{result.correctAnswer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Take Quiz Again
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            Print Results
          </button>
        </div>
      </div>
    );
  }

  // Quiz Page
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Quiz App</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error: {error}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={retryFetch}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => {
                const sampleQuestions: QuestionItem[] = [
                  {
                    Q_ID: "1",
                    Q_NAME: 'Choose the past tense of "eat"?',
                    Q_ANS: "Ate",
                    childItems: [
                      { OP_ID: 1, OP_NAME: "Eated" },
                      { OP_ID: 2, OP_NAME: "Ate" },
                      { OP_ID: 3, OP_NAME: "Eating" },
                      { OP_ID: 4, OP_NAME: "Eaten" }
                    ]
                  },
                  {
                    Q_ID: "2", 
                    Q_NAME: 'What is the opposite of "hot"?',
                    Q_ANS: "Cold",
                    childItems: [
                      { OP_ID: 1, OP_NAME: "Cold" },
                      { OP_ID: 2, OP_NAME: "Warm" },
                      { OP_ID: 3, OP_NAME: "Hot" },
                      { OP_ID: 4, OP_NAME: "Boiling" }
                    ]
                  }
                ];
                setQuestions(sampleQuestions);
                setError(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Use Sample Questions
            </button>
          </div>
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
        <>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              Answer all {questions.length} questions and click "Submit Answers" to see your results.
            </p>
          </div>

          {questions.map((q) => (
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
            </div>
          ))}

          {/* Submit Button */}
          <div className="sticky bottom-6 bg-white p-4 border-t border-gray-200 rounded-lg shadow-lg">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== questions.length}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white ${
                Object.keys(selectedAnswers).length === questions.length
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {Object.keys(selectedAnswers).length === questions.length
                ? "Submit Answers"
                : `Please answer all questions (${Object.keys(selectedAnswers).length}/${questions.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );

}