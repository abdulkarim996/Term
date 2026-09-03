import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Settings, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface CalculatorWidgetProps {
  onClose: () => void;
}

interface CalcButton {
  label: string;
  latex?: string;
  action?: string;
  isNum?: boolean;
  isOp?: boolean;
  isOrange?: boolean;
  isTeal?: boolean;
  rowSpan?: number;
}

export default function CalculatorWidget({ onClose }: CalculatorWidgetProps) {
  const [activeTab, setActiveTab] = useState<'123' | 'fx'>('123');
  const [isClient, setIsClient] = useState(false);
  const mfRef = useRef<any>(null);

  // Initialize ComputeEngine instance for advanced math parsing
  const ce = useRef<any>(null);

  useEffect(() => {
    // Import heavy math libraries from CDN to completely bypass Vite bundling and prevent Vercel OOM
    if (typeof window !== 'undefined') {
      Promise.all([
        // @ts-ignore
        import('https://esm.sh/mathlive'),
        // @ts-ignore
        import('https://esm.sh/@cortex-js/compute-engine')
      ]).then(([_, cortex]) => {
        ce.current = new cortex.ComputeEngine();
        setIsClient(true);
      }).catch(err => console.error("Failed to load math libraries", err));
    }
  }, []);

  const handleAction = (btn: any) => {
    const mf = mfRef.current;
    if (!mf) return;

    if (btn.action === 'ac') {
      mf.value = '';
    } else if (btn.action === 'del') {
      mf.executeCommand('deleteBackward');
    } else if (btn.action === 'exec') {
      try {
        if (ce.current) {
          // Extract math-json from MathLive, evaluate it using CortexJS, and set result
          const mathJson = mf.getValue('math-json');
          const evaluated = ce.current.box(mathJson).evaluate().latex;
          mf.value = evaluated;
        }
      } catch (e) {
        console.error('Math evaluation error:', e);
      }
    } else if (btn.latex) {
      mf.executeCommand(['insert', btn.latex]);
    }
    
    // Maintain focus on the mathfield
    mf.focus();
  };

  const basicButtons: CalcButton[] = [
    { label: 'x', latex: 'x' }, { label: 'y', latex: 'y' }, { label: '□/□', latex: '\\frac{#?}{#?}' }, { label: 'x^□', latex: '^{#?}' },
    { label: '7', latex: '7', isNum: true }, { label: '8', latex: '8', isNum: true }, { label: '9', latex: '9', isNum: true },
    { label: '÷', latex: '\\div', isOp: true }, { label: 'AC', action: 'ac', isOrange: true },

    { label: '√□', latex: '\\sqrt{#?}' }, { label: '∛□', latex: '\\sqrt[3]{#?}' }, { label: 'π', latex: '\\pi' }, { label: 'e', latex: 'e' },
    { label: '4', latex: '4', isNum: true }, { label: '5', latex: '5', isNum: true }, { label: '6', latex: '6', isNum: true },
    { label: '×', latex: '\\times', isOp: true }, { label: 'DEL', action: 'del' },

    { label: 'sin', latex: '\\sin(' }, { label: 'cos', latex: '\\cos(' }, { label: 'tan', latex: '\\tan(' }, { label: 'log', latex: '\\log_{10}(' },
    { label: '1', latex: '1', isNum: true }, { label: '2', latex: '2', isNum: true }, { label: '3', latex: '3', isNum: true },
    { label: '−', latex: '-', isOp: true }, { label: 'EXEC', action: 'exec', isTeal: true, rowSpan: 2 },

    { label: '(', latex: '(' }, { label: ')', latex: ')' }, { label: '|□|', latex: '\\left|#?\\right|' }, { label: ',', latex: ',' },
    { label: '0', latex: '0', isNum: true }, { label: '.', latex: '.', isNum: true }, { label: '10^x', latex: '10^{#?}' },
    { label: '+', latex: '+', isOp: true }
  ];

  const fxButtons: CalcButton[] = [
    { label: 'sin⁻¹', latex: '\\arcsin(' }, { label: 'cos⁻¹', latex: '\\arccos(' }, { label: 'tan⁻¹', latex: '\\arctan(' }, { label: 'lim', latex: '\\lim_{x \\to #?}' }, { label: 'd/dx', latex: '\\frac{d}{dx} #?' }, { label: '∫', latex: '\\int_{#?}^{#?} #? \\, dx' }, { label: '÷', latex: '\\div', isOp: true }, { label: 'AC', action: 'ac', isOrange: true },

    { label: 'sinh', latex: '\\sinh(' }, { label: 'cosh', latex: '\\cosh(' }, { label: 'tanh', latex: '\\tanh(' }, { label: 'Σ', latex: '\\sum_{#?}^{#?} #?' }, { label: 'Π', latex: '\\prod_{#?}^{#?} #?' }, { label: '∞', latex: '\\infty' }, { label: '×', latex: '\\times', isOp: true }, { label: 'DEL', action: 'del' },

    { label: '<', latex: '<' }, { label: '>', latex: '>' }, { label: '≤', latex: '\\le' }, { label: '≥', latex: '\\ge' }, { label: '=', latex: '=' }, { label: '≠', latex: '\\neq' }, { label: '−', latex: '-', isOp: true }, { label: 'EXEC', action: 'exec', isTeal: true, rowSpan: 2 },

    { label: 'A', latex: 'A' }, { label: 'B', latex: 'B' }, { label: 'C', latex: 'C' }, { label: 'X', latex: 'X' }, { label: 'Y', latex: 'Y' }, { label: 'Z', latex: 'Z' }, { label: '+', latex: '+', isOp: true }
  ];

  const renderButtons = () => {
    const buttons = activeTab === '123' ? basicButtons : fxButtons;
    return buttons.map((btn, idx) => (
      <button
        key={idx}
        onClick={() => handleAction(btn)}
        className={`
          border-r border-b border-white/5 flex items-center justify-center transition-colors hover:bg-slate-800
          ${btn.rowSpan ? 'row-span-2' : 'h-12'}
          ${btn.isOrange ? 'bg-orange-600 hover:bg-orange-500 text-white font-bold' : ''}
          ${btn.isTeal ? 'bg-teal-500 hover:bg-teal-400 text-white font-bold' : ''}
          ${!btn.isOrange && !btn.isTeal && btn.isNum ? 'text-slate-100 font-medium text-lg' : ''}
          ${!btn.isOrange && !btn.isTeal && btn.isOp ? 'text-cyan-400 font-medium text-lg' : ''}
          ${!btn.isOrange && !btn.isTeal && !btn.isNum && !btn.isOp ? 'text-slate-300 text-sm' : ''}
        `}
      >
        {btn.label}
      </button>
    ));
  };

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 250 : 50,
        y: 80,
        width: 500,
        height: 'auto',
      }}
      minWidth={450}
      maxWidth={800}
      bounds="window"
      dragHandleClassName="drag-handle"
      className="z-[9999]"
    >
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        
        {/* Header / Drag Handle */}
        <div className="drag-handle bg-slate-900 px-4 py-2 flex justify-between items-center cursor-move border-b border-slate-800">
          <div className="flex bg-slate-800 rounded-md p-1">
            <button
              onClick={() => setActiveTab('123')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === '123' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              123
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === 'fx' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              f(x)
            </button>
          </div>
          
          <div className="flex items-center space-x-3 text-slate-400">
            <button onClick={() => mfRef.current?.executeCommand('moveToPreviousChar')} className="hover:text-white cursor-pointer"><ArrowLeft size={16} /></button>
            <button onClick={() => mfRef.current?.executeCommand('moveToNextChar')} className="hover:text-white cursor-pointer"><ArrowRight size={16} /></button>
            <button className="hover:text-white cursor-pointer ml-2"><Settings size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
            <button onClick={onClose} className="hover:text-red-400 cursor-pointer"><X size={18} /></button>
          </div>
        </div>

        {/* Display Screen (MathLive) */}
        <div className="bg-[#0f172a] p-4 border-b border-slate-800 flex items-center justify-end overflow-hidden min-h-[100px]">
          {isClient && React.createElement('math-field', {
              ref: mfRef,
              class: "w-full text-right text-4xl text-white outline-none font-math",
              style: {
                '--caret-color': '#06b6d4',
                '--selection-background-color': 'rgba(6, 182, 212, 0.3)',
                '--selection-color': 'white',
              } as React.CSSProperties
            })}
        </div>

        {/* CSS Grid Keypad */}
        <div className={`grid ${activeTab === '123' ? 'grid-cols-9' : 'grid-cols-8'} bg-slate-900 border-l border-t border-white/5`}>
          {renderButtons()}
        </div>
      </div>
    </Rnd>
  );
}
