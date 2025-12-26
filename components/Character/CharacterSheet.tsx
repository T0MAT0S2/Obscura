import React, { useRef, useState, useEffect } from 'react';
import { Character, CharacterStats } from '../../types';
import { updateCharacter } from '../../services/firebase';
import { STYLES, ATTRIBUTE_MAPPING } from '../../constants';

interface Props {
  character: Character;
  sessionId: string;
  userId: string | undefined;
  onClose: () => void;
  onSkillRoll: (name: string, val: number) => void;
  onBnPRoll: (name: string, val: number) => void;
}

// Default skill list
const BASE_SKILLS_DEFAULTS: Record<string, number> = { 
    "관찰력": 25, "자료조사": 20, "듣기": 20, "도약": 20, "말재주": 5, "매혹": 15, 
    "변장": 5, "설득": 10, "손놀림": 10, "수영": 20, "승마": 5, "심리학": 10, 
    "위협": 15, "은밀행동": 20, "추적": 10, "투척": 20, "근접전(격투)": 25, 
    "사격(권총)": 20, "사격(소총/산탄총)": 25, "회피": 0,
    "기계수리": 10, "열쇠공": 1, "전기수리": 10, "자동차 운전": 20, "중장비 조작": 1, 
    "고고학": 1, "역사": 5, "오컬트": 5, "의료": 1, "인류학": 1, "자연": 10, 
    "정신분석": 1, "크툴루 신화": 0, "회계": 5, "모국어": 0,
    "예술/공예": 5, "과학": 1, "생존술": 10, "응급처치": 30, "오르기": 20, 
    "재력": 0, "항법": 10 
};

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

