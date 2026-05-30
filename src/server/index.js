import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { pingDatabase, pool } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

const allowedDishFields = [
  'nom',
  'description',
  'prix',
  'niveau_piquant',
  'vegetarien',
  'disponible',
  'temps_preparation_min',
  'id_categorie'
];

const orderStatuses = ['ouverte', 'preparee', 'servie', 'payee', 'annulee'];
const orderTypes = ['sur_place', 'a_emporter', 'livraison'];
const paymentModes = ['especes', 'carte', 'ticket_restaurant', 'en_ligne'];
const paymentStatuses = ['en_attente', 'valide', 'refuse', 'rembourse'];

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toNullableText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function toNullableInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error(`Le champ ${fieldName} est invalide.`);
    error.status = 400;
    throw error;
  }

  return parsed;
}

function parseDishPayload(body, partial = false) {
  const payload = {};

  for (const field of allowedDishFields) {
    if (Object.hasOwn(body, field)) payload[field] = body[field];
  }

  if (!partial) {
    for (const required of ['nom', 'prix', 'temps_preparation_min', 'id_categorie']) {
      if (!Object.hasOwn(payload, required) || payload[required] === '') {
        const error = new Error(`Le champ ${required} est obligatoire.`);
        error.status = 400;
        throw error;
      }
    }
  }

  if (Object.hasOwn(payload, 'nom')) payload.nom = String(payload.nom).trim();
  if (Object.hasOwn(payload, 'description')) payload.description = toNullableText(payload.description);
  if (Object.hasOwn(payload, 'prix')) payload.prix = Number(payload.prix);
  if (Object.hasOwn(payload, 'temps_preparation_min')) payload.temps_preparation_min = Number(payload.temps_preparation_min);
  if (Object.hasOwn(payload, 'id_categorie')) payload.id_categorie = Number(payload.id_categorie);
  if (Object.hasOwn(payload, 'vegetarien')) payload.vegetarien = toBoolean(payload.vegetarien);
  if (Object.hasOwn(payload, 'disponible')) payload.disponible = toBoolean(payload.disponible);

  if (payload.nom !== undefined && payload.nom.length < 2) {
    const error = new Error('Le nom du plat doit contenir au moins 2 caracteres.');
    error.status = 400;
    throw error;
  }

  if (payload.prix !== undefined && (!Number.isFinite(payload.prix) || payload.prix <= 0)) {
    const error = new Error('Le prix doit etre strictement positif.');
    error.status = 400;
    throw error;
  }

  if (
    payload.temps_preparation_min !== undefined &&
    (!Number.isInteger(payload.temps_preparation_min) ||
      payload.temps_preparation_min < 1 ||
      payload.temps_preparation_min > 180)
  ) {
    const error = new Error('Le temps de preparation doit etre compris entre 1 et 180 minutes.');
    error.status = 400;
    throw error;
  }

  if (payload.id_categorie !== undefined && (!Number.isInteger(payload.id_categorie) || payload.id_categorie < 1)) {
    const error = new Error('La categorie selectionnee est invalide.');
    error.status = 400;
    throw error;
  }

  return payload;
}

async function getDishSummary(id) {
  const [rows] = await pool.query(
    `SELECT
       p.id_plat,
       p.nom,
       p.description,
       p.prix,
       p.niveau_piquant,
       p.vegetarien,
       p.disponible,
       p.temps_preparation_min,
       p.id_categorie,
       c.nom AS categorie
     FROM plat p
     INNER JOIN categorie c ON c.id_categorie = p.id_categorie
     WHERE p.id_plat = ?`,
    [id]
  );

  return rows[0] || null;
}

