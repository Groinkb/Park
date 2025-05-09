const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db/config');
const { updateUsersTable } = require('./db/migration');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète'; // Utilisez une variable d'environnement en production

// Configurer multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Créer le dossier uploads/profiles s'il n'existe pas
    const dir = path.join(__dirname, 'public/uploads/profiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique avec l'ID de l'utilisateur
    const userId = req.user.userId;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();

    // Format: user-ID-timestamp-random.extension
    cb(null, `user-${userId}-${uniqueSuffix}.${extension}`);
  }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés'), false);
  }
};

// Configurer l'upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limiter à 5MB
  }
});

// Mettre à jour la structure de la base de données si nécessaire
updateUsersTable().catch(err => console.error('Erreur de migration de la base de données:', err));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware pour gérer les CORS (si nécessaire)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes API pour l'authentification
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Vérifier si l'email existe déjà
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (row) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insérer le nouvel utilisateur
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la création du compte' });
          }

          // Générer un token JWT
          const token = jwt.sign(
            { userId: this.lastID, name, email },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.status(201).json({
            message: 'Utilisateur créé avec succès',
            token,
            user: { id: this.lastID, name, email }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Trouver l'utilisateur par email
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur de base de données' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    try {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Générer un token JWT
      const token = jwt.sign(
        { userId: user.id, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Connexion réussie',
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
});

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }

    req.user = user;
    next();
  });
}

// Routes API pour les profils utilisateurs
// Route pour obtenir le profil de l'utilisateur connecté
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  console.log('Récupération du profil pour l\'utilisateur:', userId);

  db.get('SELECT id, name, email, phone, avatar, department, bio, position, theme FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Erreur DB lors de la récupération du profil:', err);
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(user);
    }
  );
});

// Route pour mettre à jour le profil de l'utilisateur
app.put('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { name, phone, department, bio, position, theme } = req.body;

  console.log('Mise à jour du profil pour l\'utilisateur:', userId);
  console.log('Données reçues:', req.body);

  db.run(
    `UPDATE users SET 
     name = COALESCE(?, name),
     phone = COALESCE(?, phone),
     department = COALESCE(?, department),
     bio = COALESCE(?, bio),
     position = COALESCE(?, position),
     theme = COALESCE(?, theme)
     WHERE id = ?`,
    [name, phone, department, bio, position, theme, userId],
    function (err) {
      if (err) {
        console.error('Erreur DB lors de la mise à jour du profil:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Récupérer le profil mis à jour
      db.get('SELECT id, name, email, phone, avatar, department, bio, position, theme FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            console.error('Erreur DB après mise à jour du profil:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
          }

          res.json(user);
        }
      );
    }
  );
});

// Route pour télécharger une photo de profil
app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
  }

  // Chemin relatif du fichier pour stocker dans la base de données
  const avatarPath = `/public/uploads/profiles/${req.file.filename}`;

  // Mettre à jour l'avatar de l'utilisateur dans la base de données
  db.run(
    'UPDATE users SET avatar = ? WHERE id = ?',
    [avatarPath, userId],
    function (err) {
      if (err) {
        console.error('Erreur lors de la mise à jour de l\'avatar:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'avatar' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Retourner le chemin de l'avatar
      res.json({
        message: 'Avatar mis à jour avec succès',
        avatar: avatarPath
      });
    }
  );
});

// Route pour changer le mot de passe
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;

  console.log('Changement de mot de passe pour l\'utilisateur:', userId);

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Les mots de passe actuels et nouveaux sont requis' });
  }

  try {
    // Vérifier le mot de passe actuel
    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('Erreur DB lors de la vérification du mot de passe:', err);
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }

      // Hacher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function (err) {
        if (err) {
          console.error('Erreur DB lors de la mise à jour du mot de passe:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' });
        }

        res.json({ message: 'Mot de passe mis à jour avec succès' });
      });
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les informations de base d'un utilisateur spécifique (pour afficher dans les réservations)
app.get('/api/users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;

  db.get('SELECT id, name, department, position, avatar FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(user);
    }
  );
});

