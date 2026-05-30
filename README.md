# Anatolia Sofrasi - Lancement

Application web React + API Node.js connectee a une base MySQL.

## Prerequis

- MySQL 8.x
- MySQL Workbench ou le client `mysql`
- Node.js 20+
- npm

## 1. Creer la base de donnees

### Avec MySQL Workbench

1. Ouvrir MySQL Workbench.
2. Se connecter avec un compte ayant les droits administrateur, par exemple `root`.
3. Ouvrir le fichier `script_creation.sql`.
4. Executer tout le script.

Le script cree :

- la base `anatolia_sofrasi`
- les tables
- les donnees de test
- l'utilisateur applicatif `anatolia_user`

Identifiants crees pour l'application :

```env
DB_USER=anatolia_user
DB_PASSWORD=AnatoliaBDD2026!
```

### Avec le terminal

Depuis le dossier du projet :

```bash
mysql -u root -p < script_creation.sql
```

## 2. Configurer l'application

Le fichier `.env` n'est pas obligatoire si vous utilisez les identifiants crees par le script SQL.

Configuration par defaut :

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=anatolia_user
DB_PASSWORD=AnatoliaBDD2026!
DB_NAME=anatolia_sofrasi
API_PORT=4000
VITE_API_URL=http://localhost:4000/api
```

Si votre configuration MySQL est differente, copier `.env.example` en `.env` puis modifier les valeurs.

## 3. Installer les dependances

```bash
npm install
```

## 4. Lancer l'application

```bash
npm run dev
```

Adresses :

```text
Application React : http://127.0.0.1:5173
API Node.js       : http://localhost:4000/api/health
```

## 5. Verification rapide

Dans le navigateur, ouvrir :

```text
http://localhost:4000/api/health
```

Si la connexion MySQL fonctionne, l'API retourne une reponse JSON avec le nom de la base `anatolia_sofrasi`.
