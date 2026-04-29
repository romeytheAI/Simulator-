import { Character, GameState, World, WorldTheme } from '../types';
import { createNoise2D } from 'simplex-noise';

export const SIMULATION_CONSTANTS = {
  NEEDS_DECAY_RATE: 2.5,
  HEALING_RATE: 1.0,
  MAX_STAT: 100,
  MIN_STAT: 0,
};

export type BiomeType = 'URBAN_DECAY' | 'INDUSTRIAL_RUIN' | 'BARREN_WASTE' | 'CONTAMINATED_ZONE';

export interface GridNode {
  x: number;
  y: number;
  elevation: number;
  scarcity: number;
  biome: BiomeType;
  semanticData?: {
    name: string;
    threatLevel: number;
    description: string;
  };
}

export class ProceduralEngine {
  private elevationNoise = createNoise2D();
  private scarcityNoise = createNoise2D();
  private readonly scale = 0.05;

  // Layer 1: Topological Generation
  public generateChunk(startX: number, startY: number, size: number): GridNode[][] {
    const chunk: GridNode[][] = [];
    for (let x = 0; x < size; x++) {
      const row: GridNode[] = [];
      for (let y = 0; y < size; y++) {
        const globalX = startX + x;
        const globalY = startY + y;
        
        // Calculate intersecting matrices
        const elevation = this.elevationNoise(globalX * this.scale, globalY * this.scale);
        const scarcity = this.scarcityNoise((globalX + 1000) * this.scale, (globalY + 1000) * this.scale);
        
        const biome = this.calculateBiome(elevation, scarcity);
        
        row.push({ x: globalX, y: globalY, elevation, scarcity, biome });
      }
      chunk.push(row);
    }
    return chunk;
  }

  // Layer 2: Biome Classification via Matrix Intersection
  private calculateBiome(elevation: number, scarcity: number): BiomeType {
    if (elevation > 0.4) return 'INDUSTRIAL_RUIN';
    if (elevation < -0.2 && scarcity > 0.3) return 'CONTAMINATED_ZONE';
    if (scarcity > 0.6) return 'BARREN_WASTE';
    return 'URBAN_DECAY';
  }

  // Layer 3: Semantic Data Hydration (Neural Map)
  public hydrateNodeSemanticsDeterministic(node: GridNode, gameState: GameState): GridNode {
    if (node.semanticData) return node;

    const descriptions: Record<BiomeType, string[]> = {
      'URBAN_DECAY': [
        "Shattered glass crunches beneath your feet as you navigate through a skeletal cityscape.",
        "Rusted iron girders reach like desperate fingers towards the overcast sky.",
        "The stench of stale smoke and damp wallpaper hangs heavy in the quiet alleyways."
      ],
      'INDUSTRIAL_RUIN': [
        "Massive cooling towers loom over a graveyard of forgotten machinery.",
        "Oil-slicked puddles reflect the flickering light of dying embers.",
        "The rhythmic clanking of a derelict piston echoes through the vast, empty hangar."
      ],
      'BARREN_WASTE': [
        "Whistling winds carry the dust of a thousand years across the cracked earth.",
        "Jagged stones rise from the sand like the teeth of a subterranean beast.",
        "Nothing moves in this desolate expanse save for the shifting piles of grit."
      ],
      'CONTAMINATED_ZONE': [
        "A sickly green luminescence emanates from the phosphorescent moss clinging to the walls.",
        "The air feels thick and metallic, stinging your lungs with every breath.",
        "Twisted vegetation, mutated by unseen forces, twines around the crumbling structures."
      ]
    };

    const biomeDescs = descriptions[node.biome];
    const desc = biomeDescs[Math.floor(Math.abs(node.elevation * 10) % biomeDescs.length)];
    
    const names: Record<BiomeType, string[]> = {
      'URBAN_DECAY': ["Sector 7", "The Concrete Graveyard", "Neon Squalor"],
      'INDUSTRIAL_RUIN': ["Foundry Prime", "The Steam Pit", "Gear City"],
      'BARREN_WASTE': ["Dust Highlands", "The Salt Flats", "Echo Valley"],
      'CONTAMINATED_ZONE': ["Glow-Sump", "Radiation Ridge", "The Sickening"]
    };
    const name = names[node.biome][Math.floor(Math.abs(node.scarcity * 10) % names[node.biome].length)];

    return {
      ...node,
      semanticData: {
        name,
        threatLevel: Math.floor(node.scarcity * 10),
        description: desc
      }
    };
  }
}

