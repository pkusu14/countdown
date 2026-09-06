/* Paste the config block from the Firebase console in here.
   Until you do, the app runs exactly as before - just without live sync.

   The apiKey being public is normal for Firebase web apps. What actually
   protects the data is the database rules, which allow access to this one
   room name and nothing else. */

window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBJPj6REpI0Xg9nWQLaUHxvfVWXKYFZMAY',
  authDomain: 'countdown-6b46e.firebaseapp.com',
  databaseURL: 'https://countdown-6b46e-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'countdown-6b46e',
  storageBucket: 'countdown-6b46e.firebasestorage.app',
  messagingSenderId: '593079336666',
  appId: '1:593079336666:web:86ef07d4b09ea13b60efe3'
};

/* The room name is deliberately NOT in here. It's the only secret protecting
   the data, and this file is public. It arrives in the share link instead and
   is kept in each phone's own storage. */
