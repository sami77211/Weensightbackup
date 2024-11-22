<script lang="ts">
	import type { promises } from 'dns';



	



const i18n = getContext('i18n'); // Contexte pour l'internationalisation
import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

// Liste des documents avec des noms et des URLs
let Collections = [];
let selectedCategoryId;
		

let searchQuery = ''; // Variable pour stocker la requête de recherche
let selectedDocument = ''; // Variable pour stocker le document sélectionné
let messages=[];
let isLoading = true; // Indicateur de chargement pour les documents

interface Categorie {
  id: string;
  name: string;
  description: string;
}


interface DocumentRH {
  id: string;
  nom: string;
  prenom: string;
  nomDocument: string;
  document: string;
  selected:String;
  Score:number;
  Rank:number;
  Linkedin:string;
  état:string;
  GotoChat:Boolean;
  recap: string; 
  Téléphone:string;
  Adresse:string;
  Email:string;
  Niveau:string;     // Ajoutez l'attribut recap de type Recap

}
let categories: Categorie[] = [];
let filteredDocuments : string[]  = [];
let allDocuments:string[] = [];


// Fonction pour filtrer les documents
function updateFilteredDocuments() {
  filteredDocuments = allDocuments.filter(doc =>
    doc.toLowerCase().includes(searchQuery.toLowerCase())
  );
   // Vérifier si le selectedDocument est présent dans filteredDocuments
   if (!filteredDocuments.some(doc => doc === selectedDocument)) {
    selectedDocument = ""; // Réinitialiser selectedDocument si aucune correspondance
  }
}


// Fonction pour gérer la sélection d'un document
function handleSelect(event) {
	selectedDocument = event.target.value;

  afficherCVEnPopup(selectedDocument); 
}




// Async function to fetch categories from the API
async function fetchCategories() {
  try {
    // Fetching collections from the API using the provided username
    const response = await fetch(`http://20.84.80.6:5000/collections/${user}`, {
      headers: {
        'accept': 'application/json'
      }
    });

    // Checking if the response is OK
    if (!response.ok) throw new Error('Error fetching user collections');

    // Parsing the JSON response
    const data = await response.json();
    console.log('API Data:', data);

    // Assuming the data structure contains an array of collections
    const collections = data.map((item: any) => ({
      id: item._id,  // Assuming MongoDB uses `_id`
      name: item,
      description: item.description || '' // Default to empty string if no description
    }));
    categories=collections;
   
    // Logging the mapped collections
    console.log('Mapped Collections:', collections);
  } catch (error) {
    // Log errors if any occur during the fetch operation
    console.error('Error fetching user collections:', error);
  }
  

  // Update your UI or perform additional operations here if needed
  updateFilteredDocuments();
}

let user="dev_user1";


async function fetchDocuments(langchain_mode): Promise<DocumentRH[]> {  // Spécifiez que la fonction retourne un tableau de DocumentRH
  try {
    const response = await fetch(`http://20.84.80.6:5000/get_sources?langchain_mode=${langchain_mode}`);
    
    if (!response.ok) throw new Error('Failed to fetch sources');
    
    const data = await response.json();
    
    // Assurez-vous que 'data.sources' est un tableau
    if (!Array.isArray(data.sources)) {
      console.error('Expected data.sources to be an array');
      return [];  // Retournez un tableau vide en cas de problème
    }

    // Mapping des chemins de fichiers aux documents de type DocumentRH
    const messages: DocumentRH[] = data.sources.map((filePath, index) => ({
      id: index,  // Utilisation de l'index comme identifiant temporaire
      nom: '-',   // Placeholder pour "nom"
      prenom: '-',   // Placeholder pour "prenom"
      nomDocument: filePath.split('\\').pop() || '-',  // Extraction du nom de fichier
      document: filePath || '-',  // Chemin complet du fichier
      score: 0,  // Placeholder pour "score"
      Linkedin: '-',  // Placeholder pour "Linkedin"
      état: 'treated',  // Placeholder pour "état"
    }));

    console.log(messages);
    return messages;  // Retournez la liste des documents
  } catch (err) {
    const error = err.message;
    console.error('Error fetching sources:', error);
    return [];  // Retournez un tableau vide en cas d'erreur
  }
}
async function fetchDocumentsForCategories() {
  isLoading = true;
  await fetchCategories();  // Récupère d'abord les catégories

  const allDocuments:string[] = [];// Initialize an empty array to hold all document names

  // Boucle à travers chaque catégorie pour récupérer les documents
  for (const category of categories) {
    const documents = await fetchDocuments(category.name);  // Utilise le nom de la catégorie pour récupérer les documents

    // Vérifiez que 'documents' est un tableau avant d'utiliser 'map'
    if (Array.isArray(documents)) {
      const nomDocuments = documents.map(doc => doc.nomDocument);  // Récupère seulement le nom du document
      console.log(`Documents for category "${category.name}":`, nomDocuments);
      
      // Ajoute les noms de documents à la liste globale
      allDocuments.push(...nomDocuments);
      
    } else {
      console.error(`Les documents pour la catégorie "${category.name}" ne sont pas disponibles.`);
    }
  }

  isLoading = false;
  return allDocuments; // Return the list of documents
}

