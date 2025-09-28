"use client";
import { useEffect, useState } from "react";
import { Question } from "@/types/question";

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Enhanced safe JSON parser
  function safeJSONParse(jsonString: string) {
    console.log("Original string length:", jsonString.length);
    
    try {
      return JSON.parse(jsonString);
    } catch (firstError) {
      console.log("First parse failed, attempting fixes...");
      
      // Multiple fix attempts
      const fixAttempts = [
        // Attempt 1: Fix unescaped quotes in string values
        (str: string) => str.replace(/: \"([^\"]*?)\"([^\"]*?)\"/g, ': "$1\\"$2"'),
        
        // Attempt 2: Remove any BOM characters and trim
        (str: string) => str.replace(/^\uFEFF/, '').trim(),
        
        // Attempt 3: More comprehensive quote fixing
        (str: string) => {
          return str.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
            // If the content has unescaped quotes, escape them
            if (match.includes('"') && !match.includes('\\"')) {
              const escaped = match.replace(/([^\\])"/g, '$1\\"');
              return escaped;
            }
            return match;
          });
        }
      ];

      for (let i = 0; i < fixAttempts.length; i++) {
        try {
          const fixed = fixAttempts[i](jsonString);
          const result = JSON.parse(fixed);
          console.log(`Fix attempt ${i + 1} succeeded!`);
          return result;
        } catch (e) {
          console.log(`Fix attempt ${i + 1} failed`);
        }
      }
      
      // Final fallback: manual parsing
      console.log("All automatic fixes failed, attempting manual parsing...");
      return manualJSONParse(jsonString);
    }
  }

  // Manual JSON parser as last resort
  function manualJSONParse(text: string) {
    try {
      console.log("Starting manual parsing...");
      
      // Look for the items array pattern
      const itemsMatch = text.match(/"items"\s*:\s*\[(.*)\]\s*\}/s);
      if (!itemsMatch) {
        console.log("No items array found");
        return { items: [] };
      }

      const itemsContent = itemsMatch[1];
      const questions: any[] = [];
      
      // Split by question objects more reliably
      const questionBlocks = itemsContent.split(/\{"Q_ID"/).slice(1);
      console.log(`Found ${questionBlocks.length} question blocks`);
      
      questionBlocks.forEach((block, index) => {
        try {
          // Re-add the Q_ID part we split on
          const fullBlock = `{"Q_ID"${block}`;
          
          // Extract basic question info
          const qIdMatch = fullBlock.match(/"Q_ID"\s*:\s*"([^"]*)"/);
          const qNameMatch = fullBlock.match(/"Q_NAME"\s*:\s*"([^"]*)"/);
          const qAnsMatch = fullBlock.match(/"Q_ANS"\s*:\s*"([^"]*)"/);
          
          if (qIdMatch && qNameMatch) {
            console.log(`Processing question ${index + 1}:`, qNameMatch[1]);
            
            // Extract childItems array
            const childItemsMatch = fullBlock.match(/"childItems"\s*:\s*\[(.*?)\]\s*\}/s);
            let options: any[] = [];
            
            if (childItemsMatch) {
              const childItemsContent = childItemsMatch[1];
              console.log("Child items content:", childItemsContent);
              
              // Extract options using a more robust pattern
              const optionRegex = /\{"OP_ID":\s*(\d+),\s*"OP_NAME":\s*"([^"]*)"\}/g;
              let optionMatch;
              
              while ((optionMatch = optionRegex.exec(childItemsContent)) !== null) {
                options.push({
                  OP_ID: parseInt(optionMatch[1]),
                  OP_NAME: optionMatch[2]
                });
              }
              
              console.log(`Found ${options.length} options for question ${index + 1}`);
            }
            
            // If no options found with the first method, try alternative pattern
            if (options.length === 0) {
              console.log("Trying alternative option parsing...");
              const altOptionRegex = /"OP_ID":\s*(\d+).*?"OP_NAME":\s*"([^"]*)"/gs;
              let altOptionMatch;
              
              while ((altOptionMatch = altOptionRegex.exec(fullBlock)) !== null) {
                options.push({
                  OP_ID: parseInt(altOptionMatch[1]),
                  OP_NAME: altOptionMatch[2]
                });
              }
              console.log(`Found ${options.length} options with alternative method`);
            }
            
            questions.push({
              Q_ID: qIdMatch[1],
              Q_NAME: qNameMatch[1],
              Q_ANS: qAnsMatch ? qAnsMatch[1] : "",
              childItems: options
            });
          }
        } catch (e) {
          console.log(`Error parsing question block ${index}:`, e);
        }
      });
      
      console.log(`Manual parsing complete. Found ${questions.length} questions.`);
      return { items: questions };
    } catch (error) {
      console.error("Manual parsing failed:", error);
      return { items: [] };
    }
  }

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setError(null);
        console.log("Fetching questions...");
        
        const res = await fetch("https://oracleapex.com/ords/imon/hero/question/");
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const text = await res.text();
        console.log("Raw response received, length:", text.length);
        console.log("First 500 chars:", text.substring(0, 500));
        
        const data = safeJSONParse(text);
        console.log("Parsed data structure:", data);
        
        if (data.items && Array.isArray(data.items)) {
          // Log each question with its options to debug
          data.items.forEach((q: Question, index: number) => {
            console.log(`Question ${index + 1}:`, q.Q_NAME);
            console.log(`Options:`, q.childItems);
          });
          
          setQuestions(data.items);
          console.log(`Loaded ${data.items.length} questions`);
        } else {
          setError("No questions found in response");
          setQuestions([]);
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
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
    window.location.reload(); // Simple reload for retry
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
                  selectedAnswers[q.Q_ID] === q.Q_ANS
                    ? "text-green-600"
                    : "text-red-600"
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