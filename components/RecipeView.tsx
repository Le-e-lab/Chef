import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import { Play, Pause, ChevronRight, ChevronLeft, Clock, ChefHat, RotateCcw, Volume2, Image as ImageIcon, BookCheck, Maximize2, Mic, X, Command, ArrowLeft, Heart, SlidersHorizontal, RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import { generateTTS, generateDishImage } from '../services/geminiService';

interface RecipeViewProps {
  recipe: Recipe;
  onBack: () => void;
  onSave: (recipe: Recipe) => void;
  onRemix: (constraints: string[]) => void;
  isSaved: boolean;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const CONSTRAINTS_OPTIONS = [
  "No Stove", "Vegetarian", "Vegan", "Microwave Only", "Under 15m", "One Pot", "High Protein"
];

const RecipeView: React.FC<RecipeViewProps> = ({ recipe, onBack, onSave, onRemix, isSaved }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 is Overview
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  
  // Remix State
  const [showRemixMenu, setShowRemixMenu] = useState(false);
  const [remixConstraints, setRemixConstraints] = useState<string[]>(recipe.constraints || []);
  
  // Refs for state access inside event listeners
  const stepIndexRef = useRef(currentStepIndex);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Sync ref for voice commands
  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
    stopAudio(); // Stop audio when step changes
  }, [currentStepIndex]);

  // Auto-Visualize Effect
  useEffect(() => {
    let mounted = true;
    
    const autoVisualize = async () => {
      // Only generate if we haven't already and aren't currently doing so
      if (!generatedImage && !isGeneratingImage && recipe) {
        setIsGeneratingImage(true);
        try {
          const b64 = await generateDishImage(recipe.title, recipe.description);
          if (mounted) setGeneratedImage(`data:image/jpeg;base64,${b64}`);
        } catch (e) {
          console.error("Auto visualization failed", e);
        } finally {
          if (mounted) setIsGeneratingImage(false);
        }
      }
    };

    autoVisualize();
    
    return () => { mounted = false; };
  }, [recipe.id]); // Only run when recipe ID changes (new recipe loaded)


  // Voice Recognition Effect
  useEffect(() => {
    if (!isCookingMode) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (!Recognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      
      console.log("Voice Command:", transcript);
      setLastVoiceCommand(transcript);
      
      // Clear command feedback after a delay
      setTimeout(() => setLastVoiceCommand(null), 2000);

      // Command Logic
      if (transcript.includes('next')) {
        if (stepIndexRef.current < recipe.steps.length - 1) {
           setCurrentStepIndex(prev => prev + 1);
        }
      } else if (transcript.includes('previous') || transcript.includes('back')) {
        if (stepIndexRef.current > 0) {
           setCurrentStepIndex(prev => prev - 1);
        }
      } else if (transcript.includes('exit') || transcript.includes('stop')) {
        setIsCookingMode(false);
      } else if (transcript.includes('read') || transcript.includes('speak')) {
        // Trigger TTS for current step
        const step = recipe.steps[stepIndexRef.current];
        if (step) {
          playTTS(step.instruction + (step.tip ? `. Tip: ${step.tip}` : ""));
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if still in cooking mode
      if (isCookingMode && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isCookingMode, recipe.steps]);


  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const playTTS = async (text: string) => {
    try {
      if (isPlaying) {
        stopAudio();
        return;
      }

      setIsPlaying(true); 

      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateTTS(text);
      
      // Decode Base64 to Raw PCM
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Gemini TTS returns raw 16-bit PCM at 24kHz
      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert Int16 to Float32 [-1.0, 1.0]
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      // Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };
      
      sourceNodeRef.current = source;
      source.start();

    } catch (e) {
      console.error("TTS play error", e);
      setIsPlaying(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(curr => curr + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > -1) {
      setCurrentStepIndex(curr => curr - 1);
    }
  };
  
  const enterCookingMode = () => {
    if (currentStepIndex === -1) setCurrentStepIndex(0);
    setIsCookingMode(true);
  }

  const toggleRemixConstraint = (c: string) => {
    setRemixConstraints(prev => 
      prev.includes(c) ? prev.filter(i => i !== c) : [...prev, c]
    );
  };

  const handleRemixConfirm = () => {
    setShowRemixMenu(false);
    onRemix(remixConstraints);
  };

  const toggleIngredient = (idx: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  const getDifficultyColors = (level: string) => {
    switch (level) {
      case 'Easy': return { text: 'text-emerald-400', bg: 'bg-emerald-400' };
      case 'Medium': return { text: 'text-amber-400', bg: 'bg-amber-400' };
      case 'Hard': return { text: 'text-orange-500', bg: 'bg-orange-500' };
      case 'Expert': return { text: 'text-red-500', bg: 'bg-red-500' };
      default: return { text: 'text-stone-400', bg: 'bg-stone-400' };
    }
  };

  const getDifficultyLevel = (level: string) => {
    switch (level) {
      case 'Easy': return 1;
      case 'Medium': return 2;
      case 'Hard': return 3;
      case 'Expert': return 4;
      default: return 1;
    }
  };

  // Cooking Mode UI Overlay
  if (isCookingMode) {
    const step = recipe.steps[currentStepIndex];
    return (
      <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col animate-fade-in">
        {/* Cooking Mode Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-800 bg-stone-950">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500/10 rounded-full animate-pulse">
               <Mic size={20} className="text-red-500" />
             </div>
             <div className="flex flex-col">
               <span className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Listening for commands...</span>
               <span className="text-stone-600 text-[10px]">"Next", "Back", "Read", "Exit"</span>
             </div>
           </div>
           
           <button 
             onClick={() => setIsCookingMode(false)}
             className="p-3 bg-stone-800 rounded-full text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
           >
             <X size={24} />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center p-8 max-w-4xl mx-auto w-full text-center space-y-12">
           <div className="flex items-center justify-center gap-4 text-amber-350/30 font-serif text-8xl font-bold select-none">
              <span>{currentStepIndex + 1}</span>
              <span className="text-4xl text-stone-700">/</span>
              <span className="text-4xl text-stone-700">{recipe.steps.length}</span>
           </div>
           
           <h2 className="text-3xl md:text-5xl font-serif text-stone-100 leading-tight">
             {step.instruction}
           </h2>
           
           {step.tip && (
             <div className="bg-amber-900/10 border-l-4 border-amber-350 p-6 text-left max-w-2xl mx-auto rounded-r-xl">
               <p className="text-amber-350 text-lg italic">
                 <span className="font-bold not-italic mr-2">Chef's Tip:</span>
                 {step.tip}
               </p>
             </div>
           )}

           {step.duration && (
             <div className="flex justify-center">
               <span className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 rounded-full text-stone-300 font-mono text-sm">
                 <Clock size={16} /> {step.duration}
               </span>
             </div>
           )}
        </div>
        
        {/* Voice Feedback Overlay */}
        {lastVoiceCommand && (
           <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-stone-800/90 backdrop-blur px-6 py-2 rounded-full text-stone-300 flex items-center gap-2 animate-slide-up">
              <Command size={14} />
              <span className="text-sm">Heard: "{lastVoiceCommand}"</span>
           </div>
        )}

        {/* Manual Navigation */}
        <div className="p-8 flex items-center justify-between border-t border-stone-800 bg-stone-900/30">
           <button 
             onClick={prevStep}
             disabled={currentStepIndex === 0}
             className={`flex items-center gap-2 px-8 py-4 rounded-full text-lg font-medium transition-all ${currentStepIndex === 0 ? 'text-stone-700' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`}
           >
             <ChevronLeft /> Previous
           </button>

           <button 
              onClick={() => playTTS(step.instruction + (step.tip ? `. Tip: ${step.tip}` : ""))}
              className="p-4 rounded-full bg-amber-350/10 text-amber-350 hover:bg-amber-350/20 transition-colors"
           >
              {isPlaying ? <Pause size={32} /> : <Volume2 size={32} />}
           </button>

           <button 
             onClick={nextStep}
             disabled={currentStepIndex === recipe.steps.length - 1}
             className={`flex items-center gap-2 px-8 py-4 rounded-full text-lg font-medium transition-all ${currentStepIndex === recipe.steps.length - 1 ? 'text-stone-700' : 'bg-amber-350 text-stone-900 hover:bg-amber-400'}`}
           >
             Next <ChevronRight />
           </button>
        </div>
      </div>
    );
  }

  // Standard Render
  const renderContent = () => {
    // Overview Screen
    if (currentStepIndex === -1) {
      const difficultyColors = getDifficultyColors(recipe.difficulty);
      const difficultyLevel = getDifficultyLevel(recipe.difficulty);

      return (
        <div key="overview" className="space-y-6 animate-fade-in pb-10">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-stone-800 border border-stone-700 shadow-2xl group animate-slide-up" style={{animationDelay: '0.1s'}}>
             {generatedImage ? (
               <img src={generatedImage} alt={recipe.title} className="w-full h-full object-cover animate-fade-in duration-1000" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                 {/* Shimmer Effect */}
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-700/20 to-transparent animate-shimmer" style={{backgroundSize: '200% 100%'}}></div>
                 
                 <div className="z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-amber-350/20 blur-xl rounded-full animate-pulse-slow"></div>
                        <ChefHat className="w-16 h-16 text-stone-600 relative z-10" />
                    </div>
                    <p className="text-stone-500 font-serif italic mb-2 animate-pulse">Visualizing your masterpiece...</p>
                 </div>
               </div>
             )}
          </div>

          <div className="space-y-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between text-xs font-mono tracking-widest uppercase">
              <div className="flex items-center gap-3">
                <span className="text-amber-350">{recipe.cuisineStyle}</span>
                <span className="text-stone-700">|</span>
                <div className={`flex items-center gap-2 ${difficultyColors.text}`}>
                   <div className="flex gap-0.5">
                     {[1, 2, 3, 4].map((i) => (
                       <div 
                         key={i} 
                         className={`w-1 h-3 rounded-full transition-colors ${i <= difficultyLevel ? difficultyColors.bg : 'bg-stone-800'}`}
                       />
                     ))}
                   </div>
                   {recipe.difficulty}
                </div>
              </div>
              <span className="flex items-center gap-1 text-stone-400"><Clock size={12}/> {recipe.totalTime}</span>
            </div>
            
            <h1 className="text-3xl font-serif text-white leading-tight">{recipe.title}</h1>
            
            {/* Tags & Constraints */}
            <div className="flex flex-wrap gap-2">
              {isSaved && (
                <div className="flex items-center gap-2 text-emerald-500/80 text-[10px] uppercase font-bold tracking-widest bg-emerald-950/20 border border-emerald-900/30 px-3 py-1 rounded-full w-fit">
                  <BookCheck size={12} />
                  Saved
                </div>
              )}
              {recipe.constraints?.map(c => (
                 <div key={c} className="flex items-center gap-2 text-red-400/80 text-[10px] uppercase font-bold tracking-widest bg-red-950/20 border border-red-900/30 px-3 py-1 rounded-full w-fit">
                   {c}
                 </div>
              ))}
            </div>

            <p className="text-stone-400 leading-relaxed text-sm">{recipe.description}</p>
            
            <div className="bg-stone-800/50 p-4 rounded-xl border border-stone-800">
              <h3 className="text-stone-300 text-xs font-bold uppercase tracking-wider mb-3">Ingredients (Tap to Check)</h3>
              <ul className="text-stone-400 text-sm space-y-2">
                {recipe.ingredientsFound.map((ing, i) => {
                  const key = `found-${i}`;
                  const isChecked = checkedIngredients.has(key);
                  return (
                    <li 
                      key={key} 
                      onClick={() => toggleIngredient(key)}
                      className={`flex items-center gap-3 cursor-pointer group transition-all duration-300 ${isChecked ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {isChecked ? <CheckCircle2 size={16} className="text-amber-350" /> : <Circle size={16} className="text-stone-600 group-hover:text-amber-350" />}
                      <span className={isChecked ? 'line-through decoration-stone-600' : ''}>{ing}</span>
                    </li>
                  )
                })}
                {recipe.pantryItemsNeeded.map((ing, i) => {
                  const key = `pantry-${i}`;
                  const isChecked = checkedIngredients.has(key);
                  return (
                    <li 
                      key={key} 
                      onClick={() => toggleIngredient(key)}
                      className={`flex items-center gap-3 cursor-pointer group transition-all duration-300 ${isChecked ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {isChecked ? <CheckCircle2 size={16} className="text-stone-500" /> : <Circle size={16} className="text-stone-600 group-hover:text-stone-400" />}
                      <span className={`italic ${isChecked ? 'line-through decoration-stone-600 text-stone-600' : 'text-stone-500'}`}>
                        {ing} (Pantry)
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // Standard Step Screen
    const step = recipe.steps[currentStepIndex];
    return (
      <div key={currentStepIndex} className="h-full flex flex-col justify-center space-y-8 animate-slide-up">
        <div className="flex items-center gap-4 mb-4">
           <span className="text-6xl font-serif text-amber-350/20 font-bold -ml-2 animate-fade-in">
             {(currentStepIndex + 1).toString().padStart(2, '0')}
           </span>
           <div className="h-px bg-stone-800 flex-1"></div>
           {step.duration && (
             <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-1 rounded">
               {step.duration}
             </span>
           )}
        </div>

        <p className="text-2xl md:text-3xl font-serif text-stone-100 leading-snug">
          {step.instruction}
        </p>

        {step.tip && (
          <div className="bg-amber-900/10 border-l-2 border-amber-350/50 p-4 rounded-r-lg animate-slide-right" style={{animationDelay: '0.3s'}}>
            <p className="text-amber-350/80 text-sm italic">
              <span className="font-bold not-italic mr-2">Chef's Tip:</span>
              {step.tip}
            </p>
          </div>
        )}

        <button 
          onClick={() => playTTS(step.instruction + (step.tip ? `. Tip: ${step.tip}` : ""))}
          className="self-start mt-4 px-4 py-2 rounded-full border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition-all flex items-center gap-2 text-sm"
        >
          {isPlaying ? <Pause size={16} className="animate-pulse text-amber-350"/> : <Volume2 size={16}/>}
          {isPlaying ? "Stop" : "Listen"}
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full p-6 relative">
      
      {/* Remix Menu Overlay */}
      {showRemixMenu && (
        <div className="absolute inset-0 z-50 bg-stone-900/95 backdrop-blur-md p-6 flex flex-col animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif text-white">Remix Recipe</h2>
            <button onClick={() => setShowRemixMenu(false)} className="p-2 bg-stone-800 rounded-full text-stone-400">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
             <p className="text-stone-500 text-sm mb-6">Adjust your constraints and the Muse will re-invent this dish.</p>
             <div className="grid grid-cols-2 gap-3">
               {CONSTRAINTS_OPTIONS.map(c => (
                 <button
                   key={c}
                   onClick={() => toggleRemixConstraint(c)}
                   className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                     remixConstraints.includes(c) 
                       ? 'bg-amber-350 border-amber-350 text-stone-900' 
                       : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                   }`}
                 >
                   {c}
                 </button>
               ))}
             </div>
          </div>

          <button 
            onClick={handleRemixConfirm}
            className="w-full py-4 bg-amber-350 text-stone-900 font-bold rounded-xl flex items-center justify-center gap-2 mt-4"
          >
            <RefreshCw size={18} /> Regenerate Recipe
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-stone-500 hover:text-white transition-colors flex items-center gap-1 group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        
        <div className="flex items-center gap-2">
           {/* Remix Button */}
           <button 
             onClick={() => setShowRemixMenu(true)}
             className={`p-2 rounded-full transition-all ${remixConstraints.includes('No Stove') ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-stone-500 hover:text-amber-350 hover:bg-stone-800'}`}
             title="Remix / Adjust Constraints"
           >
             <SlidersHorizontal size={20} />
           </button>

           {/* Save Button */}
           <button 
             onClick={() => !isSaved && onSave(recipe)}
             disabled={isSaved}
             className={`p-2 rounded-full transition-all ${isSaved ? 'text-emerald-500' : 'text-stone-500 hover:text-white hover:bg-stone-800'}`}
             title={isSaved ? "Saved to Cookbook" : "Save Recipe"}
           >
             {isSaved ? <BookCheck size={20} /> : <Heart size={20} />}
           </button>

           {/* Cooking Mode Toggle */}
           <button 
             onClick={enterCookingMode}
             className="p-2 text-stone-500 hover:text-amber-350 hover:bg-stone-800 rounded-full transition-colors"
             title="Enter Cooking Mode (Hands-free)"
           >
             <Maximize2 size={20} />
           </button>
        </div>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-4">
        {renderContent()}
      </div>

      {/* Bottom Nav */}
      <div className="pt-6 mt-auto flex justify-between items-center">
        <button 
          onClick={prevStep}
          disabled={currentStepIndex === -1}
          className={`p-4 rounded-full border transition-all ${currentStepIndex === -1 ? 'border-stone-800 text-stone-700' : 'border-stone-700 text-white hover:bg-stone-800'}`}
        >
          <ChevronLeft size={24} />
        </button>

        {currentStepIndex === -1 ? (
          <div className="flex gap-2">
             <button 
               onClick={enterCookingMode}
               className="px-6 py-3 border border-amber-350/30 text-amber-350 font-bold rounded-full hover:bg-amber-350/10 transition-colors flex items-center gap-2 text-xs"
             >
               <Mic size={14} /> Hands-free
             </button>
             <button 
               onClick={nextStep}
               className="px-6 py-3 bg-amber-350 text-stone-900 font-bold rounded-full hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/20 flex items-center gap-2 text-xs"
             >
               Start Cooking <ChevronRight size={14}/>
             </button>
           </div>
        ) : (
          <button 
          onClick={nextStep}
          disabled={currentStepIndex === recipe.steps.length - 1}
          className={`p-4 rounded-full border transition-all ${currentStepIndex === recipe.steps.length - 1 ? 'border-stone-800 text-stone-700' : 'border-stone-700 text-white hover:bg-stone-800'}`}
        >
          <ChevronRight size={24} />
        </button>
        )}
      </div>
    </div>
  );
};

export default RecipeView;