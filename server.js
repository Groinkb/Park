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

// Servir l'application front-end
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});