async function getOrderDetail(id, connection = pool) {
  const [orders] = await connection.query(
    `SELECT
       co.id_commande,
       co.id_client,
       co.id_table,
       co.id_employe,
       co.date_commande,
       co.statut,
       co.type_commande,
       co.note,
       CONCAT(cl.prenom, ' ', cl.nom) AS client,
       tr.numero AS numero_table,
       tr.zone AS zone_table,
       CONCAT(e.prenom, ' ', e.nom) AS employe,
       COALESCE(SUM(lc.quantite), 0) AS nombre_articles,
       COALESCE(SUM(lc.quantite * lc.prix_unitaire), 0) AS total_commande
     FROM commande co
     LEFT JOIN client cl ON cl.id_client = co.id_client
     LEFT JOIN table_restaurant tr ON tr.id_table = co.id_table
     LEFT JOIN employe e ON e.id_employe = co.id_employe
     LEFT JOIN ligne_commande lc ON lc.id_commande = co.id_commande
     WHERE co.id_commande = ?
     GROUP BY
       co.id_commande,
       co.id_client,
       co.id_table,
       co.id_employe,
       co.date_commande,
       co.statut,
       co.type_commande,
       co.note,
       cl.prenom,
       cl.nom,
       tr.numero,
       tr.zone,
       e.prenom,
       e.nom`,
    [id]
  );

  if (!orders[0]) return null;

  const [lignes] = await connection.query(
    `SELECT
       lc.id_commande,
       lc.id_plat,
       p.nom AS plat,
       c.nom AS categorie,
       lc.quantite,
       lc.prix_unitaire,
       lc.commentaire,
       (lc.quantite * lc.prix_unitaire) AS total_ligne
     FROM ligne_commande lc
     INNER JOIN plat p ON p.id_plat = lc.id_plat
     INNER JOIN categorie c ON c.id_categorie = p.id_categorie
     WHERE lc.id_commande = ?
     ORDER BY c.ordre_affichage, p.nom`,
    [id]
  );

  const [paiements] = await connection.query(
    `SELECT
       id_paiement,
       id_commande,
       montant,
       mode_paiement,
       statut,
       date_paiement
     FROM paiement
     WHERE id_commande = ?`,
    [id]
  );

  return {
    commande: orders[0],
    lignes,
    paiement: paiements[0] || null
  };
}

function parseOrderPayload(body) {
  const type = body.type_commande || 'sur_place';

  if (!orderTypes.includes(type)) {
    const error = new Error('Le type de commande est invalide.');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(body.lignes) || !body.lignes.length) {
    const error = new Error('Une commande doit contenir au moins un plat.');
    error.status = 400;
    throw error;
  }

  const byDish = new Map();

  for (const line of body.lignes) {
    const idPlat = toNullableInteger(line.id_plat, 'id_plat');
    const quantite = Number(line.quantite);

    if (!idPlat || !Number.isInteger(quantite) || quantite < 1) {
      const error = new Error('Chaque ligne doit contenir un plat et une quantite positive.');
      error.status = 400;
      throw error;
    }

    const commentaire = toNullableText(line.commentaire);
    const existing = byDish.get(idPlat);

    if (existing) {
      existing.quantite += quantite;
      if (commentaire && !existing.commentaire?.includes(commentaire)) {
        existing.commentaire = existing.commentaire ? `${existing.commentaire} | ${commentaire}` : commentaire;
      }
    } else {
      byDish.set(idPlat, { id_plat: idPlat, quantite, commentaire });
    }
  }

  return {
    id_client: toNullableInteger(body.id_client, 'id_client'),
    id_table: type === 'sur_place' ? toNullableInteger(body.id_table, 'id_table') : null,
    id_employe: toNullableInteger(body.id_employe, 'id_employe'),
    type_commande: type,
    note: toNullableText(body.note),
    lignes: Array.from(byDish.values())
  };
}

app.get('/api/health', async (req, res, next) => {
  try {
    const database = await pingDatabase();
    res.json({ ok: true, database });
  } catch (error) {
    next(error);
  }
});

app.get('/api/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         c.id_categorie,
         c.nom,
         c.description,
         c.ordre_affichage,
         COUNT(p.id_plat) AS nombre_plats
       FROM categorie c
       LEFT JOIN plat p ON p.id_categorie = c.id_categorie
       GROUP BY c.id_categorie, c.nom, c.description, c.ordre_affichage
       ORDER BY c.ordre_affichage ASC, c.nom ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/references', async (req, res, next) => {
  try {
    const [clients] = await pool.query(
      `SELECT
         id_client,
         nom,
         prenom,
         telephone,
         email,
         CONCAT(prenom, ' ', nom) AS libelle
       FROM client
       ORDER BY nom ASC, prenom ASC`
    );

    const [tables] = await pool.query(
      `SELECT
         id_table,
         numero,
         capacite,
         zone,
         disponible
       FROM table_restaurant
       ORDER BY numero ASC`
    );

    const [employes] = await pool.query(
      `SELECT
         id_employe,
         nom,
         prenom,
         role,
         email,
         CONCAT(prenom, ' ', nom, ' - ', role) AS libelle
       FROM employe
       WHERE actif = TRUE
       ORDER BY role ASC, nom ASC`
    );

    res.json({ clients, tables, employes });
  } catch (error) {
    next(error);
  }
});

