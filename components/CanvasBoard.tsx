
import React, { useRef, useEffect, useState } from 'react';

interface CanvasBoardProps {
  targetChar: string;
  onClear: () => void;
  onSubmit: (image: string) => void;
  isVerifying: boolean;
}

const CanvasBoard: React.FC<CanvasBoardProps> = ({ targetChar, onClear, onSubmit, isVerifying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setHasDrawn(false);
    setShowWarning(false);
  };

  useEffect(() => {
    setupCanvas();
  }, [targetChar]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isVerifying) return;
    setIsDrawing(true);
    setHasDrawn(true);
    setShowWarning(false);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isVerifying) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePreSubmit = () => {
    if (!hasDrawn) {
      setShowWarning(true);
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      onSubmit(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative bg-white p-2 rounded-2xl shadow-xl border-4 transition-all duration-300 ${showWarning ? 'border-red-400' : 'border-sky-200'} ${isVerifying ? 'scale-95' : 'scale-100'}`}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className={`touch-none rounded-xl pencil-cursor ${isVerifying ? 'opacity-40 cursor-not-allowed' : ''}`}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
        {isVerifying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
            <div className="flex space-x-2 mb-4">
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-sky-600 font-black text-xl animate-pulse">老師批改中...</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <button onClick={() => { setupCanvas(); onClear(); }} disabled={isVerifying} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 disabled:opacity-50">清除</button>
        <button onClick={handlePreSubmit} disabled={isVerifying} className="px-10 py-2 bg-sky-500 text-white rounded-full font-bold shadow-lg hover:bg-sky-600 disabled:bg-gray-400 active:scale-95 transition-all">
          {isVerifying ? '辨識中...' : '送出答案'}
        </button>
      </div>
    </div>
  );
};

export default CanvasBoard;
