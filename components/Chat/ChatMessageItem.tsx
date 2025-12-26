import React from 'react';
import { ChatMessage } from '../../types';

interface Props {
  msg: ChatMessage;
}

const ChatMessageItem: React.FC<Props> = ({ msg }) => {
  const isHtml = msg.type === 'html';
  const isOocDice = msg.type === 'ooc-dice';
  const isOoc = msg.type === 'ooc-chat';
  const isVn = msg.type === 'vn-chat';
  const isIc = msg.type === 'ic-chat';
  const isDesc = msg.type === 'desc';
  const isDice = msg.type === 'dice';
  const isSkill = msg.type === 'skill';
  const isBnsPnl = msg.type === 'bns_pnl_skill';

  if (isHtml) {
    return <div dangerouslySetInnerHTML={{ __html: msg.text || '' }} />;
  }

  if (isOocDice) {
    return (
      <em className="text-xs text-center block my-1 text-stone-500">
        <strong className="text-stone-700">{msg.sender}</strong> 님이 {msg.text}
      </em>
    );
  }

  if (isOoc) {
    return (
      <div className="text-xs mb-1">
        <strong className="font-semibold text-stone-800">{msg.sender}:</strong> 
        <span className="text-stone-600 leading-relaxed ml-1">{msg.text}</span>
      </div>
    );
  }

  if (isVn || isIc) {
    if (msg.sender === '나레이션') {
      return (
        <div className="text-center font-bold my-4 text-lg leading-relaxed text-stone-800 shadow-white drop-shadow-sm">
          {msg.text?.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
        </div>
      );
    }
    return (
      <div className="my-2">
        <strong className="font-semibold text-stone-900">{msg.sender}:</strong>
        <span className="leading-relaxed text-stone-800 ml-1">
          {msg.text?.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
        </span>
      </div>
    );
  }

  if (isDesc) {
    const rawText = msg.text || '';
    if (rawText.startsWith('/img ')) {
      return <img src={rawText.substring(5)} className="w-full object-cover max-h-[250px] rounded-lg border border-stone-200 my-2" alt="Scene" />;
    }
    // Simple parsing for log special commands if stored as text
    if (rawText.startsWith('/title ')) return <h2 className="font-title text-xl font-bold text-center my-4 py-2 px-4 bg-stone-700 text-white rounded">{rawText.substring(7)}</h2>;
    
    // Default desc
    return <div className="text-stone-500 italic pl-2 border-l-2 border-stone-200 my-1">{rawText}</div>;
  }

  if (isDice) {
    return (
      <em className="text-xs text-center block my-1 text-stone-500">
        <strong className="text-stone-700">{msg.sender}</strong> 님이 {msg.text}
      </em>
    );
  }

  if (isSkill) {
    return (
      <div className="border-2 border-stone-700 rounded-md my-2 text-sm overflow-hidden shadow-sm bg-white">
        <div className="font-bold text-center py-1 px-2 font-title bg-stone-700 text-white">{msg.skillName}</div>
        <div className="grid grid-cols-[auto_1fr] divide-y divide-stone-200">
          <div className="p-2 font-semibold bg-stone-100 text-stone-600">기준치</div>
          <div className="p-2 flex justify-end items-center text-right font-mono">{msg.skillValue} / {msg.hardValue} / {msg.extremeValue}</div>
          <div className="p-2 font-semibold bg-stone-100 text-stone-600">굴림</div>
          <div className="p-2 flex justify-end items-center font-mono text-lg font-bold">{msg.roll}</div>
          <div className="p-2 font-semibold bg-stone-100 text-stone-600">결과</div>
          <div className={`p-2 text-right font-bold ${msg.resultClass === 'failure' || msg.resultClass === 'fumble' ? 'text-red-600' : 'text-green-700'}`}>{msg.resultText}</div>
        </div>
      </div>
    );
  }

  if (isBnsPnl && msg.results) {
      const order = ['p2', 'p1', 'p0', 'n1', 'n2'];
      const resultsArray = Object.entries(msg.results)
        .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
        .map(([level, res]) => {
          const r = res as { roll: number, text: string, class: string };
          return {
            level,
            roll: r.roll,
            text: r.text,
            class: r.class
          };
        });
      
      const levelMap: any = {p2:'+2',p1:'+1',p0:'0',n1:'-1',n2:'-2'};
      const gridClass = "grid grid-cols-[4.5rem_1fr]";
      
      return (
        <div className="border-2 border-purple-800 rounded-md my-2 text-sm overflow-hidden shadow-sm bg-white">
          <div className="font-bold text-center py-1 px-2 font-title bg-purple-800 text-white">{msg.skillName} (B/P)</div>
          
          {/* Info Section */}
          <div className={`${gridClass} divide-y divide-stone-200 border-b border-stone-200`}>
              <div className="p-2 font-semibold bg-stone-100 text-stone-600 border-r border-stone-200 flex items-center justify-center">기준치</div>
              <div className="p-2 flex justify-end items-center text-right font-mono">{msg.skillValue} / {msg.hardValue} / {msg.extremeValue}</div>
              <div className="p-2 font-semibold bg-stone-100 text-stone-600 border-r border-stone-200 flex items-center justify-center">굴림</div>
              <div className="p-2 flex justify-end items-center font-mono text-lg font-bold space-x-2">
                {msg.allRolls?.map((r, i) => <span key={i} className={i > 0 ? 'text-purple-700' : ''}>{r}</span>)}
              </div>
          </div>
          
          {/* Results Section */}
          <div className="divide-y divide-stone-200">
              {resultsArray.map((res) => (
                  <div key={res.level} className={gridClass}>
                      <div className="p-2 font-semibold text-center bg-stone-100 text-stone-600 flex items-center justify-center border-r border-stone-200">{levelMap[res.level]}</div>
                      <div className={`p-2 text-right font-semibold ${res.class === 'failure' ? 'text-red-600' : 'text-green-700'}`}>
                          {res.text} ({res.roll})
                      </div>
                  </div>
              ))}
          </div>
        </div>
      );
  }

  return <div>Unknown message type</div>;
};

export default React.memo(ChatMessageItem);