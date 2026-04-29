/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { World, Character, GameState } from '../types';
import { 
  simulateTick, 
  resolveActionMechanics, 
  resolveSocialMechanics, 
  processActionDeterministic, 
  generateInitialSceneDeterministic 
} from '../lib/engine';
import { 
  User, Package, MapPin, Heart, Shield, Zap, Loader2, RefreshCw, Send, 
  ChevronRight, Settings, X, Sparkles, BookOpen, 
  CloudRain, CloudSnow, CloudFog, Wind, Sun, CloudLightning, Thermometer 
} from 'lucide-react';
import { getDialogue, archetypes, getArchetypeByIndex } from '../lib/dialogueData';
import { cn } from '../lib/utils';
import MapViewer from './MapViewer';
import StagedModelViewer from './StagedModelViewer';
import NPCInteractionView from './NPCInteractionView';
import SideScrollerScene from './SideScrollerScene';
import WeatherOverlay from './WeatherOverlay';

interface SimulationProps {
  world: World;
  character: Character;
  onExit: () => void;
}

export default function Simulation({ world, character, onExit }: SimulationProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  const [hordeChoice, setHordeChoice] = useState<string | null>(null);
  const [isHordeGenerating, setIsHordeGenerating] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [activeTab, setActiveTab] = useState<'narrative' | 'map' | 'model'>('narrative');
  const [activeInteraction, setActiveInteraction] = useState<{ name: string; type: string; memory: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const upgradeSkill = (index: number) => {
    if (!gameState || gameState.character.skillPoints <= 0) return;
    const newSkills = [...gameState.character.skills];
    newSkills[index].level++;
    setGameState({
      ...gameState,
      character: {
        ...gameState.character,
        skills: newSkills,
        skillPoints: gameState.character.skillPoints - 1
      }
    });
  };

  const learnNewSkill = () => {
    if (!gameState || gameState.character.skillPoints <= 0 || !newSkillName.trim()) return;
    const newSkills = [...gameState.character.skills];
    newSkills.push({ name: newSkillName.trim(), level: 1 });
    setGameState({
      ...gameState,
      character: {
        ...gameState.character,
        skills: newSkills,
        skillPoints: gameState.character.skillPoints - 1
      }
    });
    setNewSkillName("");
  };

  useEffect(() => {
    async function startSim() {
      try {
        const initial = generateInitialSceneDeterministic(world, character);
      
      const setupCharacter = {
        ...character,
        inventory: initial.startingInventory || character.inventory,
        factions: initial.startingFactions || [],
        stats: initial.startingStats ? { ...character.stats, ...initial.startingStats } : character.stats
      };

      const initialState = {
        world,
        character: setupCharacter,
        currentRoom: "Start",
        roomDescription: initial.description,
        history: [{ role: 'assistant', text: initial.description }],
        currentChoices: initial.choices,
        nearbyObjects: [],
        lastImage: undefined, // Remove image generation
        activeEvents: [],
        wiki: initial.initialWiki || [],
        time: { day: 1, timeOfDay: 'Morning' as const },
        weather: {
          type: 'Clear',
          intensity: 0.2,
          temperature: 22
        }
      };
      setGameState(initialState as any);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    startSim();
  }, [world, character]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState?.history]);

  // Asynchronous Dialogue Loop
  useEffect(() => {
    let dialogueCounter = 0;
    const interval = setInterval(() => {
      const archetype = getArchetypeByIndex(dialogueCounter);
      
      // Add to history
      setGameState((prev: any) => {
        if (!prev) return prev;
        const telemetry = prev.character.simulationTelemetry;
        const mood = prev.character.condition.stress; // Or calculate an overall mood
        const dialogue = getDialogue(archetype, telemetry, mood);
        return {
          ...prev,
          history: [...prev.history, { role: 'assistant', text: `[${archetype}]: ${dialogue}` }]
        };
      });
      
      dialogueCounter++;
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const triggerHordeChoice = async (currentHistory: any[]) => {
    // Deterministic suggestions instead of LLM
    const suggestions = ["Scout ahead", "Rest for a moment", "Check your inventory", "Look for food"];
    setHordeChoice(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  const handleAction = async (action: string, choiceType?: string) => {
    if (processing || !gameState) return;

    // INTERCEPT '!' COMMAND
    if (action.startsWith('!')) {
      const archetypeCommand = action.substring(1).trim();
      const dialogue = getDialogue(archetypeCommand);
      
      setGameState({
        ...gameState,
        history: [...gameState.history, { role: 'assistant', text: `[${archetypeCommand}]: ${dialogue}` }]
      } as any);
      return;
    }

    // NPC Interaction Check
    if (action.startsWith('Interact with')) {
      const npcName = action.substring('Interact with '.length).trim();
      const npc = gameState.character.relationships.find(r => r.name === npcName);
      if (npc) {
          setActiveInteraction({
            name: npc.name,
            type: npc.type,
            memory: npc.memory
          });
          setProcessing(false);
          return;
      }
    }

    setProcessing(true);
    setHordeChoice(null);
    setIsHordeGenerating(false);

    try {
      // Logic-based state updates (Deterministic)
      const mechanicalChanges = resolveActionMechanics(action, gameState);
      const socialChanges = resolveSocialMechanics(action, choiceType, gameState);

      const combinedMechanical = {
        ...mechanicalChanges,
        needs: { ...gameState.character.needs, ...mechanicalChanges.needs, ...socialChanges.needs },
        condition: { ...gameState.character.condition, ...mechanicalChanges.condition, ...socialChanges.condition },
        relationships: socialChanges.relationships,
        factions: socialChanges.factions
      };

      const tickResults = simulateTick({
        ...gameState,
        character: { ...gameState.character, ...combinedMechanical }
      }, action);

      const currentTime = gameState.time || { day: 1, timeOfDay: 'Morning' };
      
      const characterForPrediction = {
        ...gameState.character,
        ...combinedMechanical,
        needs: tickResults.updatedNeeds,
        condition: tickResults.updatedCondition,
        simulationTelemetry: tickResults.updatedTelemetry
      };

      // USE DETERMINISTIC ENGINE INSTEAD OF LLM
      const result = processActionDeterministic(gameState, action, choiceType);
      
      const finalNeeds = tickResults.updatedNeeds;
      const finalCondition = tickResults.updatedCondition;
      const finalTelemetry = tickResults.updatedTelemetry;
      const finalWeather = tickResults.updatedWeather;
      const finalRelationships = socialChanges.relationships;
      const finalFactions = socialChanges.factions;

      // Deterministic history updates
      let currentRelationships = finalRelationships;
      let currentFactions = finalFactions;
      let currentSkills = [...gameState.character.skills];
      let currentFollowers = [...(gameState.character.followers || [])];
      let currentActiveEvents = [...(gameState.activeEvents || [])];
      let newWiki = [...(gameState.wiki || [])];
      if (result.newWikiEntries) {
        result.newWikiEntries.forEach((newEntry: any) => {
          const index = newWiki.findIndex(w => w.term === newEntry.term);
          if (index === -1) newWiki.push(newEntry);
        });
      }
      let currentPerks = [...(gameState.character.perks || [])];
      let currentMoodlets = [...(gameState.character.moodlets || [])].map(m => ({ ...m, duration: m.duration - 1 })).filter(m => m.duration > 0);

      let currentXp = gameState.character.xp || 0;
      let currentLevel = gameState.character.level || 1;
      let currentSkillPoints = gameState.character.skillPoints || 0;
      if (result.xpGained) {
        currentXp += result.xpGained;
        let nextLevelXp = currentLevel * 100;
        while (currentXp >= nextLevelXp) {
          currentXp -= nextLevelXp;
          currentLevel++;
          currentSkillPoints++;
          nextLevelXp = currentLevel * 100;
        }
      }

      const updatedCharacter = {
        ...gameState.character,
        level: currentLevel,
        xp: currentXp,
        skillPoints: currentSkillPoints,
        inventory: gameState.character.inventory,
        relationships: currentRelationships,
        factions: currentFactions,
        skills: currentSkills,
        perks: currentPerks,
        moodlets: currentMoodlets,
        followers: currentFollowers,
        needs: finalNeeds,
        condition: finalCondition,
        simulationTelemetry: finalTelemetry
      };

      const newGameState = {
        ...gameState,
        character: updatedCharacter,
        roomDescription: result.description,
        history: [...gameState.history, { role: 'user', text: action }, { role: 'assistant', text: result.description }],
        currentChoices: result.choices as any,
        nearbyObjects: [],
        lastImage: undefined, // Neural map doesn't generate images
        activeEvents: currentActiveEvents,
        wiki: newWiki,
        time: currentTime, // Advanced by engine tick logic if needed
        weather: finalWeather
      };
      
      setGameState(newGameState as any);
      if (!choiceType) {
        triggerHordeChoice(newGameState.history);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-nexus-bg">
        <Loader2 className="animate-spin text-nexus-accent" size={48} />
        <p className="font-mono text-nexus-muted uppercase tracking-widest text-xs">Initializing Neural Link with {world.name}...</p>
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0C] overflow-hidden">
      {/* HUD Header */}
      <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-[#0F0F12] shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">World Engine</span>
            <span className="font-serif italic text-lg leading-tight text-[#D4C5B3]">{world.name}</span>
          </div>
          <div className="h-8 w-px bg-white/5" />
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[11px] uppercase tracking-wider flex items-center gap-2 text-nexus-text">
              <span className="text-orange-400 opacity-80 text-[8px]">●</span> ACTIVE
            </div>
            {world.traits && world.traits.length > 0 && (
              <div className="hidden lg:flex gap-2">
                {world.traits.map(t => (
                  <div key={t} className="px-3 py-1 bg-nexus-accent/10 rounded border border-nexus-accent/20 text-[10px] text-nexus-accent uppercase tracking-wider flex items-center">
                    {t}
                  </div>
                ))}
              </div>
            )}
            <div className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[11px] uppercase tracking-wider flex items-center gap-2 text-nexus-text">
              Day {gameState.time?.day || 1} • {gameState.time?.timeOfDay || 'Morning'}
            </div>
            {gameState.weather && (
              <div className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[11px] uppercase tracking-wider flex items-center gap-2 text-nexus-text group relative cursor-help">
                {gameState.weather.type === 'Clear' && <Sun size={14} className="text-yellow-400" />}
                {gameState.weather.type === 'Rain' && <CloudRain size={14} className="text-blue-400" />}
                {gameState.weather.type === 'Snow' && <CloudSnow size={14} className="text-white" />}
                {gameState.weather.type === 'Fog' && <CloudFog size={14} className="text-gray-400" />}
                {gameState.weather.type === 'Windy' && <Wind size={14} className="text-teal-400" />}
                {gameState.weather.type === 'Storm' && <CloudLightning size={14} className="text-purple-400" />}
                <span>{gameState.weather.type}</span>
                <span className="opacity-50 mx-1">|</span>
                <Thermometer size={12} className={cn(
                  gameState.weather.temperature < 5 ? "text-blue-300" : 
                  gameState.weather.temperature > 30 ? "text-red-400" : "text-green-400"
                )} />
                <span>{gameState.weather.temperature.toFixed(1)}°C</span>
                
                <div className="absolute top-full left-0 mt-2 p-3 bg-[#1A1A1F] border border-white/10 rounded-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48">
                   <p className="text-[10px] text-white font-bold mb-1 uppercase tracking-widest">{gameState.weather.type} Intensity: {(gameState.weather.intensity * 100).toFixed(0)}%</p>
                   <p className="text-[9px] text-[#8E8E93] leading-relaxed">
                     {gameState.weather.type === 'Storm' && "Increased stress and lethality. Visibility drastically reduced."}
                     {gameState.weather.type === 'Snow' && "Extreme cold hazard. Mobility hampered. Stress increase."}
                     {gameState.weather.type === 'Rain' && "Hygiene impact. General gloom. Moisture exposure."}
                     {gameState.weather.type === 'Fog' && "Stealth increased, but orientation difficult."}
                     {gameState.weather.type === 'Windy' && "Long range communication or flight hampered."}
                     {gameState.weather.type === 'Clear' && "Optimal conditions for exploration."}
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.15em] font-medium text-[#8E8E93]">
           <div className="flex bg-white/5 border border-white/10 rounded-sm">
             <button 
               onClick={() => setActiveTab('narrative')}
               className={cn("px-4 py-1.5 flex items-center gap-2 transition-colors", activeTab === 'narrative' ? "bg-nexus-accent text-nexus-bg" : "hover:text-[#D4C5B3]")}
             >
               <BookOpen size={14} /> Narrative
             </button>
             <button 
               onClick={() => setActiveTab('map')}
               className={cn("px-4 py-1.5 flex items-center gap-2 transition-colors", activeTab === 'map' ? "bg-nexus-accent text-nexus-bg" : "hover:text-[#D4C5B3]")}
             >
               <MapPin size={14} /> Global Map
             </button>
             <button 
               onClick={() => setActiveTab('model')}
               className={cn("px-4 py-1.5 flex items-center gap-2 transition-colors", activeTab === 'model' ? "bg-nexus-accent text-nexus-bg" : "hover:text-[#D4C5B3]")}
             >
               <User size={14} /> 3D Avatar
             </button>
           </div>
           <button onClick={() => setShowSettings(true)} className="hover:text-[#D4C5B3] transition-colors p-2">
            <Settings size={16} />
          </button>
           <button onClick={onExit} className="hover:text-red-400 transition-colors tracking-widest pl-4 border-l border-white/10">
            Terminate Session
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Status Sidebar */}
        <aside className="w-full lg:w-[400px] border-r border-white/10 bg-[#0F0F12]/50 flex flex-col custom-scrollbar overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Identity */}
            <section className="bg-white/5 rounded-xl p-5 border border-white/10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                  {gameState.character.avatar ? (
                    <div className="w-12 h-12 rounded-sm border border-white/10 overflow-hidden shrink-0">
                      <img src={gameState.character.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-sm border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                       <User size={20} className="text-[#8E8E93]" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-serif text-white leading-none mb-1">{gameState.character.name}</h2>
                    <p className="text-[10px] text-[#8E8E93] italic uppercase tracking-widest">{gameState.character.background} • {gameState.character.race} • Age {gameState.character.age}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} /> Attributes
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(gameState.character.stats).map(([k, v]) => (
                  <div key={k} className="bg-white/5 border border-white/5 p-3 rounded-sm flex flex-col justify-center">
                    <span className="text-[9px] uppercase text-[#8E8E93] mb-1">{k}</span>
                    <span className="text-xs text-[#D4C5B3]">{v as number}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Simulation Telemetry */}
            {gameState.character.simulationTelemetry && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-cyan-400">
                  <RefreshCw size={12} /> Simulation Telemetry
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(gameState.character.simulationTelemetry).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1">
                       <div className="flex justify-between text-[9px] uppercase text-[#8E8E93]">
                         <span>{k}</span>
                         <span>{v}%</span>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-cyan-500/50 transition-all" 
                           style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} 
                         />
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Needs */}
            {gameState.character.needs && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-green-400">
                  <Heart size={12} /> Needs
                </h4>
                <div className="space-y-3">
                  {Object.entries(gameState.character.needs).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1">
                       <div className="flex justify-between text-[9px] uppercase text-[#8E8E93]">
                         <span>{k}</span>
                         <span>{v}%</span>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className={cn("h-full rounded-full transition-all", 
                              Number(v) < 30 ? 'bg-red-500' : 'bg-green-500'
                           )} 
                           style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} 
                         />
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Condition */}
            {gameState.character.condition && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-red-500">
                  <Zap size={12} /> Condition
                </h4>
                <div className="space-y-3">
                  {Object.entries(gameState.character.condition).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1">
                       <div className="flex justify-between text-[9px] uppercase text-[#8E8E93]">
                         <span>{k}</span>
                         <span>{v}%</span>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className={cn("h-full rounded-full transition-all", 
                              Number(v) > 70 ? 'bg-red-500' : 'bg-orange-500/50'
                           )} 
                           style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} 
                         />
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Clothing */}
            {gameState.character.clothing && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-blue-400">
                  <Shield size={12} /> Wardrobe & State
                </h4>
                <div className="p-3 bg-white/5 rounded-sm border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8E8E93]">State</span>
                    <span className={cn(
                      "uppercase tracking-wider font-mono text-[9px] px-1.5 py-0.5 rounded",
                      gameState.character.clothing.state === 'pristine' ? 'text-green-400 bg-green-400/10' :
                      gameState.character.clothing.state === 'worn' ? 'text-yellow-400 bg-yellow-400/10' :
                      gameState.character.clothing.state === 'torn' ? 'text-orange-400 bg-orange-400/10' :
                      'text-red-400 bg-red-400/10'
                    )}>
                      {gameState.character.clothing.state}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {['head', 'torso', 'legs', 'feet'].map(part => (
                      <div key={part} className="flex flex-col border-t border-white/5 pt-1">
                        <span className="text-[8px] uppercase text-[#8E8E93] tracking-widest">{part}</span>
                        <span className="text-[10px] text-[#D4C5B3] truncate">{((gameState.character.clothing as any)[part])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Skills & Traits */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 flex-1 border-b border-white/5 pb-2">
                  Abilities & Psyche
                </h4>
              </div>
              
              <div className="flex flex-col gap-1 mb-2 bg-nexus-accent/5 border border-nexus-accent/20 p-2 rounded-sm relative overflow-hidden">
                <div className="flex justify-between items-center text-xs z-10">
                  <span className="font-mono text-nexus-accent">LEVEL {gameState.character.level || 1}</span>
                  <span className="text-[#8E8E93] text-[10px]">XP: {gameState.character.xp || 0} / {(gameState.character.level || 1) * 100}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden z-10">
                  <div className="h-full bg-nexus-accent/50 transition-all" style={{ width: `${Math.min(100, ((gameState.character.xp || 0) / ((gameState.character.level || 1) * 100)) * 100)}%` }} />
                </div>
                {gameState.character.skillPoints > 0 && (
                   <div className="absolute right-0 top-0 bottom-0 pr-2 flex items-center">
                     <span className="text-[10px] bg-nexus-accent text-nexus-bg px-1.5 py-0.5 rounded-sm font-bold animate-pulse">
                       {gameState.character.skillPoints} PTS
                     </span>
                   </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] uppercase text-[#8E8E93] mb-1 block">Traits</span>
                  <div className="flex flex-wrap gap-1">
                    {gameState.character.traits.map(t => (
                       <span key={t} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-[#D4C5B3]">{t}</span>
                    ))}
                  </div>
                </div>

                {gameState.character.perks && gameState.character.perks.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase text-nexus-accent mb-1 block">Acquired Perks</span>
                    <div className="flex flex-wrap gap-1">
                      {gameState.character.perks.map(p => (
                         <div key={p.name} title={p.description} className="text-[10px] px-2 py-1 bg-nexus-accent/10 border border-nexus-accent/20 rounded-sm text-nexus-accent">
                           {p.name}
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                {gameState.character.moodlets && gameState.character.moodlets.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase text-[#8E8E93] mb-1 block">Active Moodlets</span>
                    <div className="flex flex-wrap gap-1">
                      {gameState.character.moodlets.map(m => (
                         <div key={m.name} title={m.description} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-[#E0D7D0] flex items-center gap-1">
                           {m.name} <span className="opacity-50 text-[8px] border-l border-white/10 pl-1">{m.duration}t</span>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[9px] uppercase text-[#8E8E93] mb-1 block">Skills (Rank)</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1">
                      {gameState.character.skills.map((s, i) => (
                         <div key={s.name} className="flex items-center text-[10px] bg-white/5 border border-white/10 rounded-sm overflow-hidden transition-all hover:bg-white/10">
                           <span className="px-2 py-1 text-[#E0D7D0]">{s.name}</span>
                           <span className="px-2 py-1 bg-white/10 text-[#D4C5B3] font-bold border-l border-white/5">{s.level}</span>
                           {gameState.character.skillPoints > 0 && (
                             <button
                               onClick={() => upgradeSkill(i)}
                               className="px-2 py-1 bg-nexus-accent/20 hover:bg-nexus-accent text-nexus-accent hover:text-nexus-bg transition-colors"
                             >
                               +
                             </button>
                           )}
                         </div>
                      ))}
                    </div>
                    {gameState.character.skillPoints > 0 && (
                      <div className="flex mt-2 gap-2">
                        <input
                          type="text"
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          placeholder="Or type a new skill to learn..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-sm text-[10px] px-2 py-1 outline-none focus:border-nexus-accent text-[#D4C5B3]"
                        />
                        <button
                          onClick={learnNewSkill}
                          disabled={!newSkillName.trim()}
                          className="px-2 py-1 bg-white/10 hover:bg-nexus-accent hover:text-nexus-bg border border-white/10 rounded-sm text-[10px] transition-colors disabled:opacity-50"
                        >
                          Unlock
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Relationships & Factions */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                <Heart size={12} /> Social Web & Factions
              </h4>
              <div className="space-y-2">
                {gameState.character.relationships.length === 0 && (!gameState.character.factions || gameState.character.factions.length === 0) ? (
                  <span className="text-xs text-[#8E8E93] italic">No active connections.</span>
                ) : (
                  <>
                  {gameState.character.factions?.map((fac, i) => (
                    <div key={`fac-${i}`} className="text-xs p-3 bg-blue-900/10 border border-blue-500/20 rounded-sm flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-[#D4C5B3]">{fac.name}</span>
                        <span className={cn(
                          "text-[9px] uppercase font-mono px-1 rounded",
                          fac.reputation > 50 ? "text-blue-400 bg-blue-400/10" : fac.reputation < -20 ? "text-red-400 bg-red-400/10" : "text-[#8E8E93] bg-white/5"
                        )}>
                          {fac.reputation} Rep
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-300/50 uppercase tracking-wider">{fac.status}</span>
                    </div>
                  ))}
                  {gameState.character.relationships.map((rel, i) => (
                    <div key={`rel-${i}`} className="text-xs p-3 bg-white/5 border border-white/5 rounded-sm flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-[#D4C5B3]">{rel.name}</span>
                        <div className="flex gap-1">
                          <span className={cn(
                            "text-[9px] uppercase font-mono px-1 rounded",
                            rel.affinity > 50 ? "text-green-400 bg-green-400/10" : rel.affinity < -20 ? "text-red-400 bg-red-400/10" : "text-[#8E8E93] bg-white/5"
                          )} title="Affinity">
                            {rel.affinity} A
                          </span>
                          {rel.trust !== undefined && (
                            <span className={cn(
                              "text-[9px] uppercase font-mono px-1 rounded",
                              rel.trust > 50 ? "text-blue-400 bg-blue-400/10" : rel.trust < -20 ? "text-red-400 bg-red-400/10" : "text-[#8E8E93] bg-white/5"
                            )} title="Trust">
                              {rel.trust} T
                            </span>
                          )}
                          {rel.fear !== undefined && (
                            <span className={cn(
                              "text-[9px] uppercase font-mono px-1 rounded",
                              rel.fear > 50 ? "text-purple-400 bg-purple-400/10" : "text-[#8E8E93] bg-white/5"
                            )} title="Fear">
                              {rel.fear} F
                            </span>
                          )}
                          {rel.resentment !== undefined && (
                            <span className={cn(
                              "text-[9px] uppercase font-mono px-1 rounded",
                              rel.resentment > 50 ? "text-orange-400 bg-orange-400/10" : "text-[#8E8E93] bg-white/5"
                            )} title="Resentment">
                              {rel.resentment} R
                            </span>
                          )}
                          {rel.attraction !== undefined && (
                            <span className={cn(
                              "text-[9px] uppercase font-mono px-1 rounded",
                              rel.attraction > 50 ? "text-pink-400 bg-pink-400/10" : "text-[#8E8E93] bg-white/5"
                            )} title="Attraction">
                              {rel.attraction} L
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {rel.type && <span className="text-[10px] text-nexus-accent uppercase tracking-wider">{rel.type}</span>}
                        <span className="text-[10px] text-[#8E8E93] uppercase tracking-wider">{rel.status}</span>
                      </div>
                      <p className="text-[10px] text-white/50 italic leading-snug">{rel.memory}</p>
                    </div>
                  ))}
                  </>
                )}
              </div>
            </section>

            {/* Followers / Party */}
            {gameState.character.followers && gameState.character.followers.length > 0 && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-yellow-500">
                  <User size={12} /> Party / Followers
                </h4>
                <div className="space-y-2">
                  {gameState.character.followers.map((fol, i) => (
                    <div key={`fol-${i}`} className="text-xs p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-sm flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-[#D4C5B3]">{fol.name}</span>
                        <div className="flex gap-2">
                          <span className="text-[9px] uppercase font-mono px-1 rounded text-yellow-400 bg-yellow-400/10">
                            Ly: {fol.loyalty}
                          </span>
                          <span className="text-[9px] uppercase font-mono px-1 rounded text-green-400 bg-green-400/10">
                            Mo: {fol.morale}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-yellow-300/50 uppercase tracking-wider">{fol.status}</span>
                      <p className="text-[10px] text-white/50 italic leading-snug">{fol.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* World Events */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-orange-400">
                <RefreshCw size={12} /> Active World Events
              </h4>
               <div className="space-y-2">
                {(!gameState.activeEvents || gameState.activeEvents.length === 0) ? (
                  <span className="text-xs text-[#8E8E93] italic">World state stable.</span>
                ) : (
                  gameState.activeEvents.map((evt, i) => (
                    <div key={i} className="text-xs p-3 bg-orange-400/5 border border-orange-400/20 rounded-sm flex flex-col gap-1">
                      <span className="font-serif font-bold text-orange-400/80">{evt.name}</span>
                      <p className="text-[10px] text-orange-400/60 leading-snug">{evt.description}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Lorebook (Wiki) */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-purple-400">
                <BookOpen size={12} /> Lorebook (Wiki)
              </h4>
               <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {(!gameState.wiki || gameState.wiki.length === 0) ? (
                  <span className="text-xs text-[#8E8E93] italic">No lore recorded yet.</span>
                ) : (
                  gameState.wiki.map((entry, i) => (
                    <details key={i} className="text-xs p-3 bg-purple-900/10 border border-purple-500/20 rounded-sm flex flex-col gap-1 group">
                      <summary className="font-serif font-bold text-purple-400/80 cursor-pointer list-none flex justify-between items-center">
                        {entry.term}
                        <span className="text-[#8E8E93] group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-[10px] text-purple-300/60 leading-snug mt-2 border-t border-purple-500/20 pt-2">{entry.description}</p>
                    </details>
                  ))
                )}
              </div>
            </section>

            {/* Social Network */}
            {gameState.character.relationships && gameState.character.relationships.length > 0 && (
              <section className="space-y-4">
                <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-pink-400">
                  <User size={12} /> Social Network
                </h4>
                <div className="space-y-3">
                  {gameState.character.relationships.map((rel, i) => (
                    <details key={i} className="bg-white/5 border border-white/10 p-3 rounded-sm group overflow-hidden">
                      <summary className="flex flex-col gap-1 cursor-pointer list-none">
                        <div className="flex justify-between items-center">
                          <span className="font-serif text-[#D4C5B3]">{rel.name}</span>
                          <span className="text-[9px] uppercase tracking-widest font-mono text-[#8E8E93]">{rel.status}</span>
                        </div>
                        <div className="flex gap-1 h-3 mt-1 pr-4">
                          {/* Mini sparklines for the neural map weights */}
                          {[
                            { label: 'Af', val: rel.affinity, color: 'bg-green-500' },
                            { label: 'Tr', val: rel.trust, color: 'bg-blue-500' },
                            { label: 'Fe', val: rel.fear, color: 'bg-red-500' },
                            { label: 'Re', val: rel.resentment, color: 'bg-orange-500' },
                            { label: 'At', val: rel.attraction, color: 'bg-pink-500' }
                          ].map(metric => (
                            <div key={metric.label} className="flex-1 overflow-hidden relative group/metric">
                              <div className="absolute inset-0 bg-white/5" />
                              <div 
                                className={cn("absolute bottom-0 left-0 right-0 transition-all", metric.color)} 
                                style={{ height: `${metric.val}%` }} 
                              />
                            </div>
                          ))}
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono uppercase">
                          <div className="flex justify-between pr-2 text-green-400/80"><span>Affinity</span> <span>{rel.affinity}%</span></div>
                          <div className="flex justify-between pr-2 text-blue-400/80"><span>Trust</span> <span>{rel.trust}%</span></div>
                          <div className="flex justify-between pr-2 text-red-500/80"><span>Fear</span> <span>{rel.fear}%</span></div>
                          <div className="flex justify-between pr-2 text-orange-400/80"><span>Resentment</span> <span>{rel.resentment}%</span></div>
                          <div className="flex justify-between pr-2 text-pink-400/80"><span>Attraction</span> <span>{rel.attraction}%</span></div>
                        </div>
                        {rel.memory && (
                          <div className="bg-black/20 p-2 rounded text-[10px] text-[#8E8E93] italic leading-relaxed border border-white/5">
                            "{rel.memory}"
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Inventory */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2">
                <Package size={12} /> Inventory
              </h4>
              <div className="space-y-2">
                {gameState.character.inventory.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="text-xs p-3 bg-white/5 border border-white/5 rounded-sm flex items-center gap-2 text-[#E0D7D0]"
                  >
                    <ChevronRight size={10} className="text-[#8E8E93]" />
                    {item}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Surroundings (Environmental Interactions) */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2 text-emerald-400">
                <MapPin size={12} /> Surroundings
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {(!gameState.nearbyObjects || gameState.nearbyObjects.length === 0) ? (
                  <span className="text-xs text-[#8E8E93] italic">Nothing of note nearby.</span>
                ) : (
                  gameState.nearbyObjects.map((obj, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ backgroundColor: "rgba(52, 211, 153, 0.1)" }}
                      onClick={() => handleAction(`Interact with ${obj}`)}
                      className="text-left text-xs p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-sm flex flex-col gap-1 transition-colors group"
                    >
                      <span className="font-serif font-bold text-emerald-400/80 group-hover:text-emerald-400">{obj}</span>
                      <span className="text-[9px] text-emerald-400/40 uppercase tracking-[0.1em]">Target: Environment Object</span>
                    </motion.button>
                  ))
                )}
              </div>
            </section>
          </div>
        </aside>

        {/* Narrative & Visual Experience */}
        {activeTab === 'map' ? (
          <MapViewer worldSeed={world.id} />
        ) : activeTab === 'model' ? (
          <div className="flex-1 bg-[#0A0A0C] flex items-center justify-center p-8 relative overflow-hidden">
            <StagedModelViewer character={gameState.character} className="w-full max-w-4xl h-[80vh] border border-white/10 rounded-sm bg-black object-cover shadow-2xl shadow-black/50" />
          </div>
        ) : (
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Weather Effects Overlay */}
          <AnimatePresence>
            {gameState.weather && gameState.weather.type !== 'Clear' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none z-20 overflow-hidden mix-blend-overlay"
              >
                <WeatherOverlay weatherType={gameState.weather.type} intensity={gameState.weather.intensity} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Visual Background */}
          <div className="absolute inset-x-0 h-2/3 overflow-hidden pointer-events-none">
            <SideScrollerScene 
               character={gameState.character} 
               weatherType={gameState.weather?.type}
               processing={processing}
               className="w-full h-full opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0C]" />
          </div>

          {/* Scrollable Story */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-12 md:px-12 relative z-0 custom-scrollbar scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-12 pb-32">
              <AnimatePresence mode='popLayout'>
                {gameState.history.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "group",
                      msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
                    )}
                  >
                    {msg.role === 'user' ? (
                      <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-sm text-nexus-text font-serif italic text-lg">
                        {">"} {msg.text}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-white/5 to-transparent p-6 rounded-r-lg border-l-2 border-nexus-accent space-y-6">
                        {/* If it's the very last assistant message, maybe show the big image here instead of bg */}
                        {i === gameState.history.length - 1 && gameState.lastImage && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full aspect-video rounded-sm overflow-hidden border border-white/10 shadow-2xl relative"
                          >
                            <img 
                              src={gameState.lastImage} 
                              className="w-full h-full object-cover grayscale opacity-80" 
                              alt="Scene"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-80" />
                            <div className="absolute bottom-4 left-4 flex gap-2">
                              <span className="text-[10px] bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded-sm font-mono text-nexus-muted tracking-widest uppercase">
                                Visual Record // Node {Math.floor(i/2)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                        <div className="markdown-body max-w-none">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Interaction Bar */}
          <div className="h-40 border-t border-white/10 p-8 flex flex-col gap-4 shrink-0 bg-[#0A0A0C]">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
              <div className="flex gap-4 flex-wrap pb-2">
                {gameState.currentChoices.map((choice, i) => {
                  const isString = typeof choice === 'string';
                  const text = isString ? choice : choice.text;
                  const type = isString ? undefined : choice.type;
                  const checkContext = isString ? undefined : choice.checkContext;
                  return (
                  <motion.button
                    key={i}
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={processing}
                    onClick={() => handleAction(text, type)}
                    className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-sm text-xs hover:bg-white/10 transition-colors text-nexus-text flex flex-col items-start gap-1 justify-center relative overflow-hidden group"
                  >
                    <span className="group-hover:text-white transition-colors block text-left leading-tight pr-4">{text}</span>
                    {type && type !== 'General' && (
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider font-mono border px-1.5 py-0.5 rounded mt-1",
                        type === 'Persuasion' || type === 'Deception' || type === 'Seduction' ? "text-blue-400 border-blue-400/30 bg-blue-400/10" :
                        type === 'Intimidation' || type === 'Resist' ? "text-red-400 border-red-400/30 bg-red-400/10" :
                        "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                      )}>
                        {type} {checkContext && `<${checkContext}>`}
                      </span>
                    )}
                  </motion.button>
                )})}
                
                {/* Horde Async Choice */}
                <AnimatePresence>
                  {isHordeGenerating && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-[200px] py-3 px-4 bg-purple-900/10 border border-purple-500/20 rounded-sm text-xs text-purple-300/50 flex items-center justify-center gap-2"
                    >
                      <Loader2 size={12} className="animate-spin" />
                      <span className="uppercase tracking-widest text-[9px]">Uncensored Node Syncing...</span>
                    </motion.div>
                  )}
                  {hordeChoice && !isHordeGenerating && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ backgroundColor: "rgba(168, 85, 247, 0.15)" }}
                      whileTap={{ scale: 0.98 }}
                      disabled={processing}
                      onClick={() => handleAction(`[Uncensored Action]: ${hordeChoice}`)}
                      className="flex-1 min-w-[200px] py-3 px-4 bg-purple-900/20 border border-purple-500/40 rounded-sm text-xs hover:bg-purple-900/30 transition-colors text-purple-200 flex flex-col items-start gap-1 justify-center relative overflow-hidden group shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                    >
                      <span className="group-hover:text-white transition-colors block text-left leading-tight pr-4">{hordeChoice}</span>
                      <span className="text-[9px] uppercase tracking-wider font-mono border px-1.5 py-0.5 rounded mt-1 text-purple-400 border-purple-400/30 bg-purple-400/10 flex items-center gap-1">
                        <Sparkles size={8} /> Emergent
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[#D4C5B3] font-mono">{">"}</span>
                <input 
                  type="text" 
                  placeholder="Choose how to move forward..." 
                  disabled={processing}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAction(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 py-3 pl-10 pr-4 text-sm font-mono text-[#D4C5B3] focus:outline-none focus:border-[#D4C5B3]/50 disabled:opacity-50"
                />
                
                {processing ? (
                  <div className="absolute right-4 flex gap-1">
                    <div className="w-1 h-1 bg-[#D4C5B3] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-[#D4C5B3] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-[#D4C5B3] rounded-full animate-bounce" />
                  </div>
                ) : (
                  <div className="absolute right-4 text-[10px] text-white/20 italic">Nexus Computing...</div>
                )}
              </div>
            </div>
          </div>
        </main>
        )}
      </div>

      {/* Bottom Status Footer */}
      <footer className="h-8 bg-[#0D0D0E] border-t border-white/5 px-8 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-[0.2em] shrink-0 z-10 w-full relative">
        <div>Engine: LIFESIM_V4.2.0 • Build 8921</div>
        <div className="flex gap-6">
          <span>Seed: AX-992-KLR</span>
          <span>Mode: Deterministic (Neural Map)</span>
        </div>
      </footer>

      <style>{`
        .mask-gradient {
          mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
        }
      `}</style>
      
      {/* Interaction Overlay */}
      <AnimatePresence>
        {activeInteraction && gameState && (
          <NPCInteractionView 
            npc={activeInteraction} 
            character={gameState.character} 
            onClose={() => setActiveInteraction(null)}
            backdrop={gameState.world.theme}
            sceneImage={gameState.lastImage}
          />
        )}
      </AnimatePresence>
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0F0F12] border border-white/10 p-6 rounded-md shadow-2xl max-w-lg w-full flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-serif text-xl tracking-wide text-[#E0D7D0]">Engine Parameters</h3>
                <button onClick={() => setShowSettings(false)} className="text-[#8E8E93] hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-mono tracking-widest text-[#8E8E93]">Simulation Parameters</label>
                <p className="text-xs text-[#8E8E93]/70 mb-2 leading-relaxed">
                  Deterministic Neural Map active. The world is being simulated based on exact physiological and environmental variables. LLM influences have been purged for maximum consistency.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-nexus-accent text-black font-medium text-sm rounded-sm hover:bg-white transition-colors"
                >
                  Save & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
