const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db/config');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète'; // Utilisez une variable d'environnement en production

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

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