# Application de Réservation d'Espace

Une application web simple pour gérer la réservation d'un espace unique. Cette application permet de voir qui occupe actuellement l'espace et jusqu'à quand, ainsi que de réserver l'espace pour une période définie.

## Fonctionnalités

- Système d'inscription et de connexion utilisateur
- Visualisation du statut actuel de l'espace (libre ou occupé)
- Réservation de l'espace avec date et heure de début/fin
- Ajout de notes aux réservations
- Visualisation des réservations à venir et passées
- Annulation de ses propres réservations

## Installation

1. Clonez ce dépôt :
```
git clone <URL_DU_DEPOT>
cd reservation-app
```

2. Installez les dépendances :
```
npm install
```

3. Démarrez l'application :
```
npm start
```

L'application sera accessible à l'adresse http://localhost:3000

## Développement

Pour le développement avec rechargement automatique :
```
npm run dev
```

## Structure du projet

- `index.html` : Page principale de l'application
- `css/style.css` : Styles CSS
- `js/` : Scripts JavaScript côté client
  - `app.js` : Script principal de l'application
  - `auth.js` : Gestion de l'authentification
  - `reservation.js` : Gestion des réservations
- `server.js` : Serveur Node.js avec API REST
- `db/` : Configuration et modèles de la base de données

## Technologies utilisées

- Frontend : HTML, CSS, JavaScript (vanilla)
- Backend : Node.js, Express
- Base de données : SQLite
- Authentification : JWT (JSON Web Tokens)

## Sécurité

- Les mots de passe sont hachés avec bcrypt
- L'authentification utilise des tokens JWT
- Protection contre les conflits de réservation
- Vérification des autorisations pour les actions sensibles