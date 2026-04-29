/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { World, WorldTheme } from '../types';
import { generateWorldDeterministic } from '../lib/engine';
import { Globe, Sparkles, Sword, Cpu, Zap, Ghost, Skull, History, ArrowRight, Loader2, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface WorldCreatorProps {
  onWorldCreated: (world: World) => void;
  existingWorlds: World[];
  onSelectWorld: (world: World) => void;
}

const THEMES: { id: WorldTheme; icon: any; description: string }[] = [
  { id: 'High Fantasy', icon: Sparkles, description: 'Magic, dragons, and ancient kingdoms.' },
  { id: 'Cyberpunk', icon: Cpu, description: 'High tech, low life, neon streets.' },
  { id: 'Steampunk', icon: Zap, description: 'Steam chimneys, clockwork, Victorian aesthetics.' },
  { id: 'Lovecraftian', icon: Ghost, description: 'Cosmic horror, madness, and elder gods.' },
  { id: 'Hard Sci-Fi', icon: Globe, description: 'Realistic space exploration and tech.' },
  { id: 'Post-Apocalyptic', icon: Skull, description: 'Scarcity, survival, and ruins of the old world.' },
  { id: 'Historical Noir', icon: History, description: 'Gritty investigations in a bygone era.' },
  { id: 'Real Life', icon: User, description: 'The mundane, ordinary modern world. Unforgiving reality.' },
];

export default function WorldCreator({ onWorldCreated, existingWorlds, onSelectWorld }: WorldCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<WorldTheme>('High Fantasy');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Small artificial delay to feel like "Genesis Protocol" is calculating
      await new Promise(r => setTimeout(r, 800));
      const world = generateWorldDeterministic(selectedTheme);
      onWorldCreated(world);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-display font-bold mb-4 tracking-tight"
        >
          Genesis <span className="text-nexus-accent">Protocol</span>
        </motion.h1>
        <p className="text-nexus-muted text-lg max-w-2xl">
          Observe and manipulate the variables of reality. Select a paradigm to manifest a new world or choose from the archives.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-xs uppercase tracking-widest text-nexus-muted font-mono mb-6">Select paradigm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-sm border transition-all text-left group",
                      isSelected 
                        ? "bg-white/10 border-nexus-accent" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-sm transition-colors",
                      isSelected ? "bg-nexus-accent text-black" : "bg-[#0A0A0C] border border-white/5 text-[#8E8E93] group-hover:text-[#E0D7D0]"
                    )}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{theme.id}</h3>
                      <p className="text-xs text-nexus-muted">{theme.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <button 
            disabled={loading}
            onClick={handleGenerate}
            className="w-full nexus-button py-6 flex items-center justify-center gap-3 text-lg font-display"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Manifesting Reality...
              </>
            ) : (
              <>
                Manifest World
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-nexus-muted font-mono">The Archives</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {existingWorlds.length === 0 ? (
              <div className="glass-panel p-8 text-center text-nexus-muted">
                <Globe className="mx-auto mb-4 opacity-20" size={48} />
                <p>No worlds recorded in the archives yet.</p>
              </div>
            ) : (
              existingWorlds.map((world) => (
                <motion.button
                  key={world.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => onSelectWorld(world)}
                  className="w-full text-left glass-panel p-4 hover:border-nexus-accent transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-nexus-accent group-hover:translate-x-1 transition-transform">{world.name}</h3>
                    <span className="text-[10px] bg-nexus-bg px-2 py-1 rounded border border-nexus-border text-nexus-muted uppercase font-mono">
                      {world.theme}
                    </span>
                  </div>
                  <p className="text-xs text-nexus-muted line-clamp-2 italic font-serif">"{world.description}"</p>
                  
                  {world.traits && world.traits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {world.traits.map(t => (
                        <span key={t} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[#D4C5B3] uppercase tracking-wider">{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-4 text-[10px] font-mono text-nexus-muted">
                    <div className="flex items-center gap-1">
                      <Sparkles size={12} />
                      MAG {world.magicLevel}
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={12} />
                      TEC {world.techLevel}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
