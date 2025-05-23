// Gestion du calendrier
class CalendarManager {
  constructor() {
    this.calendar = null;
    this.calendarEl = document.getElementById('calendar');

    // Initialiser seulement si l'élément existe et si l'utilisateur est authentifié
    if (this.calendarEl && window.authManager && window.authManager.isAuthenticated()) {
      this.initCalendar();
    }
  }

  // Initialiser le calendrier
  initCalendar() {
    this.calendar = new FullCalendar.Calendar(this.calendarEl, {
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      slotMinTime: '07:00:00',
      slotMaxTime: '22:00:00',
      allDaySlot: false,
      height: 'auto',
      locale: 'fr',
      timeZone: 'local',
      selectable: true,
      selectMirror: true,
      nowIndicator: true,
      businessHours: {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0=dimanche, 1=lundi, etc.
        startTime: '08:00',
        endTime: '20:00',
      },
      select: (info) => this.handleDateSelect(info),
      eventClick: (info) => this.handleEventClick(info),
      events: (info, successCallback, failureCallback) => this.loadEvents(info, successCallback, failureCallback),
      eventContent: (info) => this.customEventContent(info),
      editable: false,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false,
        hour12: false
      }
    });

    this.calendar.render();

    // Ajouter un écouteur pour les changements d'onglet
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.currentTarget.getAttribute('data-tab') === 'calendarView' && this.calendar) {
          setTimeout(() => {
            this.calendar.updateSize();
          }, 100);
        }
      });
    });
  }

  // Charger les événements depuis l'API
  loadEvents(info, successCallback, failureCallback) {
    if (!window.authManager.isAuthenticated()) {
      return;
    }

    fetch('/api/reservations', {
      headers: {
        'Authorization': `Bearer ${window.authManager.getToken()}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des réservations');
        }
        return response.json();
      })
      .then(data => {
        const events = data.map(reservation => {
          const currentUser = window.authManager.getUser();
          const isCurrentUserReservation = reservation.user_id === currentUser.id;

          return {
            id: reservation.id,
            title: isCurrentUserReservation ? 'Ma réservation' : `Réservé par: ${reservation.user_name || 'Utilisateur'}`,
            start: reservation.start_time,
            end: reservation.end_time,
            description: reservation.note || '',
            backgroundColor: isCurrentUserReservation ? '#3498db' : '#e74c3c',
            borderColor: isCurrentUserReservation ? '#2980b9' : '#c0392b',
            textColor: '#ffffff',
            userId: reservation.user_id,
            userName: reservation.user_name,
            editable: isCurrentUserReservation,
            classNames: isCurrentUserReservation ? ['current-user-event'] : ['other-user-event']
          };
        });

        successCallback(events);
      })
      .catch(error => {
        console.error('Erreur:', error);
        failureCallback(error);
      });
  }

  // Gérer la sélection d'une date pour créer une réservation
  handleDateSelect(info) {
    if (!window.authManager.isAuthenticated()) {
      alert('Vous devez être connecté pour réserver');
      return;
    }

    // Passer aux champs de réservation et préremplir les dates
    document.querySelector('.tab[data-tab="newReservation"]').click();

    // Formater les dates pour les champs datetime-local
    const startDateInput = document.getElementById('startTime');
    const endDateInput = document.getElementById('endTime');

    // Conversion en format compatible avec datetime-local
    const formatDateForInput = (date) => {
      const d = new Date(date);
      // Format YYYY-MM-DDThh:mm (format attendu par datetime-local)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    startDateInput.value = formatDateForInput(info.start);
    endDateInput.value = formatDateForInput(info.end);
  }

  // Gérer le clic sur un événement
  handleEventClick(info) {
    const event = info.event;
    const currentUser = window.authManager.getUser();
    const isCurrentUserReservation = event.extendedProps.userId === currentUser.id;

    // Afficher les détails de la réservation
    let content = `
          <p><strong>Date:</strong> ${this.formatDate(event.start)}</p>
          <p><strong>De:</strong> ${this.formatTime(event.start)} <strong>à:</strong> ${this.formatTime(event.end)}</p>
      `;

    if (event.extendedProps.description) {
      content += `<p><strong>Note:</strong> ${event.extendedProps.description}</p>`;
    }

    // Option pour supprimer si c'est la réservation de l'utilisateur
    if (isCurrentUserReservation) {
      if (confirm(`${content}\n\nVoulez-vous supprimer cette réservation?`)) {
        this.deleteReservation(event.id);
      }
    } else {
      alert(content);
    }
  }

  // Personnaliser l'affichage des événements
  customEventContent(info) {
    const event = info.event;
    const isCurrentUserReservation = event.extendedProps.userId === window.authManager.getUser().id;
    const userName = event.extendedProps.userName || event.title.replace('Réservé par: ', '');

    // Container principal
    const container = document.createElement('div');
    container.className = 'fc-event-content-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.width = '100%';

    // En-tête avec icône utilisateur et nom
    const header = document.createElement('div');
    header.className = 'fc-event-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '2px';
    header.style.fontWeight = 'bold';

    // Icône utilisateur
    const userIcon = document.createElement('span');
    userIcon.innerHTML = isCurrentUserReservation
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
    userIcon.style.marginRight = '5px';

    // Nom d'utilisateur
    const userNameEl = document.createElement('span');
    userNameEl.textContent = isCurrentUserReservation ? 'Ma réservation' : userName;

    header.appendChild(userIcon);
    header.appendChild(userNameEl);

    // Info de temps
    const timeText = document.createElement('div');
    timeText.innerHTML = `${this.formatTime(info.event.start)} - ${this.formatTime(info.event.end)}`;
    timeText.className = 'fc-event-time';

    // Ajout des éléments au container
    container.appendChild(header);
    container.appendChild(timeText);

    // Ajouter une note si elle existe
    if (event.extendedProps.description) {
      const noteEl = document.createElement('div');
      noteEl.className = 'fc-event-description';
      noteEl.textContent = event.extendedProps.description;
      noteEl.style.fontSize = '0.9em';
      noteEl.style.fontStyle = 'italic';
      noteEl.style.overflow = 'hidden';
      noteEl.style.textOverflow = 'ellipsis';
      noteEl.style.whiteSpace = 'nowrap';
      container.appendChild(noteEl);
    }

    return { domNodes: [container] };
  }

  // Supprimer une réservation
  async deleteReservation(id) {
    if (!window.authManager.isAuthenticated()) {
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

      // Rafraîchir le calendrier
      this.calendar.refetchEvents();

      // Rafraîchir également la liste des réservations si disponible
      if (window.reservationManager) {
        window.reservationManager.loadReservations();
        window.reservationManager.updateStatus();
      }

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur de connexion au serveur');
    }
  }

  // Formater la date
  formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formater l'heure
  formatTime(date) {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Rafraîchir le calendrier
  refreshCalendar() {
    if (this.calendar) {
      this.calendar.refetchEvents();
    }
  }
}

// Exporter l'instance CalendarManager
window.calendarManager = new CalendarManager();