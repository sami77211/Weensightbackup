const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
const port = 3001; // Use a different port if 3000 is in use
// Enable CORS
app.use(cors());


// Replace with your MongoDB connection string
const uri = 'mongodb://weensight:Weensight%40%40123@20.84.80.6:27017/?authSource=weensight'; // Update this if your MongoDB is hosted elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/messages', async (req, res) => {
  try {
    await client.connect();
    await client.connect();
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('weensight');

    // Check if 'Marketing' collection exists and query it
    const marketingCollection = localDb.collection('reception_box');

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
    const localDb = client.db('weensight');
    const marketingCollection = localDb.collection('reception_box');

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
   
    res.json(jobs);
    console.log('Jobs data retrieved successfully');
    console.log(jobs);
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