app.get('/api/plats', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.search) {
      conditions.push('(p.nom LIKE ? OR p.description LIKE ?)');
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    if (req.query.categorie) {
      conditions.push('p.id_categorie = ?');
      params.push(Number(req.query.categorie));
    }

    if (req.query.minPrice) {
      conditions.push('p.prix >= ?');
      params.push(Number(req.query.minPrice));
    }

    if (req.query.maxPrice) {
      conditions.push('p.prix <= ?');
      params.push(Number(req.query.maxPrice));
    }

    if (req.query.onlyAvailable === 'true') {
      conditions.push('p.disponible = TRUE');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT
         p.id_plat,
         p.nom,
         p.description,
         p.prix,
         p.niveau_piquant,
         p.vegetarien,
         p.disponible,
         p.temps_preparation_min,
         p.id_categorie,
         c.nom AS categorie
       FROM plat p
       INNER JOIN categorie c ON c.id_categorie = p.id_categorie
       ${where}
       ORDER BY c.ordre_affichage ASC, p.nom ASC`,
      params
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/plats/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const plat = await getDishSummary(id);

    if (!plat) {
      res.status(404).json({ message: 'Plat introuvable.' });
      return;
    }

    const [ingredients] = await pool.query(
      `SELECT
         i.id_ingredient,
         i.nom,
         i.allergene,
         pi.quantite,
         pi.unite,
         pi.obligatoire
       FROM plat_ingredient pi
       INNER JOIN ingredient i ON i.id_ingredient = pi.id_ingredient
       WHERE pi.id_plat = ?
       ORDER BY pi.obligatoire DESC, i.nom ASC`,
      [id]
    );

    const [commandes] = await pool.query(
      `SELECT
         co.id_commande,
         co.date_commande,
         co.type_commande,
         co.statut,
         lc.quantite,
         lc.prix_unitaire,
         CONCAT(cl.prenom, ' ', cl.nom) AS client
       FROM ligne_commande lc
       INNER JOIN commande co ON co.id_commande = lc.id_commande
       LEFT JOIN client cl ON cl.id_client = co.id_client
       WHERE lc.id_plat = ?
       ORDER BY co.date_commande DESC
       LIMIT 8`,
      [id]
    );

    const [statsRows] = await pool.query(
      `SELECT
         COALESCE(SUM(lc.quantite), 0) AS quantite_vendue,
         COALESCE(SUM(lc.quantite * lc.prix_unitaire), 0) AS chiffre_affaires
       FROM ligne_commande lc
       INNER JOIN commande co ON co.id_commande = lc.id_commande
       WHERE lc.id_plat = ?
         AND co.statut <> 'annulee'`,
      [id]
    );

    res.json({
      plat,
      ingredients,
      commandes,
      statistiques: statsRows[0]
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/plats', async (req, res, next) => {
  try {
    const payload = parseDishPayload(req.body);
    const fields = Object.keys(payload);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map((field) => payload[field]);

    const [result] = await pool.query(
      `INSERT INTO plat (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const plat = await getDishSummary(result.insertId);
    res.status(201).json(plat);
  } catch (error) {
    next(error);
  }
});

