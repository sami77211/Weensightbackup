import { MongoClient } from 'mongodb';

export async function listCollectionsAndMarketing() {
  const uri = 'mongodb://localhost:27017/?appName=MongoDB+Compass&directConnection=true&serverSelectionTimeoutMS=2000';
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    // Connect to the 'local' database
    const localDb = client.db('local');

    // Check if 'Marketing' collection exists and query it
    const marketingCollection = localDb.collection('Marketing');

    // Fetch documents from the 'Marketing' collection
    const documents = await marketingCollection.find().toArray();

    // Return the list of documents
    return documents;

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error; // Propagate the error
  } finally {
    await client.close();
  }
}
var a;
// Example usage:
listCollectionsAndMarketing()
  .then(documents => {
    console.log('Documents in the \'Marketing\' collection:', documents);

    
  })
  .catch(error => {
    console.error('Failed to retrieve documents:', error);
  });

export default listCollectionsAndMarketing;
