import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState("synthesis"); // "synthesis", "library", "history", "settings"
  
  // --- CORE SYNTHESIS STATE ---
  const [text, setText] = useState(
    "Welcome to Vocalize AI. Adjust the tuning parameters on the right, select a voice model, and click Generate to synthesize natural, human-like speech. Watch the words highlight in real-time as they are spoken."
  );
  const [selectedModel, setSelectedModel] = useState("neural"); // "neural", "standard", "polyglot"
  const [remainingCredits, setRemainingCredits] = useState(9352);
  const [charLimit] = useState(1000);

  // Voice selection & filtering
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  // Advanced Tuning Parameters
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [stability, setStability] = useState(75); // Mock AI voice stability (0-100)
  const [clarity, setClarity] = useState(85); // Mock AI voice clarity/artifacting (0-100)

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Word highlighting & parsing
  const [tokens, setTokens] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // History list
  const [history, setHistory] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // Settings Mock States
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [sampleRate, setSampleRate] = useState("44.1khz");

  // --- REFS ---
  const synth = window.speechSynthesis;
  const canvasRef = useRef(null);
  const highlightContainerRef = useRef(null);
  const utteranceRef = useRef(null);

  // --- MOCK VOICE METADATA ---
  const getVoiceDetails = (name) => {
    // Map gender and accent categories based on names for a realistic dashboard
    const lowerName = name.toLowerCase();
    let gender = "Female";
    let accent = "🇺🇸 US";
    let style = "Narrative";
    let age = "Adult";

    if (lowerName.includes("david") || lowerName.includes("guy") || lowerName.includes("george") || lowerName.includes("ravi") || lowerName.includes("mark") || lowerName.includes("male") || lowerName.includes("zero")) {
      gender = "Male";
    }

    if (lowerName.includes("microsoft") || lowerName.includes("desktop")) {
      style = "Standard";
    } else if (lowerName.includes("google") || lowerName.includes("natural")) {
      style = "Conversational";
    }

    if (lowerName.includes("uk") || lowerName.includes("great britain") || lowerName.includes("hazel")) {
      accent = "🇬🇧 UK";
      style = "British Accent";
    } else if (lowerName.includes("india") || lowerName.includes("heera") || lowerName.includes("ravi") || lowerName.includes("sam") || lowerName.includes("in")) {
      accent = "🇮🇳 IN";
      style = "Indian Accent";
    } else if (lowerName.includes("spain") || lowerName.includes("helena") || lowerName.includes("es-")) {
      accent = "🇪🇸 ES";
      style = "Spanish Accent";
    } else if (lowerName.includes("france") || lowerName.includes("hortense") || lowerName.includes("fr-")) {
      accent = "🇫🇷 FR";
      style = "French Accent";
    } else if (lowerName.includes("germany") || lowerName.includes("stefan") || lowerName.includes("de-")) {
      accent = "🇩🇪 DE";
      style = "German Accent";
    }

    if (lowerName.includes("child") || lowerName.includes("kid")) {
      age = "Child";
    }

    return { gender, accent, style, age };
  };

  // --- PRESETS ---
  const PRESETS = [
    {
      label: "📢 Voice Intro",
      text: "Welcome to Vocalize AI. Adjust the tuning parameters on the right, select a voice model, and click Generate to synthesize natural, human-like speech. Watch the words highlight in real-time as they are spoken."
    },
    {
      label: "📈 Marketing Demo",
      text: "Introducing the next generation of neural audio generation. Our state-of-the-art voice models capture emotional depth, inflection, and natural phrasing. Perfect for audiobooks, video voiceovers, and dynamic advertisements. Upgrade today and start creating."
    },
    {
      label: "🦊 pangram test",
      text: "The quick brown fox jumps over the lazy dog. This sentence contains every letter in the alphabet and is useful for testing phonetic synthesis modules."
    }
  ];

  // Show toast feedback
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- COMPONENT MOUNT / VOICE LOAD ---
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = synth.getVoices();
      // Sort voices alphabetically
      const sortedVoices = [...allVoices].sort((a, b) =>
        a.lang.localeCompare(b.lang)
      );
      setVoices(sortedVoices);

      // Select default voice
      if (sortedVoices.length > 0 && !selectedVoiceName) {
        const defaultVoice =
          sortedVoices.find(
            v => v.lang.startsWith("en-US") || v.lang.startsWith("en-") || v.default
          ) || sortedVoices[0];
        setSelectedVoiceName(defaultVoice.name);
      }
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    // Load history
    const savedHistory = localStorage.getItem("vocalize_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      synth.cancel();
    };
  }, [synth, selectedVoiceName]);

  // --- AUDIO VISUALIZER ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== "synthesis") return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let time = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, width, height);

      const active = isPlaying && !isPaused;
      
      // Calculate dynamic parameters based on tuning settings
      const speedScale = active ? (rate * 0.18) : 0.015;
      const ampScale = active ? (volume * 18) : 3;
      const frequency = active ? (pitch * 0.015) : 0.007;

      // Draw background wave (violet-900 glow)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x++) {
        const y =
          height / 2 +
          Math.sin(x * frequency * 0.7 + time * speedScale) * ampScale * 0.8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw midground wave (pink-500 transparency)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(236, 72, 153, 0.25)";
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x++) {
        const y =
          height / 2 +
          Math.sin(x * frequency * 1.1 - time * speedScale * 0.9) * ampScale * 0.9;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw active foreground wave (violet-400 glowing line)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(167, 139, 250, 0.5)";
      ctx.shadowBlur = active ? 12 : 2;
      for (let x = 0; x < width; x++) {
        const y =
          height / 2 +
          Math.sin(x * frequency + time * speedScale * 1.2) * ampScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      time++;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isPlaying, isPaused, rate, pitch, volume, activeTab]);

  // --- AUTO SCROLLING ACTIVE WORD ---
  useEffect(() => {
    if (currentWordIndex !== -1 && highlightContainerRef.current) {
      const activeSpan = highlightContainerRef.current.querySelector(
        '[data-active="true"]'
      );
      if (activeSpan) {
        activeSpan.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  }, [currentWordIndex]);

  // --- WORD PARSING LOGIC ---
  const parseTokens = (textToParse) => {
    const regex = /(\s+|[^\s\w]+|\w+)/g;
    const parts = textToParse.match(regex) || [];
    let charCount = 0;
    return parts.map((part) => {
      const start = charCount;
      const end = charCount + part.length;
      charCount = end;
      const isWord = /\w+/.test(part);
      return { text: part, start, end, isWord };
    });
  };

  // --- PLAYBACK FUNCTIONS ---
  const handleSpeak = () => {
    if (!text.trim()) {
      showToast("Workspace text is empty.", "error");
      return;
    }

    synth.cancel();

    const parsedTokens = parseTokens(text);
    setTokens(parsedTokens);
    setCurrentWordIndex(-1);

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voiceObj = voices.find(v => v.name === selectedVoiceName);
    if (voiceObj) utterance.voice = voiceObj;

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = isMuted ? 0 : volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
      
      // Deduct characters from quota (mocking SaaS credits)
      const cost = text.length;
      setRemainingCredits((prev) => Math.max(0, prev - cost));

      // Save item to history
      saveToHistory({
        id: Date.now(),
        text: text.length > 90 ? text.substring(0, 90) + "..." : text,
        fullText: text,
        voiceName: voiceObj ? voiceObj.name : "System Default",
        voiceLang: voiceObj ? voiceObj.lang : "",
        model: selectedModel === "neural" ? "Neural HD" : selectedModel === "polyglot" ? "Polyglot" : "Standard",
        timestamp: new Date().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      });
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted") {
        console.error("Speech Synthesis Error:", e);
        showToast("Speech synthesis error.", "error");
      }
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
      setIsPlaying(true);
    };

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIndex = event.charIndex;
        const matchIdx = parsedTokens.findIndex(
          t => t.start <= charIndex && charIndex < t.end
        );
        if (matchIdx !== -1) {
          setCurrentWordIndex(matchIdx);
        }
      }
    };

    synth.speak(utterance);
  };

  const handlePause = () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (synth.paused) {
      synth.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    synth.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  };

  // --- WORKSPACE ACTIONS ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target.result);
        showToast("Workspace text loaded!", "success");
      };
      reader.readAsText(file);
    } else {
      showToast("Supports UTF-8 text (.txt) files only.", "error");
    }
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target.result);
        showToast("File text loaded!", "success");
      };
      reader.readAsText(file);
    } else {
      showToast("Only .txt files are supported.", "error");
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    showToast("Text copied to clipboard!", "success");
  };

  const handlePasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        showToast("Pasted from clipboard!", "success");
      }
    } catch (err) {
      showToast("Unable to read clipboard.", "error");
    }
  };

  const handleClearText = () => {
    setText("");
    handleStop();
    showToast("Workspace cleared.", "info");
  };

  const handlePresetSelect = (presetText) => {
    setText(presetText);
    handleStop();
    showToast("Preset text inserted.", "success");
  };

  // --- HISTORY STORAGE ---
  const saveToHistory = (newItem) => {
    setHistory((prev) => {
      const filtered = prev.filter(item => item.fullText !== newItem.fullText);
      const updated = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem("vocalize_history", JSON.stringify(updated));
      return updated;
    });
  };

  const handleHistorySelect = (item) => {
    setText(item.fullText);
    const voiceExists = voices.some(v => v.name === item.voiceName);
    if (voiceExists) {
      setSelectedVoiceName(item.voiceName);
    }
    setActiveTab("synthesis");
    handleStop();
    showToast("History configuration loaded.", "success");
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("vocalize_history");
    showToast("Synthesis history cleared.", "info");
  };

  const handleHistoryDelete = (id, e) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem("vocalize_history", JSON.stringify(updated));
      return updated;
    });
    showToast("History entry deleted.", "info");
  };

  // --- VOICE LIST FILTERS ---
  const filteredVoices = voices.filter((voice) => {
    const matchesSearch =
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.lang.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (languageFilter === "all") return matchesSearch;
    return matchesSearch && voice.lang.toLowerCase().startsWith(languageFilter.toLowerCase());
  });

  const uniqueLanguages = Array.from(
    new Set(voices.map(voice => voice.lang.split("-")[0].split("_")[0]))
  ).sort();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const currentVoiceDetails = selectedVoiceName
    ? getVoiceDetails(selectedVoiceName)
    : { gender: "Female", accent: "🇺🇸 US", style: "Standard", age: "Adult" };

  return (
    <div className="min-h-screen bg-[#04060d] text-slate-200 flex relative overflow-hidden font-sans">
      
      {/* Toast Overlay */}
      {toast.show && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl transition-all duration-300 border ${
            toast.type === "error"
              ? "bg-red-950/80 border-red-500/25 text-red-200"
              : toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/25 text-emerald-200"
              : "bg-purple-950/80 border-purple-500/25 text-purple-200"
          } backdrop-blur-xl flex items-center gap-2`}
        >
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* --- SIDEBAR PANEL (Left Columns) --- */}
      <aside className="w-64 shrink-0 glass-sidebar hidden md:flex flex-col justify-between p-6 z-10">
        <div>
          {/* Dashboard Header */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white text-sm font-black">V</span>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-none">
                Vocalize<span className="text-purple-400 font-normal">.ai</span>
              </h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Speech Synthesis
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("synthesis")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "synthesis"
                  ? "bg-violet-600/15 border border-violet-500/20 text-white shadow-lg shadow-violet-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <span>🎛️</span>
              Synthesis Console
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "library"
                  ? "bg-violet-600/15 border border-violet-500/20 text-white shadow-lg shadow-violet-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <span>📚</span>
              Voice Library
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-violet-600/15 border border-violet-500/20 text-white shadow-lg shadow-violet-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <span>📜</span>
              History & Logs
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-violet-600/15 border border-violet-500/20 text-white shadow-lg shadow-violet-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <span>⚙️</span>
              System Config
            </button>
          </nav>
        </div>

        {/* User Credit Quota Progress Box */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-400">Available Credits</span>
            <span className="text-indigo-300 font-bold">{remainingCredits} Chars</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-violet-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(remainingCredits / 10000) * 100}%` }}
            />
          </div>
          
          <button
            onClick={() => {
              setRemainingCredits(10000);
              showToast("Credits recharged to 10,000 chars!", "success");
            }}
            className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all"
          >
            Upgrade Plan
          </button>
        </div>
      </aside>

      {/* --- MAIN DISPLAY CONTENT (Flex Grow) --- */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-4 md:p-8">
        
        {/* Navigation for Mobile Screens */}
        <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">V</span>
            </div>
            <h2 className="text-sm font-black text-white">Vocalize.ai</h2>
          </div>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="p-1.5 rounded-lg text-xs glass-input"
          >
            <option value="synthesis">Synthesis</option>
            <option value="library">Voice Library</option>
            <option value="history">History Logs</option>
            <option value="settings">Settings</option>
          </select>
        </div>

        {/* Tab Content Display */}

        {/* 1. SYNTHESIS TAB */}
        {activeTab === "synthesis" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
            
            {/* LEFT Workspace column (Col Span 8) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
              
              {/* Workspace Card */}
              <div className="glass-panel glass-panel-glow rounded-3xl p-6 flex flex-col justify-between flex-1 relative overflow-hidden">
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Text Synthesis Workspace</h3>
                      <p className="text-xs text-slate-400">Generate high-fidelity spoken soundscapes</p>
                    </div>

                    <div className="flex gap-3 text-xs text-slate-400 font-medium">
                      <span>{wordCount} words</span>
                      <span>•</span>
                      <span className={`${charCount > charLimit ? "text-red-400 font-bold animate-pulse" : ""}`}>
                        {charCount} / {charLimit} characters
                      </span>
                    </div>
                  </div>

                  {/* Model Cards Selector */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { id: "neural", name: "Vocalize Neural HD", badge: "Expressive" },
                      { id: "standard", name: "Vocalize Standard", badge: "Low Latency" },
                      { id: "polyglot", name: "Vocalize Polyglot", badge: "Multilingual" }
                    ].map((model) => (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          selectedModel === model.id
                            ? "bg-violet-600/10 border-violet-500/40 shadow-lg shadow-violet-500/5 scale-[1.02]"
                            : "bg-slate-950/20 border-white/5 hover:border-white/10 hover:bg-slate-950/40"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            {model.badge}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedModel === model.id ? "bg-violet-400" : "bg-transparent"}`} />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200">{model.name}</h4>
                      </div>
                    ))}
                  </div>

                  {/* Input TextArea or Highlight Presenter */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative rounded-2xl border min-h-[260px] md:min-h-[300px] overflow-hidden flex flex-col transition-all duration-300 ${
                      isDragging
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/5 bg-slate-950/40"
                    }`}
                  >
                    {isDragging && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#05070f]/90 backdrop-blur-sm pointer-events-none">
                        <span className="text-3xl mb-1">📂</span>
                        <p className="text-sm font-bold text-white">Drop File to Import Text</p>
                      </div>
                    )}

                    {isPlaying || isPaused ? (
                      /* Highlight View */
                      <div
                        ref={highlightContainerRef}
                        className="flex-1 p-5 overflow-y-auto leading-relaxed text-slate-300 text-lg max-h-[260px] md:max-h-[300px] outline-none"
                      >
                        {tokens.map((token, idx) => {
                          const isActive = idx === currentWordIndex;
                          return (
                            <span
                              key={idx}
                              data-active={isActive ? "true" : "false"}
                              className={`${
                                isActive
                                  ? "spoken-word-highlight"
                                  : "transition-colors duration-200"
                              } ${token.isWord ? "font-normal" : "opacity-80"}`}
                            >
                              {token.text}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      /* Textarea Input */
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Write or drag-and-drop a text document here..."
                        maxLength={charLimit}
                        className="flex-1 p-5 bg-transparent text-slate-200 placeholder-slate-600 text-lg leading-relaxed border-none focus:outline-none resize-none min-h-[260px] md:min-h-[300px]"
                      />
                    )}
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-2 items-center mt-4">
                    <span className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mr-1">
                      Presets:
                    </span>
                    {PRESETS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handlePresetSelect(p.text)}
                        className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1.2 rounded-lg border border-white/5 transition-all"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Workspace bottom actions bar */}
                <div className="flex flex-wrap justify-between items-center mt-6 pt-4 border-t border-white/5 gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearText}
                      className="bg-slate-900/60 hover:bg-slate-800 hover:text-red-400 text-slate-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/5 transition-all"
                    >
                      🗑️ Clear
                    </button>
                    <button
                      onClick={handleCopyText}
                      className="bg-slate-900/60 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/5 transition-all"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={handlePasteText}
                      className="bg-slate-900/60 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/5 transition-all"
                    >
                      📥 Paste
                    </button>
                  </div>

                  <label className="bg-slate-900/60 hover:bg-slate-800 text-slate-200 px-4 py-1.5 rounded-xl text-xs font-bold border border-white/5 cursor-pointer flex items-center gap-1.5 transition-all select-none">
                    📤 Upload Text
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

              </div>

              {/* UNIFIED CONTROLLER PANEL */}
              <div className="glass-panel rounded-3xl p-5 flex items-center justify-between gap-6">
                
                {/* Generation Time Meta Info */}
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                    Synthesizer status
                  </span>
                  <p className="text-xs font-bold text-slate-300 mt-0.5">
                    {isPlaying ? "Generating Audio..." : isPaused ? "Playback Paused" : "Engine Ready"}
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center gap-3 mx-auto sm:mx-0">
                  <button
                    onClick={handleStop}
                    disabled={!isPlaying && !isPaused}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                      isPlaying || isPaused
                        ? "bg-slate-900 border-white/5 text-red-400 hover:bg-slate-800"
                        : "bg-slate-900/20 border-white/5 text-slate-700 cursor-not-allowed"
                    }`}
                  >
                    ⏹️
                  </button>

                  {isPlaying && !isPaused ? (
                    <button
                      onClick={handlePause}
                      className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2"
                    >
                      ⏸️ Pause
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={handleResume}
                      className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 animate-pulse"
                    >
                      ▶️ Resume
                    </button>
                  ) : (
                    <button
                      onClick={handleSpeak}
                      className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-extrabold shadow-xl shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      🔊 Generate Speech
                    </button>
                  )}
                </div>

                {/* Simulated Audio Download Button */}
                <button
                  onClick={() => {
                    if (!text.trim()) return showToast("No audio synthesized to download.", "error");
                    showToast("Downloading synthesized audio (vocalize.mp3)...", "success");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/5 flex items-center gap-2 transition-all"
                >
                  📥 Export WAV
                </button>

              </div>
            </div>

            {/* RIGHT Configuration Column (Col Span 4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Active Voice Card */}
              <div className="glass-panel rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Speaker Profile
                </h3>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/40 border border-white/5">
                  {/* Speaker Graphic Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg relative shrink-0">
                    <span className="text-xl">🎙️</span>
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      {currentVoiceDetails.accent.split(" ")[0]}
                    </span>
                  </div>
                  
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-white truncate">
                      {selectedVoiceName ? selectedVoiceName.split(" ")[1] || selectedVoiceName.split(" ")[0] : "Speaker"}
                    </h4>
                    <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                      <span className="text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded font-bold uppercase">
                        {currentVoiceDetails.gender}
                      </span>
                      <span className="text-[9px] bg-slate-800 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                        {currentVoiceDetails.style}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voice Selection Dropdown list */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Search speakers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="p-2 rounded-xl text-xs glass-input"
                    />
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="p-2 rounded-xl text-xs glass-input"
                    >
                      <option value="all">Languages</option>
                      {uniqueLanguages.map((lang, idx) => (
                        <option key={idx} value={lang}>
                          {lang.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs glass-input max-h-[140px]"
                    disabled={isPlaying || isPaused}
                  >
                    {filteredVoices.length > 0 ? (
                      filteredVoices.map((voice) => (
                        <option key={voice.name} value={voice.name} className="bg-[#0b0f19]">
                          {voice.name} ({voice.lang}) {voice.localService ? "• Offline" : ""}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No matching speakers found
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Voice Tuning Parameters Sliders */}
              <div className="glass-panel rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Voice Tuning Parameter
                </h3>

                {/* Stability Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Stability</span>
                    <span className="font-semibold text-slate-200">{stability}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stability}
                    onChange={(e) => setStability(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    Lower values capture expressive inflections; higher values are steadier.
                  </span>
                </div>

                {/* Clarity Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Clarity & Artifacts</span>
                    <span className="font-semibold text-slate-200">{clarity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={clarity}
                    onChange={(e) => setClarity(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    Enhances speech fidelity. Higher reduces background audio noise.
                  </span>
                </div>

                {/* Speed Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Pace / Speed</span>
                    <span className="font-semibold text-violet-300">{rate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                    disabled={isPlaying || isPaused}
                  />
                </div>

                {/* Pitch Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Vocal Pitch</span>
                    <span className="font-semibold text-violet-300">{pitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                    disabled={isPlaying || isPaused}
                  />
                </div>

                {/* Volume Slider with sound controls */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Output Volume</span>
                    <span className="font-semibold text-violet-300">{isMuted ? "Muted" : `${Math.round(volume * 100)}%`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-xs bg-slate-900 border border-white/5 p-1.5 rounded-xl hover:bg-slate-800"
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-full accent-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Visualizer Waveform Canvas Card */}
              <div className="glass-panel rounded-3xl p-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Neural Waveform Audio
                  </h3>
                  {isPlaying && !isPaused && (
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  )}
                </div>
                <div className="h-16 w-full rounded-2xl overflow-hidden bg-slate-950/60 border border-white/5 relative">
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. VOICE LIBRARY TAB */}
        {activeTab === "library" && (
          <div className="glass-panel glass-panel-glow rounded-3xl p-6 md:p-8 flex-1 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Voice Library</h3>
              <p className="text-xs text-slate-400">Explore and select from available neural speech models</p>
            </div>

            {/* List voices as cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[480px] pr-2">
              {voices.map((voice) => {
                const details = getVoiceDetails(voice.name);
                const isSelected = selectedVoiceName === voice.name;
                return (
                  <div
                    key={voice.name}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-violet-600/10 border-violet-500/40 shadow-lg shadow-violet-500/5"
                        : "bg-slate-950/20 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎙️</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 leading-none">
                            {voice.name.split(" ")[1] || voice.name.split(" ")[0]}
                          </h4>
                          <span className="text-[10px] text-slate-500 block mt-1">{voice.lang}</span>
                        </div>
                      </div>
                      <span className="text-sm">{details.accent.split(" ")[0]}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                        {details.gender}
                      </span>
                      <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded font-semibold">
                        {details.style}
                      </span>
                      <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded font-semibold">
                        {details.age}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedVoiceName(voice.name);
                        showToast(`Activated ${voice.name} speaker profile`, "success");
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-violet-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                      }`}
                    >
                      {isSelected ? "Active Profile" : "Use Speaker Voice"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. HISTORY TAB */}
        {activeTab === "history" && (
          <div className="glass-panel glass-panel-glow rounded-3xl p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">Synthesis History</h3>
                  <p className="text-xs text-slate-400">View and play previously synthesized sound logs</p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-red-400 font-bold hover:underline"
                  >
                    Clear All Logs
                  </button>
                )}
              </div>
            </div>

            {/* History Table/List */}
            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-2">
              {history.length > 0 ? (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className="p-4 rounded-2xl bg-slate-950/30 hover:bg-slate-950/60 border border-white/5 hover:border-white/10 cursor-pointer flex justify-between items-center transition-all duration-200"
                  >
                    <div className="overflow-hidden flex-1 pr-4">
                      <p className="text-sm text-slate-200 font-semibold truncate mb-1">
                        {item.text}
                      </p>
                      <div className="flex gap-2 text-[10px] text-slate-500 font-medium items-center">
                        <span className="text-violet-400">{item.voiceName}</span>
                        <span>•</span>
                        <span>{item.model}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.fullText);
                          showToast("Copied history text!", "success");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 p-2 rounded-xl text-xs border border-white/5"
                        title="Copy text"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => handleHistoryDelete(item.id, e)}
                        className="bg-slate-900 hover:bg-slate-800 p-2 rounded-xl text-xs border border-white/5 text-red-400"
                        title="Delete log"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl">
                  <span className="text-3xl mb-1">📜</span>
                  <p className="text-xs text-slate-500 italic">No speech logs generated yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="glass-panel glass-panel-glow rounded-3xl p-6 md:p-8 flex-1 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white">System Settings</h3>
              <p className="text-xs text-slate-400">Configure export details and playback environments</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[460px] overflow-y-auto pr-2">
              {/* Card 1: Format Preferences */}
              <div className="p-5 rounded-2xl bg-slate-950/20 border border-white/5 space-y-4">
                <h4 className="text-sm font-bold text-indigo-300">Format & Output Parameters</h4>
                
                {/* Audio Format Option */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block">Default Export Format</label>
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs glass-input"
                  >
                    <option value="mp3">MPEG Audio Layer III (.mp3)</option>
                    <option value="wav">Waveform Audio File Format (.wav)</option>
                    <option value="ogg">Ogg Vorbis Audio (.ogg)</option>
                  </select>
                </div>

                {/* Sample Rate */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block">Sampling Frequency</label>
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs glass-input"
                  >
                    <option value="22.05khz">22.05 kHz (Low bandwidth)</option>
                    <option value="44.1khz">44.10 kHz (CD Quality HD)</option>
                    <option value="48khz">48.00 kHz (Studio master quality)</option>
                  </select>
                </div>
              </div>

              {/* Card 2: Quota details */}
              <div className="p-5 rounded-2xl bg-slate-950/20 border border-white/5 space-y-4">
                <h4 className="text-sm font-bold text-indigo-300">Account Subscription Status</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current Plan</span>
                    <span className="text-white font-bold bg-violet-600/20 px-2 py-0.5 rounded border border-violet-500/20">
                      Standard Trial
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Reset Date</span>
                    <span className="text-slate-300">Monthly renewal in 10 days</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total usage</span>
                    <span className="text-slate-300">648 / 10,000 characters used</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => {
                      setRemainingCredits(10000);
                      showToast("Plan upgraded successfully!", "success");
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                  >
                    Change subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
