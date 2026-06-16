import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

console.log('[Firebase] projectId:', environment.firebase.projectId);
const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