/**
 * Deterministic Narrative Engine (Replacing LLM)
 */
// Helper for noun extraction (simplified)
const INTERESTING_NOUNS = ['factions', 'scarcity', 'resources', 'ruins', 'ghosts', 'memory', 'technology', 'old world', 'artifacts', 'scraps'];

import { getDialogueByActionType } from './dialogueData';

export function processActionDeterministic(gameState: GameState, action: string, choiceType?: string): {
  description: string;
  choices: { text: string; type?: string; checkContext?: string; }[];
  xpGained?: number;
  newWikiEntries: { term: string; definition: string }[];
} {
  const { character, weather, world } = gameState;
  const lowerAction = action.toLowerCase();
  const telemetry = character.simulationTelemetry;
  
  // 1. Determine base narrative context based on action
  let description = "";
  description = getDialogueByActionType(choiceType); // Use deterministic dialogue
  const choices: { text: string; type?: string; checkContext?: string; }[] = [];
  const newWikiEntries: { term: string; definition: string }[] = [];
  // Noun-based definition automation
  INTERESTING_NOUNS.forEach(noun => {
    if (description.toLowerCase().includes(noun) && !gameState.wiki.find((w: any) => w.term.toLowerCase() === noun.toLowerCase())) {
      newWikiEntries.push({ term: noun, definition: `A critical component of your survival in ${world.name}.` });
    }
  });

  // Dynamic World Events: Chance to trigger random events based on current conditions
  if (Math.random() < 0.25) { // 25% chance for a dynamic event per action
    if (telemetry && telemetry.Lethality > 60 && Math.random() < 0.5) {
       description += "\n\n*WORLD EVENT:* A sudden screech pierces the air. Hostile scavengers or local fauna have detected your presence!";
       choices.push({ text: "Take cover and prepare for an ambush", type: "Resist", checkContext: "Hostile Encounter" });
       choices.push({ text: "Flee the area immediately", type: "General" });
    } else if (telemetry && Math.random() < 0.3) {
       // Random discovery event
       description += "\n\n*WORLD EVENT:* A hidden compartment or buried cache reveals itself amid the rubble.";
       choices.push({ text: "Carefully pry it open", type: "Exploration" });
       choices.push({ text: "Ignore it, could be a trap", type: "General" });
       newWikiEntries.push({ term: "Hidden Cache", definition: "A stash of resources left behind by former inhabitants." });
    } else if (weather.type === 'Storm' && Math.random() < 0.5) {
       description += "\n\n*WORLD EVENT:* Lightning strikes a nearby structure, causing a partial collapse. Debris scatters around you!";
       choices.push({ text: "Dodge the falling debris", type: "Resist" });
    } else if (character.needs.hunger < 40) {
       description += "\n\n*WORLD EVENT:* The scent of something vaguely edible wafts through the air, testing your desperate hunger.";
       choices.push({ text: "Follow the scent", type: "Exploration" });
    }
  }

  // Add weather influence
  if (weather.type === 'Storm') description += " The howling winds nearly knock you off your feet.";
  if (weather.type === 'Rain') description += " Cold rain soaks through your clothing, dragging your spirit down.";
  if (weather.temperature < 5) description += " Your breath mists in the freezing air.";

  // 2. Generate Next Choices based on State Neural Map
  choices.push({ text: "Scout the immediate area", type: "General" });
  
  if (character.needs.hunger < 40) choices.push({ text: "Search for food scraps", type: "General", checkContext: "Scarcity is high" });
  if (character.needs.energy < 30) choices.push({ text: "Find a place to hunker down", type: "General" });
  
  // Dynamic choices based on telemetry
  if (telemetry && telemetry.Lethality > 60) {
    choices.push({ text: "Crouch and move silently", type: "Resist", checkContext: "Danger high" });
  } else {
    choices.push({ text: "Move forward with purpose", type: "General" });
  }

  // Social choices & NPC Behaviors
  if (character.relationships && character.relationships.length > 0) {
    character.relationships.forEach(npc => {
      const affinity = npc.affinity || 50;
      const fear = npc.fear || 0;
      
      // Determine NPC active behavior based on environment and relationships
      if (weather.type === 'Storm' || weather.type === 'Snow') {
        description += ` ${npc.name} struggles against the ${weather.type.toLowerCase()}, shouting for you to seek shelter.`;
        if (affinity > 50) {
          choices.push({ text: `Follow ${npc.name}'s lead to safety`, type: "Submission" });
        } else {
          choices.push({ text: `Demand ${npc.name} keeps moving`, type: "Intimidation" });
        }
      } else if (telemetry && telemetry.Lethality > 70) {
        if (fear > 60) {
          description += ` ${npc.name} is visibly panicked by the hostile surroundings, ready to bolt.`;
          choices.push({ text: `Calm ${npc.name} down`, type: "Persuasion" });
        } else {
          description += ` ${npc.name} draws closer, weapons or fists ready, anticipating an ambush.`;
          choices.push({ text: `Coordinate defense with ${npc.name}`, type: "General" });
        }
      } else if (character.needs.hunger < 30) {
         if (affinity < 40) {
            description += ` ${npc.name} eyes your belongings, the scarcity driving a wedge between you.`;
            choices.push({ text: `Guard your supplies from ${npc.name}`, type: "Intimidation" });
         } else {
            description += ` ${npc.name} offers to help you scavenge for food.`;
            choices.push({ text: `Scavenge with ${npc.name}`, type: "Exploration" });
         }
      } else {
         // Default idle behavior based on relationship
         if (affinity > 70) {
            description += ` ${npc.name} stays close, watching your back.`;
            choices.push({ text: `Converse warmly with ${npc.name}`, type: "Seduction" });
         } else if (fear > 50) {
            description += ` ${npc.name} keeps their distance, wary of your sudden moves.`;
            choices.push({ text: `Reassure ${npc.name}`, type: "Persuasion" });
         } else if (affinity < 30) {
            description += ` ${npc.name} scowls, clearly dissatisfied with your leadership.`;
            choices.push({ text: `Confront ${npc.name}'s attitude`, type: "Intimidation" });
         } else {
            choices.push({ text: `Interact with ${npc.name}`, type: "General" });
         }
      }
    });
  } else {
    choices.push({ text: "Call out for survivors", type: "General" });
  }

  // Add interactions for wiki entries (nouns)
  gameState.wiki.forEach((entry: any) => {
    if (!choices.find(c => c.text.includes(entry.term))) {
      choices.push({ text: `Examine ${entry.term}`, type: "General" });
    }
  });

  return {
    description,
    choices: choices.slice(0, 4), // Limit to 4 choices
    xpGained: 10,
    newWikiEntries
  };
}

