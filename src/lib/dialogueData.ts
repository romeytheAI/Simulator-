export const archetypes: Record<string, string[]> = {
  'Wanderer': ['"The road has no end, only stories."', '"I have seen too much to settle now."', '"Keep your head down and your eyes on the horizon."'],
  'Leader': ['"Together, we can rewrite this history."', '"What does the team think?"', '"Failure isn\'t an option here."'],
  'Scavenger': ['"Shiny... useful."', '"Anything valuable in these ruins?"', '"Don\'t mind if I take a look at that."'],
  'Cynic': ['"Why even bother trying?"', '"Everything decays, eventually."', '"Hope is just a slow way to lose."'],
  'Optimist': ['"There must be a light ahead, somewhere."', '"Smile, it makes the dark feel warmer."', '"We can overcome this if we stick together."'],
  'Soldier': ['"Keep your weapon ready."', '"Orders are orders, no matter how harsh."', '"The battlefield is all I know."'],
  'Scholar': ['"The ancient texts suggest a greater purpose."', '"Fascinating, absolutely fascinating."', '"We are repeating the mistakes of the precursors."'],
  'Merchant': ['"Trading for anything useful?"', '"Price is fair for the quality."', '"Supply is low, demand is high."'],
  'Technician': ['"Just needs a little kick to get running."', '"The circuit boards are fried."', '"I can bypass this, give me a second."'],
  'Medic': ['"Let me take a look at that wound."', '"This pain will pass, hold still."', '"We cannot afford any more casualties."'],
  'Artist': ['"The chaos has a rhythm to it."', '"I wish I could capture this moment."', '"Beauty exists, even here."'],
  'Farmer': ['"Soil is hard this season."', '"Just trying to get by, one harvest at a time."', '"Everything grows if you treat it right."'],
  'Engineer': ['"Construction is the foundation of civilization."', '"Foundations are crumbling."', '"Efficient, practical, functional."'],
  'Assassin': ['"Silence is my strongest weapon."', '"One move, that is all it takes."', '"Targets don\'t talk back."'],
  'Priest': ['"The divine path is often paved with suffering."', '"Faith is all we have left."', '"Light will guide us through."'],
  'Thief': ['"Shadows are my refuge."', '"Locks are just suggestions."', '"What\'s yours is mine."'],
  'Spy': ['"Information is power."', '"I saw everything."', '"Trust no one, especially not me."'],
  'Cultist': ['"The entity hungers."', '"The ritual is almost complete."', '"The end is simply a beginning."'],
  'Survivor': ['"I\'ve seen places that would burn your eyes out."', '"Just one more day."', '"Survival is a dirty business."'],
  'Exile': ['"They cast me out."', '"The world is bigger than they know."', '"I don\'t need them."'],
  'Guard': ['"Halt! State your business."', '"Don\'t give me a reason to use this."' ,'"This sector is restricted."'],
  'Nomad': ['"We never stay in one place long."', '"The desert is cruel and beautiful."', '"Home is where the journey takes us."'],
  'Oracle': ['"The winds whisper secrets of tomorrow."', '"Seeing is the greatest curse."', '"The cycle turns, as it always must."'],
  'Mercenary': ['"Gold talks, principles walk."', '"I don\'t ask questions, I get paid."', '"Who\'s the target?"'],
  'Rebel': ['"Down with the corrupt system!"', '"We deserve to be free."', '"Stand up and be counted."'],
  'Architect': ['"I designed this whole sector."', '"The blueprint was flawed."', '"Order must be restored."'],
  'Miner': ['"Deep below, the secrets of the earth await."', '"Stone is cold, but the ore is warm."', '"Strike deep, or go home hungry."'],
  'Gambler': ['"The odds are always against us, aren\'t they?"', '"One last bet, I can feel it."', '"Life is a gamble."'],
  'Detective': ['"The evidence suggests a pattern."', '"This case is far from over."', '"Trust only the facts."'],
  'Monk': ['"Silence is the loudest voice."', '"Peace is the ultimate objective."', '"Let go of desire."'],
  'Beastmaster': ['"The wild understands when humans do not."', '"Careful, she doesn\'t like strangers."', '"Nature is not your enemy."'],
  'Brawler': ['"Fists are the only language they understand."', '"Come on, let\'s dance."', '"Violence settles most things."'],
  'Chef': ['"There is a soul in this meal."', '"A pinch of salt changes everything."', '"Nobody works well on an empty stomach."'],
  'Pilot': ['"The sky is calling."', '"Gravity is just a suggestion."', '"Keep your eyes on the radar."'],
  'Clerk': ['"Form 4A needs to be signed in triplicate."', '"Procedure is mandatory."', '"Next!"'],
  'Politician': ['"I assure you, it\'s for the greater good."', '"The people are our priority."', '"We are working on a solution."'],
  'Smuggler': ['"I have a fast ship and no questions asked."', '"Don\'t worry about how I got it."', '"Just keep your head down."'],
  'Hacker': ['"The mainframe belongs to me now."', '"Firewalls couldn\'t keep me out."', '"Data is the true currency."'],
  'Teacher': ['"The future is in our lessons."', '"Education is the key."', '"Patience is a virtue."'],
  'Scout': ['"They are coming from the north."', '"Clear path ahead."', '"Stay low."'],
  'Nexus Acolyte': ['"The Core provides, if you learn to listen to the frequency."', '"Let the data wash over you."', '"The old network is singing today."'],
  'Cyber-Scrapper': ['"I can salvage a bypass from this junk, just give me a sec."', '"Neural interfaces here are fried, but the optical fibers are gold."', '"Don\'t toss that! It\'s good conductivity."'],
  'Void Walker': ['"The space between the stars is colder than you think."', '"Nothing is truly empty, not even the void."', '"I have stared into the dark too long."'],
  'Synth-Wanderer': ['"My diagnostic subroutines indicate a high probability of violence."', '"I am searching for my original manufacturer code."', '"Error: empathy module compromised."'],
  'Elysian Guard': ['"Hold the perimeter at all costs!"', '"For the gleaming spires of the upper tier!"', '"Your clearance level is insufficient."']
};

