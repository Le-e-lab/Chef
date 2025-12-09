import React, { useState, useEffect } from 'react';
import CameraCapture from './components/CameraCapture';
import RecipeView from './components/RecipeView';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import Cookbook from './components/Cookbook';
import { AppState, CaptureData, Recipe } from './types';
import { generateRecipeFromInput } from './services/geminiService';
import { Loader2, AlertCircle } from 'lucide-react';

const LOADING_THOUGHTS = [
  "Tasting the air...",
  "Consulting Grandma's secret stash...",
  "Chopping onions (virtually)...",
  "Checking the spice rack...",
  "Inventing a new flavor...",
  "Asking the stars for salt...",
  "Simmering ideas...",
  "Pairing flavors..."
];

const App: React.FC = () => {
  // Start at LANDING instead of IDLE
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [history, setHistory] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Fun loading state
  const [loadingThought, setLoadingThought] = useState(LOADING_THOUGHTS[0]);
  
  // Track if current recipe is saved to history
  const [isCurrentRecipeSaved, setIsCurrentRecipeSaved] = useState(false);
  
  // Keep track of current inputs for regeneration/remixing
  const [currentSessionImages, setCurrentSessionImages] = useState<string[]>([]);
  const [currentSessionAudio, setCurrentSessionAudio] = useState<string | null>(null);
  const [currentSessionText, setCurrentSessionText] = useState<string | undefined>(undefined);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chefMuseHistory');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Cycle loading thoughts
  useEffect(() => {
    let interval: any;
    if (appState === AppState.PROCESSING) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % LOADING_THOUGHTS.length;
        setLoadingThought(LOADING_THOUGHTS[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // Save history helper
  const saveToHistory = (newRecipe: Recipe) => {
    // Avoid duplicates based on ID
    if (history.some(r => r.id === newRecipe.id)) return;
    
    const newHistory = [newRecipe, ...history];
    setHistory(newHistory);
    localStorage.setItem('chefMuseHistory', JSON.stringify(newHistory));
    setIsCurrentRecipeSaved(true);
  };

  const handleCapture = async (data: CaptureData) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    setErrorDetails(null);
    
    // Store inputs for potential remixing
    setCurrentSessionImages(data.images);
    setCurrentSessionAudio(data.audio);
    setCurrentSessionText(undefined);

    try {
      // API call to Gemini with optional constraints
      const generatedRecipe = await generateRecipeFromInput(
        data.images, 
        data.audio, 
        data.audioMimeType, 
        undefined, 
        data.constraints || []
      );
      
      setRecipe(generatedRecipe);
      setIsCurrentRecipeSaved(false); // New capture is not saved by default
      setAppState(AppState.RECIPE_VIEW);

    } catch (e: any) {
      handleError(e);
    }
  };

  const handleTextGeneration = async (text: string) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    setErrorDetails(null);

    // Store inputs
    setCurrentSessionImages([]);
    setCurrentSessionAudio(null);
    setCurrentSessionText(text);

    try {
      // API call to Gemini with text only
      const generatedRecipe = await generateRecipeFromInput([], null, undefined, text);
      
      setRecipe(generatedRecipe);
      setIsCurrentRecipeSaved(false); // New capture is not saved by default
      setAppState(AppState.RECIPE_VIEW);
    } catch (e: any) {
      handleError(e);
    }
  };

  const handleRemix = async (constraints: string[]) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    try {
      const generatedRecipe = await generateRecipeFromInput(
        currentSessionImages,
        currentSessionAudio, 
        undefined, 
        currentSessionText, 
        constraints
      );

      setRecipe(generatedRecipe);
      setIsCurrentRecipeSaved(false); // Remixed recipe is considered new
      setAppState(AppState.RECIPE_VIEW);

    } catch(e: any) {
       handleError(e);
    }
  }

  const handleError = (e: any) => {
    console.error("App Error:", e);
    let msg = "The Muse was silent.";
    let details = "We couldn't generate a recipe. Please try again.";

    const errorMessage = e.message || "";
    
    if (errorMessage.includes('API Key')) {
      msg = "Configuration Error";
      details = "The API Key is missing. Please check the environment configuration.";
    } else if (errorMessage.includes('No response generated') || errorMessage.includes('Candidate was blocked')) {
      msg = "Inspiration blocked";
      details = "The Muse couldn't understand the request or it was flagged. Try different wording.";
    } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      msg = "Connection Lost";
      details = "Please check your internet connection and try again.";
    } else if (errorMessage.includes('JSON')) {
       msg = "Creative Confusion";
       details = "The Muse hallucinated an invalid format. Trying again usually fixes this.";
    }

    setError(msg);
    setErrorDetails(details);
    setAppState(AppState.ERROR);
  }

  const handleReset = () => {
    // Return to Camera view (IDLE)
    setAppState(AppState.IDLE);
    setRecipe(null);
    setError(null);
  };

  const handleStart = () => {
    setAppState(AppState.IDLE);
  };

  const handleAbout = () => {
    setAppState(AppState.ABOUT);
  };

  const handleCookbook = () => {
    setAppState(AppState.COOKBOOK);
  }

  const handleSelectRecipe = (selected: Recipe) => {
    setRecipe(selected);
    setIsCurrentRecipeSaved(true); // Coming from cookbook, it's saved
    // Clear session inputs since this is a loaded recipe
    setCurrentSessionImages([]);
    setCurrentSessionAudio(null);
    setCurrentSessionText(undefined);
    setAppState(AppState.RECIPE_VIEW);
  }

  const handleBackToLanding = () => {
    setAppState(AppState.LANDING);
  };

  const handleBackFromRecipe = () => {
    if (isCurrentRecipeSaved) {
        setAppState(AppState.COOKBOOK);
    } else {
        setAppState(AppState.LANDING); 
    }
  };

  return (
    <div className="h-screen w-full bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      
      {/* Viewport Area */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* State: Landing Page */}
        {appState === AppState.LANDING && (
          <div className="absolute inset-0 z-50 animate-fade-in">
            <LandingPage onStart={handleStart} onAbout={handleAbout} onCookbook={handleCookbook} />
          </div>
        )}

        {/* State: About Page */}
        {appState === AppState.ABOUT && (
          <div className="absolute inset-0 z-50 bg-stone-950 animate-fade-in">
            <AboutPage onBack={handleBackToLanding} />
          </div>
        )}

        {/* State: Cookbook Page */}
        {appState === AppState.COOKBOOK && (
          <div className="absolute inset-0 z-50 bg-stone-950 animate-fade-in">
             <Cookbook 
               recipes={history} 
               onSelectRecipe={handleSelectRecipe} 
               onBack={handleBackToLanding}
               onGenerateFromText={handleTextGeneration}
              />
          </div>
        )}

        {/* State: Camera/Idle/Processing/Error */}
        {(appState === AppState.IDLE || appState === AppState.RECORDING || appState === AppState.PROCESSING || appState === AppState.ERROR) && (
          <div className="absolute inset-0 transition-opacity duration-500 opacity-100">
             {appState === AppState.ERROR ? (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-stone-900 animate-fade-in">
                 <div className="p-4 bg-stone-800 rounded-full text-amber-350/50">
                    <AlertCircle size={48} />
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-serif text-white">{error}</h2>
                    <p className="text-stone-400 max-w-xs mx-auto text-sm leading-relaxed">{errorDetails}</p>
                 </div>
                 <button 
                  onClick={handleReset} 
                  className="px-8 py-3 bg-stone-100 text-stone-900 font-bold rounded-full hover:bg-amber-350 transition-colors"
                 >
                   Try Again
                 </button>
               </div>
             ) : (
                <>
                  <CameraCapture 
                    onCapture={handleCapture} 
                    onBack={handleBackToLanding}
                    isProcessing={appState === AppState.PROCESSING} 
                  />
                  
                  {/* Processing Overlay */}
                  {appState === AppState.PROCESSING && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-350 blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-amber-350 animate-spin mb-6 relative z-10" />
                      </div>
                      
                      <p className="text-amber-350/90 font-serif italic text-xl animate-float min-h-[2rem] text-center px-4">
                        "{loadingThought}"
                      </p>
                    </div>
                  )}
                </>
             )}
          </div>
        )}

        {/* State: Recipe View */}
        {appState === AppState.RECIPE_VIEW && recipe && (
          <div className="absolute inset-0 bg-stone-900 z-40 animate-fade-in">
            <RecipeView 
              recipe={recipe} 
              onBack={handleBackFromRecipe} 
              onSave={saveToHistory}
              onRemix={handleRemix}
              isSaved={isCurrentRecipeSaved}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;