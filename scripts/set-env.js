// Wordt uitgevoerd door Vercel vóór de build.
// Leest environment variables en schrijft environment.prod.ts.
const fs = require('fs');
const path = require('path');

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Verplichte environment variable ontbreekt: ${name}`);
    process.exit(1);
  }
  return value;
}

const content = `export const environment = {
  production: true,
  tmdb: {
    apiKey: '${required('TMDB_API_KEY')}',
    readAccessToken: '${required('TMDB_READ_ACCESS_TOKEN')}',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
  },
  firebase: {
    apiKey: '${required('FIREBASE_API_KEY')}',
    authDomain: '${required('FIREBASE_AUTH_DOMAIN')}',
    projectId: '${required('FIREBASE_PROJECT_ID')}',
    storageBucket: '${required('FIREBASE_STORAGE_BUCKET')}',
    messagingSenderId: '${required('FIREBASE_MESSAGING_SENDER_ID')}',
    appId: '${required('FIREBASE_APP_ID')}',
  },
};
`;

fs.writeFileSync(path.join(__dirname, '../src/environments/environment.prod.ts'), content);
console.log('✓ environment.prod.ts gegenereerd vanuit Vercel environment variables');
