// Script principal de l'application
document.addEventListener('DOMContentLoaded', () => {
  // Gestion des onglets
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Désactiver tous les onglets
      tabs.forEach(t => t.classList.remove('active'));

      // Cacher tous les contenus d'onglet
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Activer l'onglet cliqué
      tab.classList.add('active');

      // Afficher le contenu de l'onglet
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(tabName).classList.add('active');

      // Redimensionner le calendrier si nécessaire
      if (tabName === 'calendarView' && window.calendarManager) {
        setTimeout(() => {
          if (window.calendarManager.calendar) {
            window.calendarManager.calendar.updateSize();
          }
        }, 100);
      }
    });
  });

  // Charger les réservations et initialiser le calendrier si l'utilisateur est authentifié
  if (window.authManager.isAuthenticated()) {
    if (window.reservationManager) {
      window.reservationManager.loadReservations();
    }

    // Initialiser le calendrier si ce n'est pas déjà fait
    if (window.calendarManager === undefined && document.getElementById('calendar')) {
      window.calendarManager = new CalendarManager();
    }
  }

  // Observer les changements d'authentification
  const authObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
        mutation.target.id === 'appSection' &&
        window.getComputedStyle(mutation.target).display !== 'none') {
        // L'utilisateur vient de se connecter
        if (window.reservationManager) {
          window.reservationManager.loadReservations();
        }

        // Initialiser ou rafraîchir le calendrier
        if (window.calendarManager === undefined && document.getElementById('calendar')) {
          window.calendarManager = new CalendarManager();
        } else if (window.calendarManager && window.calendarManager.calendar) {
          window.calendarManager.refreshCalendar();
        }
      }
    });
  });

  // Observer les changements de style de la section principale
  authObserver.observe(document.getElementById('appSection'), {
    attributes: true,
    attributeFilter: ['style']
  });

  // Synchroniser les changements entre les réservations et le calendrier
  if (window.reservationManager) {
    const originalAddReservation = window.reservationManager.addReservation;
    window.reservationManager.addReservation = async function (...args) {
      await originalAddReservation.apply(this, args);
      if (window.calendarManager) {
        window.calendarManager.refreshCalendar();
      }
    };

    const originalDeleteReservation = window.reservationManager.deleteReservation;
    window.reservationManager.deleteReservation = async function (...args) {
      await originalDeleteReservation.apply(this, args);
      if (window.calendarManager) {
        window.calendarManager.refreshCalendar();
      }
    };
  }
});