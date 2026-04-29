import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import seedrandom from "seedrandom";
import { createNoise2D } from "simplex-noise";

// A fast seeded pseudo-random number generator and noise based on the seed
function makeChunk(seed: string, cx: number, cy: number, size: number = 32) {
  const prng = seedrandom(`${seed}:${cx}:${cy}`);
  const noise2D = createNoise2D(prng);
  
  const tiles: number[][] = [];
  
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      // Global coordinates
      const gx = cx * size + x;
      const gy = cy * size + y;
      
      // Scale coordinates for noise
      const scale = 0.1;
      const value = noise2D(gx * scale, gy * scale);
      
      // Map noise (-1 to 1) to 0 (water), 1 (grass), 2 (mountain)
      let tileType = 1;
      if (value < -0.2) {
        tileType = 0; // Water
      } else if (value > 0.4) {
        tileType = 2; // Mountain
      } else {
        tileType = 1; // Grass
      }
      
      row.push(tileType);
    }
    tiles.push(row);
  }
  
  return { seed, x: cx, y: cy, tiles };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // PCG Endpoint
  app.get("/api/chunk/:seed/:cx/:cy", (req, res) => {
    const { seed, cx, cy } = req.params;
    const chunkData = makeChunk(seed, parseInt(cx), parseInt(cy));
    res.json(chunkData);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
