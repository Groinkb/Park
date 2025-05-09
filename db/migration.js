// Configuration pour la migration de la base de données
const db = require('./config');

// Fonction pour ajouter de nouvelles colonnes à la table des utilisateurs
function updateUsersTable() {
  return new Promise((resolve, reject) => {
    // Vérifier si les colonnes existent déjà
    db.get("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      // Ajouter les colonnes manquantes
      const alterTableQueries = [
        "ALTER TABLE users ADD COLUMN phone TEXT",
        "ALTER TABLE users ADD COLUMN avatar TEXT",
        "ALTER TABLE users ADD COLUMN department TEXT",
        "ALTER TABLE users ADD COLUMN bio TEXT",
        "ALTER TABLE users ADD COLUMN position TEXT",
        "ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'"
      ];

      // Exécuter les requêtes en série
      const executeQueries = async () => {
        for (const query of alterTableQueries) {
          try {
            await runQuery(query);
            console.log(`Executed: ${query}`);
          } catch (error) {
            // Ignorer les erreurs dues à des colonnes déjà existantes
            if (!error.message.includes('duplicate column')) {
              console.error(`Error executing ${query}:`, error);
            }
          }
        }
        resolve();
      };

      executeQueries();
    });
  });
}

// Fonction utilitaire pour exécuter des requêtes SQL en promesse
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

// Exporter la fonction pour l'utiliser dans server.js
module.exports = {
  updateUsersTable
};

// Si ce script est exécuté directement
if (require.main === module) {
  updateUsersTable()
    .then(() => {
      console.log('Migration terminée avec succès');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erreur lors de la migration :', err);
      process.exit(1);
    });
}