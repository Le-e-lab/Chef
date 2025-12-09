export interface RecipeStep {
  instruction: string;
  tip?: string;
  duration?: string;
}

export interface Recipe {
  id: string;
  createdAt: number;
  title: string;
  description: string;
  cuisineStyle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  totalTime: string;
  ingredientsFound: string[];
  pantryItemsNeeded: string[];
  steps: RecipeStep[];
}

export enum AppState {
  LANDING = 'LANDING',
  ABOUT = 'ABOUT',
  COOKBOOK = 'COOKBOOK',
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RECIPE_VIEW = 'RECIPE_VIEW',
  ERROR = 'ERROR'
}

export interface CaptureData {
  images: string[]; // Base64 strings
  audio: string | null; // Base64 string
  audioMimeType?: string;
  constraints?: string[];
}