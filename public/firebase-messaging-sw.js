/* Firebase pranešimų service worker. Konfigūracija perduodama per URL adresą,
   nes service worker negali skaityti aplinkos kintamųjų. */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();
