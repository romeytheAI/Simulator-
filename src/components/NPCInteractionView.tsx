import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Character } from '../types';
import StagedModelViewer from './StagedModelViewer';

interface NPCInteractionProps {
  npc: { name: string; type: string; memory: string };
  character: Character;
  onClose: () => void;
  backdrop: string;
  sceneImage?: string;
}

export default function NPCInteractionView({ npc, character, onClose, backdrop, sceneImage }: NPCInteractionProps) {
  const npcCharacter: Character = useMemo(() => ({
    name: npc.name,
    race: npc.type || 'human',
    gender: 'female', // Adding slight variation
    age: 30,
    profession: npc.type || 'Villager',
    clothing: {
      state: 'pristine',
      head: 'Nothing',
      torso: 'Tunic',
      legs: 'Pants',
      feet: 'Boots',
    },
    background: 'Local',
    inventory: [],
    relationships: [],
    traits: ['friendly'],
    stats: { stress: 0, exhaustion: 0, hunger: 0, thirst: 0 },
    skills: [],
    skillPoints: 0
  }), [npc]);

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"
        onClick={onClose}
    >
        {/* Environmental Backdrop simulation */}
        <div 
          className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-screen bg-cover bg-center"
          style={sceneImage ? { backgroundImage: `url(${sceneImage})` } : { 
            backgroundImage: `radial-gradient(circle at center, transparent 0%, black 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 8px)`,
            backgroundSize: '100% 100%, 16px 16px' 
          }} 
        />
        
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-0" />

        <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-5xl bg-[#0a0a0c]/90 border border-white/10 rounded-lg p-8 flex flex-col gap-6 z-10 shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex flex-col">
                  <h2 className="text-3xl font-serif text-[#D4C5B3] italic tracking-wide">Interaction</h2>
                  <span className="text-[10px] text-[#8E8E93] uppercase tracking-[0.2em]">{backdrop} Sector</span>
                </div>
                <button onClick={onClose} className="text-[#8E8E93] hover:text-white transition-colors border border-white/10 rounded px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10">Terminate</button>
            </div>
            
            <div className="grid grid-cols-2 gap-12 items-center w-full h-[400px] relative">
                
                {/* Visual relationship indicator / energy link */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent flex items-center justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-4 h-4 rounded-full border border-cyan-400 bg-cyan-900/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
                  />
                </div>

                {/* Player Character */}
                <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="flex flex-col items-center gap-4 h-full"
                >
                    <div className="w-full h-full bg-black/40 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden group">
                        <StagedModelViewer character={character} className="w-full h-full absolute inset-0 cursor-move" autoRotate={false} />
                        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                        <motion.div 
                          className="absolute inset-0 bg-cyan-500/10 pointer-events-none mix-blend-screen"
                          animate={{ opacity: [0, 0.2, 0] }}
                          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                        />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[#D4C5B3] font-serif text-lg">{character.name}</span>
                      <span className="text-[10px] text-[#8E8E93] uppercase tracking-[0.2em] font-mono">You</span>
                    </div>
                </motion.div>
                
                {/* NPC */}
                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="flex flex-col items-center gap-4 h-full"
                >
                    <div className="w-full h-full bg-black/40 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden group">
                        <StagedModelViewer character={npcCharacter} className="w-full h-full absolute inset-0 cursor-move" autoRotate={false} />
                        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                        <motion.div 
                          className="absolute inset-0 bg-red-500/10 pointer-events-none mix-blend-screen"
                          animate={{ opacity: [0, 0.15, 0] }}
                          transition={{ duration: 5, repeat: Infinity, delay: 0 }}
                        />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[#D4C5B3] font-serif text-lg">{npc.name}</span>
                      <span className="text-[10px] text-nexus-accent uppercase tracking-[0.2em] font-mono">{npc.type}</span>
                    </div>
                </motion.div>
            </div>
            
            <div className="bg-white/5 p-6 border border-white/10 rounded-lg text-[#E0D7D0] font-mono text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <span className="text-[10px] text-[#8E8E93] uppercase tracking-[0.1em] block mb-2 border-b border-white/10 pb-1">Memory Matrix / Cognitive Link</span>
                <p className="leading-relaxed italic mt-2">
                  {npc.memory || "The neural link returns fragmented static. No significant historical context established yet."}
                </p>
            </div>
        </motion.div>
    </motion.div>
  );
}
