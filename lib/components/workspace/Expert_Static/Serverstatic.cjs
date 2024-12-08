const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3010; // Use a different port if 3000 is in use
// Enable CORS
app.use(cors());
 
 
// Replace with your MongoDB connection string
const uri = 'mongodb://localhost:27017'; // Update this if your MongoDB is hosted elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'local'; // Nom de la base de données
const upload = multer({ dest: 'uploads/' }); // Files will be uploaded to 'uploads' directory
 
app.use(express.json());
 


// Route pour afficher les données de la collection system prompts
app.get('/api/GetSystemPrompts', async (req, res) => {
    try {
      // Connexion à MongoDB
      await client.connect();
  
      // Sélectionner la base de données et la collection
      const db = client.db("local");
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
      const db = client.db("local");
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

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });