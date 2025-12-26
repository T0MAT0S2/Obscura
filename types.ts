import { FieldValue } from 'firebase/firestore';

export interface CharacterStats {
  STR: number; CON: number; SIZ: number; DEX: number; APP: number;
  INT: number; POW: number; EDU: number; MOV: number;
}

export interface CharacterVitals {
  HP: number; MP: number; SAN: number; initialSAN: number; LUCK: number;
  temporaryInsanity: boolean; indefiniteInsanity: boolean;
  majorWound: boolean;
  dying: boolean;
  pulpHp: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  skill: string;
  damage: string;
  range: string;
  attacks: string;
  ammo: string;
  malf: string;
}

export interface Talent {
  id: string;
  name: string;
  effect: string;
}

export interface CharacterBackstory {
  personalDescription: string;
  traits: string;
  ideology: string;
  injuries: string;
  people: string;
  phobias: string;
  locations: string;
  possessions: string;
  encounters: string;
  gear: string;
  cash: string;
  spending: string;
  assets: string;
  memo: string;
}

export interface Character {
  id: string;
  name: string;
  owner: string;
  portraitUrl: string;
  player_name: string;
  age: number;
  sex: string;
  height: string;
  family: string;
  
  stats: CharacterStats;
  vitals: CharacterVitals;
  derived: {
    damage_bonus: string;
    build: number;
  };

  skills: Record<string, number>;
  expressions: Record<string, string>;
  
  weapons: Weapon[];
  talents: Talent[];
  backstory: CharacterBackstory;
  
  mentalCondition: string;
}

export interface MapData {
  name: string;
  url: string;
}

export interface HandoutData {
  name: string;
  url: string;
}

export interface BgmData {
  name: string;
  url: string;
}

export interface SceneData {
  mapUrl: string;
  maps: MapData[];
  bgmUrl: string;
  bgms: BgmData[];
  activeHandout: string | null;
  handouts: HandoutData[];
}

export interface ChatMessage {
  id?: string;
  type: 'html' | 'desc' | 'dice' | 'ooc-dice' | 'ooc-chat' | 'vn-chat' | 'ic-chat' | 'skill' | 'bns_pnl_skill';
  text?: string;
  sender?: string;
  timestamp?: any;
  // VN specific
  characterId?: string | null;
  portraitUrl?: string | null;
  // Skill specific
  skillName?: string;
  skillValue?: number;
  hardValue?: number;
  extremeValue?: number;
  roll?: number;
  allRolls?: number[];
  resultText?: string;
  resultClass?: string;
  bonusLevel?: number;
  results?: Record<string, { roll: number, text: string, class: string }>;
}

export interface SessionData {
  id: string;
  keeperId: string;
  createdAt: any;
  scene: SceneData;
}

export interface DiceResult {
  total: number;
  rolls: number[];
}