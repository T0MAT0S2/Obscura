import React, { useState } from 'react';
import { createSession, checkSessionExists } from '../services/firebase';
import { STYLES } from '../constants';
import { User } from 'firebase/auth';

interface Props {
  user: User | null;
  onJoin: (sessionId: string, nickname: string) => void;
}

const SessionOverlay: React.FC<Props> = ({ user, onJoin }) => {
  const [nickname, setNickname] = useState(sessionStorage.getItem('nickname') || '');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('플레이어 이름을 입력해주세요.'); return; }
    if (!user) { setError('인증 정보를 불러오는 중입니다...'); return; }
    
    setIsLoading(true);
    try {
      const newSessionId = await createSession(user.uid);
      sessionStorage.setItem('nickname', nickname);
      onJoin(newSessionId, nickname);
    } catch (e) {
      console.error(e);
      setError('세션 생성 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('플레이어 이름을 입력해주세요.'); return; }
    if (!sessionIdInput.trim()) { setError('세션 ID를 입력해주세요.'); return; }
    
    setIsLoading(true);
    try {
      const exists = await checkSessionExists(sessionIdInput.trim().toUpperCase());
      if (exists) {
        sessionStorage.setItem('nickname', nickname);
        onJoin(sessionIdInput.trim().toUpperCase(), nickname);
      } else {
        setError('존재하지 않는 세션 ID입니다.');
      }
    } catch (e) {
      console.error(e);
      setError('세션 참가 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
      <div className={`w-full max-w-md p-8 ${STYLES.PANEL}`}>
        <h1 className="text-4xl font-title mb-2 text-center text-stone-800">Obscura</h1>
        <p className="text-center mb-8 text-stone-500 font-title">CoC 7판 플레이를 위한 가상 테이블탑</p>
        
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="플레이어 이름" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={`w-full px-4 py-3 text-lg font-title ${STYLES.INPUT}`}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          
          <button 
            onClick={handleCreate}
            disabled={isLoading}
            className={`w-full py-3 text-lg font-title ${STYLES.BTN_PRIMARY}`}
          >
            {isLoading ? '처리 중...' : '새 세션 만들기'}
          </button>
          
          <div className="flex items-center gap-4">
            <hr className="flex-grow border-stone-200" />
            <span className="text-stone-400 text-sm">또는</span>
            <hr className="flex-grow border-stone-200" />
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="세션 ID" 
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value.toUpperCase())}
              className={`flex-1 px-4 py-3 font-title uppercase ${STYLES.INPUT}`}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button 
              onClick={handleJoin}
              disabled={isLoading}
              className={`px-6 py-3 font-title text-lg ${STYLES.BTN}`}
            >
              참가
            </button>
          </div>
        </div>
        
        <p className="text-red-600 text-center mt-4 h-5 text-sm font-medium">{error}</p>
      </div>
    </div>
  );
};

export default SessionOverlay;
