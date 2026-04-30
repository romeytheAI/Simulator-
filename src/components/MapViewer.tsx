import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface MapViewerProps {
  worldSeed: string;
}

interface ChunkData {
  seed: string;
  x: number;
  y: number;
  tiles: number[][];
}

export default function MapViewer({ worldSeed }: MapViewerProps) {
  const [chunks, setChunks] = useState<Record<string, ChunkData>>({});
  const [loading, setLoading] = useState(false);
  
  // The visible grid of chunks: let's load a 3x3 grid around (0,0) for now
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  
  const TILE_SIZE = 4; // px size of each tile
  const CHUNK_SIZE = 32;

  const fetchChunk = async (cx: number, cy: number) => {
    const key = `${cx},${cy}`;
    if (chunks[key]) return;
    
    try {
      const res = await fetch(`/api/chunk/${encodeURIComponent(worldSeed)}/${cx}/${cy}`);
      const data = await res.json();
      setChunks(prev => ({ ...prev, [key]: data }));
    } catch (e) {
      console.error('Failed to load chunk', key, e);
    }
  };

  useEffect(() => {
    // Load 3x3 chunks around center
    for (let x = centerX - 1; x <= centerX + 1; x++) {
      for (let y = centerY - 1; y <= centerY + 1; y++) {
        if (!chunks[`${x},${y}`]) {
          fetchChunk(x, y);
        }
      }
    }
  }, [centerX, centerY, worldSeed]);

  const getColor = (tileValue: number) => {
    if (tileValue === 0) return '#1e40af'; // Water
    if (tileValue === 1) return '#166534'; // Grass
    if (tileValue === 2) return '#525252'; // Mountain
    return '#000000';
  };

  return (
    <div className="flex-1 bg-[#0A0A0C] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-x-0 h-1/2 opacity-20 blur-[10px] pointer-events-none" />
      
      <div className="text-center mb-6">
        <h2 className="font-serif italic text-2xl text-[#D4C5B3]">Global Surveyor</h2>
        <p className="text-[10px] uppercase font-mono text-[#8E8E93] tracking-widest mt-1">
          Sector {centerX}, {centerY} • Real-time Procedural Sync
        </p>
      </div>

      <div className="relative border border-white/10 shadow-2xl bg-black rounded shrink-0" 
           style={{ width: CHUNK_SIZE * TILE_SIZE * 3, height: CHUNK_SIZE * TILE_SIZE * 3 }}>
        
        {Array.from({ length: 3 }).map((_, py) => (
          Array.from({ length: 3 }).map((_, px) => {
            const cx = centerX + (px - 1);
            const cy = centerY + (py - 1);
            const chunk = chunks[`${cx},${cy}`];
            
            return (
              <div 
                key={`${cx},${cy}`} 
                className="absolute"
                style={{
                  left: px * CHUNK_SIZE * TILE_SIZE,
                  top: py * CHUNK_SIZE * TILE_SIZE,
                  width: CHUNK_SIZE * TILE_SIZE,
                  height: CHUNK_SIZE * TILE_SIZE
                }}
              >
                {!chunk ? (
                  <div className="w-full h-full flex items-center justify-center bg-white/5 border border-white/5">
                    <Loader2 size={16} className="text-nexus-accent animate-spin" />
                  </div>
                ) : (
                  <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${CHUNK_SIZE}, 1fr)` }}>
                    {chunk.tiles.map((row, y) => (
                      <React.Fragment key={y}>
                        {row.map((tile, x) => (
                          <div
                            key={x}
                            style={{ backgroundColor: getColor(tile), width: TILE_SIZE, height: TILE_SIZE }}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button onClick={() => setCenterY(prev => prev - 1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-nexus-text text-xs uppercase tracking-wider transition-colors border border-white/10">North</button>
        <button onClick={() => setCenterY(prev => prev + 1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-nexus-text text-xs uppercase tracking-wider transition-colors border border-white/10">South</button>
        <button onClick={() => setCenterX(prev => prev - 1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-nexus-text text-xs uppercase tracking-wider transition-colors border border-white/10">West</button>
        <button onClick={() => setCenterX(prev => prev + 1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-nexus-text text-xs uppercase tracking-wider transition-colors border border-white/10">East</button>
      </div>
    </div>
  );
}