/**
 * Deterministic Initial Scene Generator
 */
/**
 * Deterministic World Generator
 */
export function generateWorldDeterministic(theme: WorldTheme): World {
  const id = Math.random().toString(36).substring(7);
  const worldTemplates: Record<WorldTheme, Partial<World>> = {
    'High Fantasy': {
      name: "Aethelgard",
      description: "A realm of floating islands, ancient dragons, and shifting mana tides.",
      traits: ["High Magic", "Feudal", "Mythical Entities"],
      magicLevel: 9,
      techLevel: 2
    },
    'Cyberpunk': {
      name: "Neo-Veridian",
      description: "A rain-slicked megacity where digital consciousness and corporate greed collide.",
      traits: ["High Tech", "Dystopian", "Augmented Reality"],
      magicLevel: 0,
      techLevel: 9
    },
    'Steampunk': {
      name: "Ironport",
      description: "A world of massive gears, coal smoke, and explorers in brass airships.",
      traits: ["Industrial", "Discovery", "Bureaucratic"],
      magicLevel: 2,
      techLevel: 6
    },
    'Lovecraftian': {
      name: "Arkham Heights",
      description: "A fog-shrouded coastal town hiding cosmic horrors and forbidden knowledge.",
      traits: ["Occult", "Madness", "Ancient Secrets"],
      magicLevel: 4,
      techLevel: 3
    },
    'Hard Sci-Fi': {
      name: "Station 4",
      description: "A cold, realistic space colony governed by physics and orbital mechanics.",
      traits: ["Scientific", "Logical", "Zero-G"],
      magicLevel: 0,
      techLevel: 10
    },
    'Post-Apocalyptic': {
      name: "Dust Town",
      description: "The ruins of the old world reclaim it as survivors scrap for daily life.",
      traits: ["Scarcity", "Hardened", "Anarchic"],
      magicLevel: 0,
      techLevel: 3
    },
    'Historical Noir': {
      name: "Bay City",
      description: "A smoke-filled 1940s metropolis where every shadow hides a secret.",
      traits: ["Investigation", "Gritty", "Moral Ambiguity"],
      magicLevel: 0,
      techLevel: 4
    },
    'Real Life': {
      name: "Metro Central",
      description: "The modern world as we know it. Busy, unforgiving, and deeply normal.",
      traits: ["Mundane", "Bureaucratic", "Strict Reality"],
      magicLevel: 0,
      techLevel: 7
    }
  };

  const template = worldTemplates[theme];
  return {
    id,
    name: template.name || "Unnamed World",
    description: template.description || "A mysterious realm.",
    theme,
    traits: template.traits || [],
    magicLevel: template.magicLevel || 0,
    techLevel: template.techLevel || 0,
    civilizationAge: "Epoch IV",
    geography: "Continental",
    majorFactions: ["The Guild", "The Vanguard"],
    cultureAndEthics: "Standard Centralized",
    taboos: ["Theft", "Treason"]
  };
}

