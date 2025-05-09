// Gestion du profil utilisateur
class ProfileManager {
  constructor() {
    this.profileData = null;
    this.reservationStats = null;

    // Éléments du DOM
    this.profileTabs = document.querySelectorAll('.profile-tab');
    this.profileTabContents = document.querySelectorAll('.profile-tab-content');
    this.profileInfoForm = document.getElementById('profileInfoForm');
    this.passwordChangeForm = document.getElementById('passwordChangeForm');
    this.savePreferencesBtn = document.getElementById('savePreferencesBtn');

    // Information du profil
    this.profileName = document.getElementById('profileName');
    this.profileEmail = document.getElementById('profileEmail');
    this.avatarInitials = document.getElementById('avatarInitials');

    // Élément d'upload d'avatar
    this.avatarUpload = document.getElementById('avatarUpload');
    this.avatarImage = document.getElementById('avatarImage');

    // Champs de formulaire
    this.nameInput = document.getElementById('profileNameInput');
    this.phoneInput = document.getElementById('profilePhoneInput');
    this.departmentInput = document.getElementById('profileDepartmentInput');
    this.positionInput = document.getElementById('profilePositionInput');
    this.bioInput = document.getElementById('profileBioInput');
    this.themeSelector = document.getElementById('themeSelector');

    // Messages d'erreur
    this.profileInfoError = document.getElementById('profileInfoError');
    this.passwordChangeError = document.getElementById('passwordChangeError');
    this.themeError = document.getElementById('themeError');

    // Statistiques
    this.totalReservations = document.getElementById('totalReservations');
    this.hoursReserved = document.getElementById('hoursReserved');
    this.upcomingReservations = document.getElementById('upcomingReservations');
    this.reservationsChart = document.getElementById('reservationsChart');

    // Initialiser les événements
    this.initEvents();
  }

