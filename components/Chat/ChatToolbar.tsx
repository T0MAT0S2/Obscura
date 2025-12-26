import React, { useState, useRef } from 'react';
import { STYLES } from '../../constants';

interface Props {
  onSendHtml: (html: string) => void;
  onDiceRoll: (dice: string) => void;
  onImageUpload?: (base64: string) => void;
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
                // Moderate quality to fit into Firestore limit
                resolve(elem.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

const ChatToolbar: React.FC<Props> = ({ onSendHtml, onDiceRoll, onImageUpload }) => {
  const [activeModal, setActiveModal] = useState<'gradient' | 'divider' | 'bullet' | 'intro' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gradient State
  const [gradText, setGradText] = useState('헤더 텍스트');
  const [gradStart, setGradStart] = useState('#B39EFB');
  const [gradEnd, setGradEnd] = useState('#381A93');

  // Divider State
  const [divColor, setDivColor] = useState('#B39EFB');

  // Bullet State
  const [bullText, setBullText] = useState('조사 포인트');
  const [bullColor, setBullColor] = useState('#B39EFB');

  // Intro State
  const [introData, setIntroData] = useState({
      topImg: '', type: 'CoC 7th edition fanmade scenario', titleKo: '', titleEn: '', writer: '',
      desc: '', kpc: '', pc: '', bottomImg: '',
      colorType: '#5D5D5D', colorTitleKo: '#5D5D5D', colorTitleEn: '#8C8C8C', colorLabel: '#5D5D5D', colorDesc: '#BDBDBD', colorDate: '#5D5D5D'
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImageUpload) {
          try {
              // Ensure image is small enough for Firestore
              const base64 = await compressImage(file, 600);
              onImageUpload(base64);
          } catch (error) {
              console.error("Image compression failed", error);
              alert("이미지 업로드 실패");
          }
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendGradient = () => {
    const html = `<div style="text-align:center;"><span style="text-decoration:none; font-style:normal; text-align:center; display:inline-block; color:#FFFFFF; letter-spacing:-1px; border-radius:20px; padding:5px 25px; margin: 4px 0; background-image:linear-gradient(135deg, ${gradStart}, ${gradEnd});">✷&nbsp; ${gradText} &nbsp;✷</span></div>`;
    onSendHtml(html);
    setActiveModal(null);
  };

  const sendDivider = () => {
    const html = `<div style="text-align:center; font-style: normal; text-decoration:none; margin: 4px 0;"><span style="color:${divColor};">───────</span><span style="color: ${divColor};">✷</span><span style="color:${divColor};">───────</span></div>`;
    onSendHtml(html);
    setActiveModal(null);
  };

  const sendBullet = () => {
    const points = bullText.split(',').map(p => p.trim()).filter(p => p);
    if (points.length) {
        const inline = points.map(p => `◈${p}`).join(' ');
        const html = `<div style="font-size:11pt; margin: 2px 0;"><span style="color:${bullColor}; text-decoration:none; font-weight:bold;">${inline}</span></div>`;
        onSendHtml(html);
    }
    setActiveModal(null);
  };

  const sendIntro = () => {
      const d = introData;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      let html = `<div style="font-family: 'ChosunIlboMyungjo', serif; text-align: center; padding: 10px; max-width: 100%;">`;
      if (d.topImg) html += `<img src="${d.topImg}" style="width: 100%; border-radius: 4px; margin-bottom: 10px;">`;
      html += `<div style="color: ${d.colorType}; font-size: 10px; margin-bottom: 5px;">${d.type}</div>`;
      html += `<div style="color: ${d.colorTitleKo}; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${d.titleKo}</div>`;
      if (d.titleEn) html += `<div style="color: ${d.colorTitleEn}; font-size: 12px; margin-bottom: 10px;">${d.titleEn}</div>`;
      html += `<div style="font-size: 12px; margin-bottom: 15px;"><span style="color: ${d.colorLabel}; font-weight: bold;">Written by</span> <span style="color: ${d.colorDesc};">${d.writer}</span></div>`;
      d.desc.split('\n').forEach(line => { html += `<div style="color: ${d.colorDesc}; font-size: 12px; font-style: italic; margin-bottom: 5px;">${line}</div>`; });
      html += `<div style="margin-top: 15px; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 10px;"><span style="color: ${d.colorLabel};">KPC</span> <span style="color: ${d.colorDesc}; margin-right: 10px;">${d.kpc}</span><span style="color: ${d.colorLabel};">PC</span> <span style="color: ${d.colorDesc};">${d.pc}</span></div>`;
      html += `<div style="font-size: 10px; margin-top: 5px; color: ${d.colorDate};">${todayStr}</div>`;
      if (d.bottomImg) html += `<img src="${d.bottomImg}" style="width: 100%; border-radius: 4px; margin-top: 10px;">`;
      html += `</div>`;
      onSendHtml(html.replace(/\n/g, ''));
      setActiveModal(null);
  };

  const Button = ({ label, onClick, className = '' }: any) => (
      <button onClick={onClick} className={`px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 bg-white text-stone-600 whitespace-nowrap ${className}`}>
          {label}
      </button>
  );

  return (
    <div className="flex flex-col gap-1 p-2 bg-stone-50 border-t border-stone-200">
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <div className="flex flex-wrap gap-2 justify-center">
            <Button label="이미지 업로드" onClick={() => fileInputRef.current?.click()} />
            <Button label="인트로" onClick={() => setActiveModal('intro')} />
            <Button label="판정박스" onClick={() => setActiveModal('gradient')} />
            <Button label="✷구분선" onClick={() => setActiveModal('divider')} />
            <Button label="◈조사" onClick={() => setActiveModal('bullet')} />
        </div>
        <div className="flex gap-1 justify-center overflow-x-auto pb-1 hide-scrollbar">
            {['1d3', '1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100'].map(d => (
                <button key={d} onClick={() => onDiceRoll(d)} className="px-1.5 py-1 text-xs rounded bg-stone-200 hover:bg-stone-300 text-stone-700 min-w-[32px] whitespace-nowrap">
                    {d}
                </button>
            ))}
        </div>

        {/* Modals */}
        {activeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                <div className={`w-full max-w-sm p-6 ${STYLES.PANEL} m-4`} onClick={e => e.stopPropagation()}>
                    {activeModal === 'gradient' && (
                        <>
                            <h3 className="font-bold mb-4">판정박스 생성</h3>
                            <input type="text" value={gradText} onChange={e => setGradText(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="텍스트" />
                            <div className="flex gap-2 mb-3">
                                <input type="color" value={gradStart} onChange={e => setGradStart(e.target.value)} className="flex-1 h-8 cursor-pointer" />
                                <input type="color" value={gradEnd} onChange={e => setGradEnd(e.target.value)} className="flex-1 h-8 cursor-pointer" />
                            </div>
                            <div className="w-full text-center text-white font-bold rounded-lg p-2 mb-4" style={{backgroundImage: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`, borderRadius: '20px'}}>✷ {gradText} ✷</div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                <button onClick={sendGradient} className={STYLES.BTN_PRIMARY}>확인</button>
                            </div>
                        </>
                    )}
                    
                    {activeModal === 'divider' && (
                        <>
                             <h3 className="font-bold mb-4">구분선 생성</h3>
                             <input type="color" value={divColor} onChange={e => setDivColor(e.target.value)} className="w-full h-8 cursor-pointer mb-4" />
                             <div className="text-center mb-4 font-bold" style={{color: divColor}}>─────── ✷ ───────</div>
                             <div className="flex justify-end gap-2">
                                <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                <button onClick={sendDivider} className={STYLES.BTN_PRIMARY}>확인</button>
                            </div>
                        </>
                    )}

                    {activeModal === 'bullet' && (
                        <>
                             <h3 className="font-bold mb-4">조사 포인트</h3>
                             <input type="text" value={bullText} onChange={e => setBullText(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="항목1, 항목2..." />
                             <input type="color" value={bullColor} onChange={e => setBullColor(e.target.value)} className="w-full h-8 cursor-pointer mb-4" />
                             <div className="mb-4">
                                <span style={{color: bullColor, fontWeight: 'bold'}}>◈</span> {bullText.split(',')[0]}
                             </div>
                             <div className="flex justify-end gap-2">
                                <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                <button onClick={sendBullet} className={STYLES.BTN_PRIMARY}>확인</button>
                            </div>
                        </>
                    )}

                    {activeModal === 'intro' && (
                        <div className="max-h-[80vh] overflow-y-auto pr-2">
                             <h3 className="font-bold mb-4">인트로 템플릿</h3>
                             <div className="space-y-2 text-sm">
                                <input placeholder="상단 이미지 URL" value={introData.topImg} onChange={e => setIntroData({...introData, topImg: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                <input placeholder="시나리오 타입" value={introData.type} onChange={e => setIntroData({...introData, type: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                <input placeholder="시나리오 제목 (한글)" value={introData.titleKo} onChange={e => setIntroData({...introData, titleKo: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                <input placeholder="영문 제목" value={introData.titleEn} onChange={e => setIntroData({...introData, titleEn: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                <input placeholder="작가" value={introData.writer} onChange={e => setIntroData({...introData, writer: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                <textarea placeholder="설명 (줄바꿈 구분)" value={introData.desc} onChange={e => setIntroData({...introData, desc: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} rows={3} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="KPC" value={introData.kpc} onChange={e => setIntroData({...introData, kpc: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                    <input placeholder="PC" value={introData.pc} onChange={e => setIntroData({...introData, pc: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                </div>
                                <input placeholder="하단 이미지 URL" value={introData.bottomImg} onChange={e => setIntroData({...introData, bottomImg: e.target.value})} className={`w-full p-2 ${STYLES.INPUT}`} />
                                
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    <input type="color" title="타입 색상" value={introData.colorType} onChange={e => setIntroData({...introData, colorType: e.target.value})} className="w-full h-8" />
                                    <input type="color" title="제목 색상" value={introData.colorTitleKo} onChange={e => setIntroData({...introData, colorTitleKo: e.target.value})} className="w-full h-8" />
                                    <input type="color" title="설명 색상" value={introData.colorDesc} onChange={e => setIntroData({...introData, colorDesc: e.target.value})} className="w-full h-8" />
                                </div>
                             </div>
                             <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                <button onClick={sendIntro} className={STYLES.BTN_PRIMARY}>전송</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ChatToolbar;