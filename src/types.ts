/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorldTheme = 'High Fantasy' | 'Cyberpunk' | 'Steampunk' | 'Lovecraftian' | 'Hard Sci-Fi' | 'Post-Apocalyptic' | 'Historical Noir' | 'Real Life';

export interface World {
  id: string;
  name: string;
  description: string;
  theme: WorldTheme;
  traits: string[];
  magicLevel: number; // 0-10
  techLevel: number; // 0-10
  civilizationAge: string;
  geography: string;
  majorFactions: string[];
  cultureAndEthics: string;
  taboos: string[];
}

export interface Character {
  id: string;
  worldId: string;
  name: string;
  race: string;
  profession: string;
  background: string;
  backstory: string;
  age: number;
  ageGroup: string;
  height: string;
  gender: string;
  stats: Record<string, number>;
  level: number;
  xp: number;
  skillPoints: number;
  skills: { name: string; level: number }[];
  traits: string[];
  perks: { name: string; description: string }[];
  moodlets: { name: string; description: string; duration: number }[];
  relationships: { name: string; type: string; status: string; affinity: number; trust: number; fear: number; resentment: number; attraction: number; memory: string }[];
  factions: { name: string; reputation: number; status: string }[];
  inventory: string[];
  avatar?: string;
  needs: {
    hunger: number;
    energy: number;
    hygiene: number;
    bladder: number;
    fun: number;
    lustfulYearning: number;
    social: number;
  };
  condition: {
    stress: number; // 0 to 100
    trauma: number; // 0 to 100
    arousal: number; // 0 to 100
    pain: number; // 0 to 100
    intoxication: number; // 0 to 100
    sanity: number; // 0 to 100
  };
  clothing: {
    head: string;
    torso: string;
    legs: string;
    feet: string;
    state: 'pristine' | 'worn' | 'torn' | 'exposed' | 'naked';
  };
  followers: { name: string; loyalty: number; morale: number; status: string; description: string }[];
  simulationTelemetry?: {
    Stability: number;
    Scarcity: number;
    Lethality: number;
    Momentum: number;
    Corruption: number;
  };
}

export interface WikiEntry {
  term: string;
  description: string;
}

export interface Choice {
  text: string;
  type?: 'Persuasion' | 'Intimidation' | 'Seduction' | 'Submission' | 'Resist' | 'Deception' | 'General';
  checkContext?: string; // E.g., 'Requires Charisma', 'Combat Skill', etc.
}

export interface GameState {
  world: World;
  character: Character;
  currentRoom: string;
  roomDescription: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  currentChoices: Choice[];
  nearbyObjects: string[];
  lastImage?: string;
  activeEvents: { name: string; description: string }[];
  wiki: WikiEntry[];
  time: {
    day: number;
    timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Late Night';
  };
  weather: {
    type: 'Clear' | 'Rain' | 'Snow' | 'Fog' | 'Windy' | 'Storm';
    intensity: number; // 0 to 1
    temperature: number; // in Celsius
  };
}
