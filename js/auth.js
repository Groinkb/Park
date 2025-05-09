// Gestion de l'authentification
class Auth {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user'));

    // Éléments du DOM
    this.authSection = document.getElementById('authSection');
    this.appSection = document.getElementById('appSection');
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.loginFormElement = document.getElementById('loginFormElement');
    this.registerFormElement = document.getElementById('registerFormElement');
    this.userDisplayName = document.getElementById('userDisplayName');
    this.logoutButton = document.getElementById('logoutButton');
    this.showRegisterLink = document.getElementById('showRegister');
    this.showLoginLink = document.getElementById('showLogin');
    this.loginError = document.getElementById('loginError');
    this.registerError = document.getElementById('registerError');

    // Initialisation des événements
    this.initEvents();

    // Vérifier l'authentification au chargement
    this.checkAuth();
  }

  // Initialisation des écouteurs d'événements
  initEvents() {
    // Basculer entre les formulaires
    this.showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.loginForm.style.display = 'none';
      this.registerForm.style.display = 'block';
    });

    this.showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.registerForm.style.display = 'none';
      this.loginForm.style.display = 'block';
    });

    // Soumission des formulaires
    this.loginFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    this.registerFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.register();
    });

    // Déconnexion
    this.logoutButton.addEventListener('click', () => {
      this.logout();
    });
  }

  // Vérifier si l'utilisateur est authentifié
  checkAuth() {
    if (this.token && this.user) {
      this.authSection.style.display = 'none';
      this.appSection.style.display = 'block';
      this.userDisplayName.textContent = `Connecté en tant que ${this.user.name}`;
    } else {
      this.authSection.style.display = 'block';
      this.appSection.style.display = 'none';
    }
  }

  // Connexion
  async login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        this.loginError.textContent = data.error || 'Erreur de connexion';
        return;
      }

      // Stocker les informations d'authentification
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Mettre à jour l'état
      this.token = data.token;
      this.user = data.user;

      // Réinitialiser le formulaire
      this.loginFormElement.reset();
      this.loginError.textContent = '';

      // Actualiser l'interface
      this.checkAuth();

      // Charger les réservations
      if (window.reservationManager) {
        window.reservationManager.loadReservations();
      }

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      this.loginError.textContent = 'Erreur de connexion au serveur';
    }
  }

  // Inscription
  async register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        this.registerError.textContent = data.error || 'Erreur d\'inscription';
        return;
      }

      // Stocker les informations d'authentification
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Mettre à jour l'état
      this.token = data.token;
      this.user = data.user;

      // Réinitialiser le formulaire
      this.registerFormElement.reset();
      this.registerError.textContent = '';

      // Actualiser l'interface
      this.checkAuth();

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      this.registerError.textContent = 'Erreur de connexion au serveur';
    }
  }

  // Déconnexion
  logout() {
    // Supprimer les informations d'authentification
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Réinitialiser l'état
    this.token = null;
    this.user = null;

    // Actualiser l'interface
    this.checkAuth();
  }

  // Obtenir le token pour les requêtes authentifiées
  getToken() {
    return this.token;
  }

  // Obtenir l'utilisateur connecté
  getUser() {
    return this.user;
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return !!this.token;
  }
}

// Exporter l'instance Auth
window.authManager = new Auth();