USE anatolia_sofrasi;

-- R1. Liste des plats, entite principale du projet, tries par ordre alphabetique.
SELECT
  p.id_plat,
  p.nom,
  c.nom AS categorie,
  p.prix,
  p.disponible
FROM plat p
INNER JOIN categorie c ON c.id_categorie = p.id_categorie
ORDER BY p.nom ASC;

-- R2. Plats satisfaisant un critere numerique : prix superieur a 12 euros.
SELECT
  id_plat,
  nom,
  prix,
  temps_preparation_min
FROM plat
WHERE prix > 12.00
ORDER BY prix DESC;

-- R3. Plats lies a une categorie passee en parametre.
SET @id_categorie_recherchee = 2;
SELECT
  id_plat,
  nom,
  prix,
  niveau_piquant
FROM plat
WHERE id_categorie = @id_categorie_recherchee
ORDER BY nom ASC;

-- R4. Informations combinees de deux entites liees : plats et categories.
SELECT
  p.nom AS plat,
  c.nom AS categorie,
  p.prix,
  p.temps_preparation_min
FROM plat p
INNER JOIN categorie c ON c.id_categorie = p.id_categorie
ORDER BY c.ordre_affichage, p.nom;

-- R5. Toutes les categories, meme celles qui n'ont pas encore de plat associe.
SELECT
  c.id_categorie,
  c.nom AS categorie,
  p.nom AS plat
FROM categorie c
LEFT JOIN plat p ON p.id_categorie = c.id_categorie
ORDER BY c.ordre_affichage, p.nom;

-- R6. Chiffre d'affaires par categorie, en combinant commandes, lignes, plats et categories.
SELECT
  c.nom AS categorie,
  SUM(lc.quantite * lc.prix_unitaire) AS chiffre_affaires
FROM categorie c
INNER JOIN plat p ON p.id_categorie = c.id_categorie
INNER JOIN ligne_commande lc ON lc.id_plat = p.id_plat
INNER JOIN commande co ON co.id_commande = lc.id_commande
WHERE co.statut <> 'annulee'
GROUP BY c.id_categorie, c.nom
ORDER BY chiffre_affaires DESC;

-- R7. Nombre de plats par categorie, trie par ordre decroissant.
SELECT
  c.nom AS categorie,
  COUNT(p.id_plat) AS nombre_plats
FROM categorie c
LEFT JOIN plat p ON p.id_categorie = c.id_categorie
GROUP BY c.id_categorie, c.nom
ORDER BY nombre_plats DESC, c.nom ASC;

-- R8. Categories ayant plus de 2 plats disponibles.
SELECT
  c.nom AS categorie,
  COUNT(p.id_plat) AS plats_disponibles
FROM categorie c
INNER JOIN plat p ON p.id_categorie = c.id_categorie
WHERE p.disponible = TRUE
GROUP BY c.id_categorie, c.nom
HAVING COUNT(p.id_plat) > 2
ORDER BY plats_disponibles DESC;

-- R9. Montant moyen des commandes par type, uniquement si la moyenne depasse 20 euros.
SELECT
  totaux.type_commande,
  ROUND(AVG(totaux.total_commande), 2) AS moyenne_commande
FROM (
  SELECT
    co.id_commande,
    co.type_commande,
    SUM(lc.quantite * lc.prix_unitaire) AS total_commande
  FROM commande co
  INNER JOIN ligne_commande lc ON lc.id_commande = co.id_commande
  WHERE co.statut <> 'annulee'
  GROUP BY co.id_commande, co.type_commande
) AS totaux
GROUP BY totaux.type_commande
HAVING AVG(totaux.total_commande) > 20
ORDER BY moyenne_commande DESC;

-- R10. Prix maximum d'un plat par categorie.
SELECT
  c.nom AS categorie,
  MAX(p.prix) AS prix_maximum
FROM categorie c
INNER JOIN plat p ON p.id_categorie = c.id_categorie
GROUP BY c.id_categorie, c.nom
ORDER BY prix_maximum DESC;

-- R11. Plats dont le prix est superieur au prix moyen global des plats.
SELECT
  id_plat,
  nom,
  prix
FROM plat
WHERE prix > (
  SELECT AVG(prix)
  FROM plat
)
ORDER BY prix DESC;

-- R12. Commandes dont tous les plats associes sont actuellement disponibles.
SELECT
  co.id_commande,
  co.date_commande,
  co.type_commande,
  co.statut
FROM commande co
WHERE EXISTS (
  SELECT 1
  FROM ligne_commande lc
  WHERE lc.id_commande = co.id_commande
)
AND NOT EXISTS (
  SELECT 1
  FROM ligne_commande lc
  INNER JOIN plat p ON p.id_plat = lc.id_plat
  WHERE lc.id_commande = co.id_commande
    AND p.disponible = FALSE
)
ORDER BY co.date_commande DESC;

-- R13. Classement des clients par montant depense, avec departage par nombre de commandes puis nom.
SELECT
  RANK() OVER (
    ORDER BY SUM(lc.quantite * lc.prix_unitaire) DESC,
             COUNT(DISTINCT co.id_commande) DESC,
             cl.nom ASC,
             cl.prenom ASC
  ) AS rang,
  cl.id_client,
  CONCAT(cl.prenom, ' ', cl.nom) AS client,
  COUNT(DISTINCT co.id_commande) AS nombre_commandes,
  SUM(lc.quantite * lc.prix_unitaire) AS total_depense
FROM client cl
INNER JOIN commande co ON co.id_client = cl.id_client
INNER JOIN ligne_commande lc ON lc.id_commande = co.id_commande
WHERE co.statut <> 'annulee'
GROUP BY cl.id_client, cl.nom, cl.prenom
ORDER BY rang ASC;

-- R14. Clients ayant commande des plats dans au moins deux categories differentes.
SELECT
  cl.id_client,
  CONCAT(cl.prenom, ' ', cl.nom) AS client,
  COUNT(DISTINCT c.id_categorie) AS categories_commandees
FROM client cl
INNER JOIN commande co ON co.id_client = cl.id_client
INNER JOIN ligne_commande lc ON lc.id_commande = co.id_commande
INNER JOIN plat p ON p.id_plat = lc.id_plat
INNER JOIN categorie c ON c.id_categorie = p.id_categorie
GROUP BY cl.id_client, cl.nom, cl.prenom
HAVING COUNT(DISTINCT c.id_categorie) >= 2
ORDER BY categories_commandees DESC, client ASC;

-- R15. Pour chaque categorie, plat ayant le prix maximal ; les ex-aequo sont conserves.
SELECT
  c.nom AS categorie,
  p.nom AS plat,
  p.prix
FROM categorie c
INNER JOIN plat p ON p.id_categorie = c.id_categorie
WHERE p.prix = (
  SELECT MAX(p2.prix)
  FROM plat p2
  WHERE p2.id_categorie = c.id_categorie
)
ORDER BY c.ordre_affichage, p.nom;
