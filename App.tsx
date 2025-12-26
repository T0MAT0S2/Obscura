import React, { useEffect, useState, useRef } from 'react';
import SessionOverlay from './components/SessionOverlay';
import ChatMessageItem from './components/Chat/ChatMessageItem';
import KeeperTools from './components/Tools/KeeperTools';
import YoutubePlayer from './components/YoutubePlayer';
import CharacterSheet from './components/Character/CharacterSheet';
import ChatToolbar from './components/Chat/ChatToolbar';
import { 
  signIn, 
  subscribeToAuth, 
  subscribeToSession, 
  subscribeToCharacters, 
  subscribeToChat,
  sendChatMessage,
  addCharacter,
  getNewCharacterTemplate,
  updateScene
} from './services/firebase';
import { User } from 'firebase/auth';
import { SessionData, Character, ChatMessage } from './types';
import { STYLES } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // UI State
  const [chatInput, setChatInput] = useState('');
  const [oocInput, setOocInput] = useState('');
  const [activeTab, setActiveTab] = useState<'log' | 'ooc'>('log');
  const [actingCharId, setActingCharId] = useState<string>(''); 
  const [editingCharId, setEditingCharId] = useState<string | null>(null); 
  const [showKeeperTools, setShowKeeperTools] = useState(false);
  const [showHandout, setShowHandout] = useState(false);
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  
  // Character Creation Modal State
  const [showCharCreation, setShowCharCreation] = useState(false);
  const [newCharName, setNewCharName] = useState('');

  // Mobile Tab State (map | chat | chars)
  const [mobileTab, setMobileTab] = useState<'map' | 'chat' | 'chars'>('map');

  // Refs
  const logEndRef = useRef<HTMLDivElement>(null);
  const oocEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    signIn();
    const unsub = subscribeToAuth(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const unsubSession = subscribeToSession(sessionId, setSession);
    const unsubChars = subscribeToCharacters(sessionId, setCharacters);
    const unsubChat = subscribeToChat(sessionId, setMessages);
    return () => {
      unsubSession();
      unsubChars();
      unsubChat();
    };
  }, [sessionId]);

  useEffect(() => {
    if (activeTab === 'log') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    else oocEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  useEffect(() => {
      if (session?.scene.activeHandout) setShowHandout(true);
      else setShowHandout(false);
  }, [session?.scene.activeHandout]);

  // Image Paste Handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        const isChatInput = target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text');
        
        if (e.clipboardData && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                if (confirm('클립보드의 이미지를 전송하시겠습니까?')) {
                     const reader = new FileReader();
                     reader.onload = (evt) => {
                         const img = new Image();
                         img.onload = () => {
                             const canvas = document.createElement('canvas');
                             const ctx = canvas.getContext('2d');
                             let width = img.width;
                             let height = img.height;
                             const MAX_WIDTH = 800;
                             if (width > MAX_WIDTH) {
                                 height *= MAX_WIDTH / width;
                                 width = MAX_WIDTH;
                             }
                             canvas.width = width;
                             canvas.height = height;
                             ctx?.drawImage(img, 0, 0, width, height);
                             handleSendImage(canvas.toDataURL('image/jpeg', 0.8));
                         };
                         img.src = evt.target?.result as string;
                     };
                     reader.readAsDataURL(file);
                }
            }
        }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [sessionId]);

  const handleJoinSession = (sid: string) => setSessionId(sid);

  const actingChar = characters.find(c => c.id === actingCharId);
  const isKeeper = session?.keeperId === user?.uid;

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || chatInput.trim();
    if (!text || !sessionId) return;
    
    let msg: ChatMessage = { 
       type: 'vn-chat', 
       text, 
       sender: actingChar ? actingChar.name : '나레이션',
       characterId: actingChar?.id || null,
       portraitUrl: actingChar?.portraitUrl || null,
    };

    if (text.startsWith('/r ')) {
        const expr = text.substring(3).trim();
        await performDiceRoll(expr, actingChar?.name || '익명');
        if (!textOverride) setChatInput('');
        return;
    } else if (text.startsWith('/')) {
        msg = { type: text.startsWith('/html ') ? 'html' : 'desc', text: text.startsWith('/html ') ? text.substring(6) : text };
    }
    
    await sendChatMessage(sessionId, msg);
    if (!textOverride) setChatInput('');
  };

  const handleSendImage = async (base64: string) => {
      if (!sessionId) return;
      await sendChatMessage(sessionId, {
          type: 'desc',
          text: `/img ${base64}`
      });
  };

  const handleSendOoc = async () => {
    if (!oocInput.trim() || !sessionId) return;
    await sendChatMessage(sessionId, {
        type: 'ooc-chat',
        text: oocInput.trim(),
        sender: sessionStorage.getItem('nickname') || '익명'
    });
    setOocInput('');
  };

  const performDiceRoll = async (expr: string, senderName: string) => {
      if (!sessionId) return;
      try {
          const match = expr.match(/(\d+)d(\d+)/);
          if (match) {
              const count = parseInt(match[1]);
              const faces = parseInt(match[2]);
              const rolls = [];
              let total = 0;
              for(let i=0; i<count; i++) {
                  const r = Math.floor(Math.random() * faces) + 1;
                  rolls.push(r);
                  total += r;
              }
              await sendChatMessage(sessionId, {
                  type: 'dice', sender: senderName, text: `${expr} 굴림: ${total} (${rolls.join(', ')})`
              });
          } else {
             await sendChatMessage(sessionId, { type: 'desc', text: `잘못된 주사위: ${expr}`});
          }
      } catch (e) { console.error(e); }
  };

  const handleSkillRoll = async (charName: string, skillName: string, val: number) => {
      if (!sessionId) return;
      const roll = Math.floor(Math.random() * 100) + 1;
      let resultText = "실패";
      let resultClass = "failure";
      if (roll <= val) {
          if (roll <= 1) { resultText = "대성공"; resultClass = "success-critical"; }
          else if (roll <= val / 5) { resultText = "극단적 성공"; resultClass = "success-extreme"; }
          else if (roll <= val / 2) { resultText = "어려운 성공"; resultClass = "success-hard"; }
          else { resultText = "성공"; resultClass = "success-regular"; }
      } else if (roll >= 96) {
          resultText = "대실패"; resultClass = "fumble";
      }

      await sendChatMessage(sessionId, {
          type: 'skill', sender: charName, skillName, skillValue: val,
          hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5),
          roll, resultText, resultClass
      });
  };

  const handleBnPRoll = async (charName: string, skillName: string, val: number) => {
    if (!sessionId) return;
    const rolls = [Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1];
    
    const evalRoll = (r: number) => {
        if (r <= val) return { roll: r, text: r <= 1 ? "대성공" : (r <= val/5 ? "극단적 성공" : (r <= val/2 ? "어려운 성공" : "성공")), class: "success-regular" };
        return { roll: r, text: r >= 96 ? "대실패" : "실패", class: "failure" };
    };
    
    const results = {
        p2: evalRoll(Math.min(rolls[0], rolls[1], rolls[2])),
        p1: evalRoll(Math.min(rolls[0], rolls[1])),
        p0: evalRoll(rolls[0]),
        n1: evalRoll(Math.max(rolls[0], rolls[1])),
        n2: evalRoll(Math.max(rolls[0], rolls[1], rolls[2])),
    };

    await sendChatMessage(sessionId, {
        type: 'bns_pnl_skill', sender: charName, skillName, skillValue: val,
        hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5),
        allRolls: rolls, results
    });
  };

  const handleExportLog = () => {
    const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Obscura Log ${sessionId}</title>
    <style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto;background:#f5f5f4;color:#292524;} .msg{margin-bottom:8px;} .sender{font-weight:bold;}</style>
    </head><body><h1>Log Export: ${sessionId}</h1>
    <div class="log">${messages.map(m => {
        if (m.type === 'html') return `<div>${m.text}</div>`;
        if (m.text?.startsWith('/img ')) return `<img src="${m.text.substring(5)}" style="max-width:100%;" />`;
        return `<div class="msg"><span class="sender">${m.sender || 'System'}:</span> ${m.text || ''}</div>`;
    }).reverse().join('')}</div></body></html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `log-${sessionId}.html`; a.click();
  };

  const handleCreateCharacter = async () => {
    if (!newCharName.trim() || !sessionId || !user) return;
    
    setIsCreatingChar(true);
    try {
        const nickname = sessionStorage.getItem('nickname') || 'Unknown';
        const tmpl = getNewCharacterTemplate(newCharName, user.uid, nickname);
        const newId = await addCharacter(sessionId, tmpl);
        setEditingCharId(newId);
        setShowCharCreation(false);
        setNewCharName('');
    } catch (error) {
        console.error("Creation failed", error);
        alert("캐릭터 생성 실패: " + (error as any).message);
    } finally {
        setIsCreatingChar(false);
    }
  };

  const renderCharacterList = () => (
    <div className="space-y-2 pb-4">
      {characters.map(char => {
          const maxHP = Math.floor(((char.stats.CON || 0) + (char.stats.SIZ || 0)) / 10);
          const maxMP = Math.floor((char.stats.POW || 0) / 5);
          return (
            <div 
                key={char.id} 
                className={`p-3 rounded border cursor-pointer hover:bg-stone-50 transition-colors bg-white border-stone-200 shadow-sm`}
                onClick={() => setEditingCharId(char.id)}
            >
                <div className="font-title font-bold text-stone-800">{char.name}</div>
                <div className="text-xs text-stone-500 mb-2">{char.player_name} {char.owner === user?.uid ? '(나)' : ''}</div>
                <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div className="bg-stone-100 rounded p-1">HP <b>{char.vitals.HP}</b>/{maxHP}</div>
                    <div className="bg-stone-100 rounded p-1">MP <b>{char.vitals.MP}</b>/{maxMP}</div>
                    <div className="bg-stone-100 rounded p-1">SAN <b>{char.vitals.SAN}</b></div>
                </div>
            </div>
          );
      })}
      <button 
        type="button"
        onClick={(e) => {
            e.preventDefault();
            if (!user) { alert('인증 정보를 불러오는 중입니다.'); return; }
            setNewCharName('');
            setShowCharCreation(true);
        }}
        className={`w-full text-sm mt-4 ${STYLES.BTN_PRIMARY} py-3 shadow-md cursor-pointer active:scale-95 transition-transform`}
      >
        + 새 캐릭터
      </button>
    </div>
  );

  if (!sessionId) return <SessionOverlay user={user} onJoin={handleJoinSession} />;

  const editingCharacter = characters.find(c => c.id === editingCharId);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden text-stone-800 relative bg-stone-100">
      {/* Header */}
      <header className={`flex items-center justify-between p-3 border-b border-stone-200 bg-white/90 backdrop-blur z-20 shadow-sm shrink-0`}>
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-title font-bold text-stone-900 hidden sm:block">Obscura</h1>
            <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 hidden xs:inline">Session:</span>
                <span className="font-mono bg-stone-100 px-2 py-0.5 rounded select-all font-bold text-stone-700 text-sm sm:text-base">{sessionId}</span>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(sessionId || '');
                        alert('복사됨');
                    }}
                    className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                </button>
            </div>
        </div>
        <div>
             <button className={STYLES.BTN} onClick={handleExportLog}>로그 백업</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex relative overflow-hidden">
        
        {/* Characters Panel */}
        <aside className={`
            flex-col ${STYLES.PANEL} overflow-hidden m-0 lg:m-4 lg:w-80 shrink-0 border-0 lg:border rounded-none lg:rounded-lg
            ${mobileTab === 'chars' ? 'flex w-full absolute inset-0 z-30' : 'hidden lg:flex'}
        `}>
             <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                <h3 className="font-title font-bold text-lg text-stone-700">캐릭터</h3>
            </div>
            <div className="p-4 overflow-y-auto flex-grow bg-white pb-24 lg:pb-4">
                {renderCharacterList()}
            </div>
        </aside>

        {/* Map Panel */}
        <div className={`
            flex-grow flex-col ${STYLES.PANEL} m-0 lg:m-4 overflow-hidden relative border-0 lg:border rounded-none lg:rounded-lg
            ${mobileTab === 'map' ? 'flex w-full' : 'hidden lg:flex'}
        `}>
            <div className="relative flex-grow bg-stone-200 overflow-hidden">
                {session?.scene.mapUrl && (
                    <div className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-all duration-500" style={{ backgroundImage: `url(${session.scene.mapUrl})` }} />
                )}
                
                {/* Visual Novel Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center z-10 pb-20 lg:pb-8">
                    <div className="w-11/12 max-w-4xl pointer-events-auto">
                        {(() => {
                            const lastVn = [...messages].reverse().find(m => m.type === 'vn-chat');
                            if (!lastVn) return null;
                            return (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
                                     {lastVn.portraitUrl && (
                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-40px] z-0">
                                             <img src={lastVn.portraitUrl} className="max-h-[50vh] drop-shadow-2xl" alt="portrait" />
                                         </div>
                                     )}
                                     <div className="relative z-10 bg-stone-900/90 backdrop-blur text-stone-100 p-4 sm:p-6 rounded-xl shadow-2xl border border-stone-700 cursor-pointer" onClick={() => {/* Close logic if needed */}}>
                                         {lastVn.sender !== '나레이션' && (
                                             <div className="absolute -top-4 left-6 bg-stone-800 px-4 py-1 rounded text-stone-300 font-title font-bold border border-stone-600">
                                                 {lastVn.sender}
                                             </div>
                                         )}
                                         <p className="text-base sm:text-lg leading-relaxed mt-2 whitespace-pre-wrap">{lastVn.text}</p>
                                     </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
            
            {/* Quick Controls */}
            {isKeeper && (
                <div className="p-2 border-t border-stone-200 bg-stone-50 flex items-center gap-4 overflow-x-auto shrink-0 pb-20 lg:pb-2">
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-stone-500 uppercase">Map</span>
                         <select 
                            className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} 
                            value={session?.scene.mapUrl} 
                            onChange={(e) => updateScene(session!.id, { mapUrl: e.target.value })}
                        >
                             <option value="">(None)</option>
                             {session?.scene.maps?.map(m => <option key={m.url} value={m.url}>{m.name}</option>)}
                         </select>
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-stone-500 uppercase">Handout</span>
                         <select 
                            className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} 
                            value={session?.scene.activeHandout || ''} 
                            onChange={(e) => updateScene(session!.id, { activeHandout: e.target.value })}
                        >
                             <option value="">(Close)</option>
                             {session?.scene.handouts?.map(h => <option key={h.url} value={h.url}>{h.name}</option>)}
                         </select>
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-stone-500 uppercase">BGM</span>
                         <select 
                            className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} 
                            value={session?.scene.bgmUrl} 
                            onChange={(e) => updateScene(session!.id, { bgmUrl: e.target.value })}
                         >
                             <option value="">(Stop)</option>
                             {session?.scene.bgms?.map(b => <option key={b.url} value={b.url}>{b.name}</option>)}
                         </select>
                     </div>
                     <button onClick={() => setShowKeeperTools(true)} className="text-xs px-2 py-1 bg-stone-700 text-white rounded hover:bg-stone-800 flex items-center gap-1 shrink-0">
                        <span>⚙️ 설정</span>
                     </button>
                </div>
            )}
        </div>

        {/* Chat Panel */}
        <aside className={`
            flex-col ${STYLES.PANEL} overflow-hidden m-0 lg:m-4 lg:w-96 shrink-0 border-0 lg:border rounded-none lg:rounded-lg
            ${mobileTab === 'chat' ? 'flex w-full absolute inset-0 z-30' : 'hidden lg:flex'}
        `}>
            <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
                <button onClick={() => setActiveTab('log')} className={`flex-1 py-3 text-sm font-bold font-title transition-colors ${activeTab === 'log' ? 'bg-white text-stone-800 border-t-2 border-t-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}>세션 로그</button>
                <button onClick={() => setActiveTab('ooc')} className={`flex-1 py-3 text-sm font-bold font-title transition-colors ${activeTab === 'ooc' ? 'bg-white text-stone-800 border-t-2 border-t-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}>잡담 (OOC)</button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 bg-stone-50/30">
                {activeTab === 'log' ? (
                    <div className="space-y-3">
                        {messages.filter(m => !['ooc-chat', 'ooc-dice'].includes(m.type)).map(msg => (
                            <ChatMessageItem key={msg.id} msg={msg} />
                        ))}
                        <div ref={logEndRef} />
                    </div>
                ) : (
                     <div className="space-y-2">
                        {messages.filter(m => ['ooc-chat', 'ooc-dice'].includes(m.type)).map(msg => (
                            <ChatMessageItem key={msg.id} msg={msg} />
                        ))}
                        <div ref={oocEndRef} />
                    </div>
                )}
            </div>

            <div className="bg-white border-t border-stone-200 shrink-0 pb-20 lg:pb-0">
                {activeTab === 'log' ? (
                    <>
                        <div className="p-3">
                            <select 
                                className="w-full mb-2 p-1 text-sm border border-stone-300 rounded text-stone-600 custom-select"
                                value={actingCharId}
                                onChange={(e) => setActingCharId(e.target.value)}
                            >
                                <option value="">/desc</option>
                                {characters.map(c => <option key={c.id} value={c.id}>{c.name} {c.owner === user?.uid ? '(나)' : ''}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={actingCharId ? `${actingChar?.name}(으)로 대화...` : "메시지 입력 (이미지 붙여넣기 가능)"}
                                    className={`flex-grow resize-none ${STYLES.INPUT} px-3 py-2 text-sm`}
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                                    }}
                                />
                                <button onClick={() => handleSendMessage()} className={STYLES.BTN_PRIMARY}>전송</button>
                            </div>
                        </div>
                        <ChatToolbar 
                            onSendHtml={(html) => handleSendMessage('/html ' + html)} 
                            onDiceRoll={(dice) => handleSendMessage('/r ' + dice)}
                            onImageUpload={handleSendImage}
                        />
                    </>
                ) : (
                     <div className="flex gap-2 p-3">
                        <input
                            type="text"
                            value={oocInput}
                            onChange={(e) => setOocInput(e.target.value)}
                            placeholder="잡담 입력..."
                            className={`flex-grow ${STYLES.INPUT} px-3 py-2 text-sm`}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendOoc()}
                        />
                        <button onClick={handleSendOoc} className={STYLES.BTN_PRIMARY}>전송</button>
                    </div>
                )}
            </div>
        </aside>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden flex border-t border-stone-200 bg-white text-xs shrink-0 z-50 fixed bottom-0 w-full shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
        <button 
            onClick={() => setMobileTab('chars')} 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'chars' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}
        >
            <span className="text-xl mb-1">👥</span>
            캐릭터
        </button>
        <button 
            onClick={() => setMobileTab('map')} 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'map' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}
        >
            <span className="text-xl mb-1">🗺️</span>
            맵
        </button>
        <button 
            onClick={() => setMobileTab('chat')} 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'chat' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}
        >
            <span className="text-xl mb-1">💬</span>
            채팅
        </button>
      </nav>

      {/* Overlays and Hidden Elements */}
      {session?.scene.bgmUrl && <YoutubePlayer url={session.scene.bgmUrl} />}
      
      {showKeeperTools && session && (
        <KeeperTools session={session} onClose={() => setShowKeeperTools(false)} />
      )}

      {showHandout && session?.scene.activeHandout && (
          <div 
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setShowHandout(false)}
          >
              <img src={session.scene.activeHandout} alt="Handout" className="max-w-full max-h-full shadow-2xl rounded" />
              <p className="absolute bottom-8 text-white/50 text-sm">클릭하여 닫기</p>
          </div>
      )}

      {/* Character Creation Modal */}
      {showCharCreation && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-sm ${STYLES.PANEL} p-6`}>
                <h3 className="text-lg font-bold mb-4 font-title">새 캐릭터 생성</h3>
                <input 
                    type="text" 
                    placeholder="캐릭터 이름" 
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className={`w-full px-4 py-2 ${STYLES.INPUT} mb-4`}
                    autoFocus
                />
                <div className="flex gap-2 justify-end">
                    <button 
                        onClick={() => { setShowCharCreation(false); setIsCreatingChar(false); }}
                        className={STYLES.BTN}
                        disabled={isCreatingChar}
                    >
                        취소
                    </button>
                    <button 
                        onClick={handleCreateCharacter}
                        className={STYLES.BTN_PRIMARY}
                        disabled={isCreatingChar}
                    >
                        {isCreatingChar ? '생성 중...' : '생성'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Character Sheet Modal */}
      {editingCharacter && sessionId && (
          <CharacterSheet 
            character={editingCharacter}
            sessionId={sessionId}
            userId={user?.uid}
            onClose={() => setEditingCharId(null)}
            onSkillRoll={(name, val) => handleSkillRoll(editingCharacter.name, name, val)}
            onBnPRoll={(name, val) => handleBnPRoll(editingCharacter.name, name, val)}
          />
      )}
    </div>
  );
};

export default App;