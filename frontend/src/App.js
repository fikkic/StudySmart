import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Brain, Plus, Layout, ArrowLeft, Check, X, 
  User, BarChart3, LogOut, Mail, Lock, History, Award 
} from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState(token ? 'home' : 'auth'); 
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Creation states
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");

  // Quiz logic states
  const [cardIdx, setCardIdx] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [currentWrong, setCurrentWrong] = useState(0);

  // Axios instance configuration
  const api = axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    if (token) fetchDecks();
  }, [token]);

  const fetchDecks = async () => {
    try {
      const res = await api.get(`/decks`);
      setDecks(res.data);
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async () => {
    const fd = new FormData();
    fd.append('username', email);
    fd.append('password', password);
    try {
      if (isRegister) {
        const regData = new FormData();
        regData.append('email', email);
        regData.append('password', password);
        await axios.post(`${API_URL}/register`, regData);
        alert("Регистрация успешна! Теперь войдите.");
        setIsRegister(false);
      } else {
        const res = await axios.post(`${API_URL}/token`, fd);
        localStorage.setItem('token', res.data.access_token);
        setToken(res.data.access_token);
        window.location.reload(); 
      }
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка доступа. Проверьте данные.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setView('auth');
  };

  const handleGenerate = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('text', text);
    fd.append('title', title);
    fd.append('difficulty', difficulty);
    try {
      await api.post(`/generate`, fd);
      fetchDecks(); 
      setView('home');
      setText(""); setTitle("");
    } catch (e) { alert("Ошибка ИИ. Попробуйте текст короче."); }
    setLoading(false);
  };

  const startStudy = async (deck) => {
    try {
      const resCards = await api.get(`/decks/${deck.id}`);
      const resAttempts = await api.get(`/decks/${deck.id}/attempts`);
      setCards(resCards.data);
      setAttempts(resAttempts.data);
      setCurrentDeck(deck);
      setCardIdx(0); 
      setIsAnswered(false); 
      setSelectedOption(null);
      setCurrentCorrect(0);
      setCurrentWrong(0);
      setView('study');
    } catch (e) { alert("Не удалось загрузить тест"); }
  };

  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    const isCorrect = option === cards[cardIdx].correct;
    if (isCorrect) setCurrentCorrect(prev => prev + 1);
    else setCurrentWrong(prev => prev + 1);
  };

  const saveAndExit = async () => {
    try {
      await api.post(`/decks/${currentDeck.id}/attempts?correct=${currentCorrect}&wrong=${currentWrong}`);
      fetchDecks();
      setView('home');
    } catch (e) { alert("Ошибка сохранения результатов"); }
  };

  // --- ЭКРАН АВТОРИЗАЦИИ ---
  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-[#735184] p-4 rounded-[2rem] mb-4 shadow-xl shadow-purple-100">
              <Brain className="text-white w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">FlashMind AI</h2>
            <p className="text-slate-400 font-medium mt-1">Твой личный ИИ-репетитор</p>
          </div>
          <div className="space-y-4 mb-8">
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-300" size={20} />
              <input type="email" placeholder="Email" className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-purple-200 transition-all font-bold text-slate-700" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-300" size={20} />
              <input type="password" placeholder="Пароль" className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-purple-200 transition-all font-bold text-slate-700" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <button onClick={handleAuth} className="w-full py-4 bg-[#735184] text-white rounded-2xl font-black text-lg hover:bg-[#5a3d68] transition-all shadow-xl shadow-purple-100">
            {isRegister ? "Создать аккаунт" : "Войти"}
          </button>
          <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-slate-400 font-bold text-sm hover:text-[#735184]">
            {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen font-sans bg-slate-50/30 text-slate-800">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-[#735184] p-2 rounded-xl"><Brain className="text-white w-6 h-6" /></div>
          <h1 className="text-xl font-black tracking-tighter">FlashMind AI</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setView('profile')} className="p-3 hover:bg-slate-50 rounded-2xl transition text-slate-500 border border-slate-100"><User size={20} /></button>
          <button onClick={() => setView('create')} className="bg-[#735184] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#5a3d68] transition shadow-lg shadow-purple-50 font-bold">
            <Plus size={18} /> Создать
          </button>
        </div>
      </header>

      {/* VIEW: PROFILE */}
      {view === 'profile' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black">Профиль</h2>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-black hover:bg-red-50 px-4 py-2 rounded-xl transition"><LogOut size={18}/> Выйти</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Всего тем</p>
              <p className="text-5xl font-black">{decks.length}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-100">
              <p className="text-green-500 font-bold text-xs uppercase tracking-widest mb-2">Верных ответов</p>
              <p className="text-5xl font-black text-green-600">{decks.reduce((a, b) => a + b.correct_answers, 0)}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-100">
              <p className="text-red-400 font-bold text-xs uppercase tracking-widest mb-2">Ошибок</p>
              <p className="text-5xl font-black text-red-500">{decks.reduce((a, b) => a + b.wrong_answers, 0)}</p>
            </div>
          </div>
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-[#735184] font-black text-lg hover:underline"><ArrowLeft /> Назад к учебе</button>
        </div>
      )}

      {/* VIEW: HOME (Deck list) */}
      {view === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
          {decks.map(deck => (
            <div key={deck.id} onClick={() => startStudy(deck)} className="bg-white p-8 rounded-[3rem] border-2 border-transparent hover:border-purple-200 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                  deck.difficulty === 'easy' ? 'bg-green-100 text-green-600' : 
                  deck.difficulty === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                }`}>
                  {deck.difficulty}
                </span>
                <Award size={24} className="text-slate-100 group-hover:text-purple-100 transition-colors" />
              </div>
              <h3 className="text-2xl font-black mb-8 leading-tight text-slate-800">{deck.title}</h3>
              <div className="flex gap-6 border-t pt-6 border-slate-50">
                <div className="flex items-center gap-1.5 text-green-600 font-black text-sm"><Check size={18}/> {deck.correct_answers}</div>
                <div className="flex items-center gap-1.5 text-red-400 font-black text-sm"><X size={18}/> {deck.wrong_answers}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: CREATE */}
      {view === 'create' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
          <h2 className="text-3xl font-black mb-10 text-center">Создать модуль</h2>
          <div className="mb-8">
            <label className="text-xs font-black text-slate-300 ml-1 uppercase tracking-widest">Тема лекции</label>
            <input type="text" placeholder="Напр: История Древнего Рима" className="w-full mt-2 p-5 bg-slate-50 rounded-3xl focus:bg-white outline-none font-bold border-2 border-transparent focus:border-purple-100 transition-all text-xl" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="mb-8">
            <label className="text-xs font-black text-slate-300 ml-1 uppercase tracking-widest">Сложность</label>
            <div className="flex gap-3 mt-2">
              {['easy', 'medium', 'hard'].map(lvl => (
                <button key={lvl} onClick={() => setDifficulty(lvl)} className={`flex-1 py-4 rounded-2xl font-black capitalize transition-all border-2 ${difficulty === lvl ? 'bg-[#735184] text-white border-[#735184] shadow-lg shadow-purple-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-10">
            <label className="text-xs font-black text-slate-300 ml-1 uppercase tracking-widest">Текст конспекта</label>
            <textarea placeholder="Вставьте сюда текст из учебника или лекции..." className="w-full h-56 mt-2 p-6 bg-slate-50 rounded-[2rem] focus:bg-white outline-none resize-none border-2 border-transparent focus:border-purple-100 transition-all font-medium leading-relaxed" value={text} onChange={e => setText(e.target.value)} />
          </div>
          <button disabled={loading || !text || !title} onClick={handleGenerate} className="w-full py-6 bg-[#735184] text-white rounded-[2rem] font-black text-xl hover:bg-[#5a3d68] transition-all disabled:opacity-30 shadow-2xl shadow-purple-200">
            {loading ? "GigaChat анализирует..." : "Сгенерировать тест"}
          </button>
        </div>
      )}

      {/* VIEW: STUDY (Quiz + Results with History) */}
      {view === 'study' && cards.length > 0 && (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
          <button onClick={() => setView('home')} className="flex items-center text-slate-400 mb-8 hover:text-[#735184] font-black transition text-sm uppercase tracking-widest">
            <ArrowLeft size={16} className="mr-2" /> Завершить
          </button>

          {/* Logic: Show Quiz or final results */}
          {!(isAnswered && cardIdx === cards.length - 1) ? (
            <div className="flex flex-col items-center">
              <div className="w-full bg-slate-100 h-2.5 rounded-full mb-12 overflow-hidden shadow-inner">
                <div className="bg-[#735184] h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(115,81,132,0.5)]" style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}></div>
              </div>

              <div className="bg-white w-full p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 mb-10 relative">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
                  Вопрос {cardIdx + 1} / {cards.length}
                </span>
                <h2 className="text-2xl font-black text-center mb-12 text-slate-800 leading-tight">
                  {cards[cardIdx].question}
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {cards[cardIdx].options?.map((option, index) => {
                    let style = "bg-slate-50 border-slate-100 text-slate-700 hover:border-purple-200 hover:bg-white";
                    if (isAnswered) {
                      if (option === cards[cardIdx].correct) style = "bg-green-50 border-green-500 text-green-700 scale-[1.02]";
                      else if (option === selectedOption) style = "bg-red-50 border-red-500 text-red-700 opacity-70";
                      else style = "bg-white border-slate-50 text-slate-300 grayscale opacity-50";
                    }
                    return (
                      <button key={index} disabled={isAnswered} onClick={() => handleSelectOption(option)} className={`p-6 text-left border-2 rounded-3xl transition-all font-bold flex items-center justify-between group ${style}`}>
                        <span className="flex-1">{option}</span>
                        {isAnswered && option === cards[cardIdx].correct && <div className="bg-green-500 p-1 rounded-full"><Check size={16} className="text-white" /></div>}
                        {isAnswered && option === selectedOption && option !== cards[cardIdx].correct && <div className="bg-red-500 p-1 rounded-full"><X size={16} className="text-white" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAnswered && (
                <button onClick={() => { setCardIdx(cardIdx + 1); setIsAnswered(false); setSelectedOption(null); }} className="bg-[#735184] text-white px-16 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-purple-200 hover:bg-[#5a3d68] hover:-translate-y-1 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2">
                  Дальше
                </button>
              )}
            </div>
          ) : (
            /* FINAL RESULTS SCREEN + ATTEMPTS HISTORY */
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
              <div className="text-center mb-12">
                <div className="inline-block bg-purple-50 p-6 rounded-[2.5rem] mb-6">
                   <Award className="text-[#735184] w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 mb-2">Тест пройден!</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Ваш текущий результат</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-green-50/50 p-8 rounded-[2.5rem] text-center border border-green-100">
                  <p className="text-green-600 font-black text-sm uppercase mb-2">Верно</p>
                  <p className="text-6xl font-black text-green-600">{currentCorrect}</p>
                </div>
                <div className="bg-red-50/50 p-8 rounded-[2.5rem] text-center border border-red-100">
                  <p className="text-red-500 font-black text-sm uppercase mb-2">Ошибки</p>
                  <p className="text-6xl font-black text-red-500">{currentWrong}</p>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <History size={18} className="text-[#735184]" />
                  <h3 className="font-black text-slate-800 text-lg">История попыток</h3>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                  {attempts.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold italic text-sm">Это твое первое достижение!</p>
                    </div>
                  ) : (
                    attempts.map((att, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 hover:bg-white transition-colors">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-300 uppercase tracking-tighter">Попытка #{attempts.length - i}</span>
                          <span className="font-bold text-slate-600">
                            {new Date(att.timestamp).toLocaleDateString('ru-RU')} в {new Date(att.timestamp).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="flex gap-4 font-black">
                          <span className="text-green-500 flex items-center gap-1">✓ {att.correct}</span>
                          <span className="text-red-400 flex items-center gap-1">✗ {att.wrong}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button onClick={saveAndExit} className="w-full py-6 bg-[#735184] text-white rounded-[2rem] font-black text-xl hover:bg-[#5a3d68] shadow-[0_20px_50px_rgba(115,81,132,0.3)] transition-all transform hover:scale-[1.02] active:scale-95">
                Сохранить результат и выйти
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;