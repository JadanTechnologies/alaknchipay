
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

export const HeaderTools = () => {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Calculator State
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const safeEval = (expression: string): string => {
    try {
      // Safe calculator: only allow numbers, operators, and parentheses
      if (!/^[0-9+\-*/(). ]*$/.test(expression)) {
        return 'Error';
      }
      // Use Function constructor instead of eval for better security
      const fn = new Function('return ' + expression);
      const result = fn();
      return String(result);
    } catch (e) {
      return 'Error';
    }
  };

  const handleCalcClick = (val: string) => {
    if (val === 'C') {
        setCalcInput('');
        setCalcResult('');
    } else if (val === '=') {
        const result = safeEval(calcInput);
        setCalcResult(result);
    } else {
        setCalcInput(prev => prev + val);
    }
  };

  const calcButtons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    'C', '0', '=', '+'
  ];

  return (
    <div className="flex items-center gap-4 text-sm font-medium">
       {/* Clock */}
       <div className="flex items-center gap-2 bg-gray-100/10 px-3 py-1.5 rounded-full border border-gray-500/30 shadow-sm backdrop-blur-sm">
          <Icons.Clock size={14} className="text-blue-400" />
          <span className="font-mono text-xs md:text-sm">{time.toLocaleTimeString()}</span>
       </div>

       {/* Internet Indicator */}
       <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-sm transition-colors ${isOnline ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
          {isOnline ? <Icons.Wifi size={14} /> : <Icons.WifiOff size={14} />}
          <span className="hidden md:inline text-xs font-bold">{isOnline ? 'Online' : 'Offline'}</span>
       </div>

       {/* Calculator */}
       <div className="relative">
          <button 
            onClick={() => setShowCalculator(!showCalculator)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-sm transition active:scale-95"
            title="Calculator"
          >
             <Icons.Calculator size={14} />
             <span className="hidden md:inline text-xs font-bold">Calc</span>
          </button>
          
          {showCalculator && (
             <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                 <div className="mb-3 bg-gray-900 rounded p-3 text-right">
                     <div className="text-gray-400 text-xs h-4">{calcInput || '0'}</div>
                     <div className="text-white text-xl font-bold font-mono">{calcResult || calcInput || '0'}</div>
                 </div>
                 <div className="grid grid-cols-4 gap-2">
                     {calcButtons.map(btn => (
                         <button 
                            key={btn} 
                            onClick={() => handleCalcClick(btn)}
                            className={`p-3 rounded font-bold transition hover:bg-opacity-80 active:scale-95 ${
                                btn === 'C' ? 'bg-red-600 text-white' : 
                                btn === '=' ? 'bg-blue-600 text-white col-span-2' : 
                                ['/', '*', '-', '+'].includes(btn) ? 'bg-gray-700 text-blue-400' : 
                                'bg-gray-700 text-white'
                            }`}
                         >
                             {btn}
                         </button>
                     ))}
                 </div>
                 <button onClick={() => setShowCalculator(false)} className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300 py-1">Close</button>
             </div>
          )}
       </div>
    </div>
  )
}
