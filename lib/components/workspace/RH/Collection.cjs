const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3003;
const dbName = 'local'; // Nom de la base de données
 
 
// Utiliser le middleware CORS
app.use(cors());

// Connexion à MongoDB
const uri = 'mongodb://localhost:27017'; // Remplacez par votre URI de connexion MongoDB
const client = new MongoClient(uri);

app.get('/api/categories', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const localDb = client.db('local');
    const documentsCollection = localDb.collection('Collection'); // Utilisez la bonne collection
    const documents = await documentsCollection.find().toArray();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    await client.close();
  }
});


// Get all themes from the themes collection
app.get('/api/themes', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const themesCollection = localDb.collection('Themes'); // Utiliser la collection themes
    const themes = await themesCollection.find().toArray(); // Récupérer tous les documents
    res.json(themes); // Retourner les thèmes
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  } finally {
    await client.close(); // Fermer la connexion à MongoDB
  }
});


app.get('/api/themes-with-expert-titles', async (req, res) => {
  try {
    // Se connecter à MongoDB
    await client.connect();
    console.log('Connecté à MongoDB');
 
    const db = client.db(dbName);
    const themesCollection = db.collection('themes_collection');
    const expertParamsCollection = db.collection('expert_params');
 
    // Récupérer tous les thèmes de la collection themes_collection
    const themes = await themesCollection.find({}).toArray();
 
    // Préparer un tableau pour stocker les résultats
    const results = [];
 
    // Boucler sur chaque thème pour trouver les titres correspondants dans expert_params
    for (const theme of themes) {
      const themeTitle = theme.label;
 
      // Chercher tous les documents dans expert_params où type correspond à label, triés par date décroissante
      const expertDocs = await expertParamsCollection.find({ type: themeTitle }).sort({ date: -1 }).toArray();
 
 
      // Extraire seulement les attributs 'titre' des documents trouvés
      const expertTitles = expertDocs.map(doc => doc.titre);
 
      // Chercher le document avec la date la plus récente
      const mostRecentDoc = await expertParamsCollection.findOne(
        { type: themeTitle },
        { sort: { date: -1 } } // Trier par date descendante (du plus récent au plus ancien)
      );
 
      // Ajouter les résultats dans le tableau
      results.push({
        label: themeTitle,
        expert_titles: expertTitles,
        most_recent_title: mostRecentDoc ? mostRecentDoc.titre : null // Si le document existe, on récupère son titre
      });
    }
 
    // Envoyer les résultats sous forme de JSON
    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération des titres d\'experts :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des titres d\'experts.' });
  } finally {
    // Ne pas fermer la connexion MongoDB pour permettre à Express de continuer à répondre
  }
});
 
 

// Route pour afficher les données de la collection system prompts
app.get('/api/GetSystemPrompts', async (req, res) => {
  try {
    // Connexion à MongoDB
    await client.connect();
 
    // Sélectionner la base de données et la collection
    const db = client.db(dbName);
    const collection = db.collection('system prompts');
 
    // Récupérer toutes les données de la collection
    const SysPrompts = await collection.find({}).toArray();
 
    // Envoyer les données sous forme de JSON
    res.json(SysPrompts);
  } catch (error) {
    // En cas d'erreur, retourner une réponse d'erreur
    res.status(500).json({ message: 'Erreur lors de la récupération des invites de systeme.' });
  }
});
// Route pour afficher les données de la collection LLaVa LLM prompts
app.get('/api/GetLLaVaLLMPrompts', async (req, res) => {
  try {
    // Connexion à MongoDB
    await client.connect();
 
    // Sélectionner la base de données et la collection
    const db = client.db(dbName);
    const collection = db.collection('LLaVa LLM prompts');
 
    // Récupérer toutes les données de la collection
    const LLaVaLLMPrompts = await collection.find({}).toArray();
 
    // Envoyer les données sous forme de JSON
    res.json(LLaVaLLMPrompts);
  } catch (error) {
    // En cas d'erreur, retourner une réponse d'erreur
    res.status(500).json({ message: 'Erreur lors de la récupération des invites de LLaVa LLM.' });
  }
});
// Route pour afficher les données de la collection expert_params
app.get('/api/expert-params', async (req, res) => {
    try {
      // Connexion à MongoDB
      await client.connect();
 
      // Sélectionner la base de données et la collection
      const db = client.db(dbName);
      const collection = db.collection('expert_params');
 
      // Récupérer toutes les données de la collection
      const expertParams = await collection.find({}).toArray();
 
      // Envoyer les données sous forme de JSON
      res.json(expertParams);
    } catch (error) {
      // En cas d'erreur, retourner une réponse d'erreur
      res.status(500).json({ message: 'Erreur lors de la récupération des expert_params.' });
    }
  });
  // Route pour ajouter un nouveau thème à la collection themes_collection
