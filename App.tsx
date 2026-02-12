
import React, { useState, useEffect, useRef } from 'react';
import { Screen, HIRAGANA_A_COLUMN, FRUIT_A, FRUIT_B, VocabData, CharacterData } from './types';
import { playTTS, preloadTTS, initAudio, verifyHandwriting, verifyPronunciation } from './services/geminiService';
import CanvasBoard from './components/CanvasBoard';

const Header: React.FC<{ coins: number; onHome: () => void }> = ({ coins, onHome }) => (
  <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center pointer-events-none z-50">
    <button onClick={onHome} className="pointer-events-auto w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    </button>
    <div className="pointer-events-auto flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full border-2 border-amber-200 shadow-md">
      <span className="text-xl">💰</span>
      <span className="text-xl font-bold text-amber-600">{coins}</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [coins, setCoins] = useState(0);
  
  // 五十音遊戲狀態
  const [charStates, setCharStates] = useState<Record<string, 'normal' | 'flipped' | 'done'>>({});
  const [gameTargets, setGameTargets] = useState<CharacterData[]>([]);
  const [gameCurrentIndex, setGameCurrentIndex] = useState(0);
  const [gameFeedback, setGameFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  // 單字遊戲狀態
  const [vocabSet, setVocabSet] = useState<VocabData[]>([]);
  const [vocabStates, setVocabStates] = useState<Record<string, 'normal' | 'flipped' | 'done'>>({});
  const [vGameTargets, setVGameTargets] = useState<VocabData[]>([]);
  const [vGameIndex, setVGameIndex] = useState(0);

  // 驗證狀態
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedbackUI, setFeedbackUI] = useState<{ text: string, type: 'success' | 'error' | null }>({ text: '', type: null });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    preloadTTS(['あ','い','う','え','お','正解！','残念','素晴らしい','惜しい','いい感じ']);
  }, []);

  // --- 五十音流程控制 ---
  const startLearning = () => {
    initAudio();
    const initial: any = {};
    HIRAGANA_A_COLUMN.forEach(c => initial[c.char] = 'normal');
    setCharStates(initial);
    setScreen('learning');
  };

  const handleLearnClick = (char: string) => {
    const currentState = charStates[char];
    if (currentState === 'done') return;
    playTTS(char);
    if (currentState === 'normal') setCharStates(p => ({ ...p, [char]: 'flipped' }));
    else if (currentState === 'flipped') setCharStates(p => ({ ...p, [char]: 'done' }));
  };

  useEffect(() => {
    if (screen === 'learning' && HIRAGANA_A_COLUMN.every(c => charStates[c.char] === 'done')) {
      setTimeout(() => {
        const shuffled = [...HIRAGANA_A_COLUMN].sort(() => Math.random() - 0.5);
        setGameTargets(shuffled);
        setGameCurrentIndex(0);
        setScreen('game1');
        playTTS(shuffled[0].char);
      }, 800);
    }
  }, [charStates, screen]);

  const handleGame1Choice = (char: string) => {
    if (gameFeedback !== 'none') return;
    const target = gameTargets[gameCurrentIndex].char;
    if (char === target) {
      setGameFeedback('correct');
      playTTS('正解！');
      setTimeout(() => {
        setGameFeedback('none');
        if (gameCurrentIndex + 1 < gameTargets.length) {
          setGameCurrentIndex(i => i + 1);
          playTTS(gameTargets[gameCurrentIndex + 1].char);
        } else {
          setScreen('game2');
          setGameCurrentIndex(0);
          playTTS(gameTargets[0].char);
        }
      }, 1200);
    } else {
      setGameFeedback('wrong');
      playTTS('残念');
      setTimeout(() => setGameFeedback('none'), 800);
    }
  };

  const handleGame2Submit = async (imageData: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    const target = gameTargets[gameCurrentIndex].char;
    const result = await verifyHandwriting(imageData, target);
    setIsVerifying(false);
    if (result.isCorrect) {
      setFeedbackUI({ text: result.feedback || '寫得真棒！', type: 'success' });
      playTTS('素晴らしい');
      setTimeout(() => {
        setFeedbackUI({ text: '', type: null });
        if (gameCurrentIndex + 1 < gameTargets.length) {
          setGameCurrentIndex(i => i + 1);
          playTTS(gameTargets[gameCurrentIndex + 1].char);
        } else {
          setCoins(c => {
            const newCount = c + 1;
            if (newCount >= 2) setScreen('story');
            else setScreen('menu');
            return newCount;
          });
        }
      }, 2000);
    } else {
      setFeedbackUI({ text: result.feedback || '再試一次！', type: 'error' });
      playTTS('惜しい');
    }
  };

  // --- 單字流程控制 ---
  const startVocabLearning = (set: VocabData[]) => {
    initAudio();
    setVocabSet(set);
    const initial: any = {};
    set.forEach(v => initial[v.id] = 'normal');
    setVocabStates(initial);
    setScreen('vocab_learning');
    preloadTTS(set.map(v => v.word));
  };

  const handleVocabLearnClick = (item: VocabData) => {
    const currentState = vocabStates[item.id];
    if (currentState === 'done') return;
    playTTS(item.word);
    if (currentState === 'normal') setVocabStates(p => ({ ...p, [item.id]: 'flipped' }));
    else if (currentState === 'flipped') setVocabStates(p => ({ ...p, [item.id]: 'done' }));
  };

  useEffect(() => {
    if (screen === 'vocab_learning' && vocabSet.length > 0 && vocabSet.every(v => vocabStates[v.id] === 'done')) {
      setTimeout(() => {
        const shuffled = [...vocabSet].sort(() => Math.random() - 0.5);
        setVGameTargets(shuffled);
        setVGameIndex(0);
        setScreen('vocab_game1');
        playTTS(shuffled[0].word);
      }, 800);
    }
  }, [vocabStates, screen]);

  const handleVocabGame1Choice = (vId: string) => {
    if (gameFeedback !== 'none') return;
    const target = vGameTargets[vGameIndex].id;
    if (vId === target) {
      setGameFeedback('correct');
      playTTS('正解！');
      setTimeout(() => {
        setGameFeedback('none');
        if (vGameIndex + 1 < vGameTargets.length) {
          setVGameIndex(i => i + 1);
          playTTS(vGameTargets[vGameIndex + 1].word);
        } else {
          setScreen('vocab_game2');
          setVGameIndex(0);
        }
      }, 1200);
    } else {
      setGameFeedback('wrong');
      playTTS('残念');
      setTimeout(() => setGameFeedback('none'), 800);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsVerifying(true);
          const res = await verifyPronunciation(base64, vGameTargets[vGameIndex].word);
          setIsVerifying(false);
          if (res.isCorrect) {
            setFeedbackUI({ text: res.feedback, type: 'success' });
            playTTS('素晴らしい');
            setTimeout(() => {
              setFeedbackUI({ text: '', type: null });
              if (vGameIndex + 1 < vGameTargets.length) setVGameIndex(i => i + 1);
              else {
                setCoins(c => {
                  const newCount = c + 1;
                  if (newCount >= 2) setScreen('story');
                  else setScreen('vocab_story'); // 這是單字區的小故事
                  return newCount;
                });
              }
            }, 2500);
          } else {
            setFeedbackUI({ text: res.feedback, type: 'error' });
            playTTS('惜しい');
          }
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert('請開啟麥克風權限！'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-amber-50">
      {screen !== 'home' && screen !== 'instructions' && <Header coins={coins} onHome={() => setScreen('home')} />}

      {/* 首頁 */}
      {screen === 'home' && (
        <div className="text-center animate-fade-in">
          <h1 className="text-8xl font-black text-sky-500 mb-4 rounded-font drop-shadow-lg">日文一起學</h1>
          <p className="text-2xl text-amber-600 mb-12 font-bold italic">Happy Japanese Learning!</p>
          <button onClick={() => setScreen('instructions')} className="px-16 py-8 bg-yellow-400 text-white text-4xl font-bold rounded-full shadow-[0_10px_0_#d97706] active:translate-y-[10px] transition-all">開始冒險</button>
        </div>
      )}

      {/* 說明頁 */}
      {screen === 'instructions' && (
        <div className="max-w-2xl bg-white/90 p-12 rounded-[3rem] shadow-2xl border-8 border-yellow-200 text-center animate-scale-up">
          <h2 className="text-4xl font-bold text-sky-500 mb-10">冒險任務卡</h2>
          <div className="space-y-6 text-2xl text-amber-700 font-bold text-left">
            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100 flex items-center gap-6"><span>⭐</span><p>完成單元獲得金幣獎勵</p></div>
            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100 flex items-center gap-6"><span>💰</span><p>累積 2 枚金幣解鎖神祕故事</p></div>
          </div>
          <button onClick={() => setScreen('menu')} className="mt-12 px-16 py-5 bg-sky-500 text-white text-3xl font-bold rounded-full shadow-lg">準備好了！</button>
        </div>
      )}

      {/* 主選單 */}
      {screen === 'menu' && (
        <div className="w-full max-w-5xl text-center">
          <h2 className="text-5xl font-black text-sky-600 mb-16 rounded-font">冒險選擇</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 px-4">
            <button onClick={startLearning} className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-sky-100 hover:scale-105 transition group">
              <div className="w-40 h-40 bg-sky-400 text-white text-8xl flex items-center justify-center rounded-full mx-auto mb-8">あ</div>
              <span className="text-4xl font-black text-sky-500">五十音</span>
            </button>
            <button onClick={() => setScreen('vocab_menu')} className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-teal-100 hover:scale-105 transition group">
              <div className="w-40 h-40 bg-teal-400 text-white text-8xl flex items-center justify-center rounded-full mx-auto mb-8">🍎</div>
              <span className="text-4xl font-black text-teal-500">單字館</span>
            </button>
          </div>
        </div>
      )}

      {/* 五十音學習區 */}
      {screen === 'learning' && (
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="flex gap-4 items-center mb-6">
            <span className="bg-sky-500 text-white text-4xl font-black px-6 py-2 rounded-xl">學習中：</span>
            <span className="text-4xl font-black text-sky-600">五十音 (あ行)</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mb-12">點擊字母發音，點第二次圓圈會消失！</p>
          <div className="flex flex-wrap justify-center gap-8">
            {HIRAGANA_A_COLUMN.map((item) => {
              const state = charStates[item.char];
              return (
                <div key={item.char} className={`perspective-1000 w-48 h-48 cursor-pointer transition-all ${state === 'done' ? 'animate-shrink pointer-events-none' : ''}`} onClick={() => handleLearnClick(item.char)}>
                  <div className={`relative w-full h-full preserve-3d transition-all duration-500 ${state === 'flipped' || state === 'done' ? 'rotate-y-180' : ''}`}>
                    <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-sky-400 text-white text-8xl font-bold rounded-full shadow-xl border-8 border-sky-300">{item.char}</div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center bg-white rounded-full shadow-xl border-8 border-pink-300">
                      <img src={item.strokeImageUrl} alt={item.char} className="w-full h-full object-contain p-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 五十音遊戲一 (聽音選字) */}
      {screen === 'game1' && (
        <div className="w-full max-w-4xl text-center">
          <div className="bg-sky-500 text-white px-10 py-4 rounded-full text-3xl font-black mb-12 shadow-lg inline-block">聽音選字 ({gameCurrentIndex + 1}/5)</div>
          <button onClick={() => playTTS(gameTargets[gameCurrentIndex].char)} className="w-32 h-32 bg-sky-400 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-16 animate-pulse border-8 border-white">
             <span className="text-6xl text-white">🔊</span>
          </button>
          <div className="flex flex-wrap justify-center gap-6">
            {HIRAGANA_A_COLUMN.map(c => (
              <button key={c.char} onClick={() => handleGame1Choice(c.char)} className={`w-32 h-32 rounded-full text-5xl font-bold border-4 transition-all shadow-xl ${gameFeedback === 'correct' && c.char === gameTargets[gameCurrentIndex].char ? 'bg-green-500 text-white border-green-200' : 'bg-white text-sky-500 border-sky-100 hover:bg-sky-50'}`}>{c.char}</button>
            ))}
          </div>
        </div>
      )}

      {/* 五十音遊戲二 (寫字練習) */}
      {screen === 'game2' && (
        <div className="w-full max-w-4xl text-center">
          <div className="bg-purple-500 text-white px-10 py-4 rounded-full text-3xl font-black mb-12 shadow-lg inline-block">寫字練習 ({gameCurrentIndex + 1}/5)</div>
          <div className="mb-8 flex items-center justify-center gap-8">
             <button onClick={() => playTTS(gameTargets[gameCurrentIndex].char)} className="w-20 h-20 bg-sky-400 rounded-full flex items-center justify-center shadow-lg"><span className="text-3xl">🔊</span></button>
             <span className="text-9xl font-black text-gray-200/50 select-none">{gameTargets[gameCurrentIndex].char}</span>
          </div>
          <CanvasBoard targetChar={gameTargets[gameCurrentIndex].char} onClear={() => setFeedbackUI({ text: '', type: null })} onSubmit={handleGame2Submit} isVerifying={isVerifying} />
          {feedbackUI.type && <div className={`mt-6 px-10 py-4 rounded-3xl font-bold text-2xl shadow-md ${feedbackUI.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{feedbackUI.text}</div>}
        </div>
      )}

      {/* 單字目錄 */}
      {screen === 'vocab_menu' && (
        <div className="w-full min-h-screen bg-cyan-100/40 p-8 flex flex-col items-center">
          <h2 className="text-8xl font-black text-teal-600 mt-10 mb-2 drop-shadow-sm rounded-font">單 字</h2>
          <p className="text-3xl font-bold text-teal-500/80 mb-12">選 擇 冒 險 主 題</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl">
            <div className="bg-white rounded-[3rem] shadow-xl flex overflow-hidden border-8 border-white hover:scale-[1.02] transition cursor-pointer" onClick={() => startVocabLearning(FRUIT_A)}>
              <div className="w-1/3 bg-gray-50 flex items-center justify-center p-4"><span className="text-5xl font-black text-teal-700 [writing-mode:vertical-rl]">水果A</span></div>
              <div className="w-2/3 p-8 flex flex-col justify-center gap-3">
                {FRUIT_A.map(f => <div key={f.id} className="flex justify-between text-2xl font-bold border-b pb-2"><span className="text-teal-600">{f.word}</span><span className="text-gray-400">{f.illustration}</span></div>)}
              </div>
            </div>
            <div className="bg-white rounded-[3rem] shadow-xl flex overflow-hidden border-8 border-white hover:scale-[1.02] transition cursor-pointer" onClick={() => startVocabLearning(FRUIT_B)}>
              <div className="w-1/3 bg-gray-50 flex items-center justify-center p-4"><span className="text-5xl font-black text-teal-700 [writing-mode:vertical-rl]">水果B</span></div>
              <div className="w-2/3 p-8 flex flex-col justify-center gap-3">
                {FRUIT_B.map(f => <div key={f.id} className="flex justify-between text-2xl font-bold border-b pb-2"><span className="text-teal-600">{f.word}</span><span className="text-gray-400">{f.illustration}</span></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 單字學習區 */}
      {screen === 'vocab_learning' && (
        <div className="w-full min-h-screen bg-pink-50 flex flex-col items-center p-8">
          <div className="flex gap-4 items-center mb-6">
            <span className="bg-teal-400 text-white text-4xl font-black px-6 py-2 rounded-xl">探索中：</span>
            <span className="text-4xl font-black text-teal-600">水果點點名</span>
          </div>
          <p className="text-3xl font-bold text-sky-500 mb-16 text-center">點擊翻開單字，再點一次圓圈消失！</p>
          <div className="flex flex-wrap justify-center gap-10 max-w-6xl">
            {vocabSet.map((v) => {
              const state = vocabStates[v.id];
              return (
                <div key={v.id} onClick={() => handleVocabLearnClick(v)} className={`perspective-1000 w-56 h-56 cursor-pointer transition-all ${state === 'done' ? 'animate-shrink pointer-events-none' : 'active:scale-95'}`}>
                   <div className={`relative w-full h-full preserve-3d transition-all duration-700 ${state === 'flipped' || state === 'done' ? 'rotate-y-180' : ''}`}>
                      <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-white rounded-full shadow-2xl border-4 border-white text-9xl">{v.illustration}</div>
                      <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center bg-white rounded-full shadow-2xl border-4 border-teal-200">
                        <span className="text-8xl mb-2">{v.illustration}</span>
                        <span className="text-teal-600 text-3xl font-black">{v.word}</span>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 單字遊戲一 (聽音選圖) */}
      {screen === 'vocab_game1' && (
        <div className="w-full max-w-5xl text-center">
          <div className="bg-teal-500 text-white px-10 py-4 rounded-full text-3xl font-black mb-12 shadow-lg inline-block">聽音選圖 ({vGameIndex + 1}/5)</div>
          <button onClick={() => playTTS(vGameTargets[vGameIndex].word)} className="w-32 h-32 bg-sky-400 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-16 animate-pulse border-8 border-white">
             <span className="text-6xl text-white">🔊</span>
          </button>
          <div className="flex flex-wrap justify-center gap-8">
            {vocabSet.map(v => (
              <button key={v.id} onClick={() => handleVocabGame1Choice(v.id)} className={`w-44 h-44 rounded-full bg-white text-9xl flex items-center justify-center border-8 transition-all shadow-xl ${gameFeedback === 'correct' && v.id === vGameTargets[vGameIndex].id ? 'border-green-500 scale-110' : 'border-white hover:border-teal-300'}`}>
                {v.illustration}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 單字遊戲二 (看圖念字) */}
      {screen === 'vocab_game2' && (
        <div className="w-full max-w-4xl text-center">
          <div className="bg-indigo-500 text-white px-10 py-4 rounded-full text-3xl font-black mb-12 shadow-lg inline-block">看圖念字</div>
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-8 border-indigo-100 flex flex-col items-center gap-8">
            <span className="text-[10rem]">{vGameTargets[vGameIndex].illustration}</span>
            <div className="flex flex-col items-center gap-6">
              <p className="text-7xl font-black text-indigo-600">{vGameTargets[vGameIndex].word}</p>
              <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} disabled={isVerifying} className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 animate-ping' : 'bg-indigo-500 hover:scale-110 active:scale-95'} disabled:opacity-50`}>
                <span className="text-5xl text-white">{isRecording ? '⏹️' : '🎤'}</span>
              </button>
              <p className="text-2xl text-gray-400 font-bold">{isRecording ? '錄音中...' : '按住麥克風並大聲唸出來'}</p>
            </div>
            {isVerifying && <div className="text-3xl font-black text-indigo-500 animate-pulse">正在聽聽看發音...</div>}
            {feedbackUI.type && <div className={`px-12 py-6 rounded-3xl text-3xl font-black shadow-xl animate-scale-up ${feedbackUI.type === 'success' ? 'bg-green-100 text-green-700 border-4 border-green-200' : 'bg-red-100 text-red-700 border-4 border-red-200'}`}>{feedbackUI.text}</div>}
          </div>
        </div>
      )}

      {/* 單元獎勵故事 (雞與鳥居) */}
      {screen === 'vocab_story' && (
        <div className="w-full max-w-4xl bg-white p-16 rounded-[4rem] shadow-2xl border-y-[12px] border-teal-400 animate-scale-up">
          <div className="text-9xl mb-8 text-center animate-bounce-subtle">🐓</div>
          <h2 className="text-5xl font-black text-teal-600 mb-8 text-center leading-tight">單元獎勵：<br/>你知道「鳥居」嗎？</h2>
          <div className="space-y-6 text-2xl text-gray-700 font-bold leading-relaxed">
            <p>日本神社的紅色「鳥居」，其實跟<span className="text-pink-500 text-4xl mx-2">「雞」</span>有關喔！🐓</p>
            <div className="bg-teal-50 p-8 rounded-3xl border-l-8 border-teal-300">
              傳說天照大神躲進洞穴，世界變黑了，眾神便讓公雞啼叫引誘她出來。所以鳥居其實是公雞站的架子喔！
            </div>
          </div>
          <button onClick={() => setScreen('menu')} className="mt-16 w-full py-6 bg-teal-500 text-white text-3xl font-black rounded-full shadow-lg">再去拿一枚金幣吧！</button>
        </div>
      )}

      {/* 最終獎勵故事 (樹勾衣餒) */}
      {screen === 'story' && (
        <div className="w-full max-w-4xl bg-white p-16 rounded-[5rem] shadow-2xl border-x-[16px] border-yellow-300 animate-scale-up relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-[10rem] animate-bounce-subtle">🌟</div>
          <h2 className="text-6xl font-black text-amber-600 mb-12 text-center mt-8">究極獎勵故事：<br/>樹勾衣餒！</h2>
          <div className="space-y-10 text-3xl text-gray-700 font-bold leading-loose text-center">
            <p>有一天小明跟朋友去樹下野餐，衣服不小心被樹枝勾住了...</p>
            <p>他指著勾住的地方，跟朋友大聲驚呼：</p>
            <p className="text-7xl font-black text-sky-500 py-10 bg-sky-50 rounded-[3rem] tracking-widest shadow-inner">「 樹 勾 衣 餒 ！ 」</p>
            <div className="text-xl text-amber-400 font-black italic">
              ( すごいね - Sugoi ne! 日本語：好厲害喔！ )
            </div>
            <p className="text-amber-600">恭喜你完成所有冒險！你真的太「樹勾衣餒」了！</p>
          </div>
          <button onClick={() => { setScreen('home'); setCoins(0); }} className="mt-16 w-full py-8 bg-amber-500 text-white text-4xl font-black rounded-full shadow-[0_12px_0_#d97706] active:translate-y-2">重新開始大冒險</button>
        </div>
      )}
    </div>
  );
};

export default App;
