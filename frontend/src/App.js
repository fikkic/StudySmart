import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Plus, Layout, ArrowLeft, Check, X } from 'lucide-react';

const API_URL = "http://localhost:8000";

function App() {
  const [view, setView] = useState('home'); // home, create, study
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Состояния для создания
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  // Состояния для тренировки
  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => { fetchDecks(); }, []);

  const fetchDecks = async () => {
    const res = await axios.get(`${API_URL}/decks`);
    setDecks(res.data);
  };

  const handleGenerate = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('text', text);
    fd.append('title', title || "Без названия");
    try {
      await axios.post(`${API_URL}/generate`, fd);
      setText(""); setTitle("");
      fetchDecks();
      setView('home');
    } catch (e) { alert("Ошибка API"); }
    setLoading(false);
  };

  const startStudy = async (deck) => {
    const res = await axios.get(`${API_URL}/decks/${deck.id}`);
    setCards(res.data);
    setCurrentDeck(deck);
    setCardIdx(0);
    setView('study');
  };

  const handleReview = async (known) => {
    await axios.post(`${API_URL}/cards/${cards[cardIdx].id}/review?known=${known}`);
    if (cardIdx < cards.length - 1) {
      setCardIdx(cardIdx + 1);
      setIsFlipped(false);
    } else {
      alert("Колода пройдена!");
      setView('home');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <Brain className="text-indigo-600 w-8 h-8" />
          <h1 className="text-2xl font-bold italic">FlashMind AI</h1>
        </div>
        {view === 'home' && (
          <button onClick={() => setView('create')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition">
            <Plus size={20} /> Создать колоду
          </button>
        )}
      </header>

      {/* View: Home */}
      {view === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map(deck => (
            <div key={deck.id} onClick={() => startStudy(deck)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 cursor-pointer transition">
              <Layout className="text-indigo-500 mb-2" />
              <h3 className="font-bold text-lg">{deck.title}</h3>
              <p className="text-slate-500 text-sm">Создано: {new Date(deck.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* View: Create */}
      {view === 'create' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <button onClick={() => setView('home')} className="flex items-center text-slate-500 mb-6 hover:text-indigo-600">
            <ArrowLeft size={18} /> Назад
          </button>
          <input 
            type="text" placeholder="Название колоды (например: Биология, Глава 1)"
            className="w-full mb-4 p-3 border-b-2 border-slate-100 focus:border-indigo-500 outline-none text-xl font-semibold"
            value={title} onChange={e => setTitle(e.target.value)}
          />
          <textarea 
            placeholder="Вставьте текст лекции или конспекта..."
            className="w-full h-64 p-4 bg-slate-50 rounded-xl mb-4 outline-none focus:ring-2 ring-indigo-100"
            value={text} onChange={e => setText(e.target.value)}
          />
          <button 
            disabled={loading || !text}
            onClick={handleGenerate}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "GigaChat генерирует карточки..." : "Сгенерировать по щелчку пальцев"}
          </button>
        </div>
      )}

      {/* View: Study */}
      {view === 'study' && cards.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md h-80 perspective mb-12">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-full h-full transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
            >
              {/* Front */}
              <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-8 text-center text-2xl font-medium backface-hidden border-b-8 border-indigo-500">
                {cards[cardIdx].question}
              </div>
              {/* Back */}
              <div className="absolute inset-0 bg-indigo-600 text-white rounded-3xl shadow-2xl flex items-center justify-center p-8 text-center text-2xl font-medium backface-hidden rotate-y-180">
                {cards[cardIdx].answer}
              </div>
            </div>
          </div>
          
          <div className="flex gap-8">
            <button onClick={() => handleReview(false)} className="bg-red-100 text-red-600 p-4 rounded-full hover:bg-red-200 transition">
              <X size={32} />
            </button>
            <button onClick={() => handleReview(true)} className="bg-green-100 text-green-600 p-4 rounded-full hover:bg-green-200 transition">
              <Check size={32} />
            </button>
          </div>
          <p className="mt-6 text-slate-400">Карточка {cardIdx + 1} из {cards.length}</p>
        </div>
      )}
    </div>
  );
}

export default App;