app.post('/api/add-themes', async (req, res) => {
    try {
      // Se connecter à MongoDB
      await client.connect();
      console.log('Connecté à MongoDB');
 
      // Sélectionner la base de données et la collection
      const db = client.db(dbName);
      const collection = db.collection('themes_collection');
 
      // Récupérer les données du thème depuis la requête POST
      const newTheme = req.body;
 
      // Insérer le nouveau thème dans la collection
      const result = await collection.insertOne(newTheme);
 
      // Envoyer une réponse de succès
      res.status(201).json({ message: 'Thème ajouté avec succès', insertedId: result.insertedId });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du thème :', error);
      res.status(500).json({ message: 'Erreur lors de l\'ajout du thème.' });
    }
  });
 
  // Route pour ajouter des paramètres à la collection expert_params
  app.post('/api/add-params', async (req, res) => {
    try {
      // Se connecter à MongoDB
      await client.connect();
      console.log('Connecté à MongoDB');
 
      // Sélectionner la base de données et la collection
      const db = client.db(dbName);
      const collection = db.collection('expert_params');
 
      // Récupérer les paramètres depuis la requête POST
      const newParams = req.body;
   // Convertir la date au format ISO en objet Date
   if (newParams.date) {
    newParams.date = new Date(newParams.date);
  }
      // Insérer les nouveaux paramètres dans la collection
      const result = await collection.insertOne(newParams);
 
      // Envoyer une réponse de succès
      res.status(201).json({ message: 'Paramètres ajoutés avec succès', insertedId: result.insertedId });
    } catch (error) {
      console.error('Erreur lors de l\'ajout des paramètres :', error);
      res.status(500).json({ message: 'Erreur lors de l\'ajout des paramètres.' });
    }
  });
 
  app.post('/api/check-existence-config', async (req, res) => {
    try {
      await client.connect();
      console.log('Connecté à MongoDB');
 
      const db = client.db(dbName);
      const collection = db.collection('expert_params');
 
      // Récupérer le titre et le type depuis la requête POST
      const { titre, type } = req.body;
 
 
  // Vérifier si un document avec le titre (en minuscules) existe dans la collection
  const existingDocument = await collection.findOne({
    $expr: {
      $and: [
        { $eq: [{ $toLower: "$titre" }, titre.toLowerCase()] }, // Comparer en minuscules
        { $eq: [{ $toLower: "$type" }, type.toLowerCase()] } // Comparer en minuscules pour le type, si nécessaire
      ]
    }
  });
 
  // Vérifie si le document existe
  const existe = existingDocument !== null;
      // Envoyer la réponse avec la valeur booléenne
      res.status(200).json({ existe });
 
    } catch (error) {
      console.error('Erreur lors de la vérification :', error);
      res.status(500).json({ message: 'Erreur lors de la vérification de l\'existence.' });
    }
  });
 
  app.post('/api/check-existence-theme', async (req, res) => {
    try {
      await client.connect();
      console.log('Connecté à MongoDB');
 
      const db = client.db(dbName);
      const collection = db.collection('themes_collection');
 
      // Récupérer le titre et le type depuis la requête POST
      const { titre } = req.body;
 
   // Vérifier si un document avec le titre (en minuscules) existe dans la collection
   const existingDocument = await collection.findOne({
    $expr: {
      $or: [
        { $eq: [{ $toLower: "$label" }, titre.toLowerCase()] } // Titre en minuscules
      ]
    }
  });
 
  // Vérifie si le document existe
  const existe = existingDocument !== null;
 
      // Envoyer la réponse avec la valeur booléenne
      res.status(200).json({ existe });
 
    } catch (error) {
      console.error('Erreur lors de la vérification :', error);
      res.status(500).json({ message: 'Erreur lors de la vérification de l\'existence.' });
    }
  });
 
  app.post('/api/find-params-by-title', async (req, res) => {
    try {
      // Se connecter à MongoDB
      await client.connect();
     // console.log('Connecté à MongoDB');
 
      // Sélectionner la base de données et la collection
      const db = client.db(dbName);
      const collection = db.collection('expert_params');
 
      // Récupérer le "titre" depuis le corps de la requête
      const { titre } = req.body;
 
      if (!titre) {
        return res.status(400).json({ message: 'Le champ "titre" est requis dans le corps de la requête.' });
      }
 
      // Chercher dans la collection un document correspondant au "titre" fourni
      const param = await collection.findOne({ titre: titre });
      if (param) {
        // Retourner le paramètre si trouvé
        res.json(param); // Renvoyer le document trouvé
      } else {
        // Si aucun paramètre trouvé, renvoyer une réponse 404
        res.status(404).json({ message: `Aucun paramètre trouvé pour le titre : ${titre}` });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres :', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des paramètres.' });
    } finally {
      // Ne pas fermer le client ici pour permettre à Express de continuer à répondre
    }
  });



// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
