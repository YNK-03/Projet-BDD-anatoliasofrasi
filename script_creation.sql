CREATE DATABASE IF NOT EXISTS anatolia_sofrasi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'anatolia_user'@'localhost'
  IDENTIFIED BY 'AnatoliaBDD2026!';

ALTER USER 'anatolia_user'@'localhost'
  IDENTIFIED BY 'AnatoliaBDD2026!';

CREATE USER IF NOT EXISTS 'anatolia_user'@'127.0.0.1'
  IDENTIFIED BY 'AnatoliaBDD2026!';

ALTER USER 'anatolia_user'@'127.0.0.1'
  IDENTIFIED BY 'AnatoliaBDD2026!';

GRANT ALL PRIVILEGES ON anatolia_sofrasi.* TO 'anatolia_user'@'localhost';
GRANT ALL PRIVILEGES ON anatolia_sofrasi.* TO 'anatolia_user'@'127.0.0.1';
FLUSH PRIVILEGES;

USE anatolia_sofrasi;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS paiement;
DROP TABLE IF EXISTS ligne_commande;
DROP TABLE IF EXISTS commande;
DROP TABLE IF EXISTS reservation;
DROP TABLE IF EXISTS plat_ingredient;
DROP TABLE IF EXISTS plat;
DROP TABLE IF EXISTS ingredient;
DROP TABLE IF EXISTS categorie;
DROP TABLE IF EXISTS table_restaurant;
DROP TABLE IF EXISTS client;
DROP TABLE IF EXISTS employe;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE categorie (
  id_categorie INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255),
  ordre_affichage INT NOT NULL DEFAULT 1,
  CHECK (ordre_affichage > 0)
) ENGINE=InnoDB;

CREATE TABLE ingredient (
  id_ingredient INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  allergene BOOLEAN NOT NULL DEFAULT FALSE,
  unite_stock ENUM('g', 'kg', 'piece', 'l') NOT NULL,
  stock_actuel DECIMAL(10,2) NOT NULL DEFAULT 0,
  seuil_alerte DECIMAL(10,2) NOT NULL DEFAULT 0,
  CHECK (stock_actuel >= 0),
  CHECK (seuil_alerte >= 0)
) ENGINE=InnoDB;

CREATE TABLE plat (
  id_plat INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  prix DECIMAL(8,2) NOT NULL,
  niveau_piquant ENUM('aucun', 'doux', 'moyen', 'fort') NOT NULL DEFAULT 'aucun',
  vegetarien BOOLEAN NOT NULL DEFAULT FALSE,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  temps_preparation_min INT NOT NULL,
  id_categorie INT NOT NULL,
  CHECK (prix > 0),
  CHECK (temps_preparation_min BETWEEN 1 AND 180),
  CONSTRAINT fk_plat_categorie
    FOREIGN KEY (id_categorie)
    REFERENCES categorie(id_categorie)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE plat_ingredient (
  id_plat_ingredient INT AUTO_INCREMENT,
  id_plat INT NOT NULL,
  id_ingredient INT NOT NULL,
  quantite DECIMAL(10,2) NOT NULL,
  unite VARCHAR(20) NOT NULL,
  obligatoire BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_plat_ingredient),
  CHECK (quantite > 0),
  CONSTRAINT fk_plat_ingredient_plat
    FOREIGN KEY (id_plat)
    REFERENCES plat(id_plat)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_plat_ingredient_ingredient
    FOREIGN KEY (id_ingredient)
    REFERENCES ingredient(id_ingredient)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE client (
  id_client INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,
  date_inscription DATE NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

CREATE TABLE table_restaurant (
  id_table INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL UNIQUE,
  capacite INT NOT NULL,
  zone ENUM('salle', 'terrasse', 'salon_prive') NOT NULL DEFAULT 'salle',
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (capacite BETWEEN 2 AND 10)
) ENGINE=InnoDB;

CREATE TABLE reservation (
  id_reservation INT AUTO_INCREMENT PRIMARY KEY,
  id_client INT NOT NULL,
  id_table INT,
  date_reservation DATETIME NOT NULL,
  nb_personnes INT NOT NULL,
  statut ENUM('prevue', 'confirmee', 'annulee', 'honoree') NOT NULL DEFAULT 'prevue',
  commentaire VARCHAR(255),
  CHECK (nb_personnes > 0),
  CONSTRAINT fk_reservation_client
    FOREIGN KEY (id_client)
    REFERENCES client(id_client)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reservation_table
    FOREIGN KEY (id_table)
    REFERENCES table_restaurant(id_table)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE employe (
  id_employe INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  role ENUM('serveur', 'cuisinier', 'manager', 'caissier') NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  actif BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE commande (
  id_commande INT AUTO_INCREMENT PRIMARY KEY,
  id_client INT,
  id_table INT,
  id_employe INT,
  date_commande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut ENUM('ouverte', 'preparee', 'servie', 'payee', 'annulee') NOT NULL DEFAULT 'ouverte',
  type_commande ENUM('sur_place', 'a_emporter', 'livraison') NOT NULL,
  note VARCHAR(255),
  CONSTRAINT fk_commande_client
    FOREIGN KEY (id_client)
    REFERENCES client(id_client)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_commande_table
    FOREIGN KEY (id_table)
    REFERENCES table_restaurant(id_table)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_commande_employe
    FOREIGN KEY (id_employe)
    REFERENCES employe(id_employe)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ligne_commande (
  id_ligne_commande INT AUTO_INCREMENT PRIMARY KEY,
  id_commande INT NOT NULL,
  id_plat INT NOT NULL,
  quantite INT NOT NULL,
  prix_unitaire DECIMAL(8,2) NOT NULL,
  commentaire VARCHAR(255),
  CHECK (quantite > 0),
  CHECK (prix_unitaire > 0),
  CONSTRAINT fk_ligne_commande_commande
    FOREIGN KEY (id_commande)
    REFERENCES commande(id_commande)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_ligne_commande_plat
    FOREIGN KEY (id_plat)
    REFERENCES plat(id_plat)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE paiement (
  id_paiement INT AUTO_INCREMENT PRIMARY KEY,
  id_commande INT NOT NULL UNIQUE,
  montant DECIMAL(10,2) NOT NULL,
  mode_paiement ENUM('especes', 'carte', 'ticket_restaurant', 'en_ligne') NOT NULL,
  statut ENUM('en_attente', 'valide', 'refuse', 'rembourse') NOT NULL DEFAULT 'en_attente',
  date_paiement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (montant > 0),
  CONSTRAINT fk_paiement_commande
    FOREIGN KEY (id_commande)
    REFERENCES commande(id_commande)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO categorie (nom, description, ordre_affichage) VALUES
('Entrees', 'Soupes, mezze et specialites froides pour commencer le repas.', 1),
('Grillades', 'Brochettes et viandes grillees au charbon.', 2),
('Pides et lahmacun', 'Pates fines turques cuites au four.', 3),
('Plats mijotes', 'Recettes traditionnelles servies en assiette.', 4),
('Desserts', 'Patisseries et desserts turcs.', 5),
('Boissons', 'Boissons fraiches et chaudes.', 6);

INSERT INTO ingredient (nom, allergene, unite_stock, stock_actuel, seuil_alerte) VALUES
('Lentilles corail', FALSE, 'kg', 18.00, 4.00),
('Yaourt', TRUE, 'kg', 12.50, 3.00),
('Aubergine', FALSE, 'kg', 20.00, 5.00),
('Tomate', FALSE, 'kg', 25.00, 5.00),
('Poivron', FALSE, 'kg', 14.00, 3.00),
('Agneau hache', FALSE, 'kg', 16.00, 4.00),
('Poulet', FALSE, 'kg', 22.00, 5.00),
('Boeuf', FALSE, 'kg', 13.00, 3.00),
('Boulgour', FALSE, 'kg', 30.00, 6.00),
('Pate a pide', TRUE, 'piece', 80.00, 20.00),
('Fromage kasar', TRUE, 'kg', 9.00, 2.00),
('Sucuk', FALSE, 'kg', 7.50, 1.50),
('Pistache', TRUE, 'kg', 4.00, 1.00),
('Miel', FALSE, 'kg', 8.00, 1.00),
('Oignon', FALSE, 'kg', 18.00, 4.00),
('Persil', FALSE, 'kg', 3.00, 0.50),
('Menthe', FALSE, 'kg', 2.50, 0.50),
('The noir', FALSE, 'kg', 3.00, 0.50),
('Lait', TRUE, 'l', 18.00, 4.00),
('Beurre', TRUE, 'kg', 6.00, 1.00);

INSERT INTO plat (nom, description, prix, niveau_piquant, vegetarien, disponible, temps_preparation_min, id_categorie) VALUES
('Mercimek corbasi', 'Soupe de lentilles corail, menthe et citron.', 6.50, 'aucun', TRUE, TRUE, 10, 1),
('Meze anatolien', 'Assortiment de houmous, aubergine grillee et yaourt aux herbes.', 9.90, 'doux', TRUE, TRUE, 12, 1),
('Adana kebap', 'Brochette d agneau hache epicee, boulgour et salade.', 13.90, 'fort', FALSE, TRUE, 18, 2),
('Iskender kebap', 'Lamelles de boeuf, pain grille, yaourt et sauce tomate.', 16.50, 'moyen', FALSE, TRUE, 20, 2),
('Tavuk sis', 'Brochettes de poulet marinees, boulgour et legumes.', 12.90, 'doux', FALSE, TRUE, 17, 2),
('Lahmacun', 'Fine pate garnie de viande hachee, tomate et persil.', 8.50, 'moyen', FALSE, TRUE, 9, 3),
('Pide fromage sucuk', 'Pide au fromage kasar et saucisson turc.', 11.50, 'doux', FALSE, TRUE, 14, 3),
('Imam bayildi', 'Aubergine farcie aux legumes et huile d olive.', 12.00, 'aucun', TRUE, TRUE, 22, 4),
('Manti', 'Raviolis turcs au yaourt, beurre et menthe.', 14.00, 'doux', FALSE, TRUE, 24, 4),
('Baklava pistache', 'Feuillete croustillant au miel et a la pistache.', 6.90, 'aucun', TRUE, TRUE, 8, 5),
('Kunefe', 'Dessert chaud au fromage, miel et pistache.', 7.50, 'aucun', TRUE, TRUE, 12, 5),
('Ayran maison', 'Boisson fraiche au yaourt legerement salee.', 3.20, 'aucun', TRUE, TRUE, 3, 6),
('The turc', 'The noir infuse en double theiere.', 2.80, 'aucun', TRUE, TRUE, 4, 6);

INSERT INTO plat_ingredient (id_plat, id_ingredient, quantite, unite, obligatoire) VALUES
(1, 1, 0.18, 'kg', TRUE), (1, 17, 0.01, 'kg', TRUE),
(2, 2, 0.12, 'kg', TRUE), (2, 3, 0.20, 'kg', TRUE), (2, 16, 0.02, 'kg', FALSE),
(3, 6, 0.22, 'kg', TRUE), (3, 9, 0.16, 'kg', TRUE), (3, 15, 0.03, 'kg', TRUE),
(4, 8, 0.20, 'kg', TRUE), (4, 2, 0.10, 'kg', TRUE), (4, 4, 0.08, 'kg', TRUE),
(5, 7, 0.24, 'kg', TRUE), (5, 9, 0.16, 'kg', TRUE), (5, 5, 0.08, 'kg', TRUE),
(6, 10, 1.00, 'piece', TRUE), (6, 6, 0.12, 'kg', TRUE), (6, 16, 0.01, 'kg', FALSE),
(7, 10, 1.00, 'piece', TRUE), (7, 11, 0.11, 'kg', TRUE), (7, 12, 0.07, 'kg', TRUE),
(8, 3, 0.30, 'kg', TRUE), (8, 4, 0.10, 'kg', TRUE), (8, 15, 0.04, 'kg', TRUE),
(9, 2, 0.12, 'kg', TRUE), (9, 20, 0.03, 'kg', TRUE), (9, 17, 0.01, 'kg', TRUE),
(10, 13, 0.05, 'kg', TRUE), (10, 14, 0.04, 'kg', TRUE), (10, 20, 0.03, 'kg', TRUE),
(11, 11, 0.08, 'kg', TRUE), (11, 13, 0.04, 'kg', TRUE), (11, 14, 0.03, 'kg', TRUE),
(12, 2, 0.16, 'kg', TRUE),
(13, 18, 0.01, 'kg', TRUE);

INSERT INTO client (nom, prenom, telephone, email, date_inscription) VALUES
('Martin', 'Julie', '0601010101', 'julie.martin@example.fr', '2026-01-12'),
('Benali', 'Karim', '0602020202', 'karim.benali@example.fr', '2026-01-20'),
('Durand', 'Nina', '0603030303', 'nina.durand@example.fr', '2026-02-03'),
('Ozdemir', 'Leyla', '0604040404', 'leyla.ozdemir@example.fr', '2026-02-18'),
('Petit', 'Hugo', '0605050505', 'hugo.petit@example.fr', '2026-03-01'),
('Moreau', 'Sofia', '0606060606', 'sofia.moreau@example.fr', '2026-03-16'),
('Yilmaz', 'Emre', '0607070707', 'emre.yilmaz@example.fr', '2026-04-02');

INSERT INTO table_restaurant (numero, capacite, zone, disponible) VALUES
(1, 2, 'salle', TRUE),
(2, 4, 'salle', TRUE),
(3, 4, 'terrasse', TRUE),
(4, 6, 'terrasse', TRUE),
(5, 2, 'salle', TRUE),
(6, 8, 'salon_prive', TRUE),
(7, 10, 'salon_prive', TRUE),
(8, 4, 'salle', TRUE);

INSERT INTO reservation (id_client, id_table, date_reservation, nb_personnes, statut, commentaire) VALUES
(1, 2, '2026-05-29 19:30:00', 4, 'confirmee', 'Anniversaire'),
(2, 3, '2026-05-29 20:00:00', 3, 'prevue', NULL),
(4, 6, '2026-05-30 21:00:00', 7, 'confirmee', 'Demande chaise bebe'),
(5, 1, '2026-05-30 12:30:00', 2, 'prevue', NULL),
(7, 7, '2026-06-01 20:30:00', 9, 'prevue', 'Groupe entreprise');

INSERT INTO employe (nom, prenom, role, email, actif) VALUES
('Aydin', 'Murat', 'manager', 'murat.aydin@anatolia.local', TRUE),
('Kara', 'Selin', 'serveur', 'selin.kara@anatolia.local', TRUE),
('Demir', 'Can', 'cuisinier', 'can.demir@anatolia.local', TRUE),
('Arslan', 'Ece', 'caissier', 'ece.arslan@anatolia.local', TRUE);

INSERT INTO commande (id_client, id_table, id_employe, date_commande, statut, type_commande, note) VALUES
(1, 2, 2, '2026-05-24 12:18:00', 'payee', 'sur_place', 'Service midi'),
(2, 3, 2, '2026-05-24 20:12:00', 'payee', 'sur_place', NULL),
(3, NULL, 4, '2026-05-25 19:45:00', 'payee', 'a_emporter', 'Sans couverts'),
(4, 6, 2, '2026-05-26 21:05:00', 'payee', 'sur_place', NULL),
(5, NULL, 4, '2026-05-27 12:05:00', 'preparee', 'livraison', 'Livrer apres 12h30'),
(6, 4, 2, '2026-05-27 20:40:00', 'payee', 'sur_place', NULL),
(7, NULL, 4, '2026-05-28 11:55:00', 'ouverte', 'a_emporter', 'Client attend sur place'),
(2, 8, 2, '2026-05-28 13:10:00', 'servie', 'sur_place', NULL);

INSERT INTO ligne_commande (id_commande, id_plat, quantite, prix_unitaire, commentaire) VALUES
(1, 1, 2, 6.50, NULL),
(1, 3, 2, 13.90, 'Bien grille'),
(1, 12, 2, 3.20, NULL),
(2, 2, 1, 9.90, NULL),
(2, 4, 2, 16.50, NULL),
(2, 13, 2, 2.80, NULL),
(3, 6, 3, 8.50, 'Citron supplementaire'),
(3, 10, 2, 6.90, NULL),
(4, 5, 4, 12.90, NULL),
(4, 11, 3, 7.50, NULL),
(4, 13, 4, 2.80, NULL),
(5, 8, 1, 12.00, NULL),
(5, 12, 1, 3.20, NULL),
(6, 7, 2, 11.50, NULL),
(6, 9, 1, 14.00, NULL),
(6, 10, 2, 6.90, NULL),
(7, 6, 2, 8.50, NULL),
(8, 3, 1, 13.90, NULL),
(8, 5, 1, 12.90, NULL),
(8, 13, 2, 2.80, NULL);

INSERT INTO paiement (id_commande, montant, mode_paiement, statut, date_paiement) VALUES
(1, 47.20, 'carte', 'valide', '2026-05-24 13:02:00'),
(2, 48.50, 'ticket_restaurant', 'valide', '2026-05-24 21:05:00'),
(3, 39.30, 'en_ligne', 'valide', '2026-05-25 19:50:00'),
(4, 85.30, 'carte', 'valide', '2026-05-26 22:05:00'),
(5, 15.20, 'en_ligne', 'en_attente', '2026-05-27 12:06:00'),
(6, 50.80, 'especes', 'valide', '2026-05-27 21:22:00');
