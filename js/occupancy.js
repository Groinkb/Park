// Gestion de l'analyse d'occupation
class OccupancyManager {
  constructor() {
    this.occupancyData = {};
    this.occupancyChart = null;
    this.weeklyOccupancyChart = null;
    this.timeOfDayChart = null;
    this.topUsersChart = null;         // Nouveau
    this.userMonthlyChart = null;      // Nouveau
    this.userDayOfWeekChart = null;    // Nouveau
    this.userHourlyChart = null;       // Nouveau

    // Éléments du DOM
    this.analyticsTab = null;
    this.calendarView = document.getElementById('calendarView');

    // Initialiser les onglets
    this.initAnalyticsTab();
    this.initUserAnalyticsTab();       // Nouveau

    // Initialiser les événements
    this.initEvents();
  }

  // Initialisation de l'onglet d'analyse
  initAnalyticsTab() {
    // Vérifier si l'onglet existe déjà
    if (document.getElementById('analyticsView')) {
      this.analyticsTab = document.getElementById('analyticsView');
      return;
    }

    // Créer le nouvel onglet dans la barre de navigation
    const tabs = document.querySelector('.tabs');
    if (tabs) {
      const analyticsTabButton = document.createElement('div');
      analyticsTabButton.className = 'tab';
      analyticsTabButton.setAttribute('data-tab', 'analyticsView');
      analyticsTabButton.textContent = 'Analytique';

      // Insérer avant l'onglet de profil
      const profileTab = document.querySelector('.tab[data-tab="userProfile"]');
      if (profileTab) {
        tabs.insertBefore(analyticsTabButton, profileTab);
      } else {
        tabs.appendChild(analyticsTabButton);
      }
    }

    // Créer le contenu de l'onglet
    const appSection = document.getElementById('appSection');
    if (appSection) {
      const analyticsView = document.createElement('div');
      analyticsView.id = 'analyticsView';
      analyticsView.className = 'tab-content';

      analyticsView.innerHTML = `
        <div class="calendar-container">
          <h2>Analyse du taux d'occupation</h2>
          
          <div class="view-toggle">
            <span class="view-label">Vue:</span>
            <span class="view-option active" data-chart="weekly">Semaine</span>
            <span class="view-option" data-chart="monthly">Mois</span>
            <span class="view-option" data-chart="yearly">Année</span>
            <span class="view-option" data-chart="dayOfWeek">Jours de semaine</span>
          </div>
          
          <div class="stats-chart-container">
            <canvas id="occupancyChart" height="300"></canvas>
          </div>
          
          <div class="stats-container">
            <div class="stat-card">
              <div class="stat-value" id="averageOccupancy">0%</div>
              <div class="stat-label">Taux moyen d'occupation</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value" id="mostOccupiedDay">-</div>
              <div class="stat-label">Jour le plus demandé</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value" id="peakHours">-</div>
              <div class="stat-label">Heures de pointe</div>
            </div>
          </div>
          
          <div class="stats-chart-container">
            <h4>Occupation par heure de la journée</h4>
            <canvas id="timeOfDayChart" height="200"></canvas>
          </div>
        </div>
      `;

      appSection.appendChild(analyticsView);
      this.analyticsTab = analyticsView;
    }
  }

