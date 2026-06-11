import { useState, useEffect } from "react";

export function Popup() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Load existing count from chrome storage if available
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["clickCount"], (result: any) => {
        if (result.clickCount !== undefined) {
          setCount(Number(result.clickCount));
        }
      });
    }
  }, []);

  const handleIncrement = () => {
    const nextCount = count + 1;
    setCount(nextCount);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ clickCount: nextCount });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl">
      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/20 mb-4">
        ⚡
      </div>
      
      <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 mb-1">
        Extension Template
      </h1>
      
      <p className="text-xs text-slate-400 mb-6 text-center">
        Powered by React, TypeScript, Vite & CRXJS
      </p>

      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 flex flex-col items-center mb-6">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
          Stored Clicks
        </span>
        <span className="text-4xl font-black text-white tabular-nums">
          {count}
        </span>
      </div>

      <button
        onClick={handleIncrement}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] transition-all text-sm font-bold text-white shadow-lg shadow-indigo-550/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      >
        Increment Count
      </button>
      
      <div className="mt-4 pt-4 border-t border-slate-800/60 w-full flex justify-between text-[10px] text-slate-500">
        <span>Manifest V3</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
