// Ajouter ces lignes après l'import de db
const { updateUsersTable } = require('./db/migration');

// Ajouter cette ligne après l'initialisation de l'app mais avant de définir les routes
// Mettre à jour la structure de la base de données si nécessaire
updateUsersTable().catch(err => console.error('Erreur de migration de la base de données:', err));

// Ajouter ces routes après les routes d'authentification et avant les routes de réservation

// Route pour obtenir le profil de l'utilisateur connecté
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get('SELECT id, name, email, phone, avatar, department, bio, position, theme FROM users WHERE id = ?',
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

// Route pour mettre à jour le profil de l'utilisateur
app.put('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { name, phone, department, bio, position, theme } = req.body;

  // Empêcher la modification de l'email car c'est l'identifiant de connexion
  // Pour modifier l'email, il faudrait une route spécifique avec vérification du mot de passe

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
            return res.status(500).json({ error: 'Erreur de base de données' });
          }

          res.json(user);
        }
      );
    }
  );
});

// Route pour changer le mot de passe
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Les mots de passe actuels et nouveaux sont requis' });
  }

  try {
    // Vérifier le mot de passe actuel
    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
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
          return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' });
        }

        res.json({ message: 'Mot de passe mis à jour avec succès' });
      });
    });
  } catch (error) {
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

// Ajouter cette route après les routes des réservations

// Route pour obtenir les statistiques de réservation d'un utilisateur
app.get('/api/user/stats', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const now = new Date().toISOString();

  // Obtenir toutes les réservations de l'utilisateur
  db.all(
    `SELECT id, start_time, end_time FROM reservations WHERE user_id = ?`,
    [userId],
    (err, reservations) => {
      if (err) {
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