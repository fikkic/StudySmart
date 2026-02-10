import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Plus, Layout, ArrowLeft, Check, X, User, BarChart3 } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [view, setView] = useState('home'); // home, create, study, profile
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Состояния для создания колоды
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");

  // Состояния для режима теста
  const [cardIdx, setCardIdx] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => { 
    fetchDecks(); 
  }, []);

  const fetchDecks = async () => {
    try {
      const res = await axios.get(`${API_URL}/decks`);
      setDecks(res.data);
    } catch (e) {
      console.error("Ошибка при получении списка колод");
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('text', text);
    fd.append('title', title);
    fd.append('difficulty', difficulty);
    try {
      await axios.post(`${API_URL}/generate`, fd);
      fetchDecks(); 
      setView('home');
      setText(""); setTitle("");
    } catch (e) { 
      alert("Ошибка при генерации теста!"); 
    }
    setLoading(false);
  };

  const startStudy = async (deck) => {
    try {
      const res = await axios.get(`${API_URL}/decks/${deck.id}`);
      setCards(res.data);
      setCardIdx(0); 
      setIsAnswered(false); 
      setSelectedOption(null);
      setView('study');
    } catch (e) {
      alert("Не удалось загрузить вопросы");
    }
  };

  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    
    // Проверка на правильность (сравниваем текст или букву)
    const isCorrect = option === cards[cardIdx].correct;
    
    // Отправляем статистику на бэкенд
    axios.post(`${API_URL}/cards/${cards[cardIdx].id}/review?known=${isCorrect}`);
  };

  const nextQuestion = () => {
    if (cardIdx < cards.length - 1) {
      setCardIdx(cardIdx + 1);
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      alert("Поздравляем! Тест завершен.");
      fetchDecks(); // Обновляем статистику в профиле
      setView('home');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen font-sans bg-slate-50/30">
      {/* --- ШАПКА --- */}
      <header className="flex justify-between items-center mb-10 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Brain className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-800">FlashMind AI</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setView('profile')} 
            className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-600 border border-slate-200"
          >
            <User size={22} />
          </button>
          <button 
            onClick={() => setView('create')} 
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
          >
            <Plus size={20} /> Создать тест
          </button>
        </div>
      </header>

      {/* --- ЭКРАН: ПРОФИЛЬ --- */}
      {view === 'profile' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-bold mb-8 text-slate-800">Личный кабинет</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-slate-400 font-medium mb-1">Загружено лекций</p>
              <p className="text-4xl font-black text-slate-800">{decks.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-green-100">
              <p className="text-green-600 font-medium mb-1">Верных ответов</p>
              <p className="text-4xl font-black text-green-600">{decks.reduce((a, b) => a + b.correct_answers, 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100">
              <p className="text-red-500 font-medium mb-1">Ошибок</p>
              <p className="text-4xl font-black text-red-500">{decks.reduce((a, b) => a + b.wrong_answers, 0)}</p>
            </div>
          </div>
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-indigo-600 font-bold hover:underline">
            <ArrowLeft size={20}/> Вернуться к обучению
          </button>
        </div>
      )}

      {/* --- ЭКРАН: ГЛАВНАЯ (Список колод) --- */}
      {view === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decks.map(deck => (
            <div 
              key={deck.id} 
              onClick={() => startStudy(deck)} 
              className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  deck.difficulty === 'easy' ? 'bg-green-100 text-green-600' : 
                  deck.difficulty === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                }`}>
                  {deck.difficulty === 'easy' ? 'Легко' : deck.difficulty === 'medium' ? 'Средне' : 'Хардкор'}
                </span>
                <BarChart3 size={18} className="text-slate-200 group-hover:text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-6 text-slate-800 leading-snug">{deck.title}</h3>
              <div className="flex gap-4 border-t pt-4 border-slate-50">
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                  <Check size={16}/> {deck.correct_answers}
                </div>
                <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                  <X size={16}/> {deck.wrong_answers}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ЭКРАН: СОЗДАНИЕ --- */}
      {view === 'create' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-slate-800">Новый учебный модуль</h2>
          
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Название темы</label>
            <input 
              type="text" placeholder="Напр: Основы Python"
              className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold transition-all"
              value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="mb-8">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Выберите сложность</label>
            <div className="flex gap-3 mt-2">
              {['easy', 'medium', 'hard'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`flex-1 py-3.5 rounded-xl font-bold capitalize transition-all border-2 ${
                    difficulty === lvl 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {lvl === 'easy' ? 'Легко' : lvl === 'medium' ? 'Средне' : 'Хардкор'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Текст лекции / Конспект</label>
            <textarea 
              placeholder="Вставь сюда текст, по которому хочешь пройти тест..."
              className="w-full h-48 mt-2 p-5 bg-slate-50 rounded-2xl border border-transparent focus:border-indigo-500 focus:bg-white outline-none resize-none transition-all"
              value={text} onChange={e => setText(e.target.value)}
            />
          </div>

          <button 
            disabled={loading || !text || !title}
            onClick={handleGenerate}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-xl shadow-indigo-100"
          >
            {loading ? "GigaChat анализирует текст..." : "Сгенерировать вопросы"}
          </button>
        </div>
      )}

      {/* --- ЭКРАН: ТЕСТ (STUDY) --- */}
      {view === 'study' && cards.length > 0 && (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
          <button onClick={() => setView('home')} className="self-start flex items-center text-slate-400 mb-8 hover:text-indigo-600 transition font-bold">
            <ArrowLeft size={20} className="mr-2" /> Завершить досрочно
          </button>

          {/* Шкала прогресса */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full mb-10 overflow-hidden shadow-inner">
            <div 
              className="bg-indigo-500 h-full transition-all duration-700 ease-out" 
              style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
            ></div>
          </div>

          <div className="bg-white w-full p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-10">
            <h2 className="text-2xl font-bold text-center mb-10 text-slate-800 leading-snug">
              {cards[cardIdx].question}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {cards[cardIdx].options?.map((option, index) => {
                let btnStyle = "bg-slate-50 border-slate-100 text-slate-700 hover:border-indigo-300 hover:bg-white";
                
                if (isAnswered) {
                  if (option === cards[cardIdx].correct) {
                    btnStyle = "bg-green-50 border-green-500 text-green-700";
                  } else if (option === selectedOption) {
                    btnStyle = "bg-red-50 border-red-500 text-red-700 opacity-80";
                  } else {
                    btnStyle = "bg-white border-slate-50 text-slate-300";
                  }
                }

                return (
                  <button
                    key={index}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(option)}
                    className={`p-5 text-left border-2 rounded-2xl transition-all font-bold flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && option === cards[cardIdx].correct && <Check size={20} className="text-green-500" />}
                    {isAnswered && option === selectedOption && option !== cards[cardIdx].correct && <X size={20} className="text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {isAnswered && (
            <button 
              onClick={nextQuestion}
              className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2"
            >
              {cardIdx < cards.length - 1 ? "Дальше" : "Посмотреть итог"}
            </button>
          )}
          
          <p className="mt-8 text-slate-400 font-bold tracking-widest uppercase text-xs">Вопрос {cardIdx + 1} из {cards.length}</p>
        </div>
      )}
    </div>
  );
}

export default App;