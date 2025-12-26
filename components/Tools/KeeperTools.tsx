import React, { useState } from 'react';
import { SessionData, MapData, BgmData, HandoutData } from '../../types';
import { updateScene } from '../../services/firebase';
import { STYLES } from '../../constants';

interface Props {
  session: SessionData;
  onClose: () => void;
}

const compressImage = (file: File, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(elem.toDataURL('image/png'));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

const KeeperTools: React.FC<Props> = ({ session, onClose }) => {
  const [activeTab, setActiveTab] = useState<'maps' | 'handouts' | 'bgm'>('maps');
  
  // Maps Input
  const [newMapName, setNewMapName] = useState('');
  const [mapFile, setMapFile] = useState<File | null>(null);
  
  // Handouts Input
  const [newHoName, setNewHoName] = useState('');
  const [hoFile, setHoFile] = useState<File | null>(null);

  // BGM Input
  const [newBgmName, setNewBgmName] = useState('');
  const [newBgmUrl, setNewBgmUrl] = useState('');

  const handleAddMap = async () => {
    if (mapFile) {
        const base64 = await compressImage(mapFile, 1024);
        const newMaps = [...(session.scene.maps || []), { name: newMapName || '새 배경', url: base64 }];
        await updateScene(session.id, { maps: newMaps });
        setNewMapName(''); setMapFile(null);
    }
  };

  const handleAddHandout = async () => {
    if (hoFile) {
        const base64 = await compressImage(hoFile, 800);
        const newHos = [...(session.scene.handouts || []), { name: newHoName || '새 핸드아웃', url: base64 }];
        await updateScene(session.id, { handouts: newHos });
        setNewHoName(''); setHoFile(null);
    }
  };

  const handleAddBgm = async () => {
    if (newBgmName && newBgmUrl) {
        const newBgms = [...(session.scene.bgms || []), { name: newBgmName, url: newBgmUrl }];
        await updateScene(session.id, { bgms: newBgms });
        setNewBgmName(''); setNewBgmUrl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg flex flex-col max-h-[80vh] ${STYLES.PANEL} overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-white">
          <h2 className="text-lg font-bold font-title text-stone-800">세션 설정</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
          </button>
        </div>
        
        <div className="flex bg-stone-100 border-b border-stone-200">
          {['maps', 'handouts', 'bgm'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 font-title font-bold text-stone-600 hover:bg-white hover:text-stone-800 transition-colors ${activeTab === tab ? 'bg-white text-stone-800 border-b-2 border-stone-800' : ''}`}
             >
                {{maps: '배경', handouts: '자료', bgm: 'BGM'}[tab]}
             </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-grow bg-stone-50">
            {activeTab === 'maps' && (
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-stone-700">배경 추가</label>
                        <div className="flex gap-2">
                            <input type="text" value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="이름 (예: 서재)" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                            <label className={`cursor-pointer ${STYLES.BTN_PRIMARY} flex items-center`}>
                                파일
                                <input type="file" accept="image/*" className="hidden" onChange={e => setMapFile(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        {mapFile && <div className="text-xs mt-1 text-stone-500">선택됨: {mapFile.name}</div>}
                        <button onClick={handleAddMap} className={`w-full mt-2 ${STYLES.BTN}`}>목록에 추가</button>
                    </div>
                    <h3 className="font-title font-bold text-stone-600 mt-6 border-b pb-1">배경 목록</h3>
                    <div className="space-y-2 mt-2">
                        {session.scene.maps?.map((m, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                <span className="font-medium">{m.name}</span>
                                <button onClick={() => updateScene(session.id, { mapUrl: m.url })} className="text-xs bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded border border-stone-300">적용</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'handouts' && (
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-stone-700">자료 추가</label>
                        <div className="flex gap-2">
                            <input type="text" value={newHoName} onChange={e => setNewHoName(e.target.value)} placeholder="이름 (예: 편지)" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                            <label className={`cursor-pointer ${STYLES.BTN_PRIMARY} flex items-center`}>
                                파일
                                <input type="file" accept="image/*" className="hidden" onChange={e => setHoFile(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        {hoFile && <div className="text-xs mt-1 text-stone-500">선택됨: {hoFile.name}</div>}
                        <button onClick={handleAddHandout} className={`w-full mt-2 ${STYLES.BTN}`}>목록에 추가</button>
                    </div>
                    <h3 className="font-title font-bold text-stone-600 mt-6 border-b pb-1">자료 목록</h3>
                    <div className="space-y-2 mt-2">
                         {session.scene.handouts?.map((h, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                <span className="font-medium">{h.name}</span>
                                <button onClick={() => updateScene(session.id, { activeHandout: h.url })} className="text-xs bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded border border-stone-300">전송</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'bgm' && (
                <div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-stone-700">BGM 추가</label>
                        <input type="text" value={newBgmName} onChange={e => setNewBgmName(e.target.value)} placeholder="제목" className={`w-full px-3 py-2 mb-2 ${STYLES.INPUT}`} />
                        <div className="flex gap-2">
                             <input type="text" value={newBgmUrl} onChange={e => setNewBgmUrl(e.target.value)} placeholder="YouTube URL" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                             <button onClick={handleAddBgm} className={STYLES.BTN_PRIMARY}>추가</button>
                        </div>
                    </div>
                    <h3 className="font-title font-bold text-stone-600 mt-6 border-b pb-1">BGM 목록</h3>
                    <div className="space-y-2 mt-2">
                         {session.scene.bgms?.map((b, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                <span className="font-medium truncate mr-2">{b.name}</span>
                                <button onClick={() => updateScene(session.id, { bgmUrl: b.url })} className="text-xs bg-stone-700 text-white hover:bg-stone-800 px-2 py-1 rounded">재생</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default KeeperTools;