/**
 * Deterministic Character Options / Backstory
 */
export function generateCharacterBackstoryDeterministic(character: any, world: World): string {
  return `Born in the ${world.name}, ${character.name} has always lived a life defined by their ${character.profession} background. In the theme of ${world.theme}, they found purpose through their unique ${character.race} perspective.`;
}

export function generateCharacterOptionsDeterministic(theme: WorldTheme) {
  const options: Record<WorldTheme, { races: string[], professions: string[] }> = {
    'High Fantasy': { races: ['Elf', 'Orc', 'Human', 'Dwarf'], professions: ['Mage', 'Warrior', 'Rogue'] },
    'Cyberpunk': { races: ['Human', 'Android', 'Cyborg'], professions: ['Hacker', 'Mercenary', 'Fixer'] },
    'Steampunk': { races: ['Human', 'Automaton'], professions: ['Engineer', 'Explorer', 'Merchant'] },
    'Lovecraftian': { races: ['Human'], professions: ['Professor', 'Detective', 'Artist'] },
    'Hard Sci-Fi': { races: ['Human', 'Synthetics'], professions: ['Pilot', 'Engineer', 'Scientist'] },
    'Post-Apocalyptic': { races: ['Human', 'Mutant'], professions: ['Scavenger', 'Leader', 'Wanderer'] },
    'Historical Noir': { races: ['Human'], professions: ['P.I.', 'Cop', 'Fence'] },
    'Real Life': { races: ['Human'], professions: ['Office Worker', 'Barista', 'Barista'] },
  };
  return options[theme];
}

export function generateInitialSceneDeterministic(world: any, character: any) {
  return {
    description: `You awaken in the heart of ${world.name}. The atmosphere is heavy with the scent of ${world.theme === 'Cyberpunk' ? 'ozone and decay' : world.theme === 'High Fantasy' ? 'ancient magic and pine' : 'dust and desolation'}. You are a ${character.race} ${character.profession}, and your journey begins here.`,
    choices: [
      { text: "Examine your surroundings", type: "General" },
      { text: "Check your gear", type: "General" },
      { text: "Look for a way out", type: "General" }
    ],
    startingInventory: character.inventory,
    startingStats: character.stats,
    startingFactions: [],
    initialWiki: []
  };
}