  // Initialisation des écouteurs d'événements
  initEvents() {
    // Gérer les onglets du profil
    this.profileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.profileTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabId = tab.getAttribute('data-profile-tab');
        this.profileTabContents.forEach(content => {
          content.style.display = 'none';
        });

        document.getElementById(tabId + 'Tab').style.display = 'block';

        // Charger les statistiques si on clique sur l'onglet stats
        if (tabId === 'stats') {
          this.loadStats();
        }
      });
    });

    // Gestion de l'upload d'avatar
    if (this.avatarUpload) {
      this.avatarUpload.addEventListener('change', (e) => {
        this.uploadAvatar(e.target.files[0]);
      });
    }

    // Formulaire d'informations de profil
    if (this.profileInfoForm) {
      this.profileInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }

    // Formulaire de changement de mot de passe
    if (this.passwordChangeForm) {
      this.passwordChangeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    // Bouton de sauvegarde des préférences
    if (this.savePreferencesBtn) {
      this.savePreferencesBtn.addEventListener('click', () => {
        this.savePreferences();
      });
    }
  }

  // Charger les données du profil
  async loadProfile() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du profil');
      }

      this.profileData = await response.json();
      this.displayProfile();

    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Afficher les données du profil
  displayProfile() {
    if (!this.profileData) {
      return;
    }

    // Afficher les informations de base
    if (this.profileName) this.profileName.textContent = this.profileData.name || 'Nom non défini';
    if (this.profileEmail) this.profileEmail.textContent = this.profileData.email || 'Email non défini';

    // Initialiser les champs du formulaire
    if (this.nameInput) this.nameInput.value = this.profileData.name || '';
    if (this.phoneInput) this.phoneInput.value = this.profileData.phone || '';
    if (this.departmentInput) this.departmentInput.value = this.profileData.department || '';
    if (this.positionInput) this.positionInput.value = this.profileData.position || '';
    if (this.bioInput) this.bioInput.value = this.profileData.bio || '';
    if (this.themeSelector) this.themeSelector.value = this.profileData.theme || 'light';

    // Afficher l'avatar s'il existe
    if (this.avatarImage && this.profileData.avatar) {
      this.avatarImage.src = this.profileData.avatar;
      this.avatarImage.style.display = 'block';
      if (this.avatarInitials) this.avatarInitials.style.display = 'none';
    } else if (this.avatarInitials) {
      this.avatarInitials.style.display = 'block';
      if (this.avatarImage) this.avatarImage.style.display = 'none';

      // Afficher les initiales
      if (this.profileData.name) {
        const nameParts = this.profileData.name.split(' ');
        let initials = '';

        if (nameParts.length >= 2) {
          initials = nameParts[0].charAt(0) + nameParts[1].charAt(0);
        } else if (nameParts.length === 1) {
          initials = nameParts[0].charAt(0);
        } else {
          initials = 'U';
        }

        this.avatarInitials.textContent = initials.toUpperCase();
      }
    }

    // Appliquer le thème si défini
    if (this.profileData.theme) {
      this.applyTheme(this.profileData.theme);
    }
  }

  // Mettre à jour le profil
  async updateProfile() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    const updatedProfile = {
      name: this.nameInput.value,
      phone: this.phoneInput.value,
      department: this.departmentInput.value,
      position: this.positionInput.value,
      bio: this.bioInput.value
    };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify(updatedProfile)
      });

      if (!response.ok) {
        const data = await response.json();
        this.profileInfoError.textContent = data.error || 'Erreur lors de la mise à jour du profil';
        this.profileInfoError.style.display = 'block';
        return;
      }

      this.profileData = await response.json();
      this.displayProfile();

      // Mettre à jour le nom affiché dans la barre de navigation
      const userDisplayName = document.getElementById('userDisplayName');
      if (userDisplayName && this.profileData.name) {
        userDisplayName.textContent = `Connecté en tant que ${this.profileData.name}`;
      }

      this.profileInfoError.style.display = 'none';
      alert('Profil mis à jour avec succès');

    } catch (error) {
      console.error('Erreur:', error);
      this.profileInfoError.textContent = 'Erreur de connexion au serveur';
      this.profileInfoError.style.display = 'block';
    }
  }

  // Fonction pour télécharger l'avatar
  async uploadAvatar(file) {
    if (!file || !window.authManager.isAuthenticated()) {
      return;
    }

    // Vérifier si le fichier est une image
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }

    // Créer un objet FormData
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      // Afficher une prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.avatarImage) {
          this.avatarImage.src = e.target.result;
          this.avatarImage.style.display = 'block';
        }
        if (this.avatarInitials) {
          this.avatarInitials.style.display = 'none';
        }
      };
      reader.readAsDataURL(file);

      // Envoyer le fichier au serveur
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du téléchargement de l\'avatar');
      }

      const data = await response.json();

      // Mettre à jour l'avatar dans les données du profil
      if (this.profileData) {
        this.profileData.avatar = data.avatar;
      }

      // Rafraîchir l'affichage si nécessaire
      this.displayProfile();

    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur lors du téléchargement de l'avatar: ${error.message}`);

      // Réinitialiser si échec
      if (this.profileData && this.profileData.avatar) {
        if (this.avatarImage) {
          this.avatarImage.src = this.profileData.avatar;
          this.avatarImage.style.display = 'block';
        }
      } else {
        if (this.avatarImage) this.avatarImage.style.display = 'none';
        if (this.avatarInitials) this.avatarInitials.style.display = 'block';
      }
    }

    // Réinitialiser l'input file
    if (this.avatarUpload) {
      this.avatarUpload.value = '';
    }
  }

  // Changer le mot de passe
  async changePassword() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      this.passwordChangeError.textContent = 'Les mots de passe ne correspondent pas';
      this.passwordChangeError.style.display = 'block';
      return;
    }

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        this.passwordChangeError.textContent = data.error || 'Erreur lors du changement de mot de passe';
        this.passwordChangeError.style.display = 'block';
        return;
      }

      // Réinitialiser le formulaire
      this.passwordChangeForm.reset();
      this.passwordChangeError.style.display = 'none';
      alert('Mot de passe modifié avec succès');

    } catch (error) {
      console.error('Erreur:', error);
      this.passwordChangeError.textContent = 'Erreur de connexion au serveur';
      this.passwordChangeError.style.display = 'block';
    }
  }

  // Sauvegarder les préférences
  async savePreferences() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    const theme = this.themeSelector.value;

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify({ theme })
      });

      if (!response.ok) {
        const data = await response.json();
        this.themeError.textContent = data.error || 'Erreur lors de la sauvegarde des préférences';
        this.themeError.style.display = 'block';
        return;
      }

      this.profileData = await response.json();
      this.applyTheme(theme);

      this.themeError.style.display = 'none';
      alert('Préférences sauvegardées avec succès');

    } catch (error) {
      console.error('Erreur:', error);
      this.themeError.textContent = 'Erreur de connexion au serveur';
      this.themeError.style.display = 'block';
    }
  }

  // Appliquer le thème
  applyTheme(theme) {
    const body = document.body;

    // Supprimer les classes de thème existantes
    body.classList.remove('theme-light', 'theme-dark');

    // Appliquer le nouveau thème
    if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else if (theme === 'light') {
      body.classList.add('theme-light');
    } else if (theme === 'system') {
      // Détecter le thème du système
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('theme-dark');
      } else {
        body.classList.add('theme-light');
      }

      // Écouter les changements de thème système
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (this.themeSelector.value === 'system') {
          body.classList.remove('theme-light', 'theme-dark');
          body.classList.add(e.matches ? 'theme-dark' : 'theme-light');
        }
      });
    }
  }

  // Charger les statistiques de l'utilisateur
  async loadStats() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    try {
      // Obtenir toutes les réservations de l'utilisateur
      const response = await fetch('/api/reservations', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des réservations');
      }

      const reservations = await response.json();
      const currentUser = window.authManager.getUser();
      const userReservations = reservations.filter(res => res.user_id === currentUser.id);

      // Calculer les statistiques
      this.calculateStats(userReservations);

    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Calculer les statistiques
  calculateStats(reservations) {
    const now = new Date();

    // Réservations à venir
    const upcoming = reservations.filter(res => new Date(res.end_time) > now);

    // Calculer le temps total réservé en heures
    let totalHours = 0;

    reservations.forEach(res => {
      const start = new Date(res.start_time);
      const end = new Date(res.end_time);
      const diffHours = (end - start) / (1000 * 60 * 60);
      totalHours += diffHours;
    });

    // Mettre à jour les statistiques
    if (this.totalReservations) this.totalReservations.textContent = reservations.length;
    if (this.hoursReserved) this.hoursReserved.textContent = totalHours.toFixed(1);
    if (this.upcomingReservations) this.upcomingReservations.textContent = upcoming.length;

    // Créer le graphique des réservations par mois
    this.createMonthlyChart(reservations);
  }

  // Créer un graphique des réservations par mois
  createMonthlyChart(reservations) {
    if (!this.reservationsChart || !reservations.length) {
      return;
    }

    // Obtenir l'année en cours
    const currentYear = new Date().getFullYear();

    // Compter les réservations par mois
    const monthlyData = Array(12).fill(0);

    reservations.forEach(res => {
      const startDate = new Date(res.start_time);
      if (startDate.getFullYear() === currentYear) {
        const month = startDate.getMonth();
        monthlyData[month]++;
      }
    });

    // Noms des mois
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Détruire le graphique existant s'il y en a un
    if (this.chart) {
      this.chart.destroy();
    }

    // Créer le graphique avec Chart.js
    const ctx = this.reservationsChart.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthNames,
        datasets: [{
          label: 'Réservations par mois',
          data: monthlyData,
          backgroundColor: 'rgba(52, 152, 219, 0.5)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            }
          }
        }
      }
    });
  }
}

// Exporter l'instance ProfileManager
window.profileManager = new ProfileManager();

// Charger le profil lorsque l'utilisateur est authentifié
document.addEventListener('DOMContentLoaded', () => {
  // Observer les changements d'authentification
  const authObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
        mutation.target.id === 'appSection' &&
        window.getComputedStyle(mutation.target).display !== 'none') {
        // L'utilisateur vient de se connecter
        if (window.profileManager) {
          window.profileManager.loadProfile();
        }
      }
    });
  });

  // Observer les changements de style de la section principale
  authObserver.observe(document.getElementById('appSection'), {
    attributes: true,
    attributeFilter: ['style']
  });

  // Charger le profil si l'utilisateur est déjà connecté
  if (window.authManager && window.authManager.isAuthenticated()) {
    if (window.profileManager) {
      window.profileManager.loadProfile();
    }
  }
});