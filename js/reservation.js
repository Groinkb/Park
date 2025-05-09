// Gestion des réservations
class ReservationManager {
  constructor() {
    // Éléments du DOM
    this.reservationForm = document.getElementById('reservationForm');
    this.formError = document.getElementById('formError');
    this.upcomingList = document.getElementById('upcomingList');
    this.pastList = document.getElementById('pastList');
    this.statusMessage = document.getElementById('statusMessage');
    this.occupiedBy = document.getElementById('occupiedBy');
    this.untilTime = document.getElementById('untilTime');

    // Initialisation des événements
    this.initEvents();

    // Charger le statut actuel
    this.updateStatus();

    // Intervalle pour mettre à jour le statut
    setInterval(() => this.updateStatus(), 60000); // Mise à jour toutes les minutes
  }

  // Initialisation des écouteurs d'événements
  initEvents() {
    // Soumission du formulaire de réservation
    this.reservationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addReservation();
    });
  }

  // Formater la date et l'heure
  formatDateTime(dateTimeString) {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString('fr-FR', options);
  }

  // Mise à jour du statut actuel
  async updateStatus() {
    try {
      const response = await fetch('/api/current-status');
      const data = await response.json();

      if (data.status === 'occupied') {
        // L'espace est occupé
        this.statusMessage.textContent = "L'espace est occupé";
        this.statusMessage.className = "status-occupied";

        this.occupiedBy.textContent = `Par : ${data.reservation.user_name}`;
        this.occupiedBy.style.display = 'block';

        this.untilTime.textContent = `Jusqu'à : ${this.formatDateTime(data.reservation.end_time)}`;
        this.untilTime.style.display = 'block';
      } else {
        // L'espace est libre
        this.statusMessage.textContent = "L'espace est libre";
        this.statusMessage.className = "status-free";

        this.occupiedBy.style.display = 'none';
        this.untilTime.style.display = 'none';
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
    }
  }

  // Charger toutes les réservations
  async loadReservations() {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    try {
      const response = await fetch('/api/reservations', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des réservations');
      }

      const reservations = await response.json();
      this.displayReservations(reservations);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Ajouter une nouvelle réservation
  async addReservation() {
    if (!window.authManager.isAuthenticated()) {
      this.formError.textContent = 'Vous devez être connecté pour réserver';
      this.formError.style.display = 'block';
      return;
    }

    const startTime = new Date(document.getElementById('startTime').value);
    const endTime = new Date(document.getElementById('endTime').value);
    const note = document.getElementById('reservationNote').value;
    const now = new Date();

    // Validation
    if (startTime >= endTime) {
      this.formError.textContent = "L'heure de fin doit être après l'heure de début";
      this.formError.style.display = 'block';
      return;
    }

    if (startTime < now) {
      this.formError.textContent = "Vous ne pouvez pas réserver dans le passé";
      this.formError.style.display = 'block';
      return;
    }

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          note
        })
      });

      const data = await response.json();

      if (!response.ok) {
        this.formError.textContent = data.error || 'Erreur lors de la réservation';
        this.formError.style.display = 'block';
        return;
      }

      // Réinitialiser le formulaire et les erreurs
      this.reservationForm.reset();
      this.formError.style.display = 'none';

      // Actualiser les réservations et le statut
      this.loadReservations();
      this.updateStatus();

      // Changer l'onglet vers les réservations à venir
      document.querySelector('.tab[data-tab="upcomingReservations"]').click();

    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      this.formError.textContent = 'Erreur de connexion au serveur';
      this.formError.style.display = 'block';
    }
  }

  // Supprimer une réservation
  async deleteReservation(id) {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      // Actualiser les réservations et le statut
      this.loadReservations();
      this.updateStatus();

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur de connexion au serveur');
    }
  }

  // Afficher les réservations dans la liste
  displayReservations(reservations) {
    const now = new Date();

    // Trier les réservations par date de début
    const sortedReservations = [...reservations].sort((a, b) => {
      return new Date(a.start_time) - new Date(b.start_time);
    });

    // Séparer les réservations passées et futures
    const pastReservations = [];
    const upcomingReservations = [];

    for (const reservation of sortedReservations) {
      const endTime = new Date(reservation.end_time);

      if (endTime < now) {
        pastReservations.push(reservation);
      } else {
        upcomingReservations.push(reservation);
      }
    }

    // Effacer les listes
    this.upcomingList.innerHTML = '';
    this.pastList.innerHTML = '';

    // Afficher les réservations à venir
    if (upcomingReservations.length === 0) {
      this.upcomingList.innerHTML = '<li>Aucune réservation à venir</li>';
    } else {
      for (const reservation of upcomingReservations) {
        const li = document.createElement('li');
        li.className = 'reservation-item';

        const currentUser = window.authManager.getUser();
        const isCurrentUserReservation = reservation.user_id === currentUser.id;

        const infoDiv = document.createElement('div');
        let userInfo = '';

        if (isCurrentUserReservation) {
          userInfo = '<strong>Ma réservation</strong>';
        } else {
          // Obtenir le nom de l'utilisateur de l'API
          userInfo = `<strong>Réservé par : ${reservation.user_name || 'Utilisateur inconnu'}</strong>`;
        }

        infoDiv.innerHTML = `
                    ${userInfo}<br>
                    Du : ${this.formatDateTime(reservation.start_time)}<br>
                    Au : ${this.formatDateTime(reservation.end_time)}
                `;

        if (reservation.note) {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'reservation-note';
          noteDiv.textContent = `Note : ${reservation.note}`;
          infoDiv.appendChild(noteDiv);
        }

        li.appendChild(infoDiv);

        // Ajouter un bouton de suppression si c'est la réservation de l'utilisateur actuel
        if (isCurrentUserReservation) {
          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Annuler';
          deleteButton.className = 'delete-button';
          deleteButton.addEventListener('click', () => this.deleteReservation(reservation.id));
          li.appendChild(deleteButton);
        }

        this.upcomingList.appendChild(li);
      }
    }

    // Afficher les réservations passées
    if (pastReservations.length === 0) {
      this.pastList.innerHTML = '<li>Aucune réservation passée</li>';
    } else {
      // Afficher les 10 dernières réservations passées
      const recentPastReservations = pastReservations.slice(-10).reverse();

      for (const reservation of recentPastReservations) {
        const li = document.createElement('li');
        li.className = 'reservation-item';

        let userInfo = '';
        if (reservation.user_id === window.authManager.getUser().id) {
          userInfo = '<strong>Ma réservation</strong>';
        } else {
          userInfo = `<strong>Réservé par : ${reservation.user_name || 'Utilisateur inconnu'}</strong>`;
        }

        li.innerHTML = `
                    <div>
                        ${userInfo}<br>
                        Du : ${this.formatDateTime(reservation.start_time)}<br>
                        Au : ${this.formatDateTime(reservation.end_time)}
                    </div>
                `;

        if (reservation.note) {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'reservation-note';
          noteDiv.textContent = `Note : ${reservation.note}`;
          li.querySelector('div').appendChild(noteDiv);
        }

        this.pastList.appendChild(li);
      }
    }
  }
}

// Exporter l'instance ReservationManager
window.reservationManager = new ReservationManager();