app.put('/api/plats/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const payload = parseDishPayload(req.body, true);
    const fields = Object.keys(payload);

    if (!fields.length) {
      res.status(400).json({ message: 'Aucun champ a mettre a jour.' });
      return;
    }

    const assignments = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => payload[field]);
    values.push(id);

    const [result] = await pool.query(`UPDATE plat SET ${assignments} WHERE id_plat = ?`, values);

    if (!result.affectedRows) {
      res.status(404).json({ message: 'Plat introuvable.' });
      return;
    }

    const plat = await getDishSummary(id);
    res.json(plat);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/plats/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    try {
      const [result] = await pool.query('DELETE FROM plat WHERE id_plat = ?', [id]);
      if (!result.affectedRows) {
        res.status(404).json({ message: 'Plat introuvable.' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      if (error.code !== 'ER_ROW_IS_REFERENCED_2') throw error;
      await pool.query('UPDATE plat SET disponible = FALSE WHERE id_plat = ?', [id]);
      res.json({
        archived: true,
        message: 'Le plat existe dans des commandes : il a ete rendu indisponible pour conserver l historique.'
      });
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/commandes', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.statut) {
      conditions.push('co.statut = ?');
      params.push(req.query.statut);
    }

    if (req.query.type) {
      conditions.push('co.type_commande = ?');
      params.push(req.query.type);
    }

    if (req.query.search) {
      conditions.push(
        `(CAST(co.id_commande AS CHAR) LIKE ?
          OR cl.nom LIKE ?
          OR cl.prenom LIKE ?
          OR EXISTS (
            SELECT 1
            FROM ligne_commande lc2
            INNER JOIN plat p2 ON p2.id_plat = lc2.id_plat
            WHERE lc2.id_commande = co.id_commande
              AND p2.nom LIKE ?
          ))`
      );
      params.push(
        `%${req.query.search}%`,
        `%${req.query.search}%`,
        `%${req.query.search}%`,
        `%${req.query.search}%`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT
         co.id_commande,
         co.date_commande,
         co.statut,
         co.type_commande,
         co.note,
         CONCAT(cl.prenom, ' ', cl.nom) AS client,
         tr.numero AS numero_table,
         CONCAT(e.prenom, ' ', e.nom) AS employe,
         COUNT(lc.id_plat) AS lignes,
         COALESCE(SUM(lc.quantite), 0) AS nombre_articles,
         COALESCE(SUM(lc.quantite * lc.prix_unitaire), 0) AS total_commande,
         pa.statut AS statut_paiement
       FROM commande co
       LEFT JOIN client cl ON cl.id_client = co.id_client
       LEFT JOIN table_restaurant tr ON tr.id_table = co.id_table
       LEFT JOIN employe e ON e.id_employe = co.id_employe
       LEFT JOIN ligne_commande lc ON lc.id_commande = co.id_commande
       LEFT JOIN paiement pa ON pa.id_commande = co.id_commande
       ${where}
       GROUP BY
         co.id_commande,
         co.date_commande,
         co.statut,
         co.type_commande,
         co.note,
         cl.prenom,
         cl.nom,
         tr.numero,
         e.prenom,
         e.nom,
         pa.statut
       ORDER BY co.date_commande DESC, co.id_commande DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/commandes/:id', async (req, res, next) => {
  try {
    const commande = await getOrderDetail(Number(req.params.id));

    if (!commande) {
      res.status(404).json({ message: 'Commande introuvable.' });
      return;
    }

    res.json(commande);
  } catch (error) {
    next(error);
  }
});

app.post('/api/commandes', async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const payload = parseOrderPayload(req.body);

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO commande
         (id_client, id_table, id_employe, statut, type_commande, note)
       VALUES (?, ?, ?, 'ouverte', ?, ?)`,
      [
        payload.id_client,
        payload.id_table,
        payload.id_employe,
        payload.type_commande,
        payload.note
      ]
    );

    for (const line of payload.lignes) {
      const [plats] = await connection.query(
        `SELECT id_plat, nom, prix, disponible
         FROM plat
         WHERE id_plat = ?`,
        [line.id_plat]
      );

      const plat = plats[0];

      if (!plat) {
        const error = new Error(`Le plat ${line.id_plat} est introuvable.`);
        error.status = 400;
        throw error;
      }

      if (!plat.disponible) {
        const error = new Error(`Le plat "${plat.nom}" n'est pas disponible.`);
        error.status = 400;
        throw error;
      }

      await connection.query(
        `INSERT INTO ligne_commande
           (id_commande, id_plat, quantite, prix_unitaire, commentaire)
         VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, line.id_plat, line.quantite, plat.prix, line.commentaire]
      );
    }

    await connection.commit();
    const commande = await getOrderDetail(result.insertId);
    res.status(201).json(commande);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.patch('/api/commandes/:id/statut', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const statut = req.body.statut;

    if (!orderStatuses.includes(statut)) {
      res.status(400).json({ message: 'Statut de commande invalide.' });
      return;
    }

    const [result] = await pool.query('UPDATE commande SET statut = ? WHERE id_commande = ?', [statut, id]);

    if (!result.affectedRows) {
      res.status(404).json({ message: 'Commande introuvable.' });
      return;
    }

    res.json(await getOrderDetail(id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/commandes/:id/paiement', async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const id = Number(req.params.id);
    const modePaiement = req.body.mode_paiement || 'carte';
    const statut = req.body.statut || 'valide';

    if (!paymentModes.includes(modePaiement)) {
      res.status(400).json({ message: 'Mode de paiement invalide.' });
      return;
    }

    if (!paymentStatuses.includes(statut)) {
      res.status(400).json({ message: 'Statut de paiement invalide.' });
      return;
    }

    await connection.beginTransaction();

    const detail = await getOrderDetail(id, connection);

    if (!detail) {
      res.status(404).json({ message: 'Commande introuvable.' });
      await connection.rollback();
      return;
    }

    const montant = req.body.montant === undefined || req.body.montant === ''
      ? Number(detail.commande.total_commande)
      : Number(req.body.montant);

    if (!Number.isFinite(montant) || montant <= 0) {
      res.status(400).json({ message: 'Le montant du paiement doit etre positif.' });
      await connection.rollback();
      return;
    }

    const [existing] = await connection.query('SELECT id_paiement FROM paiement WHERE id_commande = ?', [id]);

    if (existing[0]) {
      await connection.query(
        `UPDATE paiement
         SET montant = ?, mode_paiement = ?, statut = ?, date_paiement = CURRENT_TIMESTAMP
         WHERE id_commande = ?`,
        [montant, modePaiement, statut, id]
      );
    } else {
      await connection.query(
        `INSERT INTO paiement (id_commande, montant, mode_paiement, statut)
         VALUES (?, ?, ?, ?)`,
        [id, montant, modePaiement, statut]
      );
    }

    if (statut === 'valide') {
      await connection.query('UPDATE commande SET statut = ? WHERE id_commande = ?', ['payee', id]);
    }

    await connection.commit();
    res.json(await getOrderDetail(id));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.delete('/api/commandes/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE commande
       SET statut = 'annulee'
       WHERE id_commande = ?`,
      [Number(req.params.id)]
    );

    if (!result.affectedRows) {
      res.status(404).json({ message: 'Commande introuvable.' });
      return;
    }

    res.json(await getOrderDetail(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', async (req, res, next) => {
  try {
    const [[global]] = await pool.query(
      `SELECT
         COUNT(*) AS nombre_plats,
         ROUND(AVG(prix), 2) AS prix_moyen,
         MIN(prix) AS prix_minimum,
         MAX(prix) AS prix_maximum,
         SUM(disponible = TRUE) AS plats_disponibles
       FROM plat`
    );

    const [[commandesGlobal]] = await pool.query(
      `SELECT
         COUNT(*) AS nombre_commandes,
         SUM(statut IN ('ouverte', 'preparee', 'servie')) AS commandes_en_cours,
         COALESCE(SUM(CASE WHEN statut <> 'annulee' THEN total_commande ELSE 0 END), 0) AS chiffre_affaires,
         ROUND(AVG(CASE WHEN statut <> 'annulee' THEN total_commande END), 2) AS panier_moyen
       FROM (
         SELECT
           co.id_commande,
           co.statut,
           COALESCE(SUM(lc.quantite * lc.prix_unitaire), 0) AS total_commande
         FROM commande co
         LEFT JOIN ligne_commande lc ON lc.id_commande = co.id_commande
         GROUP BY co.id_commande, co.statut
       ) AS totaux`
    );

    const [classement] = await pool.query(
      `SELECT
         p.id_plat,
         p.nom,
         c.nom AS categorie,
         COALESCE(SUM(CASE WHEN co.statut <> 'annulee' THEN lc.quantite ELSE 0 END), 0) AS quantite_vendue,
         COALESCE(SUM(CASE WHEN co.statut <> 'annulee' THEN lc.quantite * lc.prix_unitaire ELSE 0 END), 0) AS chiffre_affaires
       FROM plat p
       INNER JOIN categorie c ON c.id_categorie = p.id_categorie
       LEFT JOIN ligne_commande lc ON lc.id_plat = p.id_plat
       LEFT JOIN commande co ON co.id_commande = lc.id_commande
       GROUP BY p.id_plat, p.nom, c.nom
       ORDER BY quantite_vendue DESC, chiffre_affaires DESC, p.nom ASC
       LIMIT 5`
    );

    const [categories] = await pool.query(
      `SELECT
         c.nom AS categorie,
         COUNT(p.id_plat) AS nombre_plats,
         ROUND(AVG(p.prix), 2) AS prix_moyen
       FROM categorie c
       LEFT JOIN plat p ON p.id_categorie = c.id_categorie
       GROUP BY c.id_categorie, c.nom
       ORDER BY nombre_plats DESC, c.nom ASC`
    );

    res.json({ global, commandes: commandesGlobal, classement, categories });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, _next) => {
  const status = error.status || 500;
  const message =
    error.code === 'ER_DUP_ENTRY'
      ? 'Une valeur unique existe deja en base.'
      : error.message || 'Erreur serveur.';

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ message });
});

app.listen(port, () => {
  console.log(`API Anatolia Sofrasi disponible sur http://localhost:${port}`);
});