export interface SimulationTickResult {
  updatedNeeds: Character['needs'];
  updatedCondition: Character['condition'];
  updatedTelemetry: Character['simulationTelemetry'];
  updatedWeather: GameState['weather'];
}

/**
 * Deterministic logic for updating character vitals and world state.
 * This runs independently of the LLM to ensure consistent mechanical rules.
 */
export function simulateTick(gameState: GameState, actionType: string): SimulationTickResult {
  const { character, weather } = gameState;
  const needs = { ...character.needs };
  const condition = { ...character.condition };
  const telemetry = { ...(character.simulationTelemetry || {
    Stability: 50,
    Scarcity: 50,
    Lethality: 50,
    Momentum: 50,
    Corruption: 0
  }) };

  // 1. Weather Update Logic (Stochastic transition)
  let updatedWeather = { ...weather };
  if (Math.random() < 0.1) { // 10% chance to change weather each tick
    const types: GameState['weather']['type'][] = ['Clear', 'Rain', 'Snow', 'Fog', 'Windy', 'Storm'];
    updatedWeather.type = types[Math.floor(Math.random() * types.length)];
    updatedWeather.intensity = Math.random();
    
    // Adjust temperature based on type
    if (updatedWeather.type === 'Snow') updatedWeather.temperature = Math.random() * 5 - 10;
    else if (updatedWeather.type === 'Storm' || updatedWeather.type === 'Rain') updatedWeather.temperature = Math.random() * 10 + 5;
    else if (updatedWeather.type === 'Clear') updatedWeather.temperature = Math.random() * 15 + 15;
    else updatedWeather.temperature = Math.random() * 10 + 10;
  }

  // 2. Needs Decay based on Action Energy + Weather
  const effort = actionType?.toLowerCase().includes('run') || actionType?.toLowerCase().includes('fight') ? 2 : 1;
  const weatherStrain = (weather.type !== 'Clear' ? 1.2 : 1.0) * (1 + weather.intensity * 0.5);
  
  needs.energy = Math.max(0, needs.energy - (SIMULATION_CONSTANTS.NEEDS_DECAY_RATE * effort * weatherStrain));
  needs.hunger = Math.max(0, needs.hunger - (SIMULATION_CONSTANTS.NEEDS_DECAY_RATE * 0.5 * weatherStrain));
  needs.hygiene = Math.max(0, needs.hygiene - (SIMULATION_CONSTANTS.NEEDS_DECAY_RATE * 0.3));

  // 3. Condition updates based on needs + weather
  if (needs.hunger < 10 || needs.energy < 10) {
    condition.pain = Math.min(100, condition.pain + 2);
    condition.stress = Math.min(100, condition.stress + 5);
    telemetry.Lethality = Math.min(100, telemetry.Lethality + 1);
  }

  if (weather.type === 'Storm' || weather.type === 'Snow') {
    condition.stress = Math.min(100, condition.stress + (2 * weather.intensity));
  }
  
  if (weather.temperature < 5 || weather.temperature > 35) {
    condition.pain = Math.min(100, condition.pain + 1);
  }

  // 4. Telemetry Shifting Logic
  // Momentum increases with activity
  telemetry.Momentum = Math.min(100, telemetry.Momentum + (effort * 2));
  
  // Stability decays if Lethality is high
  if (telemetry.Lethality > 70) {
    telemetry.Stability = Math.max(0, telemetry.Stability - 2);
  }

  // Scarcity increases slowly over time
  telemetry.Scarcity = Math.min(100, telemetry.Scarcity + 0.5);

  return {
    updatedNeeds: needs,
    updatedCondition: condition,
    updatedTelemetry: telemetry,
    updatedWeather: updatedWeather
  };
}