  // Nouvelle méthode pour initialiser l'onglet des statistiques utilisateur
  initUserAnalyticsTab() {
    // Vérifier si l'onglet existe déjà
    if (document.getElementById('userStatsView')) {
      return;
    }

    // Créer le contenu de l'onglet
    const appSection = document.getElementById('appSection');
    if (appSection) {
      const userStatsView = document.createElement('div');
      userStatsView.id = 'userStatsView';
      userStatsView.className = 'tab-content';

      userStatsView.innerHTML = `
        <div class="calendar-container">
          <h2>Statistiques par utilisateur</h2>
          
          <div class="view-toggle">
            <span class="view-label">Vue:</span>
            <span class="view-option active" data-user-view="summary">Résumé</span>
            <span class="view-option" data-user-view="detailed">Détaillé</span>
          </div>
          
          <div id="userSummaryView">
            <div class="users-table-container">
              <table class="users-stats-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Département</th>
                    <th>Poste</th>
                    <th>Réservations</th>
                    <th>Heures</th>
                    <th>À venir</th>
                  </tr>
                </thead>
                <tbody id="usersStatsTableBody">
                  <tr>
                    <td colspan="6" class="loading-message">Chargement des statistiques...</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="stats-chart-container">
              <h4>Top 10 des utilisateurs par nombre de réservations</h4>
              <canvas id="topUsersChart" height="250"></canvas>
            </div>
          </div>
          
          <div id="userDetailedView" style="display: none;">
            <div class="user-selection">
              <label for="userSelect">Sélectionner un utilisateur:</label>
              <select id="userSelect" class="user-select">
                <option value="">-- Choisir un utilisateur --</option>
              </select>
              <p class="note">Note: Pour des raisons de confidentialité, vous ne pouvez voir que vos propres statistiques détaillées.</p>
            </div>
            
            <div id="userDetailedStats" class="user-detailed-stats" style="display: none;">
              <div class="stats-container">
                <div class="stat-card">
                  <div class="stat-value" id="userTotalReservations">0</div>
                  <div class="stat-label">Réservations totales</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value" id="userTotalHours">0</div>
                  <div class="stat-label">Heures totales</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value" id="userAvgDuration">0</div>
                  <div class="stat-label">Durée moyenne (h)</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value" id="userPreferredDay">-</div>
                  <div class="stat-label">Jour préféré</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value" id="userPreferredHour">-</div>
                  <div class="stat-label">Heure préférée</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value" id="userUpcomingReservations">0</div>
                  <div class="stat-label">Réservations à venir</div>
                </div>
              </div>
              
              <div class="stats-chart-container">
                <h4>Réservations par mois</h4>
                <canvas id="userMonthlyChart" height="200"></canvas>
              </div>
              
              <div class="stats-chart-container">
                <h4>Réservations par jour de semaine</h4>
                <canvas id="userDayOfWeekChart" height="200"></canvas>
              </div>
              
              <div class="stats-chart-container">
                <h4>Réservations par heure de la journée</h4>
                <canvas id="userHourlyChart" height="200"></canvas>
              </div>
              
              <div class="stats-chart-container">
                <h4>Réservations récentes</h4>
                <table class="recent-reservations-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Début</th>
                      <th>Fin</th>
                      <th>Durée</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody id="recentReservationsTableBody">
                    <tr>
                      <td colspan="5" class="empty-message">Aucune réservation récente</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;

      appSection.appendChild(userStatsView);

      // Ajouter le bouton d'onglet dans la navigation
      const tabs = document.querySelector('.tabs');
      if (tabs) {
        const userStatsTabButton = document.createElement('div');
        userStatsTabButton.className = 'tab';
        userStatsTabButton.setAttribute('data-tab', 'userStatsView');
        userStatsTabButton.textContent = 'Stats Utilisateurs';

        // Insérer avant l'onglet de profil
        const profileTab = document.querySelector('.tab[data-tab="userProfile"]');
        if (profileTab) {
          tabs.insertBefore(userStatsTabButton, profileTab);
        } else {
          tabs.appendChild(userStatsTabButton);
        }
      }

      // Initialiser les événements
      this.initUserStatsEvents();
    }
  }

  // Initialisation des écouteurs d'événements
  initEvents() {
    // Écouter les clics sur les onglets
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab')) {
        const tabName = e.target.getAttribute('data-tab');

        // Si c'est l'onglet analytique, le gérer comme avant
        if (tabName === 'analyticsView') {
          // Désactiver tous les onglets
          document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

          // Cacher tous les contenus d'onglet
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });

          // Activer l'onglet analytique
          e.target.classList.add('active');
          this.analyticsTab.classList.add('active');

          // Charger les données d'occupation
          this.loadOccupancyData();
        }
        // Pour les autres onglets, ne rien faire ici, ils sont gérés par leurs propres écouteurs
      }
    });

    // Écouter les changements de type de graphique
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('view-option')) {
        // Désactiver toutes les options
        document.querySelectorAll('.view-option').forEach(option => option.classList.remove('active'));

        // Activer l'option sélectionnée
        e.target.classList.add('active');

        // Mettre à jour le graphique
        const chartType = e.target.getAttribute('data-chart');
        this.updateOccupancyChart(chartType);
      }
    });
  }

  // Ajouter une méthode pour initialiser les événements des statistiques utilisateur
  initUserStatsEvents() {
    // Écouter les clics sur les options de vue utilisateur
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-user-view')) {
        const viewType = e.target.getAttribute('data-user-view');

        // Mettre à jour les options actives
        document.querySelectorAll('[data-user-view]').forEach(option => {
          option.classList.remove('active');
        });
        e.target.classList.add('active');

        // Afficher la vue correspondante
        if (viewType === 'summary') {
          document.getElementById('userSummaryView').style.display = 'block';
          document.getElementById('userDetailedView').style.display = 'none';
          this.loadUsersSummary();
        } else if (viewType === 'detailed') {
          document.getElementById('userSummaryView').style.display = 'none';
          document.getElementById('userDetailedView').style.display = 'block';
          this.loadUsersForSelection();
        }
      }
    });

    // Écouter les changements dans la sélection d'utilisateur
    const userSelect = document.getElementById('userSelect');
    if (userSelect) {
      userSelect.addEventListener('change', () => {
        const userId = userSelect.value;
        if (userId) {
          this.loadUserDetailedStats(userId);
        } else {
          document.getElementById('userDetailedStats').style.display = 'none';
        }
      });
    }

    // Écouter les clics sur l'onglet des statistiques utilisateur
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab') && e.target.getAttribute('data-tab') === 'userStatsView') {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

        // Cacher tous les contenus d'onglet
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });

        // Activer l'onglet des statistiques utilisateur
        e.target.classList.add('active');
        document.getElementById('userStatsView').classList.add('active');

        // Charger les données de résumé par défaut
        this.loadUsersSummary();
      }
    });
  }

  // Charger les données d'occupation
  async loadOccupancyData() {
    if (!window.authManager || !window.authManager.isAuthenticated()) {
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
      this.processOccupancyData(reservations);
      this.updateOccupancyChart('weekly');
      this.updateTimeOfDayChart(reservations);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'occupation:', error);
    }
  }

  // Traiter les données pour les analyses d'occupation
  processOccupancyData(reservations) {
    // Initialiser les structures de données
    const weeklyData = {
      labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4', 'Semaine 5'],
      morning: [0, 0, 0, 0, 0],
      afternoon: [0, 0, 0, 0, 0],
      totalHours: [0, 0, 0, 0, 0],
      possibleHours: [80, 80, 80, 80, 80] // 4 heures le matin + 4 heures l'après-midi x 5 jours ouvrés
    };

    const monthlyData = {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalHours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      possibleHours: [168, 160, 184, 168, 176, 168, 176, 176, 168, 176, 168, 176] // Heures ouvrables approx. par mois
    };

    const yearlyData = {
      labels: ['2023', '2024', '2025'],
      data: [0, 0, 0],
      totalHours: [0, 0, 0],
      possibleHours: [2080, 2080, 2080] // Heures ouvrables approx. par an
    };

    const dayOfWeekData = {
      labels: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
      data: [0, 0, 0, 0, 0, 0, 0],
      totalHours: [0, 0, 0, 0, 0, 0, 0],
      possibleHours: [8, 8, 8, 8, 8, 8, 8] // Heures ouvrables par jour
    };

    const hourlyData = Array(24).fill(0);
    const dayCount = Array(7).fill(0);

    // Variables pour les statistiques
    let totalOccupiedHours = 0;
    let totalPossibleHours = 0;

    // Traiter chaque réservation
    reservations.forEach(reservation => {
      const startTime = new Date(reservation.start_time);
      const endTime = new Date(reservation.end_time);

      // Ignorer les réservations passées de plus d'un an
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (endTime < oneYearAgo) return;

      // Calculer la durée en heures
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);

      // Déterminer l'année (relatif à l'année en cours)
      const currentYear = new Date().getFullYear();
      const yearIndex = startTime.getFullYear() - (currentYear - 2);
      if (yearIndex >= 0 && yearIndex < yearlyData.data.length) {
        yearlyData.data[yearIndex]++;
        yearlyData.totalHours[yearIndex] += durationHours;
      }

      // Déterminer le mois
      const month = startTime.getMonth();
      monthlyData.data[month]++;
      monthlyData.totalHours[month] += durationHours;

      // Déterminer la semaine du mois
      const dayOfMonth = startTime.getDate();
      const weekOfMonth = Math.floor((dayOfMonth - 1) / 7);
      if (weekOfMonth < weeklyData.morning.length) {
        // Déterminer si matin ou après-midi
        const hour = startTime.getHours();
        if (hour < 12) {
          weeklyData.morning[weekOfMonth]++;
        } else {
          weeklyData.afternoon[weekOfMonth]++;
        }
        weeklyData.totalHours[weekOfMonth] += durationHours;
      }

      // Déterminer le jour de la semaine
      const dayOfWeek = startTime.getDay(); // 0 = dimanche, 1 = lundi, ...
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir à 0 = lundi, 6 = dimanche
      dayOfWeekData.data[adjustedDayOfWeek]++;
      dayOfWeekData.totalHours[adjustedDayOfWeek] += durationHours;
      dayCount[adjustedDayOfWeek]++;

      // Compter les heures occupées
      for (let hour = startTime.getHours(); hour <= endTime.getHours(); hour++) {
        if (hour < 24) {
          hourlyData[hour]++;
        }
      }

      // Additionner pour le taux moyen
      totalOccupiedHours += durationHours;
    });

    // Calculer les taux d'occupation
    for (let i = 0; i < weeklyData.totalHours.length; i++) {
      weeklyData.totalHours[i] = (weeklyData.totalHours[i] / weeklyData.possibleHours[i]) * 100;
    }

    for (let i = 0; i < monthlyData.totalHours.length; i++) {
      monthlyData.totalHours[i] = (monthlyData.totalHours[i] / monthlyData.possibleHours[i]) * 100;
    }

    for (let i = 0; i < yearlyData.totalHours.length; i++) {
      yearlyData.totalHours[i] = (yearlyData.totalHours[i] / yearlyData.possibleHours[i]) * 100;
    }

    for (let i = 0; i < dayOfWeekData.totalHours.length; i++) {
      // Éviter division par zéro
      if (dayCount[i] > 0) {
        dayOfWeekData.totalHours[i] = (dayOfWeekData.totalHours[i] / (dayOfWeekData.possibleHours[i] * dayCount[i])) * 100;
      }
    }

    // Calculer le taux moyen d'occupation
    const workingHoursPerWeek = 40; // 8 heures x 5 jours
    const weeksPerYear = 52;
    totalPossibleHours = workingHoursPerWeek * weeksPerYear;
    const averageOccupancy = (totalOccupiedHours / totalPossibleHours) * 100;

    // Trouver le jour le plus occupé
    let maxDayIndex = 0;
    for (let i = 1; i < dayOfWeekData.totalHours.length; i++) {
      if (dayOfWeekData.totalHours[i] > dayOfWeekData.totalHours[maxDayIndex]) {
        maxDayIndex = i;
      }
    }

    // Trouver les heures de pointe
    let maxHourIndex = 0;
    for (let i = 1; i < hourlyData.length; i++) {
      if (hourlyData[i] > hourlyData[maxHourIndex]) {
        maxHourIndex = i;
      }
    }

    // Mettre à jour les statistiques
    const averageOccupancyElement = document.getElementById('averageOccupancy');
    if (averageOccupancyElement) {
      averageOccupancyElement.textContent = `${averageOccupancy.toFixed(1)}%`;
    }

    const mostOccupiedDayElement = document.getElementById('mostOccupiedDay');
    if (mostOccupiedDayElement) {
      mostOccupiedDayElement.textContent = dayOfWeekData.labels[maxDayIndex];
    }

    const peakHoursElement = document.getElementById('peakHours');
    if (peakHoursElement) {
      peakHoursElement.textContent = `${maxHourIndex}h - ${maxHourIndex + 1}h`;
    }

    // Stocker les données
    this.occupancyData = {
      weekly: weeklyData,
      monthly: monthlyData,
      yearly: yearlyData,
      dayOfWeek: dayOfWeekData,
      hourly: hourlyData
    };
  }

  // Mettre à jour le graphique d'occupation
  updateOccupancyChart(chartType) {
    const canvas = document.getElementById('occupancyChart');
    if (!canvas) return;

    // Détruire le graphique existant si présent
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }

    let chartData = {
      labels: [],
      datasets: []
    };

    switch (chartType) {
      case 'weekly':
        chartData.labels = this.occupancyData.weekly.labels;
        chartData.datasets = [
          {
            label: 'Matin (8h-12h)',
            data: this.occupancyData.weekly.morning,
            backgroundColor: 'rgba(52, 152, 219, 0.5)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1
          },
          {
            label: 'Après-midi (13h-17h)',
            data: this.occupancyData.weekly.afternoon,
            backgroundColor: 'rgba(243, 156, 18, 0.5)',
            borderColor: 'rgba(243, 156, 18, 1)',
            borderWidth: 1
          }
        ];
        break;

      case 'monthly':
        chartData.labels = this.occupancyData.monthly.labels;
        chartData.datasets = [
          {
            label: 'Taux d\'occupation (%)',
            data: this.occupancyData.monthly.totalHours,
            backgroundColor: 'rgba(46, 204, 113, 0.5)',
            borderColor: 'rgba(46, 204, 113, 1)',
            borderWidth: 1
          }
        ];
        break;

      case 'yearly':
        chartData.labels = this.occupancyData.yearly.labels;
        chartData.datasets = [
          {
            label: 'Taux d\'occupation (%)',
            data: this.occupancyData.yearly.totalHours,
            backgroundColor: 'rgba(155, 89, 182, 0.5)',
            borderColor: 'rgba(155, 89, 182, 1)',
            borderWidth: 1
          }
        ];
        break;

      case 'dayOfWeek':
        chartData.labels = this.occupancyData.dayOfWeek.labels;
        chartData.datasets = [
          {
            label: 'Taux d\'occupation (%)',
            data: this.occupancyData.dayOfWeek.totalHours,
            backgroundColor: 'rgba(231, 76, 60, 0.5)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 1
          }
        ];
        break;
    }

    // Créer le nouveau graphique
    const ctx = canvas.getContext('2d');
    this.occupancyChart = new Chart(ctx, {
      type: chartType === 'weekly' ? 'bar' : 'bar',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Taux d'occupation - ${chartType === 'weekly' ? 'Par semaine' :
              chartType === 'monthly' ? 'Par mois' :
                chartType === 'yearly' ? 'Par année' : 'Par jour de semaine'}`
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += chartType === 'weekly' ?
                    context.parsed.y.toFixed(0) :
                    context.parsed.y.toFixed(1) + '%';
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return chartType === 'weekly' ?
                  value.toFixed(0) :
                  value.toFixed(0) + '%';
              }
            }
          }
        }
      }
    });
  }

  // Mettre à jour le graphique d'occupation par heure de la journée
  updateTimeOfDayChart(reservations) {
    const canvas = document.getElementById('timeOfDayChart');
    if (!canvas) return;

    // Détruire le graphique existant si présent
    if (this.timeOfDayChart) {
      this.timeOfDayChart.destroy();
    }

    // Préparer les données d'occupation par heure
    const hourlyData = Array(24).fill(0);
    let totalReservationsByHour = 0;

    reservations.forEach(reservation => {
      const startTime = new Date(reservation.start_time);
      const endTime = new Date(reservation.end_time);

      // Calculer les heures occupées pour chaque réservation
      for (let h = startTime.getHours(); h <= endTime.getHours(); h++) {
        if (h < 24) {
          hourlyData[h]++;
          totalReservationsByHour++;
        }
      }
    });

    // Convertir en pourcentage
    const hourlyPercentage = hourlyData.map(count =>
      totalReservationsByHour > 0 ? (count / totalReservationsByHour) * 100 : 0
    );

    // Préparer les labels pour les heures
    const hourLabels = Array(24).fill().map((_, i) => `${i}h`);

    // Créer le nouveau graphique
    const ctx = canvas.getContext('2d');
    this.timeOfDayChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hourLabels,
        datasets: [{
          label: 'Taux d\'occupation (%)',
          data: hourlyPercentage,
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2,
          fillfill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Occupation par heure de la journée'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + '%';
              }
            }
          },
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 12
            }
          }
        }
      }
    });
  }

  // Charger le résumé des statistiques utilisateur
  async loadUsersSummary() {
    if (!window.authManager || !window.authManager.isAuthenticated()) {
      return;
    }

    try {
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques utilisateur');
      }

      const users = await response.json();
      this.displayUsersSummary(users);
      this.createTopUsersChart(users);
    } catch (error) {
      console.error('Erreur:', error);
      document.getElementById('usersStatsTableBody').innerHTML = `
        <tr>
          <td colspan="6" class="error-message">Erreur lors du chargement des statistiques: ${error.message}</td>
        </tr>
      `;
    }
  }

  // Afficher le résumé des statistiques utilisateur
  displayUsersSummary(users) {
    const tableBody = document.getElementById('usersStatsTableBody');
    if (!tableBody) return;

    // Trier les utilisateurs par nombre total de réservations (décroissant)
    const sortedUsers = [...users].sort((a, b) => b.stats.totalReservations - a.stats.totalReservations);

    if (sortedUsers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-message">Aucune donnée disponible</td>
        </tr>
      `;
      return;
    }

    // Générer les lignes du tableau
    let tableHtml = '';
    sortedUsers.forEach(user => {
      tableHtml += `
        <tr>
          <td>${user.name}</td>
          <td>${user.department || '-'}</td>
          <td>${user.position || '-'}</td>
          <td>${user.stats.totalReservations}</td>
          <td>${user.stats.totalHours}</td>
          <td>${user.stats.upcomingReservations}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = tableHtml;
  }

  // Créer un graphique des 10 utilisateurs les plus actifs
  createTopUsersChart(users) {
    const canvas = document.getElementById('topUsersChart');
    if (!canvas) return;

    // Détruire le graphique existant s'il y en a un
    if (this.topUsersChart) {
      this.topUsersChart.destroy();
    }

    // Trier les utilisateurs par nombre de réservations et prendre les 10 premiers
    const topUsers = [...users]
      .sort((a, b) => b.stats.totalReservations - a.stats.totalReservations)
      .slice(0, 10);

    // Préparer les données du graphique
    const labels = topUsers.map(user => user.name);
    const reservationsData = topUsers.map(user => user.stats.totalReservations);
    const hoursData = topUsers.map(user => user.stats.totalHours);

    // Créer le graphique
    const ctx = canvas.getContext('2d');
    this.topUsersChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Réservations',
            data: reservationsData,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Heures totales',
            data: hoursData,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: 'rgba(46, 204, 113, 1)',
            borderWidth: 1,
            type: 'line',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 des utilisateurs par nombre de réservations'
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre de réservations'
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Heures totales'
            }
          }
        }
      }
    });
  }

  // Charger la liste des utilisateurs pour le sélecteur
  async loadUsersForSelection() {
    if (!window.authManager || !window.authManager.isAuthenticated()) {
      return;
    }

    try {
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des utilisateurs');
      }

      const users = await response.json();

      // Remplir le sélecteur d'utilisateurs
      const userSelect = document.getElementById('userSelect');
      if (userSelect) {
        // Garder l'option par défaut
        userSelect.innerHTML = '<option value="">-- Choisir un utilisateur --</option>';

        // Pour des raisons de confidentialité, ne permettre que la sélection de l'utilisateur connecté
        const currentUser = window.authManager.getUser();

        if (currentUser) {
          const user = users.find(u => u.id === currentUser.id);
          if (user) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (Vous)`;
            userSelect.appendChild(option);
          }
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // Charger les statistiques détaillées d'un utilisateur
  async loadUserDetailedStats(userId) {
    if (!window.authManager || !window.authManager.isAuthenticated()) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/stats`, {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques détaillées');
      }

      const data = await response.json();
      this.displayUserDetailedStats(data);
    } catch (error) {
      console.error('Erreur:', error);
      document.getElementById('userDetailedStats').innerHTML = `
        <div class="error-message">
          Erreur lors du chargement des statistiques détaillées: ${error.message}
        </div>
      `;
    }
  }

  // Afficher les statistiques détaillées d'un utilisateur
  displayUserDetailedStats(data) {
    const statsContainer = document.getElementById('userDetailedStats');
    if (!statsContainer) return;

    // Afficher le conteneur
    statsContainer.style.display = 'block';

    // Mettre à jour les valeurs des statistiques
    document.getElementById('userTotalReservations').textContent = data.stats.totalReservations;
    document.getElementById('userTotalHours').textContent = data.stats.totalHours;
    document.getElementById('userAvgDuration').textContent = data.stats.avgDuration;
    document.getElementById('userPreferredDay').textContent = data.stats.preferredDay;
    document.getElementById('userPreferredHour').textContent = data.stats.preferredHour;
    document.getElementById('userUpcomingReservations').textContent = data.stats.upcomingReservations;

    // Créer les graphiques
    this.createUserMonthlyChart(data.stats.charts.monthly);
    this.createUserDayOfWeekChart(data.stats.charts.dayOfWeek);
    this.createUserHourlyChart(data.stats.charts.hourOfDay);

    // Afficher les réservations récentes
    this.displayRecentReservations(data.recentReservations);
  }

  // Créer le graphique des réservations mensuelles de l'utilisateur
  createUserMonthlyChart(monthlyData) {
    const canvas = document.getElementById('userMonthlyChart');
    if (!canvas) return;

    // Détruire le graphique existant s'il y en a un
    if (this.userMonthlyChart) {
      this.userMonthlyChart.destroy();
    }

    // Créer le graphique
    const ctx = canvas.getContext('2d');
    this.userMonthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Réservations',
          data: monthlyData.data,
          backgroundColor: 'rgba(52, 152, 219, 0.7)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  // Créer le graphique des réservations par jour de semaine de l'utilisateur
  createUserDayOfWeekChart(dayOfWeekData) {
    const canvas = document.getElementById('userDayOfWeekChart');
    if (!canvas) return;

    // Détruire le graphique existant s'il y en a un
    if (this.userDayOfWeekChart) {
      this.userDayOfWeekChart.destroy();
    }

    // Créer le graphique
    const ctx = canvas.getContext('2d');
    this.userDayOfWeekChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dayOfWeekData.labels,
        datasets: [{
          label: 'Réservations',
          data: dayOfWeekData.data,
          backgroundColor: 'rgba(155, 89, 182, 0.7)',
          borderColor: 'rgba(155, 89, 182, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  // Créer le graphique des réservations par heure de l'utilisateur
  createUserHourlyChart(hourlyData) {
    const canvas = document.getElementById('userHourlyChart');
    if (!canvas) return;

    // Détruire le graphique existant s'il y en a un
    if (this.userHourlyChart) {
      this.userHourlyChart.destroy();
    }

    // Créer le graphique
    const ctx = canvas.getContext('2d');
    this.userHourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hourlyData.labels,
        datasets: [{
          label: 'Réservations',
          data: hourlyData.data,
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          borderColor: 'rgba(46, 204, 113, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          },
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 12
            }
          }
        }
      }
    });
  }

  // Afficher les réservations récentes dans le tableau
  displayRecentReservations(reservations) {
    const tableBody = document.getElementById('recentReservationsTableBody');
    if (!tableBody) return;

    if (reservations.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-message">Aucune réservation récente</td>
        </tr>
      `;
      return;
    }

    // Formater les réservations
    let tableHtml = '';
    reservations.forEach(reservation => {
      const start = new Date(reservation.start_time);
      const end = new Date(reservation.end_time);

      // Calculer la durée
      const durationHours = (end - start) / (1000 * 60 * 60);

      // Formater les dates et heures
      const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit' };

      const dateStr = start.toLocaleDateString('fr-FR', dateOptions);
      const startTimeStr = start.toLocaleTimeString('fr-FR', timeOptions);
      const endTimeStr = end.toLocaleTimeString('fr-FR', timeOptions);

      tableHtml += `
        <tr>
          <td>${dateStr}</td>
          <td>${startTimeStr}</td>
          <td>${endTimeStr}</td>
          <td>${durationHours.toFixed(1)}h</td>
          <td>${reservation.note || '-'}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = tableHtml;
  }
}

// Initialiser le gestionnaire d'occupation
document.addEventListener('DOMContentLoaded', () => {
  window.occupancyManager = new OccupancyManager();

  // Observer les changements d'authentification
  const authObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
        mutation.target.id === 'appSection' &&
        window.getComputedStyle(mutation.target).display !== 'none') {
        // L'utilisateur vient de se connecter
        if (window.occupancyManager) {
          // Rafraîchir l'onglet d'analyse si nécessaire
          window.occupancyManager.initAnalyticsTab();
          window.occupancyManager.initUserAnalyticsTab();  // Ajout pour rafraîchir l'onglet des stats utilisateur
        }
      }
    });
  });

  // Observer les changements de style de la section principale
  if (document.getElementById('appSection')) {
    authObserver.observe(document.getElementById('appSection'), {
      attributes: true,
      attributeFilter: ['style']
    });
  }
});