async function handleFetchDocuments(langchain_mode) {
  isLoading=true;
        allDocuments=[];  // Supprime la liste actuelle avant de mettre à jour

         
        const documents = await fetchDocuments(selectedCategoryId);
        // Met à jour allDocuments avec la nouvelle liste des documents
             // Ne conserver que le nomDocument de chaque document
             const documentNames = documents.map(doc => doc.nomDocument);
        allDocuments=documentNames;
        selectedDocument="";        
        updateFilteredDocuments()
        isLoading=false;


    }

let documentURL = '';
let Nomdoc="";

const afficherCVEnPopup = async (nomDocument) => {
    try {
      const response = await fetch(`http://localhost:3002/api/documents/name/${nomDocument}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      Nomdoc=nomDocument;
      if (response.ok) {
        const result = await response.json();
        
        // Convertir la chaîne base64 en données binaires
        const caracteresBinaires = atob(result.document);
        const nombresBinaires = new Array(caracteresBinaires.length);
        for (let i = 0; i < caracteresBinaires.length; i++) {
          nombresBinaires[i] = caracteresBinaires.charCodeAt(i);
        }
        const tableauBinaire = new Uint8Array(nombresBinaires);
        const fichier = new Blob([tableauBinaire], { type: 'application/pdf' });
        documentURL = URL.createObjectURL(fichier);
      
      
      } else {
        const erreurData = await response.json();
        console.error('Échec de récupération du CV :', erreurData.error);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du CV :', error);
    }
  };

 
  let categoryName;

onMount(async () => {
fetchCategories();
const urlParams = new URLSearchParams(window.location.search); // Ou `page.query.get("categoryName")` si vous utilisez SvelteKit
     categoryName = urlParams.get("CollectionName");
     console.log("Hello"+categoryName);
    if (categoryName) {
      selectedCategoryId = categoryName;
      
    }
  
 isLoading=false;




updateFilteredDocuments();


});




</script>

<style>
  	
	@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}


.img-loader img {
    width: 80px;
    height: 80px;
}

.loader-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); /* Fond gris transparent */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.loader-maxance {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    border: 5px solid rgba(22, 140, 119, 0.2);
    border-top: 5px solid #168c77;
    animation: spin 2s linear infinite;
    background-color: white;
    display: flex;
    justify-content: center;
    align-items: center;
}


  .rtl-style{
            direction:rtl;
              text-align:right;
              flex-direction: row-reverse;
          }
   .select {
    max-height: 150px; /* Limite la hauteur du select */
    overflow-y: auto;  /* Ajoute un défilement vertical */
  }

  /* Style de la barre de défilement */
  select::-webkit-scrollbar {
    width: 8px; /* Largeur de la barre de défilement */
  }

  select::-webkit-scrollbar-thumb {
    background-color: #9FD5B5; /* Couleur de la poignée de défilement */
    border-radius: 10px;       /* Bord arrondi pour un style fin */
  }

  select::-webkit-scrollbar-track {
    background-color: #f1f1f1; /* Couleur de l'arrière-plan de la barre */
  }
  
	.search-bar {
    position: relative; /* Permet de positionner l'icône de manière absolue par rapport à la barre de recherche */
    width: 100%; /* S'assurer que la barre de recherche prend toute la largeur disponible */
    margin-bottom: 20px; /* Espacement en bas */
}

.icon {
    position: absolute; /* Positionne l'icône par rapport à la barre de recherche */
    left: 15px; /* Espace à gauche de l'icône */
    top: 50%; /* Centre verticalement l'icône */
    transform: translateY(-50%); /* Ajuste la position pour un centrage parfait */
    width: 20px; /* Largeur de l'icône */
    height: 20px; /* Hauteur de l'icône */
    pointer-events: none; /* Ignore les événements de la souris sur l'icône pour que les clics passent au champ de saisie */
}

input[type="text"] {
    padding: 10px 40px; /* Ajoute de l'espace pour le texte et l'icône */
    width: 100%; /* S'assurer que l'entrée prend toute la largeur de la barre de recherche */
    border: 2px solid #9FD5B5; /* Bordure pour l'entrée */
    border-radius: 30px; /* Coins arrondis pour un aspect plus doux */
    font-size: 1em; /* Taille de la police */
    outline: none; /* Enlève le contour par défaut */
    transition: border-color 0.3s ease; /* Transition pour la couleur de la bordure */
}

input[type="text"]:focus {
    border-color: #168c77; /* Change la couleur de la bordure au focus */
}

    /* Primary, secondary, and tertiary colors */
    :root {
        --primary-color: #168c77;
        --secondary-color: #9FD5B5;
        --tertiary-color: #f1fdf9;
    }

    /* Container styling */
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: var(--tertiary-color);
        padding: 20px;
        height: 100vh;
        font-family: Arial, sans-serif;
		max-width: 2000px;
    }
      .container::-webkit-scrollbar {
    width: 8px;              /* Largeur de la barre de défilement */
  }

  .container::-webkit-scrollbar-thumb {
    background-color: #9FD5B5;  /* Couleur de la poignée de défilement */
    border-radius: 10px;        /* Bord arrondi pour un style fin */
  }

  .container::-webkit-scrollbar-track {
    background-color: #f1f1f1;  /* Couleur de l'arrière-plan de la barre de défilement */
  }

    /* Title styling */
    h1 {
        color: #333;
        margin-bottom: 20px;
        align-self: flex-start;
    }

    /* Search bar styling */
    .search-bar {
        display: flex;
        align-items: center;
        background-color: white;
        border-radius: 8px;
        padding: 10px;
        width: 100%;
		max-width: 1000px;
		height: 50px;
        box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
		border-radius: 30px;
    }

    .search-bar input {
        border: none;
        outline: none;
        background: transparent;
        color: #333;
        font-size: 16px;
        flex: 1;
    }

    .search-bar input::placeholder {
        color: #888;
    }

    .search-bar svg {
        fill: var(--primary-color);
        margin-right: 8px;
    }

    /* Dropdown styling */
    .dropdown {
        width: 100%;
        max-width: 1000px;
        position: relative;
        margin-bottom: 20px;
    }

    select {
        width: 100%;
        padding: 12px;
     
        border-radius: 8px;
        background-color: white;
        color: #168c77;
		font-weight: bold;
        font-size: 14px;
        outline: none;
        appearance: none;
        box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Document display view styling */
    .document-view {
        width: 100%;
        max-width: 1500px;
        height: 700px;
        background-color: white;
        border: 1px solid var(--secondary-color);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 18px;
        box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
    }
</style>

<div class="container {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
  <div class="mb-3 flex justify-between items-center">
    <div class="text-lg font-semibold self-center">{$i18n.t('Documents')}</div>

</div>
  <div> <!-- Select Dropdown -->
		<div class="select-container">
      
			<select class="select-box"
      style="margin-bottom: 15px;
    width: 240px;"
			bind:value={selectedCategoryId}
      on:change={handleFetchDocuments(selectedCategoryId)} 
			placeholder={$i18n.t('Select a collection')}
      disabled={categoryName !== null}  
      >
			
				<!-- Default disabled option -->
				<option value="" selected disabled>{$i18n.t('Select a collection')}</option>
				<!-- Loop through Collections and display them as options -->
				{#each categories as collection}
					<option value={collection.name}>{collection.name}</option>
				{/each}
			</select>
    </div></div>
 

  <!-- Search Bar -->
  <div class="search-bar">
      <img src="/search.png" alt="Search Icon" class="icon" />
      <input 
          type="text" 
          placeholder={$i18n.t('Search Your Documents...')} 
          bind:value={searchQuery} 
          on:input={updateFilteredDocuments}  
      />
  </div>

  	
		

  <!-- Dropdown for selecting document -->
  <div class="dropdown">
    <select class="select" bind:value={selectedDocument} on:change={handleSelect} disabled={selectedCategoryId === ''}>
      <option value="" disabled selected>{$i18n.t('Select a Document')}</option>
      {#each filteredDocuments as document}
          <option value={document}>{document}</option>
      {/each}
      {#if searchQuery.length > 0 && filteredDocuments.length === 0}
          <option disabled>{$i18n.t('No Matches Found')}</option>
      {/if}
  </select>
  


  
  </div>


  <!-- Document display view -->
  <div class="document-view">
      {#if selectedDocument}
          <iframe src={documentURL} width="100%" height="700" frameborder="0"></iframe>
      {:else}
          <p class="placeholder-text">{$i18n.t('Select Document to View')}</p>
      {/if}
  </div>
</div>


{#if isLoading}
<div class="loader-overlay">
  <div class="loader-maxance">
      <div class="img-loader">
          <img src="/weensight_circle.png" alt="Loader Image">
      </div>
  </div>
</div>
{/if}
	