/**
 * Resolves the mechanical outcome of an action before narrative generation.
 */
/**
 * Resolves social interactions using a deterministic "neural map" logic.
 * NPCs are treated as nodes with weights (Affinity, Trust, Fear, etc.).
 */
export function resolveSocialMechanics(action: string, choiceType: string | undefined, currentState: GameState) {
  const lowerAction = action.toLowerCase();
  const character = currentState.character;
  const relationships = [...character.relationships];
  const factions = [...character.factions];
  const needs = { ...character.needs };
  const condition = { ...character.condition };

  // Helper to find or create a relationship
  const getRelation = (name: string) => {
    let rel = relationships.find(r => r.name === name);
    if (!rel) {
      rel = { name, type: 'NPC', status: 'Neutral', affinity: 50, trust: 50, fear: 0, resentment: 0, attraction: 0, memory: '' };
      relationships.push(rel);
    }
    return rel;
  };

  // 1. Identify target NPC from action string (very simple parser)
  const npcMatch = lowerAction.match(/talk to ([a-z\s]+)|interact with ([a-z\s]+)/);
  const targetNpcName = npcMatch ? (npcMatch[1] || npcMatch[2]).trim() : null;
  
  if (targetNpcName) {
    const rel = getRelation(targetNpcName);
    
    // 2. Neural Map logic based on choice type
    switch (choiceType) {
      case 'Persuasion':
        rel.trust = Math.min(100, rel.trust + 5);
        rel.affinity = Math.min(100, rel.affinity + 2);
        needs.social = Math.min(100, needs.social + 10);
        break;
      case 'Intimidation':
        rel.fear = Math.min(100, rel.fear + 15);
        rel.affinity = Math.max(0, rel.affinity - 10);
        rel.resentment = Math.min(100, rel.resentment + 5);
        condition.stress = Math.min(100, condition.stress + 5);
        break;
      case 'Seduction':
        rel.attraction = Math.min(100, rel.attraction + 8);
        rel.affinity = Math.min(100, rel.affinity + 3);
        condition.arousal = Math.min(100, condition.arousal + 10);
        break;
      case 'Submission':
        rel.fear = Math.max(0, rel.fear - 5);
        rel.trust = Math.min(100, rel.trust + 2);
        condition.stress = Math.max(0, condition.stress - 5);
        break;
      case 'Deception':
        // Deception doesn't change trust unless caught (LLM handles detection narrative, engine handles seed shift)
        rel.affinity = Math.min(100, rel.affinity + 1);
        rel.resentment = Math.min(100, rel.resentment + 2); // Subconscious suspicion
        break;
    }

    // 3. Feedback Loop (Neural map secondary effects)
    if (rel.fear > 70) rel.resentment = Math.min(100, rel.resentment + 1);
    if (rel.trust > 80) rel.affinity = Math.min(100, rel.affinity + 1);
    if (rel.resentment > 50) rel.trust = Math.max(0, rel.trust - 1);
  }

  return { 
    relationships, 
    factions, 
    needs, 
    condition 
  };
}

export function resolveActionMechanics(action: string, currentState: GameState) {
  // Example of deterministic item usage or specific keyword reactions
  const lowerAction = action.toLowerCase();
  
  const changes: Partial<Character> = {};
  
  if (lowerAction.includes('eat') || lowerAction.includes('consume')) {
    changes.needs = { ...currentState.character.needs, hunger: Math.min(100, currentState.character.needs.hunger + 25) };
  }
  
  if (lowerAction.includes('wash') || lowerAction.includes('clean')) {
    changes.needs = { ...currentState.character.needs, hygiene: Math.min(100, currentState.character.needs.hygiene + 30) };
  }
  
  if (lowerAction.includes('sleep') || lowerAction.includes('rest')) {
    changes.needs = { ...currentState.character.needs, energy: Math.min(100, currentState.character.needs.energy + 40) };
    changes.condition = { ...currentState.character.condition, stress: Math.max(0, currentState.character.condition.stress - 15) };
  }

  return changes;
}
