import React, { useState, useEffect } from 'react';
import CameraCapture from './components/CameraCapture';
import RecipeView from './components/RecipeView';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import Cookbook from './components/Cookbook';
import { AppState, CaptureData, Recipe } from './types';
import { generateRecipeFromInput } from './services/geminiService';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  // Start at LANDING instead of IDLE
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [history, setHistory] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

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

  // Save history helper
  const saveToHistory = (newRecipe: Recipe) => {
    const newHistory = [newRecipe, ...history];
    setHistory(newHistory);
    localStorage.setItem('chefMuseHistory', JSON.stringify(newHistory));
  };

  const handleCapture = async (data: CaptureData) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    setErrorDetails(null);

    try {
      // API call to Gemini with optional constraints
      const generatedRecipe = await generateRecipeFromInput(
        data.images, 
        data.audio, 
        data.audioMimeType, 
        undefined, 
        data.constraints || []
      );
      
      // Save and set state
      setRecipe(generatedRecipe);
      saveToHistory(generatedRecipe);
      setAppState(AppState.RECIPE_VIEW);

    } catch (e: any) {
      handleError(e);
    }
  };

  const handleTextGeneration = async (text: string) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    setErrorDetails(null);

    try {
      // API call to Gemini with text only
      const generatedRecipe = await generateRecipeFromInput([], null, undefined, text);
      
      setRecipe(generatedRecipe);
      saveToHistory(generatedRecipe);
      setAppState(AppState.RECIPE_VIEW);
    } catch (e: any) {
      handleError(e);
    }
  };

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
    // Return to Camera view (IDLE) rather than Landing Page for smoother re-use
    setAppState(AppState.IDLE);
    setRecipe(null);
    setError(null);
    setErrorDetails(null);
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
    setAppState(AppState.RECIPE_VIEW);
  }

  const handleBackToLanding = () => {
    setAppState(AppState.LANDING);
  };

  return (
    <div className="h-screen w-full bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      
      {/* Viewport Area */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* State: Landing Page */}
        {appState === AppState.LANDING && (
          <div className="absolute inset-0 z-50">
            <LandingPage onStart={handleStart} onAbout={handleAbout} onCookbook={handleCookbook} />
          </div>
        )}

        {/* State: About Page */}
        {appState === AppState.ABOUT && (
          <div className="absolute inset-0 z-50 bg-stone-950">
            <AboutPage onBack={handleBackToLanding} />
          </div>
        )}

        {/* State: Cookbook Page */}
        {appState === AppState.COOKBOOK && (
          <div className="absolute inset-0 z-50 bg-stone-950">
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
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                      <Loader2 className="w-12 h-12 text-amber-350 animate-spin mb-4" />
                      <p className="text-amber-350/80 font-serif italic text-lg animate-pulse-slow">Consulting the Muse...</p>
                      <p className="text-stone-500 text-xs mt-2">Identifying ingredients & dreaming up flavors</p>
                    </div>
                  )}
                </>
             )}
          </div>
        )}

        {/* State: Recipe View */}
        {appState === AppState.RECIPE_VIEW && recipe && (
          <div className="absolute inset-0 bg-stone-900 z-40">
            <RecipeView recipe={recipe} onReset={handleReset} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;