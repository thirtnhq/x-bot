import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { AnalysisResult } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Simple check to warn if config is missing
if (!firebaseConfig.apiKey) {
  console.warn("Firebase configuration is missing in .env.local");
}


// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const RESULTS_COLLECTION = 'analysis_results';

// Helper to remove undefined values for Firestore
function sanitizeData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => v === undefined ? null : sanitizeData(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : sanitizeData(v)])
    );
  }
  return obj === undefined ? null : obj;
}

// Save all raw submissions (Boundless + SocialData)
export async function saveRawSubmissions(submissions: any[]) {
  try {
    const docRef = doc(db, 'submissions_cache', 'latest');
    await setDoc(docRef, sanitizeData({
      items: submissions,
      updatedAt: new Date().toISOString()
    }));
    console.log('Raw submissions cached to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving raw submissions:', error);
    return false;
  }
}

// Get cached raw submissions
export async function getRawSubmissions() {
  try {
    const docRef = doc(db, 'submissions_cache', 'latest');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items;
    }
    return null;
  } catch (error) {
    console.error('Error loading raw submissions:', error);
    return null;
  }
}

// Save specific analysis result with unique ID
export async function saveAnalysis(result: AnalysisResult) {
  try {
    const id = `analysis-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const docRef = doc(db, 'analyses', id);
    const sanitized = sanitizeData({
      ...result,
      id,
    });
    await setDoc(docRef, sanitized);
    
    // Also update 'latest' for the default view
    await setDoc(doc(db, RESULTS_COLLECTION, 'latest'), sanitized);
    
    console.log(`Analysis ${id} saved to Firebase`);
    return id;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}

// Get analysis history
export async function getAnalyses() {
  try {
    const querySnapshot = await getDocs(collection(db, 'analyses'));
    return querySnapshot.docs.map(doc => doc.data() as AnalysisResult);
  } catch (error) {
    console.error('Error getting analyses:', error);
    return [];
  }
}

// Original persistence functions (updated to use sanitization)
export async function saveAnalysisResult(result: AnalysisResult) {
  try {
    await setDoc(doc(db, RESULTS_COLLECTION, 'latest'), sanitizeData(result));
    console.log('Analysis result saved to Firebase');
  } catch (error) {
    console.error('Error saving to Firebase:', error);
  }
}

export async function getLastAnalysisResult(): Promise<AnalysisResult | null> {
  try {
    const docRef = doc(db, RESULTS_COLLECTION, 'latest');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AnalysisResult;
    }
    return null;
  } catch (error) {
    console.error('Error loading from Firebase:', error);
    return null;
  }
}


