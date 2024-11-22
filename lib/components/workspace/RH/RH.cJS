const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3002; // Use a different port if 3002 is in use

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' }); // Files will be uploaded to 'uploads' directory

// Replace with your MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'; // Update this if your MongoDB is hosted elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// Create a new document and upload a file
app.post('/documents', upload.single('file'), async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
 
    const localDb = client.db('local');
    const documentsCollection = localDb.collection('RH'); // Use the RH collection
 
    const newDocument = {
      nom: req.body.nom,
      prenom: req.body.prenom,
      nomDocument: req.file.originalname,
      document: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)), // Store file content
     
    };
 
    const result = await documentsCollection.insertOne(newDocument);
    res.status(201).json({ message: 'Document created successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  } finally {
    await client.close();
    // Optionally remove the uploaded file after processing
    fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));
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

// Get all documents
app.get('/api/categories', async (req, res) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const localDb = client.db('local');
    const documentsCollection = localDb.collection('Collection'); // Use the RH collection
    const documents = await documentsCollection.find().toArray();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    await client.close();
  }
});



// Mock API endpoint
app.get('/evaluate_cv', (req, res) => {
  const { langchain_mode, pre_prompt_query, prompt_query, system_prompt } = req.query;

  // Check if all parameters are provided
  if (!langchain_mode || !pre_prompt_query || !prompt_query || !system_prompt) {
      return res.status(400).json({ error: 'Missing required query parameters' });
  }

  // Mock response
  const response = {
      "responses": [     "**Partie 1: Résumé du profil du candidat**\n\n* Le candidat a une bonne compréhension des concepts de garantie et d'assurance.\n* Il est capable de décrire les différents types de dommages matériels et les causes qui peuvent les entraîner.\n* Il montre une bonne maîtrise des termes juridiques liés à l'assurance, tels que la responsabilité civile et les exclusions particulières.\n\n**Partie 2: Points forts du profil par rapport à la description de poste**\n\n• **Connaissance approfondie de la garantie**: Le candidat a une bonne compréhension des concepts de garantie et d'assurance, ce qui est essentiel pour le poste.\n• **Analyse critique**: Il est capable de décrire les différents types de dommages matériels et les causes qui peuvent les entraîner, ce qui montre qu'il a une bonne capacité à analyser les situations.\n\n**Partie 3: Tableau des points à surveiller**\n\n| Critère | Évaluation |\n| --- | --- |\n| Connaissance approfondie de la garantie | **** |\n| Analyse critique | *** |\n| Maîtrise des termes juridiques | *** |\n| Capacité à communiquer les concepts complexes | ** |\n\n**Partie 4: Note sur 100**\n\n**** (96%)\n\n"]
  };

  res.json(response);
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
