import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  Firestore,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { SessionData, SceneData, Character, ChatMessage } from '../types';

// Provided config
const firebaseConfig = {
  apiKey: "AIzaSyAwmu7lzZ_aB9JFHa2bf_a8QKN-jNiaWVw",
  authDomain: "d0wnthedrain.firebaseapp.com",
  projectId: "d0wnthedrain",
  storageBucket: "d0wnthedrain.firebasestorage.app",
  messagingSenderId: "446498397523",
  appId: "1:446498397523:web:760d63009139651f0fd5a6",
  measurementId: "G-BLTSFHLWG9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const signIn = () => signInAnonymously(auth);

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const createSession = async (keeperId: string): Promise<string> => {
  const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialScene: SceneData = {
    mapUrl: '', maps: [],
    bgmUrl: '', bgms: [],
    activeHandout: null, handouts: []
  };
  
  await setDoc(doc(db, 'sessions', sessionId), {
    createdAt: serverTimestamp(),
    keeperId,
    scene: initialScene
  });
  
  return sessionId;
};

export const checkSessionExists = async (sessionId: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, 'sessions', sessionId));
  return snap.exists();
};

export const subscribeToSession = (sessionId: string, callback: (data: SessionData | null) => void) => {
  return onSnapshot(doc(db, 'sessions', sessionId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as DocumentData) } as SessionData);
    } else {
      callback(null);
    }
  });
};

export const subscribeToCharacters = (sessionId: string, callback: (chars: Character[]) => void) => {
  return onSnapshot(collection(db, 'sessions', sessionId, 'characters'), (snapshot: QuerySnapshot<DocumentData>) => {
    const chars: Character[] = [];
    snapshot.forEach((doc) => chars.push({ id: doc.id, ...doc.data() } as Character));
    callback(chars);
  });
};

export const subscribeToChat = (sessionId: string, callback: (msgs: ChatMessage[]) => void) => {
  const q = query(collection(db, 'sessions', sessionId, 'chat'), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() } as ChatMessage));
    callback(msgs.reverse());
  });
};

export const sendChatMessage = async (sessionId: string, message: ChatMessage) => {
  await addDoc(collection(db, 'sessions', sessionId, 'chat'), {
    ...message,
    timestamp: serverTimestamp()
  });
};

export const updateScene = async (sessionId: string, updates: Partial<SceneData>) => {
  const firestoreUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
        firestoreUpdates[`scene.${key}`] = value;
    }
  }
  // Deep sanitize to ensure no undefined values exist inside objects/arrays
  const safeUpdates = JSON.parse(JSON.stringify(firestoreUpdates));
  await updateDoc(doc(db, 'sessions', sessionId), safeUpdates);
};

export const addCharacter = async (sessionId: string, character: Omit<Character, 'id'>): Promise<string> => {
  // Use JSON stringify/parse to strip undefined values which cause Firestore errors
  const safeCharacter = JSON.parse(JSON.stringify(character));
  const docRef = await addDoc(collection(db, 'sessions', sessionId, 'characters'), safeCharacter);
  return docRef.id;
};

export const updateCharacter = async (sessionId: string, charId: string, updates: Partial<Character>) => {
  // Sanitize to prevent undefined errors
  const safeUpdates = JSON.parse(JSON.stringify(updates));
  await updateDoc(doc(db, 'sessions', sessionId, 'characters', charId), safeUpdates);
};

export const getNewCharacterTemplate = (name: string, userId: string, playerName: string): Omit<Character, 'id'> => {
  const initial = 50;
  return {
      name: name || "이름 없는 탐사자",
      owner: userId, 
      portraitUrl: "",
      player_name: playerName || "",
      age: 25,
      sex: "",
      height: "",
      family: "0",
      stats: { STR: 50, CON: 50, SIZ: 50, DEX: initial, APP: 50, INT: 50, POW: initial, EDU: initial, MOV: 8 },
      vitals: { 
        HP: 10, MP: 10, SAN: initial, initialSAN: initial, LUCK: 50, 
        temporaryInsanity: false, indefiniteInsanity: false,
        majorWound: false, dying: false, pulpHp: false
      },
      derived: { damage_bonus: "0", build: 0 },
      skills: { "크툴루 신화": 0, "회피": Math.floor(initial / 2), "모국어": initial },
      expressions: { '기본': '' },
      weapons: [],
      talents: [],
      backstory: {
        personalDescription: "", traits: "", ideology: "", injuries: "", people: "",
        phobias: "", locations: "", possessions: "", encounters: "", gear: "",
        cash: "", spending: "", assets: "", memo: ""
      },
      mentalCondition: "평상심"
  };
};

export { auth, db };