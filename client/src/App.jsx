import { useState, useRef, useEffect } from "react";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [diagnosisComplete, setDiagnosisComplete] = useState(false);
  const [resetFlag, setResetFlag] = useState(false);

  const chatRef = useRef(null);

    const startNewPatient = async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: [], isNew: true }), // signal to backend
        });

        const data = await res.json();
        setMessages([{ from: "patient", text: data.reply }]);
      } catch (err) {
        console.error("Initial patient message failed:", err);
      }
    };


  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "doctor", text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedMessages }),
      });

      const data = await res.json();
      const aiReply = { from: "patient", text: data.reply };

      setMessages((prev) => [...prev, aiReply]);
      
      // Check for success keyword
      if (data.correctDiagnosis) {
        setDiagnosisComplete(true);
      }
    } catch (err) {
      console.error("AI reply failed:", err);
    }
  };

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (resetFlag || messages.length === 0) {
      startNewPatient().then(() => setResetFlag(false));
    }
  }, [resetFlag, messages.length]);

  const handleReset = () => {
    setMessages([]);
    setDiagnosisComplete(false);
    setResetFlag(true); // trigger fresh patient message in useEffect
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="p-4 text-lg font-bold border-b border-gray-700 bg-gray-800">
        <span>🩺 Doctor Simulator</span>
         <button
          onClick={handleReset}
          className="absolute top-2 right-4 text-xl hover:scale-110 transition"
          title="Reset conversation"
        >
          🔄
        </button>

      </header>

      {/* Chat body */}
      <main
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.from === "doctor" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg mb-2 break-words whitespace-pre-wrap ${
                msg.from === "doctor"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-green-600 text-white rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

      </main>

      {/* Input area */}
      <footer className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            className="flex-1 p-2 rounded bg-gray-700 text-white outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask a question..."
          />
          <button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            onClick={sendMessage}
          >
            Send
          </button>
          <button
            className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
            title="Mic (coming soon)"
          >
            🎤
          </button>
        </div>

        {/* 🎉 Diagnosis Success Message */}
          {diagnosisComplete && (
            <div className="text-center mt-4">
              <p className="text-green-400 font-bold">🎉 Correct diagnosis!</p>
              <button
                className="mt-2 px-4 py-2 bg-green-700 rounded hover:bg-green-600"
                onClick={handleReset}
              >
                Start New Patient
              </button>
            </div>
          )}
      </footer>
    </div>
  );
}
