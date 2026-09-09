import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import nerdamer from 'nerdamer/all.min';

interface CalculatorWidgetProps {
  onClose: () => void;
}

interface CalcButton {
  label: string;
  latex?: string;
  action?: string;
  type?: 'num' | 'op' | 'func' | 'sec' | 'exec';
  colSpan?: number;
}

export default function CalculatorWidget({ onClose }: CalculatorWidgetProps) {
  const [activeTab, setActiveTab] = useState<'123' | 'fx'>('123');
  const [isClient, setIsClient] = useState(false);
  const mfRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      import('https://esm.sh/mathlive').then(() => {
        if ((window as any).mathVirtualKeyboard) {
          (window as any).mathVirtualKeyboard.policy = 'manual';
        }
        setIsClient(true);
      }).catch(err => console.error("Failed to load MathLive", err));
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
      executeMath();
    } else if (btn.latex) {
      mf.executeCommand(['insert', btn.latex]);
    } else if (btn.label) {
      mf.executeCommand(['insert', btn.label]);
    }
  };

  const executeMath = () => {
    const mf = mfRef.current;
    if (!mf) return;
    try {
      let expr = mf.getValue('ascii-math');
      
      // Clean up ascii-math output from MathLive for nerdamer
      // limits: lim_(x->0) expr => limit(expr, x, 0)
      expr = expr.replace(/lim_\(([a-zA-Z]+)->([^)]+)\)\s*(.*)/g, 'limit($3, $1, $2)');
      
      // derivatives: d/dx expr => diff(expr, x)
      expr = expr.replace(/d\/d([a-zA-Z]+)\s*(.*)/g, 'diff($2, $1)');
      
      // definite integral: int_0^2 expr dx => defint(expr, 0, 2, x)
      expr = expr.replace(/int_([^\^]+)\^([^\s]+)\s*(.*?)\s*d([a-zA-Z]+)/g, 'defint($3, $1, $2, $4)');
      
      // indefinite integral: int expr dx => integrate(expr, x)
      expr = expr.replace(/int\s+(.*?)\s*d([a-zA-Z]+)/g, 'integrate($1, $2)');
      
      // log base 10: log_(10)(x) => log10(x)
      expr = expr.replace(/log_\(10\)/g, 'log10');
      
      // convert PI
      expr = expr.replace(/pi/g, 'pi');

      const result = nerdamer(expr).toTeX();
      mf.value = result;
    } catch (e) {
      console.error('Math evaluation error:', e);
      // Fallback: If evaluation fails, do nothing or flash red (handled via CSS if wanted)
    }
  };

  const basicButtons: CalcButton[] = [
    { label: 'AC', action: 'ac', type: 'sec' }, { label: 'DEL', action: 'del', type: 'sec' }, { label: '(', latex: '(', type: 'sec' }, { label: ')', latex: ')', type: 'sec' },
    { label: '7', type: 'num' }, { label: '8', type: 'num' }, { label: '9', type: 'num' }, { label: '÷', latex: '\\div', type: 'op' },
    { label: '4', type: 'num' }, { label: '5', type: 'num' }, { label: '6', type: 'num' }, { label: '×', latex: '\\times', type: 'op' },
    { label: '1', type: 'num' }, { label: '2', type: 'num' }, { label: '3', type: 'num' }, { label: '-', latex: '-', type: 'op' },
    { label: '0', type: 'num' }, { label: '.', latex: '.', type: 'num' }, { label: '=', action: 'exec', type: 'exec' }, { label: '+', latex: '+', type: 'op' }
  ];

  const fxButtons: CalcButton[] = [
    { label: 'sin', latex: '\\sin\\left(#?\\right)', type: 'func' }, { label: 'cos', latex: '\\cos\\left(#?\\right)', type: 'func' }, { label: 'tan', latex: '\\tan\\left(#?\\right)', type: 'func' }, { label: 'log', latex: '\\log_{10}\\left(#?\\right)', type: 'func' },
    { label: 'sin⁻¹', latex: '\\arcsin\\left(#?\\right)', type: 'func' }, { label: 'cos⁻¹', latex: '\\arccos\\left(#?\\right)', type: 'func' }, { label: 'tan⁻¹', latex: '\\arctan\\left(#?\\right)', type: 'func' }, { label: 'ln', latex: '\\ln\\left(#?\\right)', type: 'func' },
    { label: 'lim', latex: '\\lim_{x \\to #?} \\left(#?\\right)', type: 'func' }, { label: 'd/dx', latex: '\\frac{d}{dx} \\left(#?\\right)', type: 'func' }, { label: '∫', latex: '\\int_{#?}^{#?} #? \\, dx', type: 'func' }, { label: 'π', latex: '\\pi', type: 'func' },
    { label: 'x', latex: 'x', type: 'func' }, { label: 'y', latex: 'y', type: 'func' }, { label: '^', latex: '^{#?}', type: 'func' }, { label: '√', latex: '\\sqrt{#?}', type: 'func' },
    { label: 'AC', action: 'ac', type: 'sec' }, { label: 'DEL', action: 'del', type: 'sec' }, { label: ',', latex: ',', type: 'func' }, { label: '∞', latex: '\\infty', type: 'func' }
  ];

  const renderButtons = () => {
    const buttons = activeTab === '123' ? basicButtons : fxButtons;
    return buttons.map((btn, idx) => {
      let btnClasses = 'flex items-center justify-center rounded-full text-xl font-medium transition-all active:scale-95 ';
      
      switch (btn.type) {
        case 'num':
          btnClasses += 'bg-zinc-700 text-white hover:bg-zinc-600';
          break;
        case 'op':
          btnClasses += 'bg-indigo-500 text-white hover:bg-indigo-400 text-3xl font-normal pb-1';
          break;
        case 'sec':
          btnClasses += 'bg-zinc-600 text-zinc-100 hover:bg-zinc-500 text-lg';
          break;
        case 'func':
          btnClasses += 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-base';
          break;
        case 'exec':
          btnClasses += 'bg-indigo-600 text-white hover:bg-indigo-500 text-3xl font-normal pb-1';
          break;
        default:
          btnClasses += 'bg-zinc-700 text-white hover:bg-zinc-600';
      }

      return (
        <button
          key={idx}
          onClick={() => handleAction(btn)}
          className={`${btnClasses} ${btn.colSpan ? `col-span-${btn.colSpan}` : ''}`}
          style={{ minHeight: '65px', width: '100%' }}
        >
          {btn.label}
        </button>
      );
    });
  };

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 180 : 50,
        y: 80,
        width: 360,
        height: 'auto',
      }}
      minWidth={320}
      maxWidth={400}
      bounds="window"
      dragHandleClassName="drag-handle"
      className="z-[9999]"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col font-sans select-none relative">
        
        {/* Header - Drag Handle */}
        <div className="drag-handle w-full h-10 flex justify-center items-center cursor-move pt-3 opacity-40 hover:opacity-100 transition-opacity absolute top-0 left-0 right-0 z-0">
          <div className="w-14 h-1.5 bg-zinc-500 rounded-full" />
        </div>
        
        {/* Controls Overlay */}
        <div className="absolute top-5 right-5 flex items-center space-x-2 z-10">
          <button onClick={() => mfRef.current?.executeCommand(['moveToPreviousChar'])} className="text-zinc-400 hover:text-white transition-colors p-1.5 bg-zinc-800/80 rounded-full" title="Move Left">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => mfRef.current?.executeCommand(['moveToNextChar'])} className="text-zinc-400 hover:text-white transition-colors p-1.5 bg-zinc-800/80 rounded-full" title="Move Right">
            <ChevronRight size={16} />
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-red-400 transition-colors p-1.5 bg-zinc-800/80 rounded-full ml-1" title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Display Screen */}
        <div className="pt-20 pb-4 px-6 flex items-center justify-end overflow-hidden min-h-[160px]">
          {isClient && React.createElement('math-field', {
              ref: mfRef,
              class: "w-full text-right text-5xl outline-none font-math text-white",
              'math-virtual-keyboard-policy': 'manual',
              style: {
                '--text-color': '#ffffff',
                backgroundColor: 'transparent',
                '--caret-color': '#6366f1',
                '--selection-background-color': 'rgba(99, 102, 241, 0.3)',
                '--selection-color': '#ffffff',
              } as React.CSSProperties
            })}
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pb-5 flex justify-between items-center relative z-10">
          <div className="flex bg-zinc-800 rounded-full p-1 w-full relative">
            <button
              onClick={() => setActiveTab('123')}
              className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all z-10 ${
                activeTab === '123' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              1 2 3
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all z-10 ${
                activeTab === 'fx' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              f (x)
            </button>
            {/* Active Tab Background Pill */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-600 rounded-full shadow transition-all duration-300 ease-in-out ${
                activeTab === '123' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            />
          </div>
        </div>

        {/* Keypad */}
        <div className="px-5 pb-8">
          <div className="grid grid-cols-4 gap-3">
            {renderButtons()}
          </div>
        </div>
      </div>
    </Rnd>
  );
}
