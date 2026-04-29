/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import WorldCreator from './components/WorldCreator';
import CharacterCreator from './components/CharacterCreator';
import Simulation from './components/Simulation';
import { World, Character } from './types';
import { Globe, User, Play, Boxes } from 'lucide-react';

type AppPhase = 'world-creation' | 'character-creation' | 'simulation';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('world-creation');
  const [existingWorlds, setExistingWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  // Load worlds from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexus_worlds');
    if (saved) {
      try {
        setExistingWorlds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load worlds", e);
      }
    }
  }, []);

  const handleWorldCreated = (world: World) => {
    const updated = [world, ...existingWorlds];
    setExistingWorlds(updated);
    localStorage.setItem('nexus_worlds', JSON.stringify(updated));
    setSelectedWorld(world);
    setPhase('character-creation');
  };

  const handleSelectWorld = (world: World) => {
    setSelectedWorld(world);
    setPhase('character-creation');
  };

  const handleCharacterCreated = (char: Character) => {
    setCharacter(char);
    setPhase('simulation');
  };

  const handleExitSimulation = () => {
    if (confirm("Are you sure you want to exit the current session? Current progress will be lost.")) {
      setPhase('world-creation');
      setCharacter(null);
      // We don't reset selectedWorld so user can jump back into character creation if they want
    }
  };

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text selection:bg-nexus-accent selection:text-white">
      <AnimatePresence mode="wait">
        {phase === 'world-creation' && (
          <motion.div
            key="world-creation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WorldCreator 
              onWorldCreated={handleWorldCreated}
              existingWorlds={existingWorlds}
              onSelectWorld={handleSelectWorld}
            />
          </motion.div>
        )}

        {phase === 'character-creation' && selectedWorld && (
          <motion.div
            key="character-creation"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5 }}
          >
            <CharacterCreator 
              world={selectedWorld}
              onCharacterCreated={handleCharacterCreated}
              onBack={() => setPhase('world-creation')}
            />
          </motion.div>
        )}

        {phase === 'simulation' && selectedWorld && character && (
          <motion.div
            key="simulation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <Simulation 
              world={selectedWorld}
              character={character}
              onExit={handleExitSimulation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Scanline Overlay for "Fidelity" feel */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,.25)_50%),linear-gradient(90deg,rgba(255,0,0,.06),rgba(0,255,0,.02),rgba(0,0,255,.06))] bg-[length:100%_4px,3px_100%]" />
      </div>
    </div>
  );
}