export const actionDialogues: Record<string, string[]> = {
  'General': [
    ...Array.from({ length: 250 }, (_, i) => `You perform a routine action, observing the environment for threats. Option #${i + 1}`),
    'The silence of the ruins is broken only by the sound of your own footsteps.',
    'You adjust your gear, ensuring everything is secure before proceeding.',
    'A sense of unease crawls up your spine, but you push forward.'
  ],
  'Persuasion': [
    ...Array.from({ length: 250 }, (_, i) => `You attempt to sway their perspective with charismatic reasoning. Attempt #${i + 1}`),
    'Your words carry a weight of conviction, hoping to appeal to their better judgment.',
    'You negotiate, offering a compromise that might benefit both parties.',
    'You articulate your goals clearly, aiming for mutual understanding.'
  ],
  'Intimidation': [
    ...Array.from({ length: 250 }, (_, i) => `You exert pressure through sheer presence and veiled threats. Approach #${i + 1}`),
    'You lock eyes with them, making it clear that you aren\'t to be trifled with.',
    'You demonstrate your resolve, showing them the consequences of resistance.',
    'A menacing tone underscores your words, ensuring your dominance.'
  ],
  'Seduction': [
    ...Array.from({ length: 250 }, (_, i) => `You manipulate the emotional atmosphere with charm and suggestion. Move #${i + 1}`),
    'You offer a smile that suggests a shared secret, drawing them closer.',
    'A soft, deliberate phrase shifts the tension in the room.',
    'You find a vulnerable moment and capitalize on the rapport.'
  ],
  'Submission': [
    ...Array.from({ length: 250 }, (_, i) => `You concede, adopting a posture of non-aggression and compliance. Act #${i + 1}`),
    'You bow your head, signaling you have no will to fight.',
    'You retreat slowly, leaving the initiative to them.',
    'Your movements are deliberate and slow, proving you hold no weapon.'
  ],
  'Deception': [
    ...Array.from({ length: 250 }, (_, i) => `You carefully misdirect with a sophisticated falsehood. Ruse #${i + 1}`),
    'Half-truths tumble from your lips, carefully constructed to misguide.',
    'You deflect their intense questioning with a playful dismissal.',
    'You play the part of a simpler traveler, hiding your true objectives.'
  ],
  'Exploration': [
    ...Array.from({ length: 200 }, (_, i) => `You scan the debris, hunting for anything useful. Search #${i + 1}`),
    'You pry open a rusted container, hoping for supplies hidden inside.',
    'Every nook and cranny is inspected, searching for overlooked salvage.',
    'The layout of the corridor suggests hidden caches nearby.'
  ]
};

export function getDialogue(archetype: string, telemetry?: any, mood?: number): string {
  const dialogues = archetypes[archetype as keyof typeof archetypes] || ["..."];
  let baseLine = dialogues[Math.floor(Math.random() * dialogues.length)];

  if (telemetry && telemetry.Lethality > 70) {
    baseLine += ' *They look around nervously, hands trembling slightly.* "We need to get out of here, now."';
  } else if (telemetry && telemetry.Scarcity > 80) {
    baseLine += ' *They clutch their supplies tightly.* "Everything is running out. We are living on borrowed time."';
  }

  if (mood !== undefined) {
    if (mood < 30) {
      baseLine = `*Sighs heavily* ${baseLine}`;
    } else if (mood > 70) {
      baseLine = `*Smiles warmly* ${baseLine}`;
    }
  }

  return baseLine;
}

export function getDialogueByActionType(type: string = 'General'): string {
  const dialogues = actionDialogues[type] || actionDialogues['General'];
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

export function getArchetypeByIndex(index: number): string {
  const keys = Object.keys(archetypes);
  return keys[index % keys.length];
}
