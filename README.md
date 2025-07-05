

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

 Interface de Location de Véhicules (Frontend)

Ce projet correspond à la **partie frontend** (interface utilisateur) de l’application de location de véhicules développée avec **React**.

---

Technologies utilisées

 Technologie         | Description                                     
 React.js        : Framework JavaScript pour l'interface           
Vite         : Outil de développement rapide pour React        
Axios           : Requêtes HTTP vers le backend Node.js           
React Router DOM : Navigation entre les pages                     
CSS classique   : Pour le style des pages (`Register.css`, etc.)  

---

## 📁 Structure du projet

```bash
frontend/
├── public/
├── src/
│   ├── pages/
│   │   ├── Register.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── Reservations.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── ...
├── package.json
├── vite.config.js
└── ...
````

---

## 🛠️ Prérequis

Assurez-vous d’avoir installé sur votre machine :

* [Node.js](https://nodejs.org/) (version 18 ou plus recommandée)
* [npm](https://www.npmjs.com/) (souvent inclus avec Node)
* Un éditeur de code (ex : VS Code)

---

 Installation du frontend
Installer les dépendances 

```bash
npm install
```
Lancer le serveur de développement :**

```bash
npm run dev
```

 Accéder à l’interface dans votre navigateur :

[http://localhost:5173](http://localhost:5173)

---

## Connexion au backend

L’interface utilise un backend Node.js accessible à l’adresse :

```
http://localhost:5000
```

Assurez-vous que le backend est lancé avant d'utiliser le frontend.

---

## 📌 Pages disponibles

| URL             | Fonction                                  |
| --------------- | ----------------------------------------- |
| `/`             | Page d’inscription                        |
| `/login`        | Connexion utilisateur                     |
| `/dashboard`    | Liste des véhicules + ajout + réservation |
| `/reservations` | Liste des réservations enregistrées       |

---

