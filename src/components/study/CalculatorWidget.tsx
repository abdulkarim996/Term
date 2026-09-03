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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('RAD');
  
  const mfRef = useRef<any>(null);
  const ce = useRef<any>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleAction = (btn: CalcButton) => {
    const mf = mfRef.current;
    if (!mf) return;

    if (btn.action === 'ac') {
      mf.value = '';
    } else if (btn.action === 'del') {
      mf.executeCommand('deleteBackward');
    } else if (btn.action === 'exec') {
      try {
        if (ce.current) {
          // Tell ComputeEngine our angle mode before evaluating
          ce.current.angles = angleMode === 'DEG' ? 'degrees' : 'radians';
          
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
    return buttons.map((btn, idx) => {
      let btnBg = 'bg-[#1c2333] hover:bg-[#252d40]';
      let textColor = 'text-slate-300 text-sm';
      
      if (btn.isOrange) {
        btnBg = 'bg-[#eb5528] hover:opacity-90';
        textColor = 'text-white font-bold text-lg';
      } else if (btn.isTeal) {
        btnBg = 'bg-[#10b299] hover:opacity-90';
        textColor = 'text-white font-bold text-lg';
      } else if (btn.isNum) {
        textColor = 'text-slate-100 font-medium text-lg';
      } else if (btn.isOp) {
        textColor = 'text-cyan-400 font-medium text-lg';
      }

      return (
        <button
          key={idx}
          onClick={() => handleAction(btn)}
          className={`
            border-r border-b border-slate-700/50 flex items-center justify-center transition-colors 
            ${btn.rowSpan ? 'row-span-2' : 'h-12'}
            ${btnBg} ${textColor}
          `}
        >
          {btn.label}
        </button>
      );
    });
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
      <div className="bg-[#121826] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none relative">
        
        {/* Header / Drag Handle */}
        <div className="drag-handle bg-[#121826] px-4 py-2 flex justify-between items-center cursor-move border-b border-slate-700/50">
          <div className="flex bg-[#1c2333] rounded-md p-1 border border-slate-700/50">
            <button
              onClick={() => setActiveTab('123')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === '123' ? 'bg-[#252d40] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              123
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === 'fx' ? 'bg-[#252d40] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              f(x)
            </button>
          </div>
          
          <div className="flex items-center space-x-3 text-slate-400 relative" ref={settingsRef}>
            <button onClick={() => mfRef.current?.executeCommand('moveToPreviousChar')} className="hover:text-white cursor-pointer transition-colors"><ArrowLeft size={16} /></button>
            <button onClick={() => mfRef.current?.executeCommand('moveToNextChar')} className="hover:text-white cursor-pointer transition-colors"><ArrowRight size={16} /></button>
            
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`cursor-pointer transition-colors ${isSettingsOpen ? 'text-white' : 'hover:text-white'}`}>
              <Settings size={16} />
            </button>
            
            {/* Settings Dropdown */}
            {isSettingsOpen && (
              <div className="absolute right-6 top-8 w-44 bg-[#1c2333] border border-slate-700/50 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                <button 
                  onClick={() => { if(mfRef.current) mfRef.current.value = ''; setIsSettingsOpen(false); }} 
                  className="px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#252d40] border-b border-slate-700/50 transition-colors"
                >
                  Clear History
                </button>
                <button 
                  onClick={() => { setAngleMode(angleMode === 'DEG' ? 'RAD' : 'DEG'); setIsSettingsOpen(false); }} 
                  className="px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#252d40] transition-colors"
                >
                  Angle: {angleMode}
                </button>
              </div>
            )}
            
            <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
            <button onClick={onClose} className="hover:text-[#eb5528] cursor-pointer transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Display Screen (MathLive) */}
        <div className="bg-white p-4 border-b border-slate-700/50 flex items-center justify-end overflow-hidden min-h-[110px]">
          {isClient && React.createElement('math-field', {
              ref: mfRef,
              class: "w-full text-right text-4xl outline-none font-math text-[#0f172a]",
              style: {
                '--text-color': '#0f172a',
                backgroundColor: 'white',
                '--caret-color': '#10b299',
                '--selection-background-color': 'rgba(16, 178, 153, 0.3)',
                '--selection-color': '#0f172a',
              } as React.CSSProperties
            })}
        </div>

        {/* CSS Grid Keypad */}
        <div className={`grid ${activeTab === '123' ? 'grid-cols-9' : 'grid-cols-8'} bg-[#121826] border-l border-t border-slate-700/50`}>
          {renderButtons()}
        </div>
      </div>
    </Rnd>
  );
}
