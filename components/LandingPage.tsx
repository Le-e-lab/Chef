import React from 'react';
import { ChefHat, ArrowRight, Sparkles, Eye, Mic, Info, BookOpen } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onAbout: () => void;
  onCookbook: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onAbout, onCookbook }) => {
  return (
    <div className="h-full w-full bg-stone-950 flex flex-col relative overflow-hidden animate-fade-in">
      {/* Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-stone-800/30 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating Icons */}
      <div className="absolute top-[10%] left-[10%] text-4xl opacity-10 animate-float pointer-events-none">🍅</div>
      <div className="absolute top-[20%] right-[15%] text-3xl opacity-10 animate-float-delayed pointer-events-none">🌶️</div>
      <div className="absolute bottom-[20%] left-[15%] text-5xl opacity-5 animate-float-delayed pointer-events-none">🥦</div>
      <div className="absolute bottom-[10%] right-[20%] text-4xl opacity-10 animate-float pointer-events-none">🍋</div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
        <div className="mb-10 relative">
           <div className="absolute inset-0 bg-amber-350 blur-2xl opacity-20 rounded-full"></div>
           <ChefHat className="w-24 h-24 text-amber-350 relative z-10 drop-shadow-2xl animate-float" strokeWidth={1} />
        </div>

        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 tracking-tight leading-none">
          The Chef's <span className="text-amber-350 italic">Muse</span>
        </h1>

        <p className="text-stone-400 text-lg md:text-xl max-w-md font-light leading-relaxed mb-12">
          Cooking with zero recipes.<br/> 
          Just chemistry, creativity, and <span className="text-stone-300">what's in your fridge.</span>
        </p>

        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={onStart}
            className="group relative px-10 py-5 bg-stone-100 text-stone-950 rounded-full font-serif font-bold text-lg tracking-wide hover:bg-amber-350 transition-all duration-500 flex items-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(217,185,100,0.4)] hover:scale-105"
          >
            <span className="relative z-10">Open Your Fridge</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            
            {/* Button Hover Glow */}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          </button>

          <div className="flex gap-4">
             <button 
              onClick={onCookbook}
              className="text-stone-500 hover:text-white transition-colors text-xs uppercase tracking-widest flex items-center gap-2 py-2 px-4 rounded-full hover:bg-stone-900"
            >
              <BookOpen size={14} />
              My Cookbook
            </button>
            <button 
              onClick={onAbout}
              className="text-stone-500 hover:text-white transition-colors text-xs uppercase tracking-widest flex items-center gap-2 py-2 px-4 rounded-full hover:bg-stone-900"
            >
              <Info size={14} />
              About
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer / Features */}
      <div className="p-8 pb-12 w-full max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center text-stone-600 text-[10px] md:text-xs tracking-[0.2em] uppercase font-medium">
         <div className="flex flex-col items-center gap-3 hover:text-stone-400 transition-colors">
            <Sparkles className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
            <span>AI Invention</span>
         </div>
         <div className="flex flex-col items-center gap-3 hover:text-stone-400 transition-colors">
            <Eye className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
            <span>Visual Recognition</span>
         </div>
         <div className="flex flex-col items-center gap-3 hover:text-stone-400 transition-colors">
            <Mic className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
            <span>Audio Guidance</span>
         </div>
      </div>
    </div>
  );
};

export default LandingPage;