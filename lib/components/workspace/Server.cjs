const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000; // Use a different port if 3000 is in use
// Enable CORS
app.use(cors());


// Replace with your MongoDB connection string
//const uri = 'mongodb://localhost:27017'; // Update this if your MongoDB is hosted elsewhere
const uri = 'mongodb://weensight:Weensight%40%40123@20.84.80.6:27017/?authSource=weensight';
// Database name
const dbName = 'weensight';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//const dbName = 'local'; // Nom de la base de données
const upload = multer({ dest: 'uploads/' }); // Files will be uploaded to 'uploads' directory
// MongoDB connection URI
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Hello World!');
});
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


app.get('/api/themes-with-expert-titles', async (req, res) => {
  try {
    // Se connecter à MongoDB
    await client.connect();
    console.log('Connecté à MongoDB');

    const db = client.db(dbName);
    const themesCollection = db.collection('themes_collections');
    const expertParamsCollection = db.collection('expert_params');

    // Récupérer tous les thèmes de la collection themes_collections
    const themes = await themesCollection.find({}).toArray();

    // Préparer un tableau pour stocker les résultats
    const results = [];

    // Boucler sur chaque thème pour trouver les titres correspondants dans expert_params
    for (const theme of themes) {
      const themeTitle = theme.theme_title;

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


// Route pour afficher les données de la collection themes_collections
app.get('/api/themes', async (req, res) => {
    try {
      // Se connecter à MongoDB et récupérer les données en une seule action
      await client.connect();
      console.log('Connecté à MongoDB');

      const db = client.db(dbName);
      const collection = db.collection('themes_collections');

      // Récupérer toutes les données de la collection
      const themes = await collection.find({}).toArray();

      // Envoyer les données sous forme de JSON
      res.json(themes);
    } catch (error) {
      console.error('Erreur lors de la récupération des thèmes :', error);
      // En cas d'erreur, retourner une réponse d'erreur
      res.status(500).json({ message: 'Erreur lors de la récupération des thèmes.' });
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
  // Route pour ajouter un nouveau thème à la collection themes_collections
app.post('/api/add-themes', async (req, res) => {
    try {
      // Se connecter à MongoDB
      await client.connect();
      console.log('Connecté à MongoDB');

      // Sélectionner la base de données et la collection
      const db = client.db(dbName);
      const collection = db.collection('themes_collections');

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
      const collection = db.collection('themes_collections');

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
	// Create a new document and upload multiple files
app.post('/documents', upload.array('files'), async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const documentsCollection = localDb.collection('RH'); // Use the RH collection

    // Prepare the document data, including multiple files
    const newDocument = {
      nom: req.body.nom,
      prenom: req.body.prenom,
      documents: req.files.map(file => ({
        nomDocument: file.originalname,
        content: fs.readFileSync(path.join(__dirname, 'uploads', file.filename))
      })),
    };

    const result = await documentsCollection.insertOne(newDocument);
    res.status(201).json({ message: 'Document created successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  } finally {
    await client.close();
    // Remove all uploaded files after processing
    req.files.forEach(file => fs.unlinkSync(path.join(__dirname, 'uploads', file.filename)));
  }
});

app.get('/api/getGroups', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const groupsCollection = localDb.collection('Groups'); 
    const groups = await groupsCollection.find().toArray();
    res.json(groups);

  }catch (error) 
  {console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }finally {
    await client.close();
  }
  });
// Route to insert a new group
app.post('/api/group_insert', async (req, res) => {
  const newGroup = req.body; // Le corps de la requête doit contenir le nouveau group à insérer

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    // Connect to the 'Job_sheet' collection
    const GroupCollection = localDb.collection('Groups');

    // Insertion du nouveau group dans la collection
    const result = await GroupCollection.insertOne(newGroup);

    if (result.insertedId) {
      console.log('group inserted successfully');
    } else {
      res.status(500).json({ error: 'Failed to insert group' });
    }
  } catch (error) {
    console.error('Error inserting group:', error);
    res.status(500).json({ error: 'Failed to insert group' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});


  app.get('/api/getCollections', async (req, res) => {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
  
      const localDb = client.db('local');
      const DprtCollection = localDb.collection('DepartmentsCollections');
      const DepartColls = await DprtCollection.find().toArray();
      res.json(DepartColls);
  console.log(DepartColls);
    }catch (error) 
    {console.error('Error fetching collections:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }finally {
      await client.close();
    }
    });

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const documentsCollection = localDb.collection('RH'); // Use the RH collection
    const documents = await documentsCollection.find().toArray();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    await client.close();
  }
});




app.delete('/api/documents/name/:name', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const documentsCollection = localDb.collection('RH');

    const { name } = req.params; // This is the document name we're trying to delete
    const result = await documentsCollection.deleteOne({ nomDocument: name }); // Use nomDocument field

    if (result.deletedCount === 1) {
      res.json({ message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  } finally {
    await client.close();
  }
});



// Get a CV document by its nomDocument
app.get('/api/documents/name/:nomDocument', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const documentsCollection = localDb.collection('RH'); // Use the RH collection

    const { nomDocument } = req.params;

    // Find the document by nomDocument
    const document = await documentsCollection.findOne({ nomDocument });

    if (document) {
      // Convert the binary data to base64
      const base64Data = document.document.toString('base64');

      // Send the base64 data as JSON response
      res.json({
        message: 'Document retrieved successfully',
        document: base64Data,
        nom: document.nom,
        prenom: document.prenom
      });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Error retrieving document:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  } finally {
    await client.close();
  }
});
// Route to fetch 'Job_sheet' jobs
app.get('/topics_sheet', async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB for each request
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');

    // Query the 'Job_sheet' collection
    const Job_sheetCollection = localDb.collection('Internship_sheet');
    const jobs = await Job_sheetCollection.find().toArray();
   // console.log('Jobs data:', jobs); // Ajoutez cette ligne pour afficher les données des emplois

    res.json(jobs);
    console.log('Topics data retrieved successfully');
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});

// Route to insert a new topic
app.post('/topic_insert', async (req, res) => {
  const newTopic = req.body; // Le corps de la requête doit contenir le nouveau topic à insérer

  try {
    await client.connect(); // Connect to MongoDB for each request
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');

    // Connect to the 'Internship_sheet' collection
    const Internship_sheetCollection = localDb.collection('Internship_sheet');

    // Insertion du nouveau topic dans la collection
    const result = await Internship_sheetCollection.insertOne(newTopic);

    if (result.insertedId) {
      res.status(201).json({ message: 'Topic inserted successfully', topicId: result.insertedId });
      console.log('Topic inserted successfully');
    } else {
      res.status(500).json({ error: 'Failed to insert topic' });
    }
  } catch (error) {
    console.error('Error inserting topic:', error);
    res.status(500).json({ error: 'Failed to insert topic' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});


// Route to update a Topic by 'reference' field
app.put('/updateTopicByReference', async (req, res) => {
  const { reference, post_name, mandatory_skills, optional_skils, duration, nb_profiles, qualifications, description} = req.body;

  try {
    await client.connect(); // Connect to MongoDB
    console.log('Connected to MongoDB');

    // Connect to the 'local' database and 'Internship_sheet' collection
    const localDb = client.db('local');
    const Internship_sheetCollection = localDb.collection('Internship_sheet');

    // Cherche l'élément par la référence et met à jour les champs correspondants
    const result = await Internship_sheetCollection.updateOne(
      { reference: reference }, // Cherche par la référence
      {
        $set: {
          post_name: post_name,
          mandatory_skills: mandatory_skills,
          optional_skills: optional_skils, // Correction orthographique ici
          duration:duration,
          nb_profiles:nb_profiles,
          description:description,
          qualifications: qualifications
        }
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Topic not found with the given reference' });
    } else {
      res.status(200).json({ message: 'Topic updated successfully' });
      console.log('Topic updated successfully');
    }
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  } finally {
    await client.close(); // Close the MongoDB connection
  }
});


// Route to fetch 'Job_sheet' jobs
app.get('/jobs_sheet', async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB for each request
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');

    // Query the 'Job_sheet' collection
    const Job_sheetCollection = localDb.collection('Job_sheet');
    const jobs = await Job_sheetCollection.find().toArray();
   // console.log('Jobs data:', jobs); // Ajoutez cette ligne pour afficher les données des emplois

    res.json(jobs);
    console.log('Jobs data retrieved successfully');
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});



 // Route to update a job by 'reference' field
 app.put('/updateJobByReference', async (req, res) => {
  const { reference, post_name, description, qualifications, mandatory_skills, optional_skills } = req.body;
 
  try {
    await client.connect(); // Connect to MongoDB
    console.log('Connected to MongoDB');
 
    // Connect to the 'local' database and 'Job_sheet' collection
    const localDb = client.db('local');
    const Job_sheetCollection = localDb.collection('Job_sheet');
 
    // Update the job using 'reference' as the query condition
    const result = await Job_sheetCollection.updateOne(
      { reference: reference }, // Search by 'reference'
      {
        $set: {
          post_name: post_name,
          description: description,
          qualifications: qualifications, // Update qualifications (with degree, experience, portfolio)
          mandatory_skills: mandatory_skills,
          optional_skills: optional_skills // Correct spelling for 'optional_skills'
        }
      }
    );
 
    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Job not found with the given reference' });
    } else {
      res.status(200).json({ message: 'Job updated successfully' });
      console.log('Job updated successfully');
    }
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  } finally {
    await client.close(); // Close the MongoDB connection
  }
});
// Route to insert a new job
app.post('/jobs_insert', async (req, res) => {
  const newJob = req.body; // Le corps de la requête doit contenir le nouveau job à insérer
 
  try {
    await client.connect(); // Connect to MongoDB for each request
    console.log('Connected to MongoDB');
 
    // Connect to the 'local' database
    const localDb = client.db('local');
 
    // Connect to the 'Job_sheet' collection
    const Job_sheetCollection = localDb.collection('Job_sheet');
 
    // Insertion du nouveau job dans la collection
    const result = await Job_sheetCollection.insertOne(newJob);
 
    if (result.insertedId) {
      res.status(201).json({ message: 'Job inserted successfully', jobId: result.insertedId });
      console.log('Job inserted successfully');
    } else {
      res.status(500).json({ error: 'Failed to insert job' });
    }
  } catch (error) {
    console.error('Error inserting job:', error);
    res.status(500).json({ error: 'Failed to insert job' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});





// Route pour insérer une nouvelle catégorie
app.post('/categories_insert', async (req, res) => {
  const newCategory = req.body; // Le corps de la requête doit contenir la nouvelle catégorie à insérer

  try {
    await client.connect(); // Connexion à MongoDB pour chaque requête
    console.log('Connecté à MongoDB');

    // Connexion à la base de données 'local'
    const localDb = client.db('local');

    // Connexion à la collection 'Categories'
    const categoriesCollection = localDb.collection('Collection');

    // Insertion de la nouvelle catégorie dans la collection
    const result = await categoriesCollection.insertOne(newCategory);


    if (result.insertedId) {
      res.status(201).json({ message: 'Catégorie insérée avec succès', categoryId: result.insertedId });
      console.log('Catégorie insérée avec succès');
    } else {
      res.status(500).json({ error: 'Échec de l\'insertion de la catégorie' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'insertion de la catégorie:', error);
    res.status(500).json({ error: 'Échec de l\'insertion de la catégorie' });
  } finally {
    await client.close(); // Fermeture de la connexion à MongoDB après la requête
  }
});

app.get('/messages', async (req, res) => {
  try {
    await client.connect();
    await client.connect();
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');

    // Check if 'Marketing' collection exists and query it
    const marketingCollection = localDb.collection('Marketing');

    // Fetch documents from the 'Marketing' collection
    const messages = await marketingCollection.find().toArray();

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    await client.close();
  }
});



app.patch('/messages/:id', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');
    const marketingCollection = localDb.collection('Marketing');

    // Get the message ID from the request parameters
    const { id } = req.params;
    const { response } = req.body; // Assume the response is sent in the request body

    // Update the document in the 'Marketing' collection
    const result = await marketingCollection.updateOne(
      { _id: new MongoClient.ObjectId(id) }, // Assuming you are using ObjectId for MongoDB
      { $set: { response: response } }
    );

    if (result.modifiedCount === 1) {
      res.json({ message: 'Response updated successfully' });
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Error updating response:', error);
    res.status(500).json({ error: 'Failed to update response' });
  } finally {
    await client.close();
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const localDb = client.db('local');
    const usersCollection = localDb.collection('Users');
    const users = await usersCollection.find().toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Route to fetch 'Job_sheet' jobs
app.get('/jobs_sheet', async (req, res) => {
  try {
    await client.connect(); // Connect to MongoDB for each request
    console.log('Connected to MongoDB');
 
    // Connect to the 'local' database
    const localDb = client.db('local');
 
    // Query the 'Job_sheet' collection
    const Job_sheetCollection = localDb.collection('Job_sheet');
    const jobs = await Job_sheetCollection.find().toArray();
    console.log('Jobs data:', jobs); // Ajoutez cette ligne pour afficher les données des emplois
 
    res.json(jobs);
    console.log('Jobs data retrieved successfully');
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  } finally {
    await client.close(); // Close the MongoDB connection after the request
  }
});




app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });