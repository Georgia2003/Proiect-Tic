## README

### Prezentare generală

Proiectul este o aplicație web de tip SPA (Single Page Application) care implementează un flux complet de autentificare și gestionare date printr-o arhitectură separată UI + API. Aplicația permite administrarea produselor și a comenzilor (CRUD), cu acces controlat în funcție de utilizatorul autentificat. Scopul principal este să demonstrez integrarea dintre un frontend modern și un backend REST, cu persistență într-o bază de date NoSQL (Firestore) și validări stricte pe server.

### Tehnologii utilizate

* **Frontend (UI):** Vue 3 + Vite, Vue Router (navigare), Pinia (state), Vuetify (interfață), Firebase Auth (autentificare).
* **Backend (API):** Node.js + Express, Firebase Admin SDK (acces la Firestore), Joi (validare request-uri).
* **Database:** Firestore (NoSQL, colecții/documente).

### Arhitectură și flux de securitate

Autentificarea se face prin Firebase Auth în UI. La fiecare request către API, UI trimite token-ul de autentificare. API verifică token-ul și identifică utilizatorul. Toate operațiile de citire/scriere sunt restricționate la datele utilizatorului curent (de exemplu, produse asociate owner-ului și comenzi asociate user-ului). Astfel, un utilizator nu poate edita/șterge resurse care nu îi aparțin.

### Funcționalități implementate

 **Autentificare:** login/logout, protejarea rutelor (fără login nu se pot accesa paginile de Products/Orders).
 **Products:** listare, adăugare, editare, ștergere; fiecare produs este asociat cu utilizatorul care l-a creat.
 **Orders:** listare, creare comandă pe baza unui produs selectat, editare (status + date de livrare), ștergere; fiecare comandă este asociată cu utilizatorul care a creat-o.

### Validări (Joi) — partea obligatorie

Pe backend sunt definite scheme de validare pentru request-urile de creare și update atât la Products, cât și la Orders. Validările urmăresc tipurile de date, câmpurile obligatorii și intervalele acceptate (ex: cantitate minim 1, preț >= 0, structuri corecte pentru liste/obiecte). Scopul este prevenirea introducerii de date invalide în Firestore și reducerea erorilor la nivel de aplicație.

### Endpoints (descriere)

API expune endpoint-uri REST pentru:

 **Products:** operații CRUD pentru produse (limitând accesul la owner).
 **Orders:** operații CRUD pentru comenzi (limitând accesul la user).
  Aceste endpoint-uri sunt consumate de UI printr-un serviciu comun care atașează automat token-ul în request.

### Model de date (logic)

 **products:** documente de produse cu informații generale (nume, preț, descriere) + câmpuri nested pentru categorie și inventar; include identificatorul owner-ului.
 **orders:** documente de comenzi care includ lista de produse comandate (productId, cantitate, preț la cumpărare, snapshot), status și informații de livrare; include identificatorul user-ului.

### Rulare proiect

Proiectul se rulează local în două procese: API (server Express) și UI (Vite). Sunt necesare variabile de mediu pentru conexiunea la API în UI și configurarea Firebase Admin în API. După pornire, fluxul de test este: login → products → orders.



Proiectul este construit pentru a evidenția corect: separarea responsabilităților (UI vs API), securizarea accesului la date per utilizator și validarea strictă a datelor pe backend.
