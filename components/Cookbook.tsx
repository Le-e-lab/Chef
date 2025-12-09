import React, { useState, useMemo } from 'react';
import { Recipe } from '../types';
import { Search, Clock, ChevronRight, ArrowLeft, ChefHat, Sparkles, Plus, Flame, Coffee, Leaf, Zap } from 'lucide-react';

interface CookbookProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
  onGenerateFromText: (text: string) => void;
}

const VIBES = ['Spicy', 'Comfort', 'Healthy', 'Quick', 'Gourmet', 'Rustic', 'Creamy', 'Zesty'];

const STARTER_IDEAS = [
  { text: 'Spicy Late Night Snack', icon: <Flame size={14} /> },
  { text: 'Healthy Breakfast', icon: <Coffee size={14} /> },
  { text: 'Quick Lunch', icon: <Zap size={14} /> },
  { text: 'Vegetarian Feast', icon: <Leaf size={14} /> },
];

const Cookbook: React.FC<CookbookProps> = ({ recipes, onSelectRecipe, onBack, onGenerateFromText }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return recipes.filter(recipe => 
      recipe.title.toLowerCase().includes(q) || 
      recipe.cuisineStyle.toLowerCase().includes(q) ||
      recipe.ingredientsFound.some(ing => ing.toLowerCase().includes(q))
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [recipes, searchQuery]);

  return (
    <div className="h-full w-full bg-stone-950 flex flex-col relative overflow-hidden animate-fade-in text-stone-300">
      
      {/* Header */}
      <div className="sticky top-0 z-20 p-6 bg-gradient-to-b from-stone-950 via-stone-950/95 to-transparent flex flex-col gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors self-start group mb-2"
        >
          <div className="p-2 rounded-full border border-stone-800 group-hover:bg-stone-800 transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-sm tracking-wide uppercase font-medium">Back</span>
        </button>

        <div className="flex items-center justify-between">
           <h1 className="text-3xl font-serif text-white">My <span className="text-amber-350 italic">Cookbook</span></h1>
           <span className="text-stone-600 font-mono text-xs border border-stone-800 rounded-full px-3 py-1">
             {recipes.length} {recipes.length === 1 ? 'Recipe' : 'Recipes'}
           </span>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-500 group-focus-within:text-amber-350 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-350/50 focus:ring-1 focus:ring-amber-350/20 transition-all"
            placeholder="Search or type ingredients to invent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-20">
        
        {/* Active Search & Suggestions */}
        {searchQuery.length > 0 && (
          <div className="mb-8 animate-fade-in">
             <button 
              onClick={() => onGenerateFromText(searchQuery)}
              className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-900/40 to-stone-900 border border-amber-350/30 flex items-center justify-between group hover:border-amber-350/60 transition-all shadow-lg shadow-amber-900/10"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-350/10 rounded-full text-amber-350 border border-amber-350/20 group-hover:scale-110 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-stone-100 font-serif font-medium text-lg">Invent a new recipe</h3>
                  <p className="text-stone-400 text-xs">Using "<span className="text-amber-350">{searchQuery}</span>" as inspiration</p>
                </div>
              </div>
              <ChevronRight className="text-stone-600 group-hover:text-amber-350 transition-colors" />
            </button>

            {/* Dynamic Suggestions (Vibes) */}
            <div>
               <h4 className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mb-3 pl-1">Suggestions</h4>
               <div className="flex flex-wrap gap-2">
                 {VIBES.map(vibe => (
                   <button
                     key={vibe}
                     onClick={() => onGenerateFromText(`${vibe} ${searchQuery}`)}
                     className="px-4 py-2 rounded-full bg-stone-900 border border-stone-800 text-stone-400 text-xs hover:border-amber-350/50 hover:text-amber-350 hover:bg-stone-800 transition-all"
                   >
                     {vibe} {searchQuery}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="h-px bg-stone-800 w-full my-6"></div>
          </div>
        )}

        {filteredRecipes.length > 0 ? (
          <div className="grid gap-4">
            {filteredRecipes.map((recipe) => (
              <div 
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                className="group relative bg-stone-900/40 border border-stone-800 rounded-2xl p-5 hover:bg-stone-900 hover:border-amber-900/50 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex justify-between items-start mb-2">
                   <h3 className="text-lg font-serif text-white group-hover:text-amber-350 transition-colors pr-4">{recipe.title}</h3>
                   <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${
                     recipe.difficulty === 'Easy' ? 'border-green-900 text-green-500' :
                     recipe.difficulty === 'Medium' ? 'border-yellow-900 text-yellow-500' :
                     'border-red-900 text-red-500'
                   }`}>
                     {recipe.difficulty}
                   </span>
                </div>
                
                <p className="text-stone-500 text-xs mb-4 line-clamp-2 leading-relaxed">{recipe.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-stone-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {recipe.totalTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChefHat size={12} /> {recipe.cuisineStyle}
                  </span>
                </div>

                {/* Hover Indicator */}
                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 translate-x-2">
                   <ChevronRight className="text-amber-350" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {searchQuery.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pt-10 text-center opacity-100">
                  <div className="mb-8 opacity-50">
                    <Sparkles className="w-12 h-12 text-stone-700 mb-4 mx-auto" strokeWidth={1} />
                    <p className="text-stone-500 font-serif text-lg">Your cookbook is empty.</p>
                    <p className="text-stone-600 text-sm mt-2">Start cooking to build your collection.</p>
                  </div>

                  {/* Starter Suggestions for Empty State */}
                  <div className="w-full max-w-sm">
                    <h4 className="text-stone-600 text-[10px] font-bold uppercase tracking-widest mb-4">Try these ideas</h4>
                    <div className="grid grid-cols-2 gap-3">
                       {STARTER_IDEAS.map((idea) => (
                         <button
                           key={idea.text}
                           onClick={() => onGenerateFromText(idea.text)}
                           className="flex items-center gap-2 p-3 rounded-lg border border-stone-800 bg-stone-900/30 hover:bg-stone-800 hover:border-amber-350/30 hover:text-amber-350 transition-all text-xs text-stone-400 text-left"
                         >
                           {idea.icon}
                           {idea.text}
                         </button>
                       ))}
                    </div>
                  </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 text-center opacity-50">
                  <p className="text-stone-600 text-sm">No saved recipes match "{searchQuery}".</p>
                  <p className="text-stone-700 text-xs mt-1">But you can invent one above!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Cookbook;