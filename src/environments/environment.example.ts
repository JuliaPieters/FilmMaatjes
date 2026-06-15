// Kopieer dit bestand naar environment.ts (dev) en environment.prod.ts (productie)
// en vul de juiste waarden in. Beide bestanden staan in .gitignore.
export const environment = {
  production: false,
  tmdb: {
    apiKey: 'JOUW_TMDB_API_KEY',
    readAccessToken: 'JOUW_TMDB_READ_ACCESS_TOKEN',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
  },
  firebase: {
    apiKey: 'JOUW_FIREBASE_API_KEY',
    authDomain: 'JOUW_PROJECT.firebaseapp.com',
    projectId: 'JOUW_PROJECT_ID',
    storageBucket: 'JOUW_PROJECT.firebasestorage.app',
    messagingSenderId: 'JOUW_SENDER_ID',
    appId: 'JOUW_APP_ID',
  },
};
