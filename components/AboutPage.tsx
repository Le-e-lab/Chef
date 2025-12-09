import React from 'react';
import { ArrowLeft, ChefHat, Sparkles, Brain, Video, Heart, AlertCircle } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <div className="h-full w-full bg-stone-950 flex flex-col relative overflow-y-auto no-scrollbar animate-fade-in text-stone-300">
      
      {/* Navigation */}
      <div className="sticky top-0 z-20 p-6 bg-gradient-to-b from-stone-950 via-stone-950/90 to-transparent">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full border border-stone-800 group-hover:bg-stone-800 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-sm tracking-wide uppercase font-medium">Back</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20 w-full">
        
        {/* Header */}
        <div className="text-center mb-16">
           <div className="inline-block p-4 rounded-full bg-stone-900 border border-stone-800 mb-6 shadow-2xl">
              <ChefHat className="w-12 h-12 text-amber-350" strokeWidth={1} />
           </div>
           <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">The Chef's <span className="text-amber-350 italic">Muse</span></h1>
           <p className="text-lg text-stone-500 font-light max-w-xl mx-auto">Cooking with zero recipes. Just chemistry, intuition, and what's in your fridge.</p>
        </div>

        {/* The Problem & Solution */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-stone-900/40 p-8 rounded-2xl border border-stone-800 hover:border-red-900/30 transition-colors">
            <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-400/80" />
              <span>The Problem</span>
            </h3>
            <p className="leading-relaxed text-stone-400 text-sm">
              "I have a weird mix of ingredients—half an onion, leftover chicken, yogurt—and no idea what to make."
              <br/><br/>
              Standard recipe apps are too rigid. They force you to shop, not cook. They don't understand chaos.
            </p>
          </div>
          <div className="bg-stone-900/40 p-8 rounded-2xl border border-stone-800 hover:border-green-900/30 transition-colors">
             <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-green-400/80" />
              <span>The Concept</span>
            </h3>
            <p className="leading-relaxed text-stone-400 text-sm">
              A culinary intelligence that understands flavor profiles at a chemical level.
              <br/><br/>
              The Muse doesn't search a database. It <span className="text-amber-350/80">invents</span> a custom guide specifically for your ingredients and your time constraints.
            </p>
          </div>
        </div>

        {/* The Flow */}
        <div className="mb-20">
          <h2 className="text-2xl font-serif text-white mb-8 text-center italic">How the Muse Works</h2>
          <div className="space-y-3">
             <Step 
               icon={<Video className="text-amber-350" />}
               title="Visual Recognition"
               desc="Pan your camera across your shelves. The AI identifies ingredients instantly—even the obscure ones."
             />
             <Step 
               icon={<Brain className="text-amber-350" />}
               title="Contextual Understanding"
               desc="Speak naturally. 'I want something spicy, and I have 20 minutes.' The Muse listens."
             />
             <Step 
               icon={<ChefHat className="text-amber-350" />}
               title="Generative Synthesis"
               desc="Using Gemini 3 Pro, it creates a dish that likely doesn't exist on the internet, tailored to your reality."
             />
          </div>
        </div>

        {/* Why it Wins */}
        <div className="text-center bg-gradient-to-b from-amber-900/10 to-transparent p-10 rounded-3xl border border-amber-900/20">
           <Heart className="w-10 h-10 text-amber-350 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-serif text-white mb-4">The Joy of Cooking</h2>
           <p className="text-stone-400 max-w-lg mx-auto leading-relaxed text-sm">
             Everyone eats. But not everyone knows how to improvise. The Chef's Muse bridges the gap between a cluttered pantry and a gourmet meal, turning the daily chore of "what's for dinner" into a moment of creative magic.
           </p>
        </div>
        
        <div className="mt-12 text-center">
            <button onClick={onBack} className="text-amber-350 hover:text-amber-200 text-sm uppercase tracking-widest font-bold">
                Close
            </button>
        </div>

      </div>
    </div>
  );
};

const Step = ({icon, title, desc}: {icon: React.ReactNode, title: string, desc: string}) => (
  <div className="flex items-start gap-5 p-6 rounded-xl bg-stone-900/20 border border-stone-800/50 hover:bg-stone-900/40 transition-colors">
    <div className="mt-1 p-3 bg-stone-950 rounded-lg border border-stone-800">{icon}</div>
    <div>
      <h3 className="text-white font-medium mb-1 font-serif text-lg">{title}</h3>
      <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default AboutPage;