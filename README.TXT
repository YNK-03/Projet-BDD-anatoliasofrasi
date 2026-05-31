Projet - Base de donnees avancees
Restaurant turc : Anatolia Sofrasi

1. Domaine choisi
Le projet modelise la gestion d'un restaurant turc fictif, Anatolia Sofrasi.
La base couvre la carte du restaurant, les categories de plats, les ingredients,
les clients, les tables, les reservations, les employes, les commandes, les
lignes de commande et les paiements.



2. Lancement de la base MySQL
Prerequis : MySQL 8

Execute le script : script_creation.sql

Le script cree la base anatolia_sofrasi, supprime les anciennes tables si elles
existent, recree toutes les tables, insere un jeu de donnees coherent et cree
l'utilisateur applicatif suivant :

Utilisateur : anatolia_user
Mot de passe : AnatoliaBDD2026!

Le script SQL doit etre execute avec un compte MySQL qui a les droits de creer
une base et un utilisateur, par exemple root dans MySQL Workbench.

3. Lancement de l'application web
Prerequis : Node.js 20+ et MySQL lance.

1) Le fichier .env est optionnel. Sans .env, l'application utilise automatiquement :
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=anatolia_user
   DB_PASSWORD=AnatoliaBDD2026!
   DB_NAME=anatolia_sofrasi
   API_PORT=4000
   VITE_API_URL=http://localhost:4000/api

Si votre MySQL utilise une configuration differente, copier .env.example en .env
et adapter les valeurs.

2) Installer les dependances :
   npm install

3) Demarrer l'application :
   npm run dev

4) Ouvrir :
   Frontend React : http://127.0.0.1:5173
   API Node.js    : http://localhost:4000/api/health

5. Fonctionnalites de l'application
- Ajouter un plat.
- Lister les plats.
- Rechercher par mot-cle dans le nom ou la description.
- Filtrer par categorie, prix minimal, prix maximal et disponibilite.
- Modifier un plat.
- Supprimer un plat ; s'il est deja reference par une commande, il est rendu indisponible.
- Afficher un classement des plats les plus commandes.
- Afficher le detail d'un plat avec ses ingredients et ses commandes recentes.
- Passer une commande avec plusieurs plats et quantites.
- Associer une commande a un client, une table et un employe.
- Lister et rechercher les commandes.
- Filtrer les commandes par statut et par type.
- Afficher le detail d'une commande avec ses lignes.
- Modifier le statut d'une commande : ouverte, preparee, servie, payee ou annulee.
- Encaisser une commande avec creation ou mise a jour du paiement.

6. Regles metier
R1. Un plat appartient obligatoirement a une seule categorie.
R2. Une categorie peut contenir zero, un ou plusieurs plats.
R3. Le nom d'une categorie, d'un ingredient et d'un plat est unique.
R4. Le prix d'un plat est strictement positif.
R5. Le temps de preparation d'un plat est compris entre 1 et 180 minutes.
R6. Un plat peut contenir plusieurs ingredients, et un ingredient peut composer plusieurs plats.
R7. L'association plat_ingredient porte les attributs quantite, unite et obligatoire.
R8. Le stock et le seuil d'alerte d'un ingredient ne peuvent pas etre negatifs.
R9. Une reservation concerne un client et peut etre rattachee a une table.
R10. Une table possede une capacite comprise entre 2 et 10 personnes.
R11. Une commande peut etre liee a un client, une table et un employe.
R12. Une commande contient au moins une ligne de commande dans les donnees exploitees.
R13. Une ligne de commande relie une commande et un plat avec quantite et prix_unitaire.
R14. Le prix_unitaire d'une ligne de commande conserve l'historique du prix facture.
R15. Une commande peut avoir au maximum un paiement.
R16. Un paiement possede un montant strictement positif.
R17. La suppression d'un plat deja commande est bloquee par l'integrite referentielle ; l'application le rend indisponible.
R18. La suppression d'une commande supprime ses lignes et son paiement.

7. MLD
Categorie(id_categorie, nom, description, ordre_affichage)
Ingredient(id_ingredient, nom, allergene, unite_stock, stock_actuel, seuil_alerte)
Plat(id_plat, nom, description, prix, niveau_piquant, vegetarien, disponible, temps_preparation_min, #id_categorie)
Plat_Ingredient(#id_plat, #id_ingredient, quantite, unite, obligatoire)
Client(id_client, nom, prenom, telephone, email, date_inscription)
Table_Restaurant(id_table, numero, capacite, zone, disponible)
Reservation(id_reservation, #id_client, #id_table, date_reservation, nb_personnes, statut, commentaire)
Employe(id_employe, nom, prenom, role, email, actif)
Commande(id_commande, #id_client, #id_table, #id_employe, date_commande, statut, type_commande, note)
Ligne_Commande(#id_commande, #id_plat, quantite, prix_unitaire, commentaire)
Paiement(id_paiement, #id_commande, montant, mode_paiement, statut, date_paiement)

8. Dictionnaire des donnees
Table | Attribut | Type SQL | Contraintes | Description
Categorie | id_categorie | INT | PK, AUTO_INCREMENT | Identifiant de categorie
Categorie | nom | VARCHAR(80) | NOT NULL, UNIQUE | Nom de la categorie
Categorie | description | VARCHAR(255) | NULL | Description de la categorie
Categorie | ordre_affichage | INT | NOT NULL, CHECK > 0 | Ordre dans la carte
Ingredient | id_ingredient | INT | PK, AUTO_INCREMENT | Identifiant d'ingredient
Ingredient | nom | VARCHAR(100) | NOT NULL, UNIQUE | Nom de l'ingredient
Ingredient | allergene | BOOLEAN | NOT NULL, DEFAULT FALSE | Presence d'un allergene
Ingredient | unite_stock | ENUM | NOT NULL | Unite de stockage
Ingredient | stock_actuel | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Stock courant
Ingredient | seuil_alerte | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Seuil de reapprovisionnement
Plat | id_plat | INT | PK, AUTO_INCREMENT | Identifiant de plat
Plat | nom | VARCHAR(120) | NOT NULL, UNIQUE | Nom du plat
Plat | description | TEXT | NULL | Description du plat
Plat | prix | DECIMAL(8,2) | NOT NULL, CHECK > 0 | Prix de vente
Plat | niveau_piquant | ENUM | NOT NULL | Niveau de piquant
Plat | vegetarien | BOOLEAN | NOT NULL | Indique un plat vegetarien
Plat | disponible | BOOLEAN | NOT NULL | Plat visible a la carte
Plat | temps_preparation_min | INT | NOT NULL, CHECK 1..180 | Duree de preparation
Plat | id_categorie | INT | FK, NOT NULL | Categorie du plat
Plat_Ingredient | id_plat | INT | PK, FK | Plat compose
Plat_Ingredient | id_ingredient | INT | PK, FK | Ingredient utilise
Plat_Ingredient | quantite | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Quantite necessaire
Plat_Ingredient | unite | VARCHAR(20) | NOT NULL | Unite de recette
Plat_Ingredient | obligatoire | BOOLEAN | NOT NULL | Ingredient obligatoire ou optionnel
Client | id_client | INT | PK, AUTO_INCREMENT | Identifiant de client
Client | nom | VARCHAR(80) | NOT NULL | Nom du client
Client | prenom | VARCHAR(80) | NOT NULL | Prenom du client
Client | telephone | VARCHAR(20) | NOT NULL, UNIQUE | Telephone
Client | email | VARCHAR(150) | UNIQUE | Adresse email
Client | date_inscription | DATE | NOT NULL | Date d'inscription
Table_Restaurant | id_table | INT | PK, AUTO_INCREMENT | Identifiant de table
Table_Restaurant | numero | INT | NOT NULL, UNIQUE | Numero visible en salle
Table_Restaurant | capacite | INT | NOT NULL, CHECK 2..10 | Nombre de places
Table_Restaurant | zone | ENUM | NOT NULL | Zone du restaurant
Table_Restaurant | disponible | BOOLEAN | NOT NULL | Table exploitable
Reservation | id_reservation | INT | PK, AUTO_INCREMENT | Identifiant de reservation
Reservation | id_client | INT | FK, NOT NULL | Client ayant reserve
Reservation | id_table | INT | FK, NULL | Table reservee
Reservation | date_reservation | DATETIME | NOT NULL | Date et heure de reservation
Reservation | nb_personnes | INT | NOT NULL, CHECK > 0 | Nombre de convives
Reservation | statut | ENUM | NOT NULL | Etat de la reservation
Reservation | commentaire | VARCHAR(255) | NULL | Commentaire libre
Employe | id_employe | INT | PK, AUTO_INCREMENT | Identifiant d'employe
Employe | nom | VARCHAR(80) | NOT NULL | Nom de l'employe
Employe | prenom | VARCHAR(80) | NOT NULL | Prenom de l'employe
Employe | role | ENUM | NOT NULL | Role operationnel
Employe | email | VARCHAR(150) | NOT NULL, UNIQUE | Email professionnel
Employe | actif | BOOLEAN | NOT NULL | Employe actif
Commande | id_commande | INT | PK, AUTO_INCREMENT | Identifiant de commande
Commande | id_client | INT | FK, NULL | Client associe
Commande | id_table | INT | FK, NULL | Table concernee
Commande | id_employe | INT | FK, NULL | Employe responsable
Commande | date_commande | DATETIME | NOT NULL | Horodatage de commande
Commande | statut | ENUM | NOT NULL | Etat de commande
Commande | type_commande | ENUM | NOT NULL | Sur place, a emporter ou livraison
Commande | note | VARCHAR(255) | NULL | Note operationnelle
Ligne_Commande | id_commande | INT | PK, FK | Commande concernee
Ligne_Commande | id_plat | INT | PK, FK | Plat commande
Ligne_Commande | quantite | INT | NOT NULL, CHECK > 0 | Quantite commandee
Ligne_Commande | prix_unitaire | DECIMAL(8,2) | NOT NULL, CHECK > 0 | Prix facture
Ligne_Commande | commentaire | VARCHAR(255) | NULL | Commentaire cuisine
Paiement | id_paiement | INT | PK, AUTO_INCREMENT | Identifiant de paiement
Paiement | id_commande | INT | FK, UNIQUE, NOT NULL | Commande payee
Paiement | montant | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Montant paye
Paiement | mode_paiement | ENUM | NOT NULL | Mode de paiement
Paiement | statut | ENUM | NOT NULL | Etat du paiement
Paiement | date_paiement | DATETIME | NOT NULL | Date du paiement
