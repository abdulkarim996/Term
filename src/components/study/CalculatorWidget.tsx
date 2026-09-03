import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { evaluate } from 'mathjs';
import { X } from 'lucide-react';

interface CalculatorWidgetProps {
  onClose: () => void;
}

export default function CalculatorWidget({ onClose }: CalculatorWidgetProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [activeTab, setActiveTab] = useState<'123' | 'fx'>('123');

  const handleInput = (val: string) => {
    setExpression((prev) => prev + val);
  };

  const handleClear = () => {
    setExpression('');
    setResult('');
  };

  const handleDelete = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const calculate = () => {
    try {
      if (!expression) return;
      const res = evaluate(expression);
      setResult(Number.isInteger(res) ? res.toString() : Number(res.toFixed(8)).toString());
    } catch (error) {
      setResult('Error');
    }
  };

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? window.innerWidth - 350 : 50,
        y: 100,
        width: 320,
        height: 'auto',
      }}
      minWidth={320}
      maxWidth={400}
      bounds="window"
      dragHandleClassName="drag-handle"
      className="z-[9999]"
    >
      <div className="bg-[#121212] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl bg-opacity-95 text-white">
        {/* Header / Drag Handle */}
        <div className="drag-handle bg-[#1e1e1e] p-3 flex justify-between items-center cursor-move border-b border-gray-800 select-none">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
          </div>
          <span className="text-gray-400 font-semibold text-xs tracking-widest uppercase">Calculator</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer z-50">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Display */}
        <div className="p-5 bg-[#121212] flex flex-col justify-end items-end h-28 border-b border-gray-800">
          <div className="text-gray-400 text-lg w-full text-right overflow-hidden break-all h-10 flex items-end justify-end tracking-wider">
            {expression || '0'}
          </div>
          <div className="text-white text-3xl font-bold w-full text-right overflow-hidden mt-1 truncate">
            {result ? `= ${result}` : ''}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#1e1e1e] p-1 mx-4 mt-4 rounded-lg">
          <button
            onClick={() => setActiveTab('123')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === '123' ? 'bg-[#2a2a2a] text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            123
          </button>
          <button
            onClick={() => setActiveTab('fx')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'fx' ? 'bg-[#2a2a2a] text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            f(x)
          </button>
        </div>

        {/* Keypad */}
        <div className="p-4 select-none">
          {activeTab === '123' ? (
            <div className="grid grid-cols-4 gap-3">
              <button onClick={handleClear} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-red-400 rounded-xl font-medium text-lg transition-colors">C</button>
              <button onClick={() => handleInput('(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">(</button>
              <button onClick={() => handleInput(')')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">)</button>
              <button onClick={() => handleInput('/')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">÷</button>

              <button onClick={() => handleInput('7')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">7</button>
              <button onClick={() => handleInput('8')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">8</button>
              <button onClick={() => handleInput('9')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">9</button>
              <button onClick={() => handleInput('*')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">×</button>

              <button onClick={() => handleInput('4')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">4</button>
              <button onClick={() => handleInput('5')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">5</button>
              <button onClick={() => handleInput('6')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">6</button>
              <button onClick={() => handleInput('-')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">−</button>

              <button onClick={() => handleInput('1')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">1</button>
              <button onClick={() => handleInput('2')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">2</button>
              <button onClick={() => handleInput('3')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-medium text-xl transition-colors">3</button>
              <button onClick={() => handleInput('+')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-blue-400 rounded-xl font-medium text-lg transition-colors">+</button>

              <button onClick={() => handleInput('0')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] col-span-2 rounded-xl font-medium text-xl transition-colors">0</button>
              <button onClick={() => handleInput('.')} className="h-12 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded-xl font-bold text-xl transition-colors">.</button>
              <button onClick={calculate} className="h-12 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-2xl shadow-lg shadow-blue-500/20 transition-all">=</button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => handleInput('sin(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">sin</button>
              <button onClick={() => handleInput('cos(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">cos</button>
              <button onClick={() => handleInput('tan(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">tan</button>
              <button onClick={() => handleInput('log10(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">log</button>

              <button onClick={() => handleInput('log(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">ln</button>
              <button onClick={() => handleInput('sqrt(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">√</button>
              <button onClick={() => handleInput('^')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">^</button>
              <button onClick={() => handleInput('!')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">!</button>

              <button onClick={() => handleInput('pi')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">π</button>
              <button onClick={() => handleInput('e')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">e</button>
              <button onClick={() => handleInput('(')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">(</button>
              <button onClick={() => handleInput(')')} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-medium text-sm transition-colors">)</button>

              <button onClick={handleDelete} className="h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-red-400 col-span-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1 transition-colors">
                DEL
              </button>
              <button onClick={calculate} className="h-12 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-2xl shadow-lg shadow-blue-500/20 col-span-2 transition-all">=</button>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