const CharacterSheet: React.FC<Props> = ({ character, sessionId, userId, onClose, onSkillRoll, onBnPRoll }) => {
    const isOwner = character.owner === userId;
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Draggable State
    const [position, setPosition] = useState({ x: 20, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (window.innerWidth > 800) {
            setPosition({ 
                x: Math.max(0, (window.innerWidth - 800) / 2), 
                y: 40 
            });
        }
        
        // Ensure data integrity for new fields
        if (character.derived === undefined) handleUpdate('derived', { damage_bonus: '0', build: 0 });
        if (character.vitals.majorWound === undefined) handleUpdate('vitals.majorWound', false);
        if (character.vitals.dying === undefined) handleUpdate('vitals.dying', false);
        
        // Auto-calculate derived stats
        const { db, build, mov } = calculateDerived(character.stats, character.age);
        if (character.derived?.damage_bonus !== db || character.derived?.build !== build) {
             handleUpdate('derived', { damage_bonus: db, build });
        }
        if (character.stats.MOV !== mov && character.stats.MOV !== undefined) {
             handleUpdate('stats.MOV', mov);
        }
    }, [character.stats.STR, character.stats.SIZ, character.stats.DEX, character.age]); // Recalculate when relevant stats change

    // Drag Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleUpdate = async (path: string, value: any) => {
        if (!isOwner) return;
        await updateCharacter(sessionId, character.id, { [path]: value } as any);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await compressImage(e.target.files[0], 300);
            handleUpdate('portraitUrl', base64);
        }
    };

    const calculateDerived = (stats: CharacterStats, age: number) => {
        const { STR = 0, SIZ = 0, DEX = 0 } = stats || {};
        let db = '0';
        let build = 0;
        const total = STR + SIZ;
        
        if (total < 65) { db = '-2'; build = -2; }
        else if (total < 85) { db = '-1'; build = -1; }
        else if (total < 125) { db = '0'; build = 0; }
        else if (total < 165) { db = '1d4'; build = 1; }
        else if (total < 205) { db = '1d6'; build = 2; }
        else {
            const extra = Math.ceil((total - 204) / 80);
            db = `${1 + extra}d6`;
            build = 2 + extra;
        }
    
        let mov = 8;
        if (DEX < SIZ && STR < SIZ) mov = 7;
        else if (DEX > SIZ && STR > SIZ) mov = 9;
        
        if (age >= 40) mov -= 1;
        if (age >= 50) mov -= 1;
        if (age >= 60) mov -= 1;
        if (age >= 70) mov -= 1;
        if (age >= 80) mov -= 1;
        
        return { db, build, mov };
    };

    const DICE_ICON = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor"><path d="M384 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h320c35.35 0 64-28.65 64-64V96C448 60.65 419.3 32 384 32zM384 432H64c-8.822 0-16-7.178-16-16V96c0-8.822 7.178-16 16-16h320c8.822 0 16 7.178 16 16v320C400 424.8 392.8 432 384 432z M128 128c17.67 0 32-14.33 32-32S145.7 64 128 64S96 78.33 96 96S110.3 128 128 128z M320 128c17.67 0 32-14.33 32-32S337.7 64 320 64S288 78.33 288 96S302.3 128 320 128z M320 384c17.67 0 32-14.33 32-32S337.7 320 320 320S288 334.3 288 352S302.3 384 320 384z M128 384c17.67 0 32-14.33 32-32S145.7 320 128 320S96 334.3 96 352S110.3 384 128 384z M224 224c-17.67 0-32 14.33-32 32s14.33 32 32 32s32-14.33 32-32S241.7 224 224 224z"/></svg>;

    const RollButton = ({ onClick }: any) => (
        <button onClick={(e) => { e.stopPropagation(); onClick(e); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors" title="일반 판정">{DICE_ICON}</button>
    );
    const BnPButton = ({ onClick }: any) => (
        <button onClick={(e) => { e.stopPropagation(); onClick(e); }} className="p-1 hover:bg-purple-50 rounded text-purple-600 transition-colors" title="보너스/페널티">{DICE_ICON}</button>
    );

    const maxHP = Math.floor(((character.stats.CON || 0) + (character.stats.SIZ || 0)) / 10);
    const maxMP = Math.floor((character.stats.POW || 0) / 5);
    const maxSAN = 99 - (character.skills['크툴루 신화'] || 0);
    const majorWoundThreshold = Math.floor(maxHP / 2);

    const skills = { ...BASE_SKILLS_DEFAULTS, ...character.skills };
    if (!character.skills['회피']) skills['회피'] = Math.floor((character.stats.DEX || 0) / 2);
    if (!character.skills['모국어']) skills['모국어'] = character.stats.EDU || 0;
    
    const sortedSkillNames = Object.keys(skills).sort((a, b) => a.localeCompare(b, 'ko'));

    return (
        <div 
            className={`fixed z-[60] w-full max-w-[50rem] flex flex-col ${STYLES.PANEL} shadow-2xl border-stone-300 bg-[#f8f7f5]`}
            style={{ left: position.x, top: position.y, maxHeight: '85vh' }}
        >
            {/* Drag Header */}
            <div className="flex justify-between items-center p-3 border-b border-stone-300 cursor-move bg-[#e7e5e4] rounded-t-lg select-none" onMouseDown={handleMouseDown}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-stone-700 rounded-full flex items-center justify-center text-white text-xs font-bold font-title">CoC</div>
                    <span className="font-title font-bold text-stone-800 tracking-wide">{character.name || 'Character Sheet'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-stone-500 hover:text-red-600">✕</button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 scrollbar-thin bg-[#f8f7f5] flex-grow">
                
                {/* Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 bg-white p-4 rounded border border-stone-200 shadow-sm">
                    <div className="flex flex-col items-center gap-2 w-full sm:w-28">
                        {character.portraitUrl ? (
                            <img src={character.portraitUrl} className="w-24 h-24 object-cover rounded border border-stone-300 shadow-inner" />
                        ) : (
                            <div className="w-24 h-24 bg-stone-100 rounded border border-stone-300 flex items-center justify-center text-stone-300 text-4xl">?</div>
                        )}
                        {isOwner && (
                            <>
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-stone-200 px-2 py-1 rounded hover:bg-stone-300 text-stone-600">사진 변경</button>
                            </>
                        )}
                    </div>
                    <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="col-span-2">
                            <span className="block text-xs text-stone-400 font-bold mb-0.5">이름</span>
                            <input type="text" value={character.name} onChange={(e) => handleUpdate('name', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent py-0.5 font-bold"/>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-xs text-stone-400 font-bold mb-0.5">플레이어</span>
                            <input type="text" value={character.player_name} onChange={(e) => handleUpdate('player_name', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent py-0.5"/>
                        </div>
                        <div><span className="text-xs text-stone-400 font-bold">나이</span><input type="number" value={character.age} onChange={(e) => handleUpdate('age', parseInt(e.target.value))} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent"/></div>
                        <div><span className="text-xs text-stone-400 font-bold">성별</span><input type="text" value={character.sex || ''} onChange={(e) => handleUpdate('sex', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent"/></div>
                        <div><span className="text-xs text-stone-400 font-bold">키</span><input type="text" value={character.height || ''} onChange={(e) => handleUpdate('height', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent"/></div>
                        <div>
                            <span className="text-xs text-stone-400 font-bold">이동력</span>
                            <input type="number" value={character.stats.MOV || 8} disabled className="w-full border-b border-stone-300 bg-transparent text-center font-bold text-stone-600"/>
                        </div>
                        <div className="col-span-2 flex gap-4 text-xs mt-1 text-stone-500">
                            <span>피해 보너스: <b>{character.derived?.damage_bonus}</b></span>
                            <span>체구: <b>{character.derived?.build}</b></span>
                        </div>
                    </div>
                </div>

                {/* Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* HP */}
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-title font-bold text-lg text-stone-700">체력</span>
                            <div className="flex flex-col items-end gap-1 text-[10px]">
                                <label className="flex items-center" title={`중상 기준: ${majorWoundThreshold}`}><input type="checkbox" checked={character.vitals.majorWound} onChange={e => handleUpdate('vitals.majorWound', e.target.checked)} disabled={!isOwner} className="mr-1"/>중상 <span className="text-stone-400 ml-1">({majorWoundThreshold})</span></label>
                                <label className="flex items-center"><input type="checkbox" checked={character.vitals.dying} onChange={e => handleUpdate('vitals.dying', e.target.checked)} disabled={!isOwner} className="mr-1"/>사망</label>
                            </div>
                        </div>
                        <div className="flex items-end justify-center text-xl font-mono">
                            <input 
                                type="number" 
                                value={character.vitals.HP} 
                                onChange={e => handleUpdate('vitals.HP', e.target.value === '' ? 0 : parseInt(e.target.value))} 
                                disabled={!isOwner} 
                                className="w-12 text-center border-b-2 border-stone-800 bg-transparent outline-none focus:border-stone-500 focus:bg-stone-50 transition-colors"
                            />
                            <span className="text-stone-400 mx-1">/</span>
                            <span className="text-stone-500 text-lg">{maxHP}</span>
                        </div>
                    </div>
                    
                    {/* SAN */}
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1">
                                <span className="font-title font-bold text-lg text-stone-700">이성</span>
                                <RollButton onClick={() => onSkillRoll('이성', character.vitals.SAN)} />
                            </div>
                            <div className="flex gap-2 text-[10px]">
                                <label className="flex items-center"><input type="checkbox" checked={character.vitals.temporaryInsanity} onChange={e => handleUpdate('vitals.temporaryInsanity', e.target.checked)} disabled={!isOwner} className="mr-1"/>일시</label>
                                <label className="flex items-center"><input type="checkbox" checked={character.vitals.indefiniteInsanity} onChange={e => handleUpdate('vitals.indefiniteInsanity', e.target.checked)} disabled={!isOwner} className="mr-1"/>장기</label>
                            </div>
                        </div>
                        <div className="flex items-end justify-center text-xl font-mono">
                            <input 
                                type="number" 
                                value={character.vitals.SAN} 
                                onChange={e => handleUpdate('vitals.SAN', e.target.value === '' ? 0 : parseInt(e.target.value))} 
                                disabled={!isOwner} 
                                className="w-12 text-center border-b-2 border-stone-800 bg-transparent outline-none focus:border-stone-500 focus:bg-stone-50 transition-colors"
                            />
                            <span className="text-stone-400 mx-1">/</span>
                            <span className="text-stone-500 text-lg">{maxSAN}</span>
                            <span className="text-[10px] text-stone-400 ml-2">(시작 {character.vitals.initialSAN})</span>
                        </div>
                    </div>

                    {/* MP */}
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <span className="font-title font-bold text-lg text-stone-700">마력</span>
                                <RollButton onClick={() => onSkillRoll('마력', character.vitals.MP)} />
                            </div>
                            <div className="text-lg font-mono">
                                <input 
                                    type="number" 
                                    value={character.vitals.MP} 
                                    onChange={e => handleUpdate('vitals.MP', e.target.value === '' ? 0 : parseInt(e.target.value))} 
                                    disabled={!isOwner} 
                                    className="w-10 text-center border-b-2 border-stone-800 bg-transparent outline-none focus:border-stone-500 focus:bg-stone-50 transition-colors"
                                />
                                <span className="text-stone-400 mx-1">/</span>
                                <span className="text-stone-500 text-base">{maxMP}</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-stone-400 text-right mt-auto">매 시간 1 회복</div>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white p-3 rounded border border-stone-200 shadow-sm">
                    <h3 className="font-title font-bold text-base text-stone-600 mb-2 border-b border-stone-100">특성치</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {Object.entries(ATTRIBUTE_MAPPING).filter(([k]) => k !== 'MOV').map(([key, label]) => {
                            const val = (key === 'LUCK') ? character.vitals.LUCK : (character.stats as any)[key];
                            const path = (key === 'LUCK') ? 'vitals.LUCK' : `stats.${key}`;
                            return (
                                <div key={key} className="flex flex-col items-center bg-stone-50 p-2 rounded border border-stone-100">
                                    <div className="text-[10px] font-bold text-stone-500 mb-1">{label}</div>
                                    <div className="flex items-center w-full gap-2">
                                        <input 
                                            type="number" 
                                            value={val} 
                                            onChange={e => {
                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                handleUpdate(path, value);
                                                if (key === 'POW') {
                                                    handleUpdate('vitals.initialSAN', value);
                                                }
                                            }}
                                            disabled={!isOwner} 
                                            className="flex-1 w-full text-center text-sm font-bold bg-white border border-stone-200 rounded py-0.5 min-w-0"
                                        />
                                        <div className="flex gap-1 shrink-0">
                                            <RollButton onClick={() => onSkillRoll(label, val)} />
                                            <BnPButton onClick={() => onBnPRoll(label, val)} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Skills */}
                <div className="bg-white p-4 rounded border border-stone-200 shadow-sm">
                    <h3 className="font-title font-bold text-lg mb-3 border-b border-stone-100 pb-1 flex justify-between items-center">
                        <span>기능</span>
                        <span className="text-[10px] text-stone-400 font-normal">체크박스는 성장용</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                        {sortedSkillNames.map(name => {
                            const val = skills[name];
                            const defaultVal = BASE_SKILLS_DEFAULTS[name] !== undefined ? BASE_SKILLS_DEFAULTS[name] : 0;
                            return (
                                <div key={name} className="flex justify-between items-center text-sm py-0.5 border-b border-stone-50 hover:bg-stone-50 px-1">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <input type="checkbox" className="w-3 h-3 rounded-sm border-stone-300 text-stone-600 focus:ring-0" />
                                        <span className="truncate" title={name}>{name} <span className="text-stone-300 text-[10px]">({defaultVal})</span></span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input type="number" value={val} onChange={e => handleUpdate(`skills.${name}`, parseInt(e.target.value))} disabled={!isOwner} className="w-9 text-center border border-stone-200 rounded p-0.5 text-xs bg-white" />
                                        <div className="flex">
                                            <RollButton onClick={() => onSkillRoll(name, val)} />
                                            <BnPButton onClick={() => onBnPRoll(name, val)} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {isOwner && (
                        <div className="mt-4 flex gap-2">
                            <input id="new-skill-name" type="text" placeholder="새 기능 이름" className="flex-grow px-2 py-1 text-sm border border-stone-300 rounded" />
                            <input id="new-skill-val" type="number" placeholder="%" className="w-16 px-2 py-1 text-sm border border-stone-300 rounded" />
                            <button onClick={() => {
                                const nameInput = document.getElementById('new-skill-name') as HTMLInputElement;
                                const valInput = document.getElementById('new-skill-val') as HTMLInputElement;
                                if (nameInput.value && valInput.value) {
                                    handleUpdate(`skills.${nameInput.value}`, parseInt(valInput.value));
                                    nameInput.value = ''; valInput.value = '';
                                }
                            }} className="bg-stone-200 px-3 py-1 rounded text-sm hover:bg-stone-300">추가</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterSheet;