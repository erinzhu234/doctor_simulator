import { useState, useRef, useEffect } from "react";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [diagnosisComplete, setDiagnosisComplete] = useState(false);
  const [resetFlag, setResetFlag] = useState(false);
  
  const [user, setUser] = useState(null);
  const [showCookieNotice, setShowCookieNotice] = useState(false);

  const [inputUsername, setInputUsername] = useState('');

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
    if ((resetFlag || messages.length === 0) && user) {
      startNewPatient().then(() => setResetFlag(false));
    }
  }, [resetFlag, messages.length, user]);

  // Check login status
  useEffect(() => {
    fetch('/api/auth/me', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser({username: data.user});
        else setShowCookieNotice(true);
      });
  }, []);

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
        {user && (
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
              });
              setUser(null);
              setShowCookieNotice(true);
            }}
            className="absolute top-2 right-25 text-xl hover:scale-110 transition"
            title="Logout"
          >
            Log Out
          </button>
        )}
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
            disabled={!user}
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

      {showCookieNotice && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 text-center text-sm flex flex-col items-center gap-2">
          <span>This app uses cookies for simulation.</span>
          <input
            className="p-2 rounded bg-gray-700 text-white"
            placeholder="Enter Doctor ID"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <button
            onClick={async () => {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: inputUsername }),
              });
              const data = await res.json();

              if(data.success) {
                setShowCookieNotice(false);
                window.location.reload();
              } else {
                alert("Login failed. Try again. ")
              }
            }}
            className="bg-green-600 px-3 py-1 rounded hover:bg-green-500"
          >
            Accept & Login
          </button>
        </div>
      )}
    </div>
  );
}
