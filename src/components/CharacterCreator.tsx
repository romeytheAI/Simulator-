/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { World, Character } from '../types';
import { 
  generateCharacterOptionsDeterministic, 
  generateCharacterBackstoryDeterministic 
} from '../lib/engine';
import { User, Shield, Book, Briefcase, Ruler, MapPin, Loader2, ArrowLeft, ArrowRight, Dices, Wand2, ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface CharacterCreatorProps {
  world: World;
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
}

export default function CharacterCreator({ world, onCharacterCreated, onBack }: CharacterCreatorProps) {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ races: string[], professions: string[], backgrounds: string[], skills: string[], traits: string[], coreStats: string[] } | null>(null);
  
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('Young Adult');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('Non-binary');
  const [height, setHeight] = useState('5\'10"');
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('');
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);

  const [stats, setStats] = useState<Record<string, number>>({});
  
  const [backstory, setBackstory] = useState('');
  const [isGeneratingBackstory, setIsGeneratingBackstory] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const rawOptions = generateCharacterOptionsDeterministic(world.theme);
        const data = {
          ...rawOptions,
          backgrounds: ['Commoner', 'Aristocrat', 'Outcast'],
          skills: ['Athletics', 'Stealth', 'Knowledge', 'Survival', 'Insight'],
          traits: ['Brave', 'Cunning', 'Loyal', 'Greedy', 'Cowardly'],
          coreStats: ['Strength', 'Agility', 'Intelligence', 'Willpower', 'Luck']
        };
        setOptions(data);
        setSelectedRace(data.races[0]);
        setSelectedProfession(data.professions[0]);
        setSelectedBackground(data.backgrounds[0]);
        
        // Initialize dynamic stats
        const initialStats: Record<string, number> = {};
        data.coreStats.forEach(s => initialStats[s] = 10);
        setStats(initialStats);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [world]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) setSelectedSkills(selectedSkills.filter(s => s !== skill));
    else if (selectedSkills.length < 5) setSelectedSkills([...selectedSkills, skill]);
  };

  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) setSelectedTraits(selectedTraits.filter(t => t !== trait));
    else if (selectedTraits.length < 5) setSelectedTraits([...selectedTraits, trait]);
  };

  const rollStats = () => {
    if (!options?.coreStats) return;
    const newStats: Record<string, number> = {};
    options.coreStats.forEach(s => {
      newStats[s] = Math.floor(Math.random() * 10) + 8;
    });
    setStats(newStats);
  };

  const handleGenerateBackstory = async () => {
    setIsGeneratingBackstory(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const text = generateCharacterBackstoryDeterministic({ name, race: selectedRace, profession: selectedProfession }, world);
      setBackstory(text);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingBackstory(false);
    }
  };

  const handleGenerateAvatar = async () => {
    // Neural map doesn't support visuals
    setAvatar(undefined);
  };

  const handleFinish = () => {
    if (!name) return;
    const character: Character = {
      id: crypto.randomUUID(),
      worldId: world.id,
      name,
      race: selectedRace,
      profession: selectedProfession,
      background: selectedBackground,
      backstory,
      ageGroup,
      age,
      height,
      gender,
      stats,
      level: 1,
      xp: 0,
      skillPoints: 0,
      skills: selectedSkills.map(s => ({ name: s, level: 1 })),
      traits: selectedTraits,
      perks: [],
      moodlets: [],
      relationships: [],
      factions: [],
      inventory: ['Worn clothes'],
      needs: {
        hunger: 100,
        energy: 100,
        hygiene: 100,
        bladder: 100,
        fun: 100,
        lustfulYearning: 0,
        social: 100
      },
      condition: {
        stress: 0,
        trauma: 0,
        arousal: 0,
        pain: 0,
        intoxication: 0,
        sanity: 100
      },
      clothing: {
        head: 'None',
        torso: 'Simple shirt',
        legs: 'Simple trousers',
        feet: 'Basic shoes',
        state: 'worn'
      },
      followers: [],
      avatar
    };
    onCharacterCreated(character);
  };

  const AGE_GROUPS = ['Birth', 'Young Child', 'Child', 'Teen', 'Young Adult', 'Adult', 'Middle-aged', 'Aged', 'Senior', 'Elder'];
  
  // Update age roughly when bracket changes
  useEffect(() => {
    if (ageGroup === 'Birth') setAge(0);
    if (ageGroup === 'Young Child') setAge(3);
    if (ageGroup === 'Child') setAge(8);
    if (ageGroup === 'Teen') setAge(15);
    if (ageGroup === 'Young Adult') setAge(22);
    if (ageGroup === 'Adult') setAge(32);
    if (ageGroup === 'Middle-aged') setAge(50);
    if (ageGroup === 'Aged') setAge(68);
    if (ageGroup === 'Senior') setAge(80);
    if (ageGroup === 'Elder') setAge(95);
  }, [ageGroup]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-nexus-accent" size={48} />
        <p className="font-mono text-nexus-muted uppercase tracking-widest text-xs">Analyzing local life forms in {world.name}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-nexus-muted hover:text-white transition-colors mb-8 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Return to Genesis
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <header>
            <h1 className="text-4xl font-display font-bold mb-2">Character <span className="text-nexus-accent">Manifestation</span></h1>
            <p className="text-nexus-muted">Defining essence for entry into <span className="text-nexus-accent font-semibold">{world.name}</span>.</p>
          </header>

          <section className="glass-panel p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar Generator */}
              <div className="flex flex-col gap-4 items-center shrink-0">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-sm border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden relative group">
                  {avatar ? (
                    <img src={avatar} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <User size={48} className="text-[#8E8E93] opacity-50" />
                  )}
                  {isGeneratingAvatar && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="animate-spin text-nexus-accent" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleGenerateAvatar}
                  disabled={isGeneratingAvatar}
                  className="text-[10px] uppercase font-mono tracking-widest text-[#D4C5B3] hover:text-white border border-white/10 px-3 py-1.5 rounded-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <ImageIcon size={12} />
                  {avatar ? "Regenerate Visual" : "Synthesize Visual"}
                </button>
              </div>

              {/* Basic Details */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs uppercase font-mono text-nexus-muted">Identity Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name..."
                    className="nexus-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-mono text-nexus-muted">Life Stage</label>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="nexus-input">
                    {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-mono text-nexus-muted">Exact Age</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(parseInt(e.target.value))}
                    className="nexus-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-mono text-nexus-muted">Gender Identity</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="nexus-input">
                    <option>Masculine</option>
                    <option>Feminine</option>
                    <option>Non-binary</option>
                    <option>Fluid</option>
                    <option>Unknown/Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-mono text-nexus-muted">Physical Stature (Height)</label>
                  <input 
                    type="text" 
                    value={height} 
                    onChange={(e) => setHeight(e.target.value)}
                    className="nexus-input" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                <User size={14} /> Race/Species
              </h3>
              <div className="flex flex-wrap gap-2">
                {options?.races.map(r => (
                  <button 
                    key={r}
                    onClick={() => setSelectedRace(r)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs border transition-all", selectedRace === r ? "bg-white/10 border-nexus-accent text-nexus-text" : "bg-white/5 border-white/10 hover:border-white/20 text-[#8E8E93]")}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                <Briefcase size={14} /> Profession
              </h3>
              <div className="flex flex-wrap gap-2">
                {options?.professions.map(p => (
                  <button 
                    key={p}
                    onClick={() => setSelectedProfession(p)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs border transition-all", selectedProfession === p ? "bg-white/10 border-nexus-accent text-nexus-text" : "bg-white/5 border-white/10 hover:border-white/20 text-[#8E8E93]")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                <Shield size={14} /> Social Strata
              </h3>
              <div className="flex flex-wrap gap-2">
                {options?.backgrounds.map(b => (
                  <button 
                    key={b}
                    onClick={() => setSelectedBackground(b)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs border transition-all", selectedBackground === b ? "bg-white/10 border-nexus-accent text-nexus-text" : "bg-white/5 border-white/10 hover:border-white/20 text-[#8E8E93]")}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                  <Book size={14} /> Skills (Choose 5)
                </h3>
                <span className="text-[10px] text-nexus-accent font-mono">{selectedSkills.length}/5</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {options?.skills?.map(s => (
                  <button 
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs border transition-all", selectedSkills.includes(s) ? "bg-white/10 border-nexus-accent text-nexus-text" : "bg-white/5 border-white/10 hover:border-white/20 text-[#8E8E93]")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-end">
                <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                  <User size={14} /> Traits (Choose 5)
                </h3>
                <span className="text-[10px] text-nexus-accent font-mono">{selectedTraits.length}/5</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {options?.traits?.map(t => (
                  <button 
                    key={t}
                    onClick={() => toggleTrait(t)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs border transition-all", selectedTraits.includes(t) ? "bg-white/10 border-nexus-accent text-nexus-text" : "bg-white/5 border-white/10 hover:border-white/20 text-[#8E8E93]")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Backstory */}
          <section className="glass-panel p-6 space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-xs uppercase font-mono text-nexus-muted flex items-center gap-2">
                <Book size={14} /> Backstory & Motivations
              </h3>
              <button 
                onClick={handleGenerateBackstory}
                disabled={isGeneratingBackstory || selectedTraits.length === 0}
                className="text-[10px] uppercase font-mono text-[#D4C5B3] hover:text-white flex items-center gap-1 disabled:opacity-50"
              >
                {isGeneratingBackstory ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {isGeneratingBackstory ? "Synthesizing..." : "Auto-Generate"}
              </button>
            </div>
            <textarea 
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              placeholder="Describe your character's history, motivations, and significant life events..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-sm p-4 text-sm font-serif text-[#E0D7D0] focus:outline-none focus:border-nexus-accent/50 resize-none custom-scrollbar"
            />
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 border-nexus-accent/30 bg-nexus-accent/5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs uppercase font-mono text-nexus-muted">Core Attributes</h2>
              <button 
                onClick={rollStats}
                className="p-2 hover:bg-nexus-accent/20 rounded-lg transition-colors text-nexus-accent"
              >
                <Dices size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase font-mono text-nexus-muted">{k}</span>
                    <span className="font-mono font-bold text-nexus-accent">{v}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      key={v}
                      initial={{ width: 0 }}
                      animate={{ width: `${(v / 20) * 100}%` }}
                      className="h-full bg-[#D4C5B3]" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            disabled={!name || selectedSkills.length < 5 || selectedTraits.length < 5}
            onClick={handleFinish}
            className="w-full nexus-button py-6 flex items-center justify-center gap-3 text-lg font-display shadow-[0_0_30px_rgba(59,130,246,0.15)]"
          >
            Enter Reality
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