// Routes API pour les réservations
app.get('/api/reservations', authenticateToken, (req, res) => {
  db.all(`
    SELECT r.id, r.user_id, r.start_time, r.end_time, r.note, u.name as user_name 
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.start_time
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
    }
    res.json(rows);
  });
});

app.post('/api/reservations', authenticateToken, (req, res) => {
  const { start_time, end_time, note } = req.body;
  const userId = req.user.userId;

  // Vérifier s'il y a un conflit de réservation
  db.get(
    'SELECT * FROM reservations WHERE (start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?)',
    [end_time, start_time, end_time, start_time, start_time, end_time],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (row) {
        return res.status(400).json({ error: 'Ce créneau est déjà réservé' });
      }

      // Insérer la nouvelle réservation
      db.run(
        'INSERT INTO reservations (user_id, start_time, end_time, note) VALUES (?, ?, ?, ?)',
        [userId, start_time, end_time, note || null],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la création de la réservation' });
          }

          res.status(201).json({
            id: this.lastID,
            user_id: userId,
            start_time,
            end_time,
            note
          });
        }
      );
    }
  );
});

app.delete('/api/reservations/:id', authenticateToken, (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.userId;

  // Vérifier si l'utilisateur est autorisé à supprimer cette réservation
  db.get('SELECT * FROM reservations WHERE id = ?', [reservationId], (err, reservation) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur de base de données' });
    }

    if (!reservation) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    if (reservation.user_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé à supprimer cette réservation' });
    }

    // Supprimer la réservation
    db.run('DELETE FROM reservations WHERE id = ?', [reservationId], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la suppression de la réservation' });
      }

      res.json({ message: 'Réservation supprimée avec succès' });
    });
  });
});

// Route pour obtenir les statistiques de réservation d'un utilisateur
app.get('/api/user/stats', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const now = new Date().toISOString();

  console.log('Récupération des statistiques pour l\'utilisateur:', userId);

  // Obtenir toutes les réservations de l'utilisateur
  db.all(
    `SELECT id, start_time, end_time FROM reservations WHERE user_id = ?`,
    [userId],
    (err, reservations) => {
      if (err) {
        console.error('Erreur DB lors de la récupération des statistiques:', err);
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      // Calculer les statistiques
      const stats = {
        total: reservations.length,
        upcoming: 0,
        past: 0,
        totalHours: 0,
        monthlyCount: Array(12).fill(0)
      };

      // Année en cours
      const currentYear = new Date().getFullYear();

      reservations.forEach(reservation => {
        const startTime = new Date(reservation.start_time);
        const endTime = new Date(reservation.end_time);

        // Calculer la durée en heures
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
        stats.totalHours += durationHours;

        // Compter les réservations à venir et passées
        if (new Date(reservation.end_time) > new Date(now)) {
          stats.upcoming++;
        } else {
          stats.past++;
        }

        // Compter les réservations par mois pour l'année en cours
        if (startTime.getFullYear() === currentYear) {
          const month = startTime.getMonth();
          stats.monthlyCount[month]++;
        }
      });

      // Arrondir le total d'heures à une décimale
      stats.totalHours = parseFloat(stats.totalHours.toFixed(1));

      res.json(stats);
    }
  );
});

// Route pour obtenir le statut actuel de l'espace
app.get('/api/current-status', (req, res) => {
  const now = new Date().toISOString();

  db.get(
    `SELECT r.id, r.start_time, r.end_time, r.note, u.name as user_name 
         FROM reservations r
         JOIN users u ON r.user_id = u.id
         WHERE r.start_time <= ? AND r.end_time > ?
         LIMIT 1`,
    [now, now],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur de base de données' });
      }

      if (row) {
        res.json({
          status: 'occupied',
          reservation: row
        });
      } else {
        res.json({
          status: 'free'
        });
      }
    }
  );
});
// Route pour obtenir les données d'occupation hebdomadaire
app.get('/api/occupancy/weekly', (req, res) => {
  // Par défaut, semaine en cours
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - now.getDay() + 1); // Lundi de cette semaine
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Dimanche de cette semaine
  endDate.setHours(23, 59, 59, 999);

  // Permettre de spécifier une semaine différente
  if (req.query.startDate) {
    const customStart = new Date(req.query.startDate);
    if (!isNaN(customStart.getTime())) {
      startDate.setTime(customStart.getTime());
      endDate.setTime(customStart.getTime());
      endDate.setDate(endDate.getDate() + 6);
    }
  }

  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  // Récupérer les réservations pour cette semaine
  db.all(`
    SELECT r.id, r.user_id, r.start_time, r.end_time, r.note, u.name as user_name 
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    WHERE r.start_time >= ? AND r.end_time <= ?
    ORDER BY r.start_time
  `, [startDateStr, endDateStr], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des données d\'occupation hebdomadaire' });
    }

    // Calculer l'occupation par jour et par créneau
    const weeklyData = calculateWeeklyOccupancy(rows, startDate, endDate);

    res.json(weeklyData);
  });
});

// Route pour obtenir les données d'occupation mensuelle
app.get('/api/occupancy/monthly', (req, res) => {
  // Par défaut, mois en cours
  const now = new Date();
  const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
  const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth(); // Mois de 0 à 11

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Dernier jour du mois

  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  // Récupérer les réservations pour ce mois
  db.all(`
    SELECT r.id, r.user_id, r.start_time, r.end_time, r.note, u.name as user_name 
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    WHERE r.start_time >= ? AND r.end_time <= ?
    ORDER BY r.start_time
  `, [startDateStr, endDateStr], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des données d\'occupation mensuelle' });
    }

    // Calculer l'occupation par jour du mois
    const monthlyData = calculateMonthlyOccupancy(rows, startDate, endDate);

    res.json(monthlyData);
  });
});

// Fonction helper pour calculer les statistiques d'occupation
function calculateOccupancyStats(reservations, startDate, endDate) {
  // Initialiser les structures de données
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Lun - Dim
  const dayOfWeekHours = [0, 0, 0, 0, 0, 0, 0]; // Heures par jour de semaine
  const hourOfDayCounts = Array(24).fill(0); // Heure 0 - 23

  let totalOccupiedHours = 0;
  let totalPossibleHours = 0;

  // Calculer les heures ouvrables totales dans la période
  const daysBetween = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const workingHoursPerDay = 8; // 8 heures par jour ouvrable
  totalPossibleHours = daysBetween * workingHoursPerDay;

  // Traiter chaque réservation
  reservations.forEach(reservation => {
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);

    // Calculer la durée en heures
    const durationHours = (end - start) / (1000 * 60 * 60);
    totalOccupiedHours += durationHours;

    // Ajouter aux compteurs par jour de semaine
    const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // 0 = Lundi, 6 = Dimanche
    dayOfWeekCounts[dayOfWeek]++;
    dayOfWeekHours[dayOfWeek] += durationHours;

    // Ajouter aux compteurs par heure du jour
    const startHour = start.getHours();
    const endHour = end.getHours();
    for (let h = startHour; h <= endHour; h++) {
      if (h < 24) hourOfDayCounts[h]++;
    }
  });

  // Déterminer le jour le plus occupé
  let maxDayIndex = 0;
  for (let i = 1; i < dayOfWeekCounts.length; i++) {
    if (dayOfWeekCounts[i] > dayOfWeekCounts[maxDayIndex]) {
      maxDayIndex = i;
    }
  }

  // Déterminer l'heure la plus occupée
  let maxHourIndex = 8; // Par défaut 8h
  for (let i = 9; i < 18; i++) { // Heures de bureau (8h-18h)
    if (hourOfDayCounts[i] > hourOfDayCounts[maxHourIndex]) {
      maxHourIndex = i;
    }
  }

  // Calculer le taux d'occupation moyen
  const occupancyRate = totalPossibleHours > 0 ? (totalOccupiedHours / totalPossibleHours) * 100 : 0;

  // Noms des jours de la semaine
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  return {
    averageOccupancy: occupancyRate.toFixed(1) + '%',
    mostOccupiedDay: dayNames[maxDayIndex],
    peakHour: `${maxHourIndex}h - ${maxHourIndex + 1}h`,
    dayOfWeekData: {
      labels: dayNames,
      data: dayOfWeekHours.map(hours => parseFloat((hours / daysBetween * 7).toFixed(1)))
    },
    hourlyData: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
      data: hourOfDayCounts
    }
  };
}

// Fonction helper pour calculer l'occupation hebdomadaire
function calculateWeeklyOccupancy(reservations, startDate, endDate) {
  // Créer des tableaux pour chaque jour de la semaine
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const morningData = [0, 0, 0, 0, 0, 0, 0];
  const afternoonData = [0, 0, 0, 0, 0, 0, 0];

  // Pour chaque réservation, déterminer le jour et la partie de la journée
  reservations.forEach(reservation => {
    const start = new Date(reservation.start_time);
    const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // 0 = Lundi, 6 = Dimanche

    // Matin (avant 12h) ou après-midi?
    const hour = start.getHours();
    if (hour < 12) {
      morningData[dayOfWeek]++;
    } else {
      afternoonData[dayOfWeek]++;
    }
  });

  return {
    labels: dayNames,
    morning: morningData,
    afternoon: afternoonData,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// Fonction helper pour calculer l'occupation mensuelle
function calculateMonthlyOccupancy(reservations, startDate, endDate) {
  // Nombre de jours dans le mois
  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

  // Initialiser les données de jour
  const dailyData = Array(daysInMonth).fill(0);
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // 1, 2, 3, ...

  // Pour chaque réservation, incrémenter le jour correspondant
  reservations.forEach(reservation => {
    const start = new Date(reservation.start_time);
    const day = start.getDate() - 1; // Index 0-based
    if (day >= 0 && day < daysInMonth) {
      dailyData[day]++;
    }
  });

  // Calculer le taux d'occupation par jour
  const occupancyRate = dailyData.map(count => {
    // Ici on simplifie en supposant que chaque réservation occupe environ 2 heures
    // et qu'une journée de travail fait 8 heures
    return Math.min(100, (count * 2 / 8) * 100); // Pourcentage d'occupation
  });

  return {
    labels: labels,
    data: occupancyRate,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// Ajouter cette route à votre fichier server.js pour les statistiques par utilisateur

// Route pour obtenir les statistiques de tous les utilisateurs
app.get('/api/users/stats', authenticateToken, (req, res) => {
  // Vérifier si l'utilisateur a les droits d'administration (à personnaliser selon votre logique)
  const userId = req.user.userId;

  // Récupérer tous les utilisateurs (sauf les informations sensibles comme le mot de passe)
  db.all('SELECT id, name, email, department, position FROM users ORDER BY name', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }

    // Récupérer toutes les réservations
    db.all('SELECT id, user_id, start_time, end_time FROM reservations', (err, reservations) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
      }

      // Calculer les statistiques pour chaque utilisateur
      const now = new Date().toISOString();
      const usersWithStats = users.map(user => {
        const userReservations = reservations.filter(r => r.user_id === user.id);
        const upcoming = userReservations.filter(r => r.end_time > now).length;
        let totalHours = 0;

        userReservations.forEach(reservation => {
          const start = new Date(reservation.start_time);
          const end = new Date(reservation.end_time);
          const duration = (end - start) / (1000 * 60 * 60);
          totalHours += duration;
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department || 'Non spécifié',
          position: user.position || 'Non spécifié',
          stats: {
            totalReservations: userReservations.length,
            totalHours: parseFloat(totalHours.toFixed(1)),
            upcomingReservations: upcoming
          }
        };
      });

      res.json(usersWithStats);
    });
  });
});

// Route pour obtenir les statistiques détaillées d'un utilisateur spécifique
app.get('/api/users/:id/stats', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const requestingUserId = req.user.userId;

  // Vérifier si l'utilisateur demande ses propres statistiques ou s'il a des droits d'administration
  // Pour simplifier, nous permettons à l'utilisateur de voir ses propres statistiques uniquement
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Non autorisé à accéder à ces statistiques' });
  }

  // Récupérer les informations de l'utilisateur
  db.get('SELECT id, name, email, department, position FROM users WHERE id = ?', [targetUserId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des informations utilisateur' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer toutes les réservations de l'utilisateur
    db.all('SELECT id, start_time, end_time, note FROM reservations WHERE user_id = ? ORDER BY start_time DESC',
      [targetUserId],
      (err, reservations) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
        }

        // Calcul des statistiques détaillées
        const now = new Date();
        const stats = calculateUserDetailedStats(reservations, now);

        res.json({
          user: user,
          stats: stats,
          recentReservations: reservations.slice(0, 5) // 5 réservations les plus récentes
        });
      }
    );
  });
});

// Fonction helper pour calculer les statistiques détaillées d'un utilisateur
function calculateUserDetailedStats(reservations, currentDate) {
  // Initialiser les compteurs
  let totalReservations = reservations.length;
  let upcomingReservations = 0;
  let pastReservations = 0;
  let totalHours = 0;
  let avgDuration = 0;

  // Données pour les graphiques
  const monthlyData = Array(12).fill(0);
  const dayOfWeekData = Array(7).fill(0);
  const hourOfDayData = Array(24).fill(0);

  // Date pour filter les réservations récentes (dernier mois)
  const oneMonthAgo = new Date(currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Traiter chaque réservation
  reservations.forEach(reservation => {
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);

    // Calculer la durée
    const durationHours = (end - start) / (1000 * 60 * 60);
    totalHours += durationHours;

    // Compter les réservations à venir et passées
    if (end > currentDate) {
      upcomingReservations++;
    } else {
      pastReservations++;
    }

    // Ajouter aux données mensuelles (de l'année en cours)
    if (start.getFullYear() === currentDate.getFullYear()) {
      const month = start.getMonth();
      monthlyData[month]++;
    }

    // Ajouter aux données par jour de semaine
    const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // 0 = Lundi, 6 = Dimanche
    dayOfWeekData[dayOfWeek]++;

    // Ajouter aux données par heure 
    const hour = start.getHours();
    hourOfDayData[hour]++;
  });

  // Calculer la durée moyenne
  avgDuration = totalReservations > 0 ? totalHours / totalReservations : 0;

  // Trouver le jour de la semaine préféré
  let preferredDayIndex = 0;
  for (let i = 1; i < dayOfWeekData.length; i++) {
    if (dayOfWeekData[i] > dayOfWeekData[preferredDayIndex]) {
      preferredDayIndex = i;
    }
  }

  // Trouver l'heure préférée
  let preferredHourIndex = 0;
  for (let i = 1; i < hourOfDayData.length; i++) {
    if (hourOfDayData[i] > hourOfDayData[preferredHourIndex]) {
      preferredHourIndex = i;
    }
  }

  // Noms des jours et des mois
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return {
    totalReservations: totalReservations,
    upcomingReservations: upcomingReservations,
    pastReservations: pastReservations,
    totalHours: parseFloat(totalHours.toFixed(1)),
    avgDuration: parseFloat(avgDuration.toFixed(1)),
    preferredDay: dayNames[preferredDayIndex],
    preferredHour: `${preferredHourIndex}h00`,
    charts: {
      monthly: {
        labels: monthNames,
        data: monthlyData
      },
      dayOfWeek: {
        labels: dayNames,
        data: dayOfWeekData
      },
      hourOfDay: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
        data: hourOfDayData
      }
    }
  };
}
// Servir l'application front-end
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});