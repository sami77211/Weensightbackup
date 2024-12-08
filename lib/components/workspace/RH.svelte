
<script lang="ts">
      
  import fileSaver from 'file-saver';
  const { saveAs } = fileSaver;
    import { writable } from 'svelte/store';
    
  
  
  
  import * as XLSX from 'xlsx';

  import { WEBUI_NAME, documents, showSidebar } from '$lib/stores';
  import { createNewDoc, getDocs } from '$lib/apis/documents';

  import { SUPPORTED_FILE_TYPE, SUPPORTED_FILE_EXTENSIONS } from '$lib/constants';
  import { processDocToVectorDB, uploadDocToVectorDB } from '$lib/apis/rag';
  import { blobToFile, transformFileName } from '$lib/utils';

  import Checkbox from '$lib/components/common/Checkbox.svelte';
  import { v4 as uuidv4 } from 'uuid';
  // Importer la fonction pour générer un UUID
  import EditDocModal from '$lib/components/documents/EditDocModal.svelte';
  import AddFilesPlaceholder from '$lib/components/AddFilesPlaceholder.svelte';
  import AddDocModal from '$lib/components/documents/AddDocModal.svelte';
  import { transcribeAudio } from '$lib/apis/audio';
  import { uploadFile } from '$lib/apis/files';

    import { onMount, getContext } from 'svelte';
    import { settings } from '$lib/stores';
    import { toast } from 'svelte-sonner';
  import type { IntegerType } from 'mongodb';
  import Name from '../chat/Messages/Name.svelte';
  import { Pagination } from 'bits-ui';
    let page = 1;
    let dateSortOrder = 'asc'; // Default date sort order
    let sentimentSortOrder = 'asc'; // Default sentiment sort order
    let urgencySortOrder = 'asc'; // Default sort order
    const i18n = getContext('i18n');
    let searchTermcvs="";
    let selectedPostName = ''; // Le nom du poste sélectionné
    let filteredJobs: Job[] = []; // Liste des jobs filtrés
    let showAddForm = false; // Initialement caché
    
    interface  qualifications {
    degree: string; // Exemple de qualification (diplôme)
    experience: string; // Exemple de qualification (expérience)
    portfolio?: string; // Facultatif, peut inclure des informations sur un portefeuille
  }
    
    interface Job {
  _id: string; // Identifiant unique (ex: MongoDB ObjectID)
  post_name: string; // Nom du poste
  description: string; // Description du poste
  qualifications: qualifications;
  mandatory_skills: string[]; // Compétences obligatoires
  optional_skills: string[]; // Compétences optionnelles (corrigé ici)
  nb_profiles:number;
  duration:string;
}

let Degree: string="";
   let nb_profiles:number=0;
   let duration: string="";
let newMandatorySkill = '';
let newOptionalSkill = '';
let jobs: Job[] = [];
let selectedJob: Job | null = null;
let error_job: string | null = null;
let infoMessage: string | null = null; // For displaying messages to the user


let selectedMandatorySkills: Record<string, boolean> = {};
let selectedOptionalSkills: Record<string, boolean> = {};

let newPosition = ''; // Capture the value of the new position
let poste_description='';



let searchTerm = '';

function setSelectedSkills(job: Job) {
  selectedMandatorySkills = {};
  selectedOptionalSkills = {};

  job.mandatory_skills.forEach((skill) => {
    selectedMandatorySkills[skill] = false;
  });

  job.optional_skills.forEach((skill) => {
    selectedOptionalSkills[skill] = false;
  });
}



let query = '';
let tags = [];
let showAddDocModal = false;
let showEditDocModal = false;
let selectedDoc;
let selectedTag = '';
let dragged = false;
let currentStep = 1; // Set the last active step
let selectedDocuements=[];



function updateStepperUI() {
  const stepItems = document.querySelectorAll('.stepper-item');

  stepItems.forEach((item, index) => {
    if (index + 1 === currentStep) {
      item.classList.add('active');
      item.classList.remove('completed');
    } else if (index + 1 < currentStep) {
      item.classList.add('completed');
      item.classList.remove('active');
    } else {
      item.classList.remove('completed');
      item.classList.remove('active');
    }
  });
}

function goToStep_stepper(step) {
  if (step >= 1 && step <= 3) {
    document.querySelectorAll('.stepper-item').forEach((item, index) => {
      if (index < step - 1) {
        item.classList.add('completed');
        item.classList.remove('active');
      } else if (index === step - 1) {
        item.classList.add('active');
        item.classList.remove('completed');
      } else {
        item.classList.remove('completed', 'active');
      }
    });

    currentStep = step;
    updateButtonState();
  }
}

interface PointSurveiller {
    point: string;         // Point à surveiller
    description: string;   // Description du point
}

interface Recap {
    partie1: string; // Résumé du profil
    partie2: string; // Points forts du profil
    partie3: PointSurveiller[];  // Tableau des points à surveiller
}


interface DocumentRH {
  id: string;
  nom: string;
  prenom: string;
  nomDocument: string;
  document: string;
  selected:String;
  Score:IntegerType;
  Rank:IntegerType;
  Linkedin:string;
  état:string;
  GotoChat:Boolean;
  recap: Recap; 
  Téléphone:string;
  Adresse:string;
  Email:string;
  Niveau:string;     // Ajoutez l'attribut recap de type Recap

}
function GoToChat(cv) {
    cv.selected = !cv.selected;
    // Mets à jour ton tableau ou prends d'autres actions en fonction de la sélection
  }

let messages: DocumentRH[] = [];
let selectedMessage: DocumentRH | null = null;
let error: string = '';
async function fetchTopics() {
try {
const response = await fetch('http://localhost:3000/topics_sheet');
if (!response.ok) throw new Error('Failed to fetch topics');
const data = await response.json();
jobs = data.map((item: any) => ({
reference:item.reference,
post_name: item.post_name,
mandatory_skills: item.mandatory_skills,
duration:item.duration,
nb_profiles:item.nb_profiles,
description: item.description, // Description du poste
qualifications: item.qualifications, // Objet qualifications (ajusté ici)
}));


} catch (err) {
error_job = err.message;
infoMessage = `Error fetching topics: ${error}`;
}
}

async function UpdateTopic(reference, postname, MandatorySkills, qualifications,nb_profiles,duration,description) {
      try {
  // Appelle l'API pour mettre à jour le job par référence
  const response = await fetch('http://localhost:3000/updateTopicByReference', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
   reference:reference,
   post_name: postname,
   mandatory_skills: MandatorySkills,
   duration:duration,
   nb_profiles:nb_profiles,
   description: description, // Description du poste
   qualifications: qualifications, // Objet qualifications (ajusté ici)
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update topic');
  }

  const data = await response.json();
  console.log(data);
      // Appeler fetchTopics pour mettre à jour la liste affichée
      await fetchTopics();
      // Cacher le formulaire après la mise à jour
  hideForm();
  toast.success($i18n.t('Topic successfully updated.'));
} catch (error) {
  toast.error($i18n.t('Error updating Topic: ' + error.message));
}
}


async function fetchDocuments(langchain_mode) {
  isLoading=true;
  try {
    const response = await fetch(`http://20.84.80.6:5000/get_sources?langchain_mode=${langchain_mode}`);
    
    if (!response.ok) throw new Error('Failed to fetch sources');
    
    const data = await response.json();
    
    // Assuming 'data.sources' contains an array of file paths
    messages = data.sources.map((filePath, index) => ({
      id: index,  // Use index as a temporary unique ID
      nom: '-',   // Placeholder for "nom"
      prenom: '-',   // Placeholder for "prenom"
      nomDocument: filePath.split('\\').pop() || '-',  // Extract file name from the path
      document: filePath || '-',  // Full file path
      score: 0,  // Placeholder for "score"
      Linkedin: '-',  // Placeholder for "Linkedin"
      état: 'treated',  // Placeholder for "état"
    }));
    
    console.log(messages);
   

    if (messages.length > 0) {
      selectedMessage = messages[0];
      
    }
  } catch (err) {
    const error = err.message;
    console.error('Error fetching sources:', error);
  }
isLoading=false;
}




const uploadDoc = async (file: File, tags?: object) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nom', selectedDoc?.nom || '');
  formData.append('prenom', selectedDoc?.prenom || '');

  const response = await fetch('http://localhost:3002/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.token}`,
    },
    body: formData,
  });
    console.log(response);

  if (response.ok) {
    const data = await response.json();
  
 
    await fetchDocuments(selectedCategoryName);
  } else {
    const errorData = await response.json();
    toast.error(`Erreur lors de l'upload: ${errorData.error}`);
  }
};


const getDocumentSizeInKo = async (nomDocument) => {
  try {
    const response = await fetch(`http://localhost:3000/api/documents/name/${nomDocument}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const result = await response.json();
      
      // Convertir la chaîne base64 en données binaires
      const caracteresBinaires = atob(result.document);
      const nombresBinaires = new Array(caracteresBinaires.length);
      for (let i = 0; i < caracteresBinaires.length; i++) {
        nombresBinaires[i] = caracteresBinaires.charCodeAt(i);
      }
      const tableauBinaire = new Uint8Array(nombresBinaires);
      
      // Calculer la taille du fichier en Ko
      const tailleFichierEnKo = (tableauBinaire.length / 1024).toFixed(2); // Convertir en Ko

      return tailleFichierEnKo; // Retourne la taille en Ko
    } else {
      throw new Error('Échec de récupération du document');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la taille du document :', error);
    return null; // Retourne null en cas d'erreur
  }
};



 let evaluationResult;

onMount(() => {
  

  fetchJobs();
  fetchCategories();
 
  
   






 



});

let Nomdoc="";
let isPopupVisible = false;
let documentURL = '';

  const afficherCVEnPopup = async (nomDocument) => {
    try {
      const response = await fetch(`http://localhost:3000/api/documents/name/${nomDocument}`, {
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
      
        // Afficher la popup
        isPopupVisible = true;
      } else {
        const erreurData = await response.json();
        console.error('Échec de récupération du CV :', erreurData.error);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du CV :', error);
    }
  };

  const fermerPopup = () => {
    event?.stopPropagation();
  // Désélectionner le dernier élément
  const lastIndex = messages.length - 1;
  if (lastIndex >= 0) {
    messages[lastIndex].selected = 'unchecked';
  }


    isPopupVisible = false;
    documentURL = '';

  };
const deleteDocByName = async (nomDocument) => {
    try {
        console.log(`Attempting to delete document: ${nomDocument}`);
        const response = await fetch(`http://localhost:3000/api/documents/name/${encodeURIComponent(nomDocument)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log(nomDocument)
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error details:', errorData);
            throw new Error(errorData.error || 'Failed to delete document');
        }

        const data = await response.json();
        console.log(data.message); // Log success message
        await fetchDocuments(langchain_mode); // Optionally refresh the document list
    } catch (error) {
        console.error('Error deleting document:', error.message);
    }
};

function getFileType(title) {
    const ext = title.split('.').pop();
    return ext ? ext.toUpperCase() : null;
}

function getFileSizeInKB(base64String) {
    // Check if the base64 string contains metadata (e.g., data:image/png;base64,)
    const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;

    // Check if base64Data is not empty or undefined
    if (!base64Data) {
        console.error('Base64 data is empty or undefined');
        return 0; // Return 0 if no valid data is available
    }

    try {
        // Decode the base64 string to binary
        const byteLength = atob(base64Data).length; // Length in bytes
        const sizeInKB = (byteLength / 1024).toFixed(2); // Convert to KB and format to 2 decimal places

        return sizeInKB; // Return size in KB
    } catch (error) {
        console.error('Error decoding base64 string:', error);
        return 0; // Return 0 if there's an error
    }
}

function toggleDocumentSelection(doc) {
    // Vérifie si le document est déjà sélectionné
    const index = selectedDocuements.findIndex(item => item.nomDocument === doc.nomDocument);

    if (doc.selected === 'checked') {
  
      if (index !== -1) {
        selectedDocuements.splice(index, 1); // Retire le document de la liste
      }
    } else {
      // Si non sélectionné, l'ajoute à la liste
  
      if (index === -1) {
        selectedDocuements.push(doc); // Ajoute le document à la liste uniquement s'il n'est pas déjà présent
      }
    }
    
  }







  // Fonction pour trier les documents par score (du plus haut au plus bas)
  function sortDocumentsByScore() {
    // Vérifier si la liste est vide
    if (selectedDocuements.length === 0) {
      return; // Ne rien faire si la liste est vide
    }
    selectedDocuements.sort((a, b) => b.score - a.score);

      // Affecter le rang après le tri
  selectedDocuements.forEach((document, index) => {
    document.Rank = index + 1; // Attribuer le rang (1 pour le premier, 2 pour le deuxième, etc.)
  });
  }
  let nameSortOrder = 'asc'; // État pour suivre l'ordre de tri
let firstNameSortOrder = 'asc'; // État pour suivre l'ordre de tri du prénom
function sortByName() {
  selectedDocuements.sort((a, b) => {
    return nameSortOrder === 'asc'
      ? a.nom.localeCompare(b.nom)
      : b.nom.localeCompare(a.nom);
  });
  
  // Update the reactive variable to trigger reactivity
  selectedDocuements = [...selectedDocuements];
  nameSortOrder = nameSortOrder === 'asc' ? 'desc' : 'asc';
}

function sortByFirstName() {
  selectedDocuements.sort((a, b) => {
    return firstNameSortOrder === 'asc'
      ? a.prenom.localeCompare(b.prenom)
      : b.prenom.localeCompare(a.prenom);
  });
  
  // Update the reactive variable to trigger reactivity
  selectedDocuements = [...selectedDocuements];
  firstNameSortOrder = firstNameSortOrder === 'asc' ? 'desc' : 'asc';
}



function downloadExcel() {
 console.log(selectedDocuements);

  // Crée un nouveau classeur Excel
  const wb = XLSX.utils.book_new();

// Map les documents pour structurer les données
const jobData = selectedDocuements.map(doc => ({
  'Candidat': `${doc.nom || 'Non trouvé'} ${doc.prenom || 'Non trouvé'}`, // Combine le nom et prénom
  'Nom du Document': doc.nomDocument || 'Non trouvé',
  'Adresse': doc.Adresse || 'Non trouvé',
  'Téléphone': doc.Téléphone || 'Non trouvé',
  'Email': doc.Email || 'Non trouvé',
  'Niveau': doc.Niveau || 'Non trouvé',
  'Score': doc.score || 0,
  'Rang': doc.Rank || 0,
  'LinkedIn': doc.Linkedin || 'Non trouvé',
  'État': doc.état || 'Non trouvé',
  'GotoChat': doc.GotoChat ? 'Oui' : 'Non',
  'Résumé du Profil': doc.recap?.partie1 || 'Non trouvé',
  'Points Forts du Profil': doc.recap?.partie2 || 'Non trouvé',
  'Points à Surveiller': doc.recap?.partie3 || 'Non trouvé'
}));

  // Convertir les données mappées en une feuille de calcul Excel
  const ws = XLSX.utils.json_to_sheet(jobData);

  // Ajouter la feuille de calcul au classeur
  XLSX.utils.book_append_sheet(wb, ws, 'Documents RH');

  // Générer le fichier binaire du classeur
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  // Convertir en Blob pour téléchargement
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });

  // Créer un lien pour télécharger le Blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'documents_rh.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



// Function to convert string to ArrayBuffer
function s2ab(s) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}
let showrecap = false;
let selectedcv=null;
  // Function to open the modal
  function openModal(cv) {
    showrecap = true;
    console.log(showrecap);
    selectedcv=cv;
  }

  // Function to close the modal
  function closeModal() {
    showrecap = false;
  }
let showdetails;

  function openRecap(cv) {
    showdetails = true;
    console.log(showrecap);
    selectedcv=cv;
  }

  // Function to close the modal
  function closerecap() {
    showdetails = false;
  }

  let activeIndex = null;

function toggleAccordion(index) {
  activeIndex = activeIndex === index ? null : index;
  const inputText = selectedcv.recap.partie3;
  document.getElementById('output').innerHTML = convertTextToTable(inputText);
}












let updateMode=false;
let indexToUpdate:number | null;

let lastSelectedButton = null; // Pour garder la trace du dernier bouton sélectionné

let ShowAddMandatorySkillModal=false;
let ShowAddOptionalSkillModal = false;
let optionalSkillsInputs = [""]; // Tableau pour stocker les valeurs des inputs
let NewOptionalSkills :string[]= []; // Tableau pour stocker les valeurs des inputs
let MandatorySkillsInputs = [""]; // Tableau pour stocker les valeurs des inputs
let NewMandatorySkills :string[]= []; // Tableau pour stocker les valeurs des inputs
let ShowPositionstype=true;
let selectedPositionType='';

  // Fonction pour ajouter un nouveau champ input
  function addOptionalSkillInput() {
    optionalSkillsInputs = [...optionalSkillsInputs, ""];
  }

  function removeSkill(index, skillType) {
    if (skillType === 'mandatory') {
      NewMandatorySkills = NewMandatorySkills.filter((skill, i) => i !== index);
      MandatorySkillsInputs = MandatorySkillsInputs.filter((skill, i) => i !== index);

    } else if (skillType === 'optional') {
      NewOptionalSkills = NewOptionalSkills.filter((skill, i) => i !== index);
      optionalSkillsInputs = optionalSkillsInputs.filter((skill, i) => i !== index);

    }
  }
  // Fonction pour collecter les compétences optionnelles et les ajouter à la liste
  function addOptionalSkills() {
    let filledSkills = optionalSkillsInputs.filter(skill => skill.trim() !== "");

    // Logique d'ajout des compétences (par exemple, pousser dans une liste de compétences optionnelles)
    console.log("Collected Compétences optionnelles: ", filledSkills);

    // Réinitialiser les inputs et fermer le modal
    NewOptionalSkills = optionalSkillsInputs.filter(skill => skill.trim() !== "");
    ShowAddOptionalSkillModal = false;
  }
  // Fonction pour ajouter un nouveau champ input
  function addMandatorySkillInput() {
    MandatorySkillsInputs = [...MandatorySkillsInputs, ""];
  }

  // Fonction pour collecter les compétences optionnelles et les ajouter à la liste
  function addMandatorySkills() {
    let filledSkills = MandatorySkillsInputs.filter(skill => skill.trim() !== "");

    // Logique d'ajout des compétences (par exemple, pousser dans une liste de compétences optionnelles)
    console.log("Collected Compétences obligatoires: ", filledSkills);

    // Réinitialiser les inputs et fermer le modal
    NewMandatorySkills = MandatorySkillsInputs.filter(skill => skill.trim() !== "");
    ShowAddMandatorySkillModal = false;
  }
  function handleCancelMandatory() {
    ShowAddMandatorySkillModal = false; // Fermer le modal
    if (NewMandatorySkills.length === 0) {
      MandatorySkillsInputs = [""]; // Initialiser avec une entrée vide
    } else {
      MandatorySkillsInputs = [...NewMandatorySkills, ""]; // Ajouter les nouvelles compétences et une entrée vide
    }
  }
  function handleCancelOptional() {
    ShowAddOptionalSkillModal = false; // Fermer le modal
    if (NewOptionalSkills.length === 0) {
      optionalSkillsInputs = [""]; // Initialiser avec une entrée vide
    } else {
      optionalSkillsInputs = [...NewOptionalSkills, ""]; // Ajouter les nouvelles compétences et une entrée vide
    }
  }

  async function fetchJobs() {
try {
const response = await fetch('http://localhost:3000/jobs_sheet');
if (!response.ok) throw new Error('Failed to fetch jobs');
const data = await response.json();
jobs = data.map((item: any) => ({
reference:item.reference,
post_name: item.post_name,
mandatory_skills: item.mandatory_skills,
optional_skills: item.optional_skills, // Erreur de typographie ici, devrait être optional_skills
description: item.description, // Description du poste
qualifications: item.qualifications, // Objet qualifications (ajusté ici)
}));
} catch (err) {
error_job = err.message;
infoMessage = `Error fetching jobs: ${error}`;
}
}





async function updateJobCollection() {
try {
const response = await fetch('http://localhost:3000/jobs_sheetUpdate', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(jobs), // La collection mise à jour
  
});
console.log(jobs);
if (!response.ok) {
    
  throw new Error('Failed to update job collection');
}

const data = await response.json();
} catch (error) {
toast.error($i18n.t('Error updating job collection: ' + error.message));
}
}



  





    function showForm(){
        showAddForm = true; // Afficher la div "message-details"

    }
    function hideForm(){
        showAddForm = false; // masquer la div "message-details"
        newPosition="";
        optionalSkillsInputs = [""];
        NewOptionalSkills=[];
        MandatorySkillsInputs = [""];
        NewMandatorySkills=[];
        filteredJobs=jobs;
        selectedPostName="";
        updateMode=false;
        poste_description="";
        Degree="";
        experience="";
        Portfolio="";
        nb_profiles=0;
        duration="";


    }

    async function UpdatePosition(reference, postname, MandatorySkills, OptionalSkills, poste_description, degree, experience,nb_profiles,Portfolio,duration) {
      if(selectedPositionType=="internship"){
// Check if all fields are filled
if (!degree.trim()||
    !poste_description.trim()||
    !postname.trim()||
     MandatorySkills.length === 0 ||
    !poste_description.trim()||
     nb_profiles==0|| 
    !duration.trim()) {
  toast.error($i18n.t('Please fill all fields before updating a topic.'));
  return;
}

        try {
  // Appelle l'API pour mettre à jour le job par référence
  const response = await fetch('http://localhost:3000/updateTopicByReference', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
   reference:reference,
   post_name: postname,
   mandatory_skills: MandatorySkills,
   duration:duration,
   nb_profiles:nb_profiles,
   description: poste_description, // Description du poste
   qualifications: { // Map qualifications to the three variables
          degree: Degree,
          experience: "",
          portfolio: "" // Optional field
        }
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update topic');
  }

  const data = await response.json();
  console.log(data);
      // Appeler fetchTopics pour mettre à jour la liste affichée
      await fetchTopics();
      // Cacher le formulaire après la mise à jour
  hideForm();
  toast.success($i18n.t('Topic successfully updated.'));
} catch (error) {
  toast.error($i18n.t('Error updating Topic: ' + error.message));
}
      }
      else{
    // Check if all required fields are filled
  if (!postname.trim() || 
      MandatorySkills.length === 0 || 
      OptionalSkills.length === 0 || 
      !poste_description.trim() || 
      !Degree.trim() || 
      !experience.trim()) {
    toast.error($i18n.t('Please fill all fields before adding a position.'));
    return;
  }
  
  try {
    // Appelle l'API pour mettre à jour le job par référence
    const response = await fetch('http://localhost:3000/updateJobByReference', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: reference,
        post_name: postname,
        mandatory_skills: MandatorySkills,  // Correspond à la structure correcte
        optional_skills: OptionalSkills,    // Correspond à la structure correcte
        description: poste_description,
        qualifications: { // Map qualifications to the three variables
          degree: Degree,
          experience: experience,
          portfolio: Portfolio // Optional field
        }
      }),
    });

        // Appeler fetchJobs pour mettre à jour la liste affichée
        await fetchJobs();
    // Cacher le formulaire après la mise à jour
    hideForm();
    toast.success($i18n.t('Position successfully updated.'));
  } catch (error) {
    toast.error($i18n.t('Error updating position: ' + error.message));
  }

}
    }

function openEditInterface(position) {

  console.log(position);
  // Fill the existing fields from the selected position
  Jobreference = position?.reference;
  newPosition = position?.post_name;
  NewMandatorySkills = position?.mandatory_skills;
  MandatorySkillsInputs = [...position?.mandatory_skills, ""];
  // Fill the additional fields
  Degree = position?.qualifications?.degree || ''; // Fallback to empty string if undefined
 poste_description = position?.description || ''; // Fallback to empty string if undefined

  if(selectedPositionType=="internship"){
    duration=position?.duration;
    nb_profiles=position?.nb_profiles;
  }else{
    NewOptionalSkills = position?.optional_skills; // Corrected to match the key name
    optionalSkillsInputs = [...position?.optional_skills, ""];
    experience = position?.qualifications?.experience || ''; // Fallback to empty string if undefined
    Portfolio = position?.qualifications?.portfolio || ''; // Fallback to empty string since it's optional
  
  }
 
  console.log(position); // Debugging information
  showAddForm = true; // Show the form for editingF
  updateMode = true;  // Set to update mode
  console.log(position?.post_name); // Debugging information
}

async function AddPosition(postname:string, mandatorySkills:string[], optionalSkills:string[], poste_description:string, degree:string, experience:string, portfolio:string, nb_profiles:number, duration:string) {
  if(selectedPositionType=="internship"){
// Check if all fields are filled
if (!degree.trim()||
    !poste_description.trim()||
    !postname.trim()||
     mandatorySkills.length === 0 ||
    !poste_description.trim()||
     nb_profiles==0|| 
    !duration.trim()) {
  toast.error($i18n.t('Please fill all fields before adding a topic.'));
  return;
}
const newTopic = {
  reference: uuidv4(),
  post_name: postname,
  mandatory_skills: mandatorySkills,
  optional_skills: optionalSkills, // Assurez-vous que la clé est correcte
  duration:duration,
  nb_profiles:nb_profiles,
  description:poste_description,
  qualifications: {
      degree: degree,
      experience: "",
      portfolio: "" // Optional field
    }

};

try {
  const response = await fetch('http://localhost:3000/topic_insert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newTopic),
  });

  if (!response.ok) {
    throw new Error('Failed to insert topic');
  }

  const data = await response.json();
  toast.success($i18n.t('Topic successfully added !' ));
console.log(jobs);
  // Appeler fetchJobs pour mettre à jour la liste affichée
  await fetchTopics();
  // Cacher le formulaire après la mise à jour
  hideForm();
} catch (error) {
  toast.error($i18n.t('Error inserting topic: ' + error.message));
}
}else{
  // Check if all required fields are filled
  if (!postname.trim() || 
      mandatorySkills.length === 0 || 
      optionalSkills.length === 0 || 
      !poste_description.trim() || 
      !degree.trim() || 
      !experience.trim()) {
    toast.error($i18n.t('Please fill all fields before adding a position.'));
    return;
  }


  const newJob = {
    reference: uuidv4(), // Generate a unique reference for the new job
    post_name: postname,
    mandatory_skills: mandatorySkills,
    optional_skills: optionalSkills, // Corrected key for optional_skills
    description: poste_description,
    qualifications: {
      degree: degree,
      experience: experience,
      portfolio: portfolio // Optional field
    }
  };

  try {
    const response = await fetch('http://localhost:3000/jobs_insert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newJob), // Send the new job as a JSON object
    });

    if (!response.ok) {
      throw new Error('Failed to insert job');
    }

    const data = await response.json();
    toast.success($i18n.t('Position added successfully !'));
    console.log(data);
    
    // Call fetchJobs to update the displayed list
    await fetchJobs();
    
    // Hide the form after the job is added
    hideForm();
  } catch (error) {
    toast.error($i18n.t('Error inserting job: ' + error.message));
  }
}
}

function validateStep() {
  if (!selectedJob) {
    // Display an error message
    if(selectedPositionType === "internship"){
      toast.error($i18n.t("Please select a topic.")); // Display the error message

    }else{
    toast.error($i18n.t("Please select a Position.")); // Display the error message
  }return; // Exit the function to prevent further action
  
}
 
    console.log(currentStep);
    if(currentStep==2){
      
      if (selectedDocuements.length==0) { 
            // Affiche un message toast si aucune sélection n'a été faite
            toast.error('Please select your CVs');
          } else if (selectedCategoryName ==""){
            toast.error('Please select a collection');
          }
          else
          {
        sortDocumentsByScore();
        totalPages = Math.ceil(selectedDocuements.length / itemsPerPage);
       
        
          }

    
    }
  // Ne pas passer à l'étape suivante si currentStep est 2 et que la longueur des documents == 0
  if (currentStep < 3 ) {
    if((currentStep===2 && selectedDocuements.length==0) || (currentStep===2 &&selectedCategoryName =="")){

    }
    else{
        currentStep++;
        updateStepperUI();}
    }
  
}

function toggleButton(selectedButton, job) {
  

    // Mettre à jour le job sélectionné
    selectedJob = job;
    console.log("Selected Job:", selectedJob);

    // Mettre à jour le dernier bouton sélectionné
    lastSelectedButton = selectedButton; // Référence au bouton cliqué
}



function updateButtonState() {
    const button = document.getElementById('validateButton');
    if (currentStep < 3) {
        button.disabled = false; // Activer le bouton si ce n'est pas la dernière étape
    } else {
        button.disabled = true; // Désactiver le bouton si c'est la dernière étape
    }
}




    

  // Interface pour le document RH
  interface DocumentRH {
    id: string;          // Identifiant unique du document
    nom: string;        // Nom de la personne
    prenom: string;     // Prénom de la personne
    nomDocument: string; // Nom du document
    document: string;    // Contenu ou chemin du document
  }





    function getFileSize(doc)  {
        console.log(getDocs);
   let size = 0;     
  if (doc && doc.file) {
    const sizeInBytes = doc.file.size; // Accéder à la taille du fichier
    return sizeInBytes;
  } else {
    console.warn('Aucun fichier disponible pour ce document');
    return 0; // Retourner une taille par défaut si aucun fichier n'est trouvé
  }
}
// Fonction pour gérer la soumission
async function handleSubmitType() {
if (!selectedPositionType) {
  // Affiche un message toast si aucune sélection n'a été faite
  toast.error($i18n.t("Please select a position type!"));
} else {
  if(selectedPositionType=="internship"){
    await fetchTopics();
  }else{
    await fetchJobs();
  }
  // Change l'état de ShowPositionstype pour masquer l'élément
  ShowPositionstype = false;
}
}
function openLinkedInProfile(linkedinUrl: string) {
  if (linkedinUrl) {
    window.open(linkedinUrl, '_blank');
  } else {
    console.error('Aucun lien LinkedIn fourni');
  }
}

let showDropdown = false;
  let selectedFilters = [];
  let filterValues = {};


// Liste des options de filtre
const filterOptions = [
    { value: 'mandatorySkills', label: 'Compétences responsibilities' },
    { value: 'optionalSkills', label: 'Compétences optionnelles' },
    { value: 'experience', label: 'Années d\'expérience' },
  ];

  // Gestion de la sélection d'un filtre
  const toggleFilter = (option) => {
    if (selectedFilters.includes(option.value)) {
      // Supprime le filtre si déjà sélectionné
      selectedFilters = selectedFilters.filter((filter) => filter !== option.value);
      delete filterValues[option.value];
    } else {
      // Ajoute le filtre si non sélectionné
      selectedFilters = [...selectedFilters, option.value];
      filterValues[option.value] = '';
    }
  };

  // Gestion de la suppression d'un critère sélectionné
  const removeFilter = (filter) => {
    selectedFilters = selectedFilters.filter((f) => f !== filter);
    delete filterValues[filter];
  };
  function selectAllDocuments() {
        // Mettez à jour chaque document pour le marquer comme sélectionné
        messages.forEach((doc) => {
            doc.selected = 'checked';  // Assurez-vous que l'état 'checked' correspond à votre logique
            console.log(doc)
        });
    }


  
  
  import { createEventDispatcher } from 'svelte';

  import ChevronLeft from '../icons/ChevronLeft.svelte';
  import ChevronRight from '../icons/ChevronRight.svelte';
  import Sidebar from '../layout/Sidebar.svelte';

    let currentPage = 1;
  const itemsPerPage = 5;

  // Calculate total pages
  $: totalPages = Math.ceil(selectedDocuements.length / itemsPerPage);


  function nextPage() {
    
    console.log('Total Pages:', totalPages);
  
  console.log('Current Page:', currentPage, 'Total Pages:', totalPages);
  if (currentPage < totalPages) {
    currentPage += 1;
    console.log('Next Page:', currentPage);
  } else {
    console.log('Next page not available');
  }
}
  // Navigate to the previous page
  function prevPage() {
    if (currentPage > 1) {
      currentPage -= 1;
    }
  }

  let currentPagePoste = 1; // Numéro de la page actuelle
  let itemsPerPagePoste = 3; // Nombre d'éléments par page
  let totalPagesPoste :number;
let Jobreference:string;

  // Fonction pour aller à la page suivante
  function nextPageposte() {
    if (currentPagePoste < totalPagesPoste) {
      currentPagePoste += 1;
    }
  }

  // Fonction pour aller à la page précédente
  function prevPageposte() {
    if (currentPagePoste > 1) {
      currentPagePoste -= 1;
    }
  }

  // Calculer la liste paginée en fonction de la page actuelle et de filteredJobs
$: paginatedJobs = filteredJobs.slice(
    (currentPagePoste - 1) * itemsPerPagePoste,
    currentPagePoste * itemsPerPagePoste
  );
  // Filtrage des emplois
$: filteredJobs = jobs.filter(
    (job) =>
      selectedPostName === '' || job.post_name.toLowerCase().includes(selectedPostName.toLowerCase())
  );
  // Recalculer le nombre total de pages chaque fois que filteredJobs change
  $: totalPagesPoste= Math.ceil(filteredJobs.length / itemsPerPagePoste);

// Filtrage des emplois
$: filteredJobs = jobs.filter(
    (job) =>
      selectedPostName === '' || job.post_name.toLowerCase().includes(selectedPostName.toLowerCase())
  );
  // Recalculer le nombre total de pages chaque fois que filteredJobs change
  $: totalPagesPoste= Math.ceil(filteredJobs.length / itemsPerPagePoste);

  import { goto } from '$app/navigation'; // Correct import for SvelteKit
  let chatCandidates = []; // To hold candidates with GoToChat set to true

// This function checks the selected documents and redirects accordingly
function redirectToChatbot() {
  const chatCandidates = selectedDocuements.filter(doc => doc.GoToChat === true);

  if (chatCandidates.length > 0) {
    // Convert chatCandidates to a query string
    const queryString = chatCandidates
      .map((candidate, index) => `candidate${index}=${encodeURIComponent(JSON.stringify(candidate))}`)
      .join('&');

    // Redirect to the chatbot route with query parameters
    goto(`/?${queryString}`);
  } else {
    toast.error("No candidate selected to go to the chatbot."); // Alert if no candidates are selected
  }
}
 
 
interface Categorie {
  id: string;
  name: string;
  description: string;
}
let categories: Categorie[] = [];

// Async function to fetch categories from the API
async function fetchCategories() {
  try {
     // Fetching collections from the API using the provided username
     const response = await fetch(`http://20.84.80.6:5000/collections/${username}`, {
      headers: {
        'accept': 'application/json'
      }
    });
    // Checking if the response is OK
    if (!response.ok) throw new Error('Error fetching categories');

    // Parsing the JSON response
    const data = await response.json();
    console.log('API Data:', data);

    // Mapping the data to the Categorie interface
    categories = data.map((item: any) => ({
      id: item._id, // Assuming MongoDB uses `_id`
      name: item,
      description: item.description || '' // Default to empty string if no description
    })) as Categorie[];

    // Logging the mapped categories
    console.log('Mapped Categories:', categories);
  } catch (error) {
    // Log errors if any occur during the fetch operation
    console.error('Error fetching categories:', error);
  }
}


  let selectedCategoryId = '';

let showCategoryModal = false;

let show =false;
const toggleCategoryModal = () => {
        showCategoryModal = !showCategoryModal;
    };
    let categoryName = '';
   
let successMessage = '';


const submitHandler = async () => {
  if (categoryName.trim()) {
    const newCategory = { name: categoryName.trim() };

    try {
      const response = await fetch('http://localhost:3002/categories_insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      });

      if (!response.ok) {
        const errorResponse = await response.json(); // Get the error response
        throw new Error(errorResponse.error || 'Failed to insert category'); // Log specific error
      }

      // Handle successful response
      const result = await response.json();
      console.log('Category inserted:', result);
      
      // Set the success message
      successMessage = 'La collection a été ajoutée avec succès !'; // Success message in French
      
      // Optionally, reset the category name input
      categoryName = ''; // Reset the input field if necessary

      
  
    } catch (error) {
      console.error('Erreur de soumission de collection:', error);
    }
  } else {
    console.warn('nom de collection est vide!.');
  }
  show=false;
  fetchCategories();
};


  function updateStatus(candidate, newStatus) {

    
    
    candidate.état = newStatus;
    candidate.buttonsDisabled = true; // Disable both buttons after clicking one
   
   
  }

    // Fonction pour extraire le nom du candidat
    function extractName(text) {
    const regex = /Nom\s*:\s*([A-Za-zÀ-ÿ\s\-]+)/; // Expression régulière pour extraire le nom
    const match = text.match(regex);
    return match ? match[1] : '-';
  }


  function extrairePartiesProfilEtScore(texte) {
    const parties = {};

    // Expression régulière pour capturer les détails (Nom, Prénom, Téléphone, Adresse, Email, Niveau d'expérience)
    //const regexDetails = /Nom\s*:\s*([^\n]*)\s*Prénom\s*:\s*([^\n]*)\s*Téléphone\s*:\s*([^\n]*)\s*Adresse\s*:\s*([^\n]*)\s*Email\s*:\s*([^\n]*)\s*Niveau d'expérience\s*:\s*([^\n]*)/;
   // const regexDetailss = /Nom\s*:\s*([^\n]*)\s*\*\s*Prénom\s*:\s*([^\n]*)\s*\*\s*Téléphone\s*:\s*([^\n]*)\s*\*\s*Adresse\s*:\s*([^\n]*)\s*\*\s*Email\s*:\s*([^\n]*)\s*\*\s*Niveau d'expérience\s*:\s*([^\n]*)/;
   const regexDetails = /Nom\s*:\s*([^\n]*)\s*\*?\s*Prénom\s*:\s*([^\n]*)\s*\*?\s*Téléphone\s*:\s*([^\n]*)\s*\*?\s*Adresse\s*:\s*([^\n]*)\s*\*?\s*Email\s*:\s*([^\n]*)\s*\*?\s*Niveau d'expérience\s*:\s*([^\n]*)/;

   const detailsMatch = texte.match(regexDetails);
    
    let nom = "";
    let prenom = "";
    let telephone = "";
    let adresse = "";
    let email = "";
    let niveauExperience = "";
    
    if (detailsMatch) {
        nom = detailsMatch[1].trim();
        prenom = detailsMatch[2].trim();
        telephone = detailsMatch[3].trim();
        adresse = detailsMatch[4].trim();
        email = detailsMatch[5].trim();
        niveauExperience = detailsMatch[6].trim();
    }

    // Expression régulière pour capturer les parties 1, 2, et 3
    const regexParties = /(Partie \d+)\s*:\s*(.+?)(?=(Partie \d+|$))/gs;

    let match;
    while ((match = regexParties.exec(texte)) !== null) {
        const [_, partie, contenu] = match;
        // On capture uniquement les trois premières parties
        if (["Partie 1", "Partie 2", "Partie 3"].includes(partie.trim())) {
            parties[partie.trim()] = contenu.trim();
        }
    }

    // Recherche du score après 4 étoiles, ou mentionné avec "note" ou "score", ou au format x/100
    const regexScore = /(?:\*{4}\s*\((\d+)\s*\/\s*100\)|(?:note|score|Note|Score)\s*(de|:)?\s*(\d+)|(\d+)\s*\/\s*100)/;
    const scoreMatch = texte.match(regexScore);
    const score = scoreMatch ? (scoreMatch[1] || scoreMatch[3] || scoreMatch[4]) : "Non trouvé"; // On prend le score de la première capture valide
    if(selectedPositionType=="internship"){
      nom=extractName(texte);
    }
    
    // Retourne les détails et le score
    return { nom, prenom, telephone, adresse, email, niveauExperience, ...parties, score };
}


async function evaluateCV(document_choice, langchain_mode, pre_prompt_query, prompt_query, system_prompt) {
    const apiUrl = 'http://20.84.80.6:5000/evaluate_cv/'; // URL de votre API

    // Construction de la charge utile pour le corps de la requête
    const body = {
        document_choice: [document_choice], // Utilise le nom de document passé en paramètre
        langchain_mode,
        pre_prompt_query,
        prompt_query,
        system_prompt
    };


    try {
        const response = await fetch(apiUrl, {
            method: 'POST', // Utilisation de POST
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body), // Envoi de la charge utile
        });

        // Vérifie si la réponse est correcte
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        

        // Vérifie si la réponse contient un tableau "responses"
        if (!Array.isArray(data.responses) || data.responses.length === 0) {
            throw new Error('No responses found in the data.');
        }

        // Extraire la première réponse
        const firstResponse = data.responses[0];
        console.log(firstResponse);

        const result = extrairePartiesProfilEtScore(firstResponse);

        // Afficher la réponse dans la console ou traiter comme souhaité
        console.log(result); // ou toute autre opération que vous souhaitez faire avec la réponse

        return result; // Retourne la première réponse
    } catch (error) {
        console.error('Error evaluating CV:', error);
        throw error; // Relance l'erreur pour être gérée plus haut dans la chaîne
    }
}


let langchain_mode = 'RessourcesHumaines';
  
  let prompt_query = 'Prêtez attention et retenez les informations ci-dessous, qui vous aideront à répondre à la question ou à l impératif après la fin du contexte.'
  let system_prompt = 'ProblemSolveFull';
  let result;

  function extraireTableauPartie3(texte) {
    // Expression régulière pour capturer la partie 3 du texte
    const regexPartie3 = /Tableau des points à surveiller\*\*\s*([\s\S]*?)(?=\*\*|$)/;
    const match = texte.match(regexPartie3);
    
    if (!match) {
        throw new Error("Partie 3 non trouvée dans le texte.");
    }

    // Récupérer le contenu du tableau
    const tableauTexte = match[1].trim();

    // Extraire les lignes du tableau en ignorant les lignes vides
    const lignes = tableauTexte.split('\n').filter(line => line.trim() !== '' && !line.startsWith('| --- |')); // Ignore la ligne d'en-tête

    // Initialiser un tableau pour les points à surveiller
    const pointsSurveiller = [];

    // Parcourir les lignes du tableau
    for (const ligne of lignes) {
        // Expression régulière pour capturer le critère et son évaluation
        const regexPoint = /\| (.+?) \| (.+?) \|/;
        const pointMatch = ligne.match(regexPoint);
        
        if (pointMatch) {
            const critere = pointMatch[1].trim(); // Récupère le critère
            const evaluation = pointMatch[2].trim(); // Récupère l'évaluation
            pointsSurveiller.push({ critere, evaluation });
        }
    }

    return pointsSurveiller; // Retourner le tableau des points à surveiller
}



async function EvaluteCv_enBoucle() {
  isLoading = true; // Afficher le loader
    // Itérer sur tous les documents sélectionnés
    for (const document of selectedDocuements) {
        // Appelez la fonction evaluateCV pour chaque document
      
        try {
            // Appelez la fonction evaluateCV
            const firstResponse = await evaluateCV(document.document,selectedCategoryName,preprompt, prompt_query, system_prompt);
            
           
            
            
            // Affectez le score et les autres parties au document
            document.score = firstResponse.score; // Affectez le score au document
           
            // Mappage des parties au document
            document.recap = {
                partie1: firstResponse['Partie 1'], // Assurez-vous que les clés correspondent
                partie2: firstResponse['Partie 2'], // Assurez-vous que les clés correspondent
                partie3: firstResponse['Partie 3'], // Tableau des points à surveiller
            };
            document.nom=firstResponse.nom.split(' ')[0];
            document.prenom=firstResponse.nom.split(' ').slice(1).join(' ');
            console.log(firstResponse.nom);
            refresh = !refresh; // Cela forcera Svelte à re-render car la variable change
            document.Téléphone=firstResponse.telephone;
            document.Email=firstResponse.email;
            document.Adresse=firstResponse.adresse;
            document.Niveau=firstResponse.niveauExperience;
          
            

         console.log(document);
        } catch (error) {
            console.error(`Erreur lors de l'évaluation de ${document.nom}:`, error);
        }
    }
    sortDocumentsByScore();
    // Vous pouvez effectuer d'autres actions après la validation ici
    isLoading = false; // Masquer le loader après l'évaluation



}


function extraireNomPrenom(texte) {
    // Expression régulière pour capturer le nom et le prénom dans le texte
    const regexNomPrenom = /([A-Za-zÀ-ÖØ-öø-ÿ-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)\s+est\s+/i;

    // Exécuter la regex sur le texte fourni
    const match = texte.match(regexNomPrenom);

    if (match) {
        const prenom = match[1];
        const nom = match[2];
        return { prenom, nom };
    } else {
        return { prenom: "Non trouvé", nom: "Non trouvé" };
    }
}
function formatProfileText(text) {
  // Vérifier s'il y a des étoiles (points) dans le texte
  if (text.includes('• ') || text.includes('* ')) {
    return text
      .replace(/\*\*/g, '')  // Enlever les double astérisques qui entourent les titres et sous-titres
      .replace(/\n\* /g, '\n• ')  // Remplacer les étoiles au début de ligne par des puces
      .replace(/\• \*\*/g, '\n• **')  // Assurer le maintien du format puce + sous-titre
      .replace(/\* /g, '• ')  // Remplacer les autres étoiles suivies d'un espace par des bullet points
      .replace(/(\n• [^\n]+)/g, '\n\n$1')  // Ajouter un double retour à la ligne avant chaque bullet point pour plus de clarté
      .trim();  // Nettoyer l'excès d'espaces
  } else {
    // Si aucun point trouvé, retourner le texte tel quel
    return text.trim();
  }
}

let refresh = false;
let selectedCategoryName = "";
  // Fonction pour obtenir le nom de la catégorie à partir de l'ID
  function getCategoryNameById(id) {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : ""; // Retourne le nom ou une chaîne vide si non trouvé
  }

  // Fonction pour gérer le changement de sélection
  function handleCategoryChange() {
    selectedCategoryName = getCategoryNameById(selectedCategoryId);
    
  }
  function convertTextToTable(input) {
    // Sépare le texte en lignes
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Commence le tableau HTML
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
    tableHtml += '<thead>';
    tableHtml += '<tr style="background-color: #f2f2f2; text-align: left;">';
    tableHtml += '<th style="padding: 10px; border-bottom: 2px solid #ddd;">Critère</th>';
    tableHtml += '<th style="padding: 10px; border-bottom: 2px solid #ddd;">Évaluation</th>';
    tableHtml += '</tr>';
    tableHtml += '</thead>';
    tableHtml += '<tbody>';

    // Traite chaque ligne
    for (let line of lines) {
        // Sépare le critère de l'évaluation
        const [criteria, evaluation] = line.split('|').map(part => part.trim());
        
        // Remplace les étoiles par des balises HTML
        const starCount = (evaluation.match(/\*/g) || []).length; // Compte le nombre d'étoiles
        const starsHtml = '★'.repeat(starCount).replace(/★/g, '<span style="color: gold;">★</span>');

        // Ajoute la ligne au tableau
        tableHtml += '<tr>';
        tableHtml += `<td style="padding: 10px; border-bottom: 1px solid #ddd;">${criteria}</td>`;
        tableHtml += `<td style="padding: 10px; border-bottom: 1px solid #ddd;">${starsHtml}</td>`;
        tableHtml += '</tr>';
    }

    // Termine le tableau
    tableHtml += '</tbody>';
    tableHtml += '</table>';

    return tableHtml;
}

async function fetchCvEvaluationPrompt(title, description, responsibilities, skills_required, degree, experience, portfolio, duration,nbprofiles) {   
  if(selectedPositionType=="internship"){
    const url = 'http://20.84.80.6:5000/generate_cv_evaluation_prompt_Stage';    
 
 // Convert arrays and fields into URLSearchParams for x-www-form-urlencoded format
 const params = new URLSearchParams();
 params.append('Post_name', title);
 params.append('project_Description', description);
 console.log(responsibilities);
 responsibilities.forEach(responsibility => params.append('skills_required', responsibility));
 params.append('profile_Level', degree);
console.log(params.toString());

 try {        
     // Sending the POST request
     const response = await fetch(url, {
         method: 'POST',
         headers: {
             'accept': 'application/json',
             'Content-Type': 'application/x-www-form-urlencoded'
         },
         body: params.toString()  // Serialize the body
     });

     // Check if the request was successful
     if (response.ok) {            
         const data = await response.json();            
         console.log("API Output:", data);            
         return data;
     } else {
         console.error("Error:", response.statusText);
     }
 } catch (error) {
     console.error("Error fetching data:", error);
 }

  }
  else {
    const url = 'http://20.84.80.6:5000/generate_cv_evaluation_prompt_STAR';    
 
    // Convert arrays and fields into URLSearchParams for x-www-form-urlencoded format
    const params = new URLSearchParams();
    params.append('title', title);
    params.append('description', description);
    console.log(responsibilities);
    responsibilities.forEach(responsibility => params.append('responsibilities', responsibility));
    skills_required.forEach(skill => params.append('skills_required', skill));
    params.append('degree', degree);
    params.append('experience', experience);
    params.append('portfolio', portfolio);
    console.log(params);
    try {        
        // Sending the POST request
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()  // Serialize the body
        });
 
        // Check if the request was successful
        if (response.ok) {            
            const data = await response.json();            
            console.log("API Output:", data);            
            return data;
        } else {
            console.error("Error:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
}
let preprompt="";

const processFile = async (file: File, langchain_mode: string, chunk = true, chunk_size = 512, embed = true) => {
  langchain_mode=selectedCategoryName;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('langchain_mode', langchain_mode);
  formData.append('chunk', chunk.toString());
  formData.append('chunk_size', chunk_size.toString());
  formData.append('embed', embed.toString());

  const response = await fetch('http://20.84.80.6:5000/process_file/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.token}`, // Si vous avez besoin d'un token
    },
    body: formData,
  });

  console.log(response);

  if (response.ok) {
    const data = await response.json();
    fetchDocuments(langchain_mode);
   
  
    toast.success(`File Uploaded successfully!`);
    return data; // Retourner les données pour une utilisation ultérieure
  } else {
    const errorData = await response.json();
    toast.error(`Erreur lors du traitement: ${errorData.detail || 'Erreur inconnue'}`);
    throw new Error(errorData.detail || 'Erreur inconnue');
  }
  

};

function extraireCompetencesEtEvaluations(texte) {
  const lignes = texte.split('\n'); // Sépare le texte par lignes
  const competencesEtEvaluations = [];

  // Expression régulière pour trouver les lignes pertinentes
  const regex = /^\| (.+?) \| (.+?) \|$/; // Correspond au format du tableau

  lignes.forEach((ligne) => {
    const match = ligne.trim().match(regex);
    if (match) {
      const competence = match[1].trim();
      const evaluation = match[2].trim();
      competencesEtEvaluations.push([competence, evaluation]);
    }
  });

  return competencesEtEvaluations;
}

function afficherTableauErgonomique(donnees) {
  // Sélectionner le div de sortie
  const outputDiv = document.getElementById("output");

  // Créer un tableau HTML
  let tableauHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px;">Compétence</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Évaluation</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Remplir le tableau avec les données
  donnees.forEach(([competence, evaluation]) => {
    tableauHTML += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${competence}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${evaluation}</td>
      </tr>
    `;
  });

  // Fermer les balises du tableau
  tableauHTML += `
      </tbody>
    </table>
  `;

  // Insérer le tableau dans le div de sortie
  outputDiv.innerHTML = tableauHTML;
}
let isLoading = false; // Variable pour gérer l'état du loader
let username = 'dev_user1'; // Nom d'utilisateur par défaut
let path='db_dir';

let responseData = null; // Pour stocker les données de la réponse
// Fonction pour ajouter un nouveau mode Langchain
async function addNewLangchainMode(user, mode, path) {
        isLoading = true; // Démarrer le chargement
        path=path+'_'+mode;
        console.log(path);
        try {
            // Construire l'URL avec les paramètres
            const response = await fetch(`http://20.84.80.6:5000/add_new_langchain_mode?username=${encodeURIComponent(user)}&langchain_mode=${encodeURIComponent(mode)}&langchain_path=${encodeURIComponent(path)}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json', // Indiquez que vous attendez une réponse au format JSON
                },
                body: null // Pas de corps de requête dans cet exemple
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            responseData = await response.json(); // Récupérez les données en format JSON
            console.log(responseData); // Affichez les données dans la console pour vérification
        } catch (err) {
            error = err.message; // Stockez l'erreur
            console.error('Error sending POST request:', error);
        } finally {
            isLoading = false; // Changez l'état de chargement
        }
    }

    function formatTextWithLineBreaks(inputText) {
    // Remplace les symboles '•' ou '*' par un retour à la ligne, et supprime les symboles
    const formattedText = inputText.replace(/[•*]/g, '\n');

    return formattedText.trim(); // Supprime les espaces inutiles au début ou à la fin
}


  // Fonction pour extraire les compétences et les niveaux
  function extractCompetencesAndLevels(text) {
    // Diviser le texte en lignes
    const lines = text.split('\n').filter(line => line.includes('|'));

    console.log("Lignes après filtrage:", lines); // Debug

    // Si le tableau n'a pas de lignes valides, retourner un tableau vide
    if (lines.length === 0) return [];

    // Supprimer les en-têtes et lignes de séparation (---)
    const dataLines = lines.slice(2);

    // Extraire les compétences et les niveaux
    const competences = dataLines.map(line => {
      const columns = line.split('|').map(cell => cell.trim());
      if (columns.length >= 3) { // Vérifier qu'il y a au moins 2 colonnes (compétence et niveau)
        return { competence: columns[1], level: columns[2] };
      }
      return null;
    }).filter(item => item !== null); // Filtrer les lignes malformées

    console.log("Compétences extraites:", competences); // Debug
    return competences;
  }

  let Showjobinfo=false;
   
   let experience;
   let Portfolio;
 





   let responsibilities = [
        "Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum",
        "Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum",
        "Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum",
        "Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum"
    ];

    let skills = [
        {
            name: "Angular",
            description: "Pour le développement frontend."
        },
        {
            name: "Angular",
            description: "Pour le développement frontend."
        }
    ];

    let other = {
        qualifications: "lorem ipsum",
        degree: "lorem ipsum",
        experience: "lorem ipsum",
        portfolio: "lorem ipsum"
    };

let jobdetail :Job;
    // Fonction pour stocker un job sélectionné dans la variable
    function jobdetails(job) {
      jobdetail = job;
      Showjobinfo=true;
        console.log('Job sélectionné:', jobdetail);
    }

    const closePopup = () => {
    Showjobinfo = false;
  };
</script>


<svelte:head>
  <title>
    {$i18n.t('RH')} | {"Weensight"}
  </title>
</svelte:head>

<AddDocModal bind:show={showAddDocModal} {uploadDoc} {processFile} />

<div class="stepper-wrapper ">
  <button class="stepper-item {currentStep > 1 ? 'completed' : 'active'}" on:click={() => goToStep_stepper(1)}>
    <div class="step-counter">1</div>
    <div class="step-name">{$i18n.t(selectedPositionType === 'internship' ? 'Choose your topic' : 'Choose your position')}</div>

    
</button>
<button class="stepper-item {currentStep > 2 ? 'completed' : 'active'}"  on:click={() => {

  if (!selectedJob) {
    // Display an error message
    if(selectedPositionType === "internship"){
      toast.error($i18n.t("Please select a topic.")); // Display the error message

    }else{
    toast.error($i18n.t("Please select a Position.")); // Display the error message
  }return; // Exit the function to prevent further action
  
}
 
  goToStep_stepper(2); // Proceed to the next step if a job is selected
}}
>
    <div class="step-counter">2</div>
    <div class="step-name">{$i18n.t('Select your CVs')}</div>
</button>
<button
  class="stepper-item {currentStep > 3 ? 'completed' : 'active'}"
  on:click={() => {
    if (currentStep === 1 && !selectedJob) {
      // Display an error message if no job is selected
      toast.error($i18n.t("Please select a position before proceeding to step 3.")); // Display the error message
      return; // Exit the function to prevent further action
    }

    if (selectedDocuements.length === 0) {
      // Display an error message if no documents are selected
      toast.error($i18n.t("Please select at least one CV.")); // Display the error message
      return; // Exit the function to prevent further action
    }

    goToStep_stepper(3); // Proceed to the next step if all conditions are met
  }}
>
    <div class="step-counter">3</div>
    <div class="step-name">{$i18n.t('Evaluate your CVs')}</div>
  </button>

</div>
{#if currentStep==2}

<div class="mb-3" style="display: flex; align-items:baseline;">
    <div class="flex justify-between items-center" style="width: 80%;">
      <div class=" text-lg font-semibold self-center">{$i18n.t('Select your CVs for the internship offer : ')+selectedJob?.post_name}</div>
    </div>

    <div class="my-3 w-full flex justify-between" style="display: flex;
    justify-content: flex-end; width:40%;" >
  
    <div class="flex items-center relative" style="display: flex; align-items: center; justify-content: center; margin-top: 18px;">
      <select
      class="w-fit pr-8 rounded px-2 text-xs outline-none text-left"
      style="background-color: white; color: black; border: 2px solid rgb(22, 140, 119); cursor: pointer; padding: 0.5rem 1rem; appearance: none; border-radius: 10px; width: 230px; height: 41px; font-size: 15px;"
      bind:value={selectedCategoryName}
      on:change={(event) => {
        
        fetchDocuments(selectedCategoryName ); // Make sure langchain_mode is defined
      }}
    >
      <option value="" disabled selected style="color: gray;">{$i18n.t('Select the collection')}</option>
      {#each categories as category}
        <option value={category.name} style="color: #006654; background-color: white;">{category.name}</option>
      {/each}
    </select>

    
    <button
    class="flex text-xs items-center space-x-1 px-3 py-1.5 rounded-xl custom-bg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 transition"
    style="margin-left: 15px;"
    on:click={() => {
     show=true;
    
    }}


 
  >
    <div class=" self-center mr-2 font-medium line-clamp-1" >{$i18n.t('Add a collection')}</div>

    <div class=" self-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 s-vcJllTiem_cB"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" class="s-vcJllTiem_cB"></path></svg>
    </div>
  </button>
  </div>
    </div>


    
  </div>


{#if show==true}

<div class="fixed inset-0  bg-opacity-10 flex justify-center items-center z-50" style="background-color: var(--color-gray-800, #33333394);">
  <div class="bg-white rounded-lg shadow-lg w-96" style="width:500px; margin-left: 150px;" >
    <div class="flex justify-between p-4 border-b">
      <div class="font-medium"  style="display: flex;
    text-align: center;
    align-items: center;">{$i18n.t('Add a collection')}</div>
      <button on:click={() => (show = false)} class="text-gray-600 hover:text-gray-800 text-xl p-1"> <!-- Increased font size and padding -->
        &times; 
      </button>
    </div>
    <div class="p-4">
      <label for="category-name" class="block mb-2">{$i18n.t('Name of the collection')}</label>
      <input
        id="category-name"
        type="text"
        bind:value={categoryName}
        class="border rounded-lg w-full p-2 mb-4"
        placeholder={$i18n.t("Enter the name of the collection")}
      />
      <div class="flex justify-end">
        <button
        on:click={() => {
          submitHandler(); // Appel de la première fonction
          addNewLangchainMode(username, categoryName, path); // Appel de la seconde fonction
        }}
      
          class="bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-4 rounded"
          style="border-radius: 17px;"
        >
          {$i18n.t('Save')}
        </button>
      </div>
    </div>
  </div>
</div>




{/if}
  <div class=" flex w-full space-x-2">
    <div class="flex flex-1">
      <div class=" self-center ml-1 mr-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            fill-rule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <input
        class=" w-full text-sm pr-4 py-1 rounded-r-xl outline-none bg-transparent"
      
        placeholder={$i18n.t('Search documents')}
        bind:value={searchTerm}
        on:input={() => { currentPage = 1; }}  
      />
    </div>


    
    <div>

  

      <button
        class="px-2 py-2 rounded-xl bg-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1 bckclr"
        aria-label={$i18n.t('Add Docs')}
        on:click={() => {
          showAddDocModal = true;
        }}
         disabled={selectedCategoryName === ''}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"
          />
        </svg>
      </button>
    

    </div>
  </div>
  <div>

  
  </div>
  
  
  <hr class=" dark:border-gray-850 my-2.5" />

  
  
  <div class="my-3 mb-5 ">
    <!-- Table header -->
    <div class="flex space-x-4 px-3 py-2 bg-gray-200 rounded-t-lg header">
      <div class="w-12"></div>
      <div class="flex-1 text-sm font-bold title">

        {$i18n.t('Document name')}
      </div>
  
      <div class="w-40 text-sm font-bold title">{$i18n.t('Document type')}</div>
      
      <div class="w-16"></div>
    </div>
    <div class="scrollbar-container">
    {#each messages.filter(doc => {
        const query = searchTerm.toLowerCase();
        // If the searchTerm is empty, return all documents
        if (searchTerm === '') {
            return true;
        }
        // Check if the nom, prenom, or nomDocument fields include the search term
        return (
            doc.nom.toLowerCase().includes(query) ||
            doc.prenom.toLowerCase().includes(query) ||
            doc.nomDocument.toLowerCase().includes(query)
        );
    }) as doc }
    
      <button
        class="flex space-x-4 cursor-pointer text-left w-full px-3 py-2 dark:hover:bg-white/5 hover:bg-black/5 border-b rounded-xl"
        on:click={() => {   
        toggleDocumentSelection(doc);
        doc.selected = doc.selected === 'checked' ? 'unchecked' : 'checked' ;
        
        }}
      >
        <div class="my-auto flex items-center">
          <Checkbox state={doc.selected ?? 'unchecked'} />
        </div>
  
        <!-- Document details -->
        <div class="flex flex-1 space-x-4 cursor-pointer w-full ">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-red-400 text-white rounded-lg ">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                <path fill-rule="evenodd"
                  d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z"
                  clip-rule="evenodd" />
                <path
                  d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
              </svg>
            </div>
            <div class="self-center flex-1">
              <div class="font-semibold line-clamp-1">
                {doc.nomDocument}
               
              </div>
              <div class="text-xs overflow-hidden text-ellipsis line-clamp-1">
                {doc.document}
              </div>
            </div>
          </div>
        </div>

        <div class="w-40 text-sm font-medium title">
          
          {getFileType(doc.nomDocument)}
        </div>
 
        <!-- Edit/Delete actions -->
        <div class="flex flex-row space-x-1 self-center">
          <div class="document-item">
            <button on:click={() =>    event.stopPropagation() } >
            <button class="view-cv-icon" on:click={() =>  afficherCVEnPopup(doc.nomDocument) }>
              <img src="/voir-les-details.png" alt="View CV" />
            </button>
          </button>
          </div>



          {#if isPopupVisible}
          <div class="fenetre-popup" on:click={fermerPopup}>
            <div class="contenu-popup" on:click|stopPropagation>
              <div style="width: 100%; margin-bottom: 60px;">
                <span class="titre">{Nomdoc}</span>
                <div  on:click={event?.stopPropagation}>


              
                  <span class="fermer" on:click={fermerPopup}>&times;</span>
                </div>
              </div>
            
              <iframe id="myIframe" src={documentURL} class="cadre-pdf" allow="fullscreen"></iframe>
            </div>
          </div>
        {/if}
        
              
          <!-- Delete button -->
          <button
            class="self-center w-fit text-sm px-2 py-2 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
            aria-label={$i18n.t('Delete Doc')}
            on:click={(e) => {
              e.stopPropagation();
              deleteDocByName(doc.nomDocument);
            }}
          >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          </button>
        </div>
      </button>
  {:else} 
  {#if selectedCategoryName==""}
    <!-- Message if the list is empty -->
    <div class="text-gray-500 py-4 text-center">
      <strong>{$i18n.t('No collection is selected')}</strong>
  </div>
    {:else}
    <div class="text-gray-500 py-4 text-center">
      <strong>{$i18n.t('No CV matches your search')}</strong>
  </div>
    {/if}
  {/each}
</div>

  
</div>



{/if}
{#if currentStep == 1}
{#if ShowPositionstype == true}

<div class="Position-container">

<div class="Position-selection">
  {#if ShowPositionstype == true}
    <div style="display: flex; flex-direction: column;width: 320px; align-items: center;">
      <!-- Titre -->
      <h2 class="card-title">{$i18n.t('Types of Positions')} </h2>

      <!-- Dropdown -->
      <select id="positions-dropdown" class="styled-dropdown mt-2" bind:value={selectedPositionType}>
          <option value="" disabled selected>{$i18n.t('Select a Type of Position')}</option>
          <option value="internship">{$i18n.t('Internship Positions')}</option>
          <option value="employment">{$i18n.t('Employment Positions')}</option>
      </select>
               <!-- Bouton Soumettre -->
              <button id="validateButton" class="flex items-center justify-center mt-4" on:click={handleSubmitType}>
                  {$i18n.t('Submit')}
                 </button>
    
    </div>
  
  {/if}
</div>
</div>

{/if}
{#if showAddForm==false && ShowPositionstype==false}

<div class=" flex w-fit rounded-xl p-1.5 bg-white space-x-2"style='border: 2px solid #d1d5db;
'>
  <div class="flex flex-1">
    <div class=" self-center ml-1 mr-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="w-4 h-4"
      >
        <path
          fill-rule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
    <input
      class=" w-full text-sm pr-4 py-1 rounded-r-xl outline-none "
      bind:value={selectedPostName}
      placeholder={$i18n.t('Position Search')}
    />
        
  </div>

  
</div>
<hr class="dark:border-gray-850 my-6" />
{#if paginatedJobs.length==0}
  <div style="display: flex; justify-content: center;">
  <p style="font-size: large;">{$i18n.t('No position matches your search.')}
  </p> 
  </div>
  {:else}
<div class="cards-container">
  {#each paginatedJobs as position}
  <div class="card">
    <!-- Bouton Modifier en haut à droite -->
    <button style="{$i18n.language === 'ar-BH' ? '' : 'right: 10px'}"
      class="px-2 py-2 rounded-xl border edit-button border-gray-200 dark:border-gray-600 dark:border-0 button-plus hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
      aria-label={$i18n.t('Add Docs')} on:click={(event) => openEditInterface(position)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-fill" viewBox="0 0 16 16">
        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
      </svg>
    </button>
  
    <h3 class="card-title">{position.post_name}</h3>
  
    <div class="skills-section {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
      <div style="display: flex; justify-content:space-between;">
        <strong class="mini-title">{$i18n.t(selectedPositionType === 'internship' ? 'Topic Description :' : 'Job Description :')}</strong>
        <div style="display: flex; align-items:center;">
        <!-- Icône d'info à gauche -->
        <button class="info-button" on:click={() => jobdetails(position)}>
          <img src="/info.png" alt="Info Icon" class="custom-info-icon" />
        </button>
    
      </div>
      </div>
      <p class="description-text">{position.description}</p> 

    </div>




  

    <button class="{selectedJob && selectedJob.post_name === position.post_name ? 'selected' : 'select-button'}"
    on:click={async (event) => {
        toggleButton(event.target, position);
        
               // Appel de la fonction `fetchCvEvaluationPrompt` avec les paramètres extraits de `selectedJob`
const prepromptValue = await fetchCvEvaluationPrompt(
  position.post_name, // Titre du poste
  position.description, // Description du poste
  position.mandatory_skills, // Compétences obligatoires
  position.optional_skills, // Compétences optionnelles
  position.qualifications.degree, // Diplôme
  position.qualifications.experience, // Expérience
  position.qualifications.portfolio, // Portfolio (facultatif)
  position.duration, // durée du stage
  position.nb_profiles // nombre de profils demandés
);
    // Vérifier que prepromptValue est un tableau et prendre le premier élément
if (Array.isArray(prepromptValue) && prepromptValue.length > 0) {
    preprompt = prepromptValue[0]; // Assigner le premier élément à preprompt
} else {
    // Gérer le cas où prepromptValue n'est pas un tableau ou est vide
    preprompt = ''; // Ou une valeur par défaut appropriée
}

        // Log pour vérifier la valeur de preprompt
        console.log(preprompt);
    }}>
      {selectedJob && selectedJob.post_name === position.post_name
        ? $i18n.t('Selected')
        : $i18n.t('Select')}
    </button>
  </div>
  {/each}
</div>


<!-- Pagination -->
<div class="flex justify-center">
  <div class="my-2 flex items-center">
    <!-- Bouton page précédente -->
    <button
      class=" mr-[25px] inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-700 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent"
      on:click={prevPageposte}
      disabled={currentPagePoste === 1}
    >
      <ChevronLeft class="size-4" strokeWidth="2" />
    </button>

    <!-- Boutons de pages -->
    <div class="flex items-center gap-2.5">
      {#each Array(totalPagesPoste) as _, index (index)}
        <button
          class=" inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium hover:bg-dark-10 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent {currentPagePoste === (index + 1) ? 'pagination-arrow bg-color-pag text-gray-100' : ''}"
          on:click={() => goToPage(index + 1)}
        >
          {index + 1}
        </button>
      {/each}
    </div>

    <!-- Bouton page suivante -->
    <button
      class=" ml-[25px] inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-700 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent"
      on:click={nextPageposte}
      disabled={currentPagePoste === totalPagesPoste}
    >
      <ChevronRight class="size-4" strokeWidth="2" />
    </button>
  </div>
</div>
  <div class="button-container  ">
    <button class="bold-icon flex items-center justify-center custom-bg hover:custom-bg-hover" on:click={() => showForm()}>
           {$i18n.t(selectedPositionType === 'internship' ? 'Add topic +' : 'Add position +')}    

      
      </button>
      
      <button id="validateButton" class="flex items-center justify-center" on:click={() => validateStep()}>
          {$i18n.t('Submit')}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-check ml-2 " viewBox="0 0 16 16">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
        </svg>
      </button>
      
      
</div>

{/if}
  {/if}
{#if showAddForm && ShowPositionstype==false}
  <div class="message-details">
    <div class="info-container">
      <div class="info-box" style="direction: {$i18n.language === 'ar-BH' ? 'rtl' : 'ltr'}; 
      text-align: {$i18n.language === 'ar-BH' ? 'right' : 'left'}; 
      flex-direction: {$i18n.language === 'ar-BH' ? 'row-reverse' : 'row'}
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      ">
      <strong class="mini-title">
        {$i18n.t(selectedPositionType === 'internship' ? 'Your topic' : 'Your position')}
      </strong>
      <br>
        <div style="margin-top: 2rem;">
        <label style=" font-weight: bold;
    padding: 1px;"> {$i18n.t(selectedPositionType === 'internship' ? 'Topic title' : 'Position title')}</label>
        <input 
        bind:value={newPosition}
        class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none" 
        placeholder={$i18n.t(selectedPositionType === 'internship' ? 'Add your topic title' : 'Add your position title')}    
    />
  </div>
  <div style="margin-top: 2rem;">

    <label style=" font-weight: bold;
        padding: 1px;"> {$i18n.t(selectedPositionType === 'internship' ? 'Topic Description' : 'Position Description')}</label>

    <textarea
    bind:value={poste_description}
    class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none"
    style="height: 150px;"
    placeholder={$i18n.t(selectedPositionType === 'internship' ? 'Add your topic description' : 'Add your position description')}    

  />
</div>
  
      </div>
      <div class="info-box" style="direction: {$i18n.language === 'ar-BH' ? 'rtl' : 'ltr'}; 
      text-align: {$i18n.language === 'ar-BH' ? 'right' : 'left'}; 
      flex-direction: {$i18n.language === 'ar-BH' ? 'row-reverse' : 'row'}
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      ">
      <strong class="mini-title">{$i18n.t(selectedPositionType === 'internship' ? 'Administrative specifications' : 'Qualifications')}</strong> <br> 
        <div style="margin-top: 2rem;">
          <label style=" font-weight: bold;
    padding: 1px;">{$i18n.t('Degree')}</label>
        <input 
        bind:value={Degree}
        class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none" 
        placeholder={$i18n.t('Add your Degree')}        
    />

  </div>

  {#if selectedPositionType === "internship"}
  <div style="margin-top: 2rem;">
    <label style=" font-weight: bold;
     padding: 1px;">{$i18n.t('Number of profiles')}</label>
    <input 
    bind:value={nb_profiles}
    class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none" 
    placeholder={$i18n.t('Add the number of profiles')}        
    />
  </div>
  <div style="margin-top: 2rem;">
    <label style=" font-weight: bold;
padding: 1px;">{$i18n.t('Duration')}</label>
    <textarea
    bind:value={duration}
    class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none"
    placeholder={$i18n.t('Add your duration')}
  />
  </div>
{:else}

  <div style="margin-top: 2rem;">
    <label style=" font-weight: bold;
     padding: 1px;">{$i18n.t('Experience')}</label>
    <input 
    bind:value={experience}
    class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none" 
    placeholder={$i18n.t('Add your Experience')}        
    />
  </div>
  <div style="margin-top: 2rem;">
    <label style=" font-weight: bold;
padding: 1px;">{$i18n.t('Portfolio')}</label>
    <textarea
    bind:value={Portfolio}
    class="px-3 py-1.5 text-sm w-full input-style height dark:border-gray-600 outline-none"
    placeholder={$i18n.t('Add Your Portfolio')}
  />
  </div>
  {/if}
      </div>
      <div class="info-box" style="direction: {$i18n.language === 'ar-BH' ? 'rtl' : 'ltr'}; 
      text-align: {$i18n.language === 'ar-BH' ? 'right' : 'left'}; 
      flex-direction: {$i18n.language === 'ar-BH' ? 'row-reverse' : 'row'}; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      ">
      <strong class="mini-title">{$i18n.t(selectedPositionType === 'internship' ? 'Required Skills' : 'Responsibilities')}</strong> <br> 
    <div class="skills-section">
      {#if NewMandatorySkills.length > 0}
        <ul class="skills-container">
          {#each NewMandatorySkills as skill, index}
            <li class="skills-list" style="display: flex; align-items: center; justify-content: space-between;">
              <span class="skill">{skill}</span>
              
              <!-- Bouton 'x' pour supprimer l'élément -->
              <button class="delete-skill-btn" on:click={() => removeSkill(index, 'mandatory')}>
                ✕
              </button>
            </li>
          {/each}
        </ul>
      {:else}
      <p>{$i18n.t(selectedPositionType === 'internship' ? 'No required skills' : 'No Responsibilities')}</p> 
      {/if}

    </div>
    
    <br>
    <div style="display: flex; justify-content: center;">
      <button
        class="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-0 custom-bg hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
        aria-label={$i18n.t(selectedPositionType === 'internship' ? 'Enter Your skills' : 'Enter Your responsibilities')}    

        on:click={() => {
          if (MandatorySkillsInputs.length > 1 || MandatorySkillsInputs[0] !== "") {
            MandatorySkillsInputs = MandatorySkillsInputs.filter(skill => skill.trim() !== "");
            MandatorySkillsInputs.push("");
          }
          ShowAddMandatorySkillModal = true;
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
        </svg>
      </button>
    </div>

    
</div>

            {#if selectedPositionType === "internship"}
{:else}
<div class="info-box" style="direction: {$i18n.language === 'ar-BH' ? 'rtl' : 'ltr'}; 
text-align: {$i18n.language === 'ar-BH' ? 'right' : 'left'}; 
flex-direction: {$i18n.language === 'ar-BH' ? 'row-reverse' : 'row'};
display: flex;
flex-direction: column;
justify-content: space-between;">
<strong class="mini-title">{$i18n.t('Required Skills')}</strong>
<div class="skills-section">
{#if NewOptionalSkills.length > 0}
<ul class="skills-container">
  {#each NewOptionalSkills as skill, index}
    <li class="skills-list" style="display: flex; align-items: center; justify-content: space-between;">
      <span class="skill">{skill}</span>
      
      <!-- Bouton 'x' pour supprimer l'élément dans Compétences optionnelles -->
      <button class="delete-skill-btn" on:click={() => removeSkill(index, 'optional')}>
        ✕
      </button>
    </li>
  {/each}
</ul>
{:else}
<p>{$i18n.t('No Required Skills')}</p>
{/if}
</div>


<br> 
    <div style="display: flex;justify-content: center;margin-bottom: 5px;">
      <button
        class=" px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-0 custom-bg hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
        aria-label={$i18n.t('Add Required Skills')}
        on:click={() => {
          if (optionalSkillsInputs.length > 1 || optionalSkillsInputs[0]!="") {
    optionalSkillsInputs = optionalSkillsInputs.filter(skill => skill.trim() !== "");
    optionalSkillsInputs.push("");
  }
        
          ShowAddOptionalSkillModal = true;
        }}

        
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"
          />
        </svg>
      </button>
      
    </div>
    </div> 
    {/if}
    </div>
  </div>
  <div class="button-container ">
    <button class="custom-bg hover:custom-bg-hover" on:click={() => hideForm()}>
       {$i18n.t('Cancel')} 
      </button>

      <button id="validateButton" on:click={() => updateMode ? UpdatePosition(Jobreference,newPosition,NewMandatorySkills,NewOptionalSkills,poste_description,Degree,experience,nb_profiles,Portfolio,duration) : AddPosition(newPosition,NewMandatorySkills,NewOptionalSkills,poste_description,Degree,experience,Portfolio,nb_profiles,duration)}>
    {updateMode ? $i18n.t('Update') : $i18n.t('Add')}
  </button>
</div>
{#if ShowAddMandatorySkillModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <h3>{$i18n.t(selectedPositionType === 'internship' ? 'Enter Your skills' : 'Enter Your responsibilities')}    </h3>
        <button class="close-button" on:click={handleCancelMandatory}>
          &times;
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- Inputs for Compétences optionnelles -->
        {#each MandatorySkillsInputs as skillInput, index}
          <div class="input-group">
            <input
              bind:value={MandatorySkillsInputs[index]}
              class="input-style"
              placeholder={$i18n.t(selectedPositionType === 'internship' ? 'Enter a skill' : 'Enter a responsibility')}
            />
            {#if index === MandatorySkillsInputs.length - 1} <!-- Only show "+" for the last input -->
              <div>
                <button
                  class="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-0 button-plus hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
                  aria-label={$i18n.t(selectedPositionType === 'internship' ? 'Enter a skill' : 'Enter a responsibility')}
                  on:click={addMandatorySkillInput}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"
                    />
                  </svg>
                </button>
              </div>
            {:else}
              <!-- Empty div for spacing -->
              <div class="input-spacing"></div>
            {/if}
          </div>
        {/each}
      </div>

      
      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="custom-bg hover:custom-bg-hover" on:click={handleCancelMandatory}>
          {$i18n.t('Cancel')}
      </button>
      
        <button id="validateButton" on:click={addMandatorySkills}>
          {$i18n.t('Add')}
        </button>
      </div>
    </div>
  </div>
{/if}
{#if ShowAddOptionalSkillModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <h3>{$i18n.t('Add your required skills')}</h3>
        <button class="close-button" on:click={handleCancelOptional}>
          &times;
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- Inputs for Compétences optionnelles -->
        {#each optionalSkillsInputs as skillInput, index}
          <div class="input-group">
            <input
              bind:value={optionalSkillsInputs[index]}
              class="input-style"
              placeholder={$i18n.t('Enter a required skill')}
            />
            {#if index === optionalSkillsInputs.length - 1} <!-- Only show "+" for the last input -->
              <div>
                <button
                  class="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-0 button-plus hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
                  aria-label={$i18n.t('Add Docs')}
                  on:click={addOptionalSkillInput}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"
                    />
                  </svg>
                </button>
              </div>
            {:else}
              <!-- Empty div for spacing -->
              <div class="input-spacing"></div>
            {/if}
          </div>
        {/each}
      </div>

      

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="custom-bg hover:custom-bg-hover" on:click={handleCancelOptional}>
          {$i18n.t('Cancel')}
        </button>
        <button id="validateButton" on:click={addOptionalSkills}>
          {$i18n.t('Add')}
        </button>
      </div>
    </div>
    
  </div>
  
{/if}
{/if}

{/if}


{#if  currentStep === 2}
  <div class="button-container">
    <button id="validateButton" on:click={() => { validateStep(); EvaluteCv_enBoucle(); }}>
      {#if currentStep === 2}
    {$i18n.t('Evaluate')}
        <img src="/Eval.png" alt="Evaluer Icon" class="icon" />
      {/if}
    </button>
  </div>
{/if}

{#if isLoading}
<div class="loader-overlay">
  <div class="loader-maxance">
      <div class="img-loader">
          <img src="/weensight_circle.png" alt="Loader Image">
      </div>
  </div>
</div>
{/if}


{#if currentStep==3}


<div class="mb-3">
  <div class="flex justify-between items-center">
    <div class=" text-lg font-semibold self-center">{$i18n.t('Evaluation of CVs for the position : ')+selectedJob?.post_name}</div>
  </div>
</div>


<div class="flex items-center justify-between mb-4">
  <!-- Input de recherche avec largeur fixe -->
  <div  style="display: flex;">
  <input
    type="text"
    class="search-input rounded-xl py-1.5 px-4 text-sm dark:text-gray-300 dark:bg-gray-850 outline-none bordure"
    style="margin-right: 10px;"
    placeholder={$i18n.t("Search...")}
    bind:value={searchTermcvs} 
  />

  <!-- Bouton avec icône pour ouvrir la liste déroulante -->
  <button 
    class="filter-button ml-4 flex items-center p-2 bg-gray-200 dark:bg-gray-850 rounded"
    on:click={() => showDropdown = !showDropdown}
  >
    <img src="/filterAvance.png" alt="Filter" class="w-6 h-6" />
  </button> 

  
</div>



<div style="display: flex;">
  <!-- Bouton d'exportation avec largeur fixe -->
  <button
    class="export-button flex items-center px-3 py-1.5 rounded-xl button-custom text-gray-800 dark:text-gray-200 transition"
    on:click={downloadExcel}
    style="margin-right: 10px;"
  >
    <div class="self-center mr-2 font-medium" style="font-size: 13px;
">
      {$i18n.t('Export Applications')}
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
      <path fill-rule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm4 3.5a.75.75 0 0 1 .75.75v2.69l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l.72.72V6.25A.75.75 0 0 1 8 5.5Z" clip-rule="evenodd"/>
    </svg>
  </button>

  <button
  class="export-button flex items-center px-3 py-1.5 rounded-xl button-custom text-gray-800 dark:text-gray-200 transition"
  on:click={redirectToChatbot}
  disabled={selectedDocuements.every(doc => !doc.GoToChat)}
>
  
  <div class="self-center mr-2 font-medium" style="font-size: 13px;">
    {$i18n.t('chatbot Weensight')}
  </div>
  <img src="/Chat_weensight.png" alt="Weensight Chat" class="w-4 h-4 mr-2" /> <!-- Add the image here -->
</button>

</div>
</div>
<!-- Liste déroulante avec cases à cocher -->
{#if showDropdown}
  <div class="dropdown bg-white dark:bg-gray-850 shadow rounded-lg p-4 mt-2 absolute z-10">
    {#each filterOptions as option}
      <label class="flex items-center space-x-2 mb-2">
        <input
          type="checkbox"
          checked={selectedFilters.includes(option.value)}
          on:change={() => toggleFilter(option)}
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
{/if}

<!-- Liste des critères sélectionnés avec champs de saisie et icône de suppression -->
<div class="mt-4 space-y-2" style="width: 300px;display:flex;margin-bottom: 15px;">
  {#each selectedFilters as filter}
    <div class="flex items-center space-x-2" style="margin-right:10px;">
      <input
        type="text"
        bind:value={filterValues[filter]}
        placeholder={`Entrez la valeur pour ${filterOptions.find(opt => opt.value === filter).label}`}
        class="rounded-xl py-1.5 px-4 text-sm dark:text-gray-300 dark:bg-gray-850 outline-none bordure flex-grow"
      />
      <!-- Icône de suppression pour retirer le filtre -->
      <button on:click={() => removeFilter(filter)} class="p-1 bg-red-500 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4 text-white">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<div>

  {#if refresh}

<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-auto max-w-full s-FoVA_WMOgxUD">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-850 dark:text-gray-400 s-FoVA_WMOgxUD">
      <tr class="s-FoVA_WMOgxUD">
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('date')} 
        style="text-align: center; border: none; border-radius: 15px 0 0 0; text-transform: none; background-color:#9FD5B5">
    </th>


    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
    on:click={sortByName} 
    style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
    {$i18n.t('Ranking')} {nameSortOrder === 'asc' ? '↑' : '↓'}
</th>

<th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
    on:click={sortByFirstName} 
    style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Candidate')} {firstNameSortOrder === 'asc' ? '↑' : '↓'}
</th>

  

    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      {$i18n.t('Score')}
    </th>

    <!--<th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
  style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Linkedin')}
  </th>-->
  <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
  style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Status')}
  </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('sentiment')} 
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      
{$i18n.t('Summary')} 
    </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('sentiment')} 
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      
        {$i18n.t('Details of the application')}
      </th>
        
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" style="text-align: center; border: none; border-radius: 0 15px 0 0; text-transform: none; background-color:#9FD5B5"></th>
        
      </tr>
    </thead>
    <tbody class="s-FoVA_WMOgxUD">

        
      {#if selectedDocuements.filter((message) => {
        const query = searchTermcvs.toLowerCase();  // Ensure the correct variable is used
        if (searchTermcvs === '') {
          return true;
        } else {
          const nom = message.nom.toLowerCase();
          const prenom = message.prenom.toLowerCase();
        
      
          return (
            nom.includes(query) ||
            prenom.includes(query) 
          
          );
        }
      }).length === 0}



        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: white; background-color:white;">
              <p style="color:gray"> {$i18n.t('No CVs match your search')}</p>
          </td>
        </tr>
      {:else}
      
      {#each selectedDocuements
        .filter((message) => {
          const query = searchTermcvs.toLowerCase();
          if (searchTermcvs === '') return true;
          const nom = message.nom.toLowerCase();
          const prenom = message.prenom.toLowerCase();
          return nom.includes(query) || prenom.includes(query);
        })
        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) as cv}
<tr 
class="text-xs hover-row" 
style="background-color: white; border-bottom: 1px solid rgba(0, 0, 0, 0.1);" 
on:click={() => cv.GoToChat = !cv.GoToChat}
>
<td style="text-align: center; border-right: none;">
  <input 
      type="checkbox" 
      checked={cv.GoToChat} 
      on:change={() => cv.GoToChat = !cv.GoToChat} 
      style="accent-color: #006654;"
  />
</td>

          <td class="rank-cell" style="text-align: center; border-right: none; height:50px; font-size:10px; font-size: 14px; align-items: center;">
            
            {#if cv.Rank === 1}
          
            <img src="/firstone.png" alt="Gold Rank" width="30" height="30" />
        
          {:else if cv.Rank === 2}
            <img src="/second.png" alt="Silver Rank" width="30" height="30" />
          {:else if cv.Rank === 3}
            <img src="/third.png" alt="Bronze Rank" width="30" height="30" />
            
          {:else}
            #{cv.Rank} <!-- Affiche le rang pour les autres -->
          {/if}
        </td>
      
        <td style="text-align: center; border-right: none; height:50px; font-size:14px;">
          {cv.nom && cv.prenom ?cv.prenom +" "+ cv.nom : '-'}
        </td>
        
      

       
            <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">{cv.score ? cv.score : '-'}</td>

           <!-- <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">
              <button class="view-cv-icon" on:click={openLinkedInProfile(cv.Linkedin)}>
                <img src="/linkedin.png" alt="View CV" />
              </button>
            </td>-->
            <td style="text-align: center; border-left: none; border-right: none; font-size: 14px;">
              <div style="display: flex; justify-content:center; align-items:center;">
                <button 
                  class="flex items-center gap-2 text-xs px-3 py-0.5 rounded-lg 
                    {cv.état === 'treated' && 'text-green-600 bg-green-200/30'} 
                    {cv.état === 'ongoing' && 'text-yellow-600 bg-yellow-200/30'} 
                    {cv.état === 'invalid' && 'text-red-600 bg-red-200/30'}"
                  on:click={() => handleStatusClick(cv.état)}
                >
                  <div 
                    class="w-1 h-1 rounded-full 
                      {cv.état === 'Treated' && 'bg-green-600'} 
                      {cv.état === 'ongoing' && 'bg-yellow-600'} 
                      {cv.état === 'invalid' && 'bg-red-600'}">
                  </div>
                  {cv.état ? $i18n.t(cv.état) : '-'}
                </button>
              </div>
            </td>
            
            <td style="text-align: center; border-left: none; border-right: none;    font-size: 14px;">


              <button class="view-cv-icon" on:click={openRecap(cv)}>
                <img src="/recap.png" alt="View CV" />
              </button>
              
            </td>
            <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">
                <button class="view-cv-icon" on:click={openModal(cv)}>
                    <img src="/detailscondidature.png" alt="View CV" />
                  </button>
            </td>
            <td style="text-align: center; border-left: none; border-right: none; font-size: 14px;">
              <div class="flex justify-center space-x-2">
                
                <button 
                class="flex items-center justify-center bg-white border border-gray-300 w-10 h-10 rounded-lg"
                style="    height: 30px;
    width: 30px; " 
    on:click={() => {
      
      updateStatus(cv, 'invalid');        
      cv.GoToChat = !cv.GoToChat;         
    }}
    disabled={cv.buttonsDisabled}
  >
                     
                       
                <img src="/nonvalide.png" alt="Not Valid" class="w-5 h-5" style="width: 10px;
    height: 10px;" />
              </button>
          
              
                <!-- Valid Button -->
                <button 
                  class="flex items-center justify-center bg-green-600 text-white w-10 h-10 rounded-lg"
                    style="height: 30px;  width: 30px;     background-color: #006654;"
                    on:click={() => {
      
                      updateStatus(cv, 'ongoing');        
                      cv.GoToChat = !cv.GoToChat;         
                    }
                  }
                    disabled={cv.buttonsDisabled}
               
                >

                
                  <img src="/Valide.png" alt="Valid" class="w-5 h-5"  style="width: 10px;
                  height: 10px;"/>
                </button>
            
                <!-- Not Valid Button -->

              </div>
            </td>
            
      
          </tr>
        {/each}
      {/if}
    </tbody>
    
  </table>
  
  {:else}
  <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-auto max-w-full s-FoVA_WMOgxUD">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-850 dark:text-gray-400 s-FoVA_WMOgxUD">
      <tr class="s-FoVA_WMOgxUD">
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('date')} 
        style="text-align: center; border: none;{$i18n.language === 'ar-BH' ? 'border-radius: 0px 15px 0 0;' : 'border-radius:15px 0px 0 0'}  text-transform: none; background-color:#9FD5B5">
    </th>


    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
    on:click={sortByName} 
    style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
    {$i18n.t('Ranking')} {nameSortOrder === 'asc' ? '↑' : '↓'}
</th>

<th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
    on:click={sortByFirstName} 
    style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Candidate')} {firstNameSortOrder === 'asc' ? '↑' : '↓'}
</th>




    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      {$i18n.t('Score')} 
    </th>

   <!-- <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
  style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Linkedin')}
  </th>-->
  <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
  
  style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
  {$i18n.t('Status')}
  </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('sentiment')} 
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      
{$i18n.t('Summary')} 
    </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('sentiment')} 
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
      
        {$i18n.t('Details of the application')}
      </th>
        
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" style="text-align: center; border: none;{$i18n.language === 'ar-BH' ? 'border-radius:15 0px 0 0;' : 'border-radius:0px 15px 0px 0px'}  text-transform: none; background-color:#9FD5B5"></th>
        
      </tr>
    </thead>
    <tbody class="s-FoVA_WMOgxUD">

        
      {#if selectedDocuements.filter((message) => {
        const query = searchTermcvs.toLowerCase();  // Ensure the correct variable is used
        if (searchTermcvs === '') {
          return true;
        } else {
          const nom = message.nom.toLowerCase();
          const prenom = message.prenom.toLowerCase();
        
      
          return (
            nom.includes(query) ||
            prenom.includes(query) 
          
          );
        }
      }).length === 0}



        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: white; background-color:white;">
              <p style="color:gray"> {$i18n.t('No CVs match your search')}</p>
          </td>
        </tr>
      {:else}
      
      {#each selectedDocuements
        .filter((message) => {
          const query = searchTermcvs.toLowerCase();
          if (searchTermcvs === '') return true;
          const nom = message.nom.toLowerCase();
          const prenom = message.prenom.toLowerCase();
          return nom.includes(query) || prenom.includes(query);
        })
        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) as cv}
<tr 
class="text-xs hover-row" 
style="background-color: white; border-bottom: 1px solid rgba(0, 0, 0, 0.1);" 
on:click={() => cv.GoToChat = !cv.GoToChat}
>
<td style="text-align: center; border-right: none;">
  <input 
      type="checkbox" 
      checked={cv.GoToChat} 
      on:change={() => cv.GoToChat = !cv.GoToChat} 
      style="accent-color: #006654;"
  />
</td>

          <td class="rank-cell" style="text-align: center; border-right: none; height:50px; font-size:10px; font-size: 14px; align-items: center;">
            
            {#if cv.Rank === 1}
          
            <img src="/firstone.png" alt="Gold Rank" width="30" height="30" />
        
          {:else if cv.Rank === 2}
            <img src="/second.png" alt="Silver Rank" width="30" height="30" />
          {:else if cv.Rank === 3}
            <img src="/third.png" alt="Bronze Rank" width="30" height="30" />
            
          {:else}
            #{cv.Rank} <!-- Affiche le rang pour les autres -->
          {/if}
        </td>
            <td style="text-align: center; border-right: none; height:50px; font-size:10px; font-size: 14px;">{cv.prenom+" "+cv.nom}</td>
            <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">{cv.score}</td>

          <!--  <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">
              <button class="view-cv-icon" on:click={openLinkedInProfile(cv.Linkedin)}>
                <img src="/linkedin.png" alt="View CV" />
              </button>
            </td>-->
            <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">
              <div style="display: flex; justify-content:center; align-items:center;">
                <button 
                class="flex items-center gap-2 text-xs px-3 py-0.5 rounded-lg 
                  {cv.état === 'treated' && 'text-green-600 bg-green-200/30'} 
                  {cv.état === 'ongoing' && 'text-yellow-600 bg-yellow-200/30'} 
                  {cv.état === 'invalid' && 'text-red-600 bg-red-200/30'}"
                on:click={() => handleStatusClick(application.status)}
              >
                <div 
                  class="w-1 h-1 rounded-full 
                    {cv.état === 'treated' && 'bg-green-600'} 
                    {cv.état === 'Eongoing' && 'bg-yellow-600'} 
                    {cv.état === 'invalid' && 'bg-red-600'}">
                </div>
                {$i18n.t(cv.état)}
              </button>
          </div>
            </td>
            <td style="text-align: center; border-left: none; border-right: none;    font-size: 14px;">


              <button class="view-cv-icon" on:click={openRecap(cv)}>
                <img src="/recap.png" alt="View CV" />
              </button>
              
            </td>
            <td style="text-align: center; border-left: none; border-right: none;     font-size: 14px;">
                <button class="view-cv-icon" on:click={openModal(cv)}>
                    <img src="/detailscondidature.png" alt="View CV" />
                  </button>
            </td>
            <td style="text-align: center; border-left: none; border-right: none; font-size: 14px;">
              <div class="flex justify-center space-x-2">
                
                <button 
                class="flex items-center justify-center bg-white border border-gray-300 w-10 h-10 rounded-lg"
                style="    height: 30px;
    width: 30px; " 
    on:click={() => {
      
      updateStatus(cv, 'invalid');        
      cv.GoToChat = !cv.GoToChat;         
    }}
    disabled={cv.buttonsDisabled}
  >
                     
                       
                <img src="/nonvalide.png" alt="Not Valid" class="w-5 h-5" style="width: 10px;
    height: 10px;" />
              </button>
          
              
                <!-- Valid Button -->
                <button 
                  class="flex items-center justify-center bg-green-600 text-white w-10 h-10 rounded-lg"
                    style="height: 30px;  width: 30px;     background-color: #006654;"
                    on:click={() => {
      
                      updateStatus(cv, 'ongoing');        
                      cv.GoToChat = !cv.GoToChat;         
                    }
                  }
                    disabled={cv.buttonsDisabled}
               
                >

                
                  <img src="/Valide.png" alt="Valid" class="w-5 h-5"  style="width: 10px;
                  height: 10px;"/>
                </button>
            
                <!-- Not Valid Button -->

              </div>
            </td>
            
      
          </tr>
        {/each}
      {/if}
    </tbody>
    
  </table>
  {/if}
  {#if selectedDocuements
    .filter((message) => {
      const query = searchTermcvs.toLowerCase();
      if (searchTermcvs === '') return true;
      const nom = message.nom.toLowerCase();
      const prenom = message.prenom.toLowerCase();
      return nom.includes(query) || prenom.includes(query);
    }).length!==0}
  <div class="pagination-controls ">
    <button class="button_pagin icon-color" on:click={prevPage} disabled={currentPage === 1}>
      <svg style="color: white;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4 "><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
      
    </button>
    <div class="text_pagin" >
    <span style="font: bold;"> {currentPage} </span>
  </div>
    <button class="button_pagin icon-color"    on:click={nextPage} disabled={currentPage === totalPages}><svg style="color: white;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4 icon-color"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg></button>
  </div>
  {/if}
  
</div>

  

<!-- Modal Popup -->
{#if showrecap}
<div class="popup-background"></div>
<div class="popup">
  <div class="popup-content">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 class="popup-title">{selectedcv.nom} {selectedcv.prenom} </h2>
      <span class="close" on:click={closeModal}>&times;</span>
    </div>

    <!-- Static Candidate Information with Image Icons -->
    <div class="candidate-info">
    

      <div class="field" >
        <label style="display: flex;">
          <img src="/date de naissance.png" alt="Date de Naissance Icon" class="icon" /> {$i18n.t('Date of birth')}
        </label>
        <p>-</p>
      </div>
      <div class="field" >
        <label style="display: flex;">
          <img src="/lieunaissance.png" alt="Lieu Icon" class="icon" /> {$i18n.t('Place of birth')}
        </label>
        <p>-</p>
      </div>

      <div class="field" >
        <label style="display: flex;">
          <img src="/tel.png" alt="Téléphone Icon" class="icon" /> {$i18n.t('Phone')}
        </label>
        <p>{selectedcv.Téléphone}</p>
      </div>
      <div class="field" >
        <label style="display: flex;">
          <img src="/mail.png" alt="Email Icon" class="icon" /> {$i18n.t('Email')}
        </label>
        <p>{selectedcv.Email}</p>
      </div>

      <div class="field" >
        <label style="display: flex;">
          <img src="/diplome.png" alt="Diplôme Icon" class="icon" /> {$i18n.t('Diploma')}
        </label>
        <p>{selectedcv.Niveau}</p>
      </div>
      <div class="field" >
        <label style="display: flex;">
          <img src="/poste.png" alt="Poste Icon" class="icon" /> {$i18n.t('Position applied for')}
        </label>
        <p>-</p>
      </div>

      <div class="field" >
        <label style="display: flex;">
          <img src="/niveau.png" alt="Niveau d'expérience Icon" class="icon" /> {$i18n.t('Level of experience')}
        </label>
        <p>-</p>
      </div>
    </div>
  </div>
</div>
{/if}
{#if showdetails}
<div class="popup-background"></div>
<div class="popup">
  <div class="popup-content">
    <div style="display: grid; justify-content: center; align-items: center; text-align: center;">
      <h2 class="popup-title">{$i18n.t('Summary')}</h2>
      <span class="close" on:click={closerecap}>&times;</span>
    </div>
  
  
    <!-- Accordion -->
    <div class="accordion">
      {#each [
          $i18n.t('Profile Summary'),
          $i18n.t('Strengths Related to the Position ') + selectedJob?.post_name,
          $i18n.t('Points to Watch Regarding the Position ') + selectedJob?.post_name
      ] as section, index}
                <div class="accordion-item">
          <!-- Accordion Header -->
          <div class="accordion-header" on:click={() => toggleAccordion(index)}>
            {section}
            <span class="arrow {activeIndex === index ? 'open' : ''}">▶</span>
          </div>
          
          <!-- Accordion Content -->
          <div class="accordion-content {activeIndex === index ? 'open' : ''}">
            {#if index === 0}
              <p> {formatTextWithLineBreaks(formatProfileText(selectedcv.recap.partie1))}</p>
            {:else if index === 1}
            <p>
              {formatTextWithLineBreaks(formatProfileText(selectedcv.recap.partie2))}
            </p>
            {:else if index === 2}
            <div id="output">
              <ul>
                {#each extractCompetencesAndLevels(selectedcv.recap.partie3) as item}
                  <li><strong>{item.competence}</strong>: {item.level}</li>
                {/each}
              </ul>
            </div>
            
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
{/if}

{/if}




<!-- Si showPopup est vrai, on affiche la modale -->
{#if Showjobinfo}
    <div id="modal-background" on:click={Showjobinfo}>
        <div id="popup" on:click|stopPropagation>
          <div class="popup-header">
            <!-- Div contenant l'image de fermeture -->
            <button class="close-container" on:click={closePopup}>
              <img src="/Closepopup.png" alt="Fermer" />
            </button>
          </div>
          
          
          {#if selectedPositionType === "internship"}
          <div class="responsibilities">
            <div class="section-title">{$i18n.t('Project description')}</div>
            <div style="display:flex;">
            {jobdetail.description}
          </div>
        </div>
          {:else}
          <div class="responsibilities">
            <div class="section-title">{$i18n.t('Responsibilities')}</div>
            <ul>
                {#each jobdetail.mandatory_skills as responsibility}
                <div style="display:flex;">
                <div class="icon">
                  <!-- Replacing the SVG with an image -->
                  <img src="/check-mark.png" alt="Check Mark" />
              </div>
              {responsibility}
            </div>
                
                       
                    
                {/each}
            </ul>
        </div>
          {/if}



            <div class="skills">
                <div class="section-title">{$i18n.t('Required Skills')}</div>
                <div class="skills-container">
                  {#if selectedPositionType === "internship"}
                  {#each jobdetail.mandatory_skills as skill}
                  <div class="skill-card">
                    <div class="icon">
                      <img src="/percentage.png" alt="Check Mark" />
                       
                    </div>
                    <div class="text-content" style="font-size: 14px;">
                        <strong>{skill}</strong>
                        
                     
                    </div>
                </div>
            {/each}
                  {:else}
                  {#each jobdetail.optional_skills as skill}
                  <div class="skill-card">
                    <div class="icon">
                      <img src="/percentage.png" alt="Check Mark" />
                       
                    </div>
                    <div class="text-content" style="font-size: 14px;">
                        <strong>{skill}</strong>
                        
                     
                    </div>
                </div>
            {/each}
                  {/if}
                 
                </div>
            </div>

            <div class="other">
              {#if selectedPositionType === "internship"}
              <div class="section-title">{$i18n.t('Administrative specifications')}</div>
              <div class="qualifications-card">
              
              
                <div class="qualification-item">
                  <img src="/graduation.png" alt="Degree Icon" class="icon" />
                  <span class="label">{$i18n.t('Degree :')}</span>
                  <span class="value">{jobdetail.qualifications.degree}</span>
                </div>
                <div class="qualification-item">
                  <img src="/person.png" alt="Experience Icon" class="icon" />
                  <span class="label">{$i18n.t('Number of profiles :')}</span>
                  <span class="value">{jobdetail.nb_profiles}</span>
                </div>
                <div class="qualification-item">
                  <img src="/rush.png" alt="Portfolio Icon" class="icon" />
                  <span class="label">{$i18n.t('Duration :')}</span>
                  <span class="value">{jobdetail.duration}</span>
                </div>
              </div>
              {:else}
              <div class="section-title">{$i18n.t('Qualifications')}</div>
              <div class="qualifications-card">
              
              
                <div class="qualification-item">
                  <img src="/graduation.png" alt="Degree Icon" class="icon" />
                  <span class="label">{$i18n.t('Degree :')}</span>
                  <span class="value">{jobdetail.qualifications.degree}</span>
                </div>
                <div class="qualification-item">
                  <img src="/exp.png" alt="Experience Icon" class="icon" />
                  <span class="label">{$i18n.t('Experience :')}</span>
                  <span class="value">{jobdetail.qualifications.experience}</span>
                </div>
                <div class="qualification-item">
                  <img src="/port.png" alt="Portfolio Icon" class="icon" />
                  <span class="label">{$i18n.t('Portfolio :')}</span>
                  <span class="value">{jobdetail.qualifications.portfolio}</span>
                </div>
              </div>
              {/if}

            </div>
        </div>
    </div>
{/if}
<style>

.ltr-style{
            direction:rtl;
              text-align:right;
              flex-direction: row-reverse;
          }

.popup-header {
  display: flex;
  justify-content: flex-end; /* Aligne le contenu à droite */
  padding: 10px;
}

.close-container {
  cursor: pointer; /* Optionnel : pour montrer que c'est cliquable */
}

.close-container img {
  width: 20px;  /* Ajustez la taille de l'image si nécessaire */
  height: 20px; /* Ajustez la taille de l'image si nécessaire */
}

.qualifications-card {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
 width: 100%;
}

.qualifications-card h3 {
  color: #006654;
  margin-bottom: 15px;
  font-weight: 600;
}

.qualification-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.qualification-item .icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
}

.qualification-item .label {
  font-weight: bold;
  color: #006654;
  margin-right: 5px;
}

.qualification-item .value {
  color: #666;
}

.qualifications-card .qualification-item:last-child {
  margin-bottom: 0;
}


   /* Style pour le fond semi-transparent */
   #modal-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5); /* Fond gris semi-transparent */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999; /* Au-dessus de l'interface principale */
    }

    /* Style pour la popup (modale) */
    #popup {
        background-color: white; /* Fond de la popup */
      
        padding: 20px;
        width: 1000px;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Légère ombre pour l'effet 3D */
        z-index: 1000; /* Popup au-dessus du fond */
    }

    /* Style du bouton de fermeture */
    #close-button {
        background-color: transparent;
        border: none;
        font-size: 18px;
        position: absolute;
        top: 10px;
        right: 10px;
        cursor: pointer;
        color: #006654;
    }

    #popup .section-title {
        color: #006654;
        font-size: 18px;
        margin-bottom: 10px;
        font-weight: bold;
    }

    #popup ul {
        list-style: none;
        padding: 0;
    }

    #popup .checkmark {
        color: #006654;
        margin-right: 10px;
    }

    #popup .skills-container, #popup .other-container {
        display: flex;
        justify-content: space-between;
    }

    #popup .skill-card, #popup .other-card {
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 10px;
        width: 45%;
        display: flex;
        align-items: center;
        height: 66px;

    }

    #popup .icon {
     
        border-radius: 50%;
        width: 25px;
        height: 25px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 15px;
    }

    #popup .icon svg {
        width: 24px;
        height: 24px;
        fill: white;
    }

    #popup .other-card svg {
        fill: #006654;
    }

    #popup .text-content {
        flex: 1;
    }

    #popup .other-item {
        margin-bottom: 10px;
    }


        /* Style pour le tableau */
        table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }

    th, td {
        padding: 12px;
       /* border: 1px solid #006654;*/
        text-align: left;
    }

    th {
        background-color: #9FD5B5;
        color: white;
      

    }

    td {
      /*  background-color: #f5f5f5;*/
    }

  .custom-info-icon {
    width: 20px;
    height: 20px;
  }


.description-text {
  font-size: 15px; /* Taille de police légèrement plus grande */
  line-height: 1.6; /* Espacement entre les lignes pour plus de lisibilité */
  color: #333; /* Couleur du texte (gris foncé) */
  margin-top: 10px; /* Espace au-dessus de la description */
  margin-bottom: 10px; /* Espace en dessous de la description */
  text-align: justify; /* Justification du texte */
}
.chevron {
    transition: transform 0.3s ease;
  }

  /* Rotate chevron down when the select is focused */
  .chevron-toggle:focus + .chevron {
    transform: translateY(-50%) rotate(90deg);
  }
      /* Define hover style for the row */
      .hover-row:hover {
        background-color: rgba(22, 140, 119, 0.2);
        cursor: pointer;
    }

.pagination-arrow {
    background-color: #006654; /* Fond des boutons de pagination */
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 20%;
    cursor: pointer;
    height: 2.125rem;
    width: 1.75rem;
    transition: background-color 0.3s ease;
  }

  .pagination-arrow:disabled {
    background-color: #c8d1e2; /* Fond des boutons désactivés */
    cursor: not-allowed;
  }

  .pagination-arrow:hover {
    background-color: #006654; /* Couleur au survol */
  }

.text-align-left{
  text-align: left;
}

.button_pagin{

  --tw-bg-opacity: 1;
    background-color: rgb(22 140 119 / var(--tw-bg-opacity));
    width: 2rem;
    height: 2rem;
    border-radius: 11px;
    /* text-align: center; */
    justify-content: center;
    align-items: center;
    display: flex;

}
.text_pagin{

  display: flex;
  align-items: center;
}


.pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 15px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }



.scrollbar-container {
    max-height: 500px; /* Adjust height as needed */
    overflow-y: auto;
  }

  /* Custom scrollbar styling */
  .scrollbar-container::-webkit-scrollbar {
    width: 8px;
  }

  .scrollbar-container::-webkit-scrollbar-thumb {
    background-color: #9FD5B5;
    border-radius: 4px;
  }

  .scrollbar-container::-webkit-scrollbar-track {
    background-color: #f1f1f1;
    border-radius: 4px;
  }

  .dropdown {
    width: 200px;
    top: 27%;
    /* position: static; */
    right: 66%;
  }

  .filter-input {
    width: 200px; /* Largeur maximale fixée pour limiter la taille de l'input */
    max-width: 100%; /* Empêche l'input de dépasser sa largeur maximum */
  }



.titre {
    font-size: 20px; /* Taille du titre */
    color: #006654; /* Couleur du titre */
  }

/* Style pour la popup personnalisée */
.fenetre-popup {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(192, 192, 192, 0.1); /* Gris très clair avec faible opacité */
    z-index: 2000;
  }
  
  .contenu-popup {
    position: relative;
    width: 90%; /* Augmentez la largeur */
    max-width: 1145px; /* Augmentez la largeur maximale */
    height: 90vh; /* Ajustez la hauteur pour occuper une grande partie de l'écran */
    background: #f1fdf9;
    padding: 20px;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .fermer {
    position: absolute;
    top: 10px;
    right: 20px;
    font-size: 24px;
    cursor: pointer;
    color:#006654;
  }

  .cadre-pdf {
    width: 100%;
    height: 89%; /* S'étend pour remplir la hauteur de la popup */
    border: none;

  }

.points-surveiller-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ccc; /* Bordure grise fine */
    border-radius: 8px; /* Arrondi des coins */
    overflow: hidden; /* Masquer les coins coupés */
  }

  .points-surveiller-table th, 
  .points-surveiller-table td {
    border: 1px solid #ccc; /* Bordure fine grise entre les cellules */
    padding: 10px;
    text-align: left;
  }

  .points-surveiller-table th {
    background-color: #f1fdf9; /* Couleur de fond pour les en-têtes */
    color: #006654; /* Texte de l'en-tête */
  }

  .points-surveiller-table tr:nth-child(even) {
    background-color: #f9f9f9; /* Alternance de couleur pour les lignes */
  }
.accordion {
    width: 100%;
    max-width: 1000px;
    margin: 40px auto;
    padding: 10px;
    background-color: #f1fdf9;
  }

  .accordion-item {
    margin-bottom: 20px;
    border-radius: 12px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .accordion-item:hover {
    transform: translateY(-4px); /* Small lift effect */
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2); /* Deeper shadow on hover */
  }

  .accordion-header {
    background: linear-gradient(135deg, #006654, #9fd5b5); /* Gradient background */
    padding: 20px;
    font-weight: bold;
    font-size: 18px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.3s ease;
  }

  .accordion-header:hover {
    background: linear-gradient(135deg, #9fd5b5, #006654); /* Reverse gradient on hover */
  }

  .accordion-content {
    background-color: #fff;
    padding: 20px;
    color: black;
    text-align: left;
    border-top: 2px solid #9fd5b5;
    display: none;
  }

  .accordion-content.open {
    display: block;
    animation: slideDown 0.4s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .arrow {
    transition: transform 0.3s ease;
    font-size: 1.2em;
  }

  .arrow.open {
    transform: rotate(90deg);
  }

  /* Small dots above each section for decoration */
  .decorative-dots {
    display: flex;
    justify-content: center;
    margin-bottom: 5px;
  }

  .dot {
    width: 10px;
    height: 10px;
    margin: 0 5px;
    background-color: #006654;
    border-radius: 50%;
  }
.popup {
  position: fixed;
  top: 50%;   
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 1000px;
  background-color: #f1fdf9;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 15px;
  padding: 20px;
  z-index: 9999;
  transition: all 0.3s ease;
  opacity: 1;
  visibility: visible;
  
}

.popup-content {

  padding: 20px;
  text-align: left;
  border-radius: 10px;
}
.popup-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(230, 230, 230, 0.5); /* Lighter gray with transparency */
    z-index: 0; /* Behind the popup content */
}


.close {
  position: absolute;
  top: 15px;
  right: 15px;
  font-size: 26px;
  cursor: pointer;
  transition: color 0.2s ease;
  margin-top: 24px;
}

.close:hover {
  color: #ff5c5c;
}
.popup-title {
    font-size: 20px;
    font-weight: bold;
    color: #333;
  }

  .candidate-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 20px;
  }

  .field label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 14px;
    color: #555;
  }

  .field p {
    font-size: 14px;
    color: #333;
    margin: 0;
  }

  .icon {
    margin-right: 8px;
    width: 20px;
    height: 20px;
  }

    .rank-cell {
  display: flex;
  align-items: center; /* Aligne verticalement l'image et le texte */
  justify-content: center; /* Aligne horizontalement l'image et le texte */
}

.rank-cell img {
  margin-right: 5px; /* Espace entre l'image et le texte */
}

  
  .textarea-style{
        min-height: 140px;
    background-color: #eef3fb; /* Couleur au survol */
    }
.select-button {
    padding: 10px 20px;
    margin-top: 20px; /* Assure que le bouton est poussé vers le bas */
    background-color: #006654; /* Couleur de fond par défaut */
    color: white; /* Couleur du texte */
    border: 1px solid #006654;
    border-radius: 5px; /* Coins arrondis */
    cursor: pointer; /* Curseur en forme de main */
    transition: background-color 0.3s; /* Transition douce pour le changement de couleur */
}




  
    .button-container {
    /* display: flex;*/
      display: flex;
      gap: 10px;
      justify-content: center;    /* Centre horizontalement le contenu */
      align-items: center;        /* Centre verticalement les éléments si nécessaire */
      padding: 20px;
    }

  
    .cards-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around; /* Ajustement pour un espacement uniforme */
      gap: 20px; /* Espacement réduit entre les cartes */
    }
  
.card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* Maintient les éléments en haut */
  background-color: #ffffff;
  border: 1px solid #006654;
  border-radius: 10px;
  padding: 20px;
  min-height: 200px;
  width: calc(33% - 30px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative; /* Permet l'utilisation de positionnement absolu */

}

.skills-container {
  display: flex;
/* flex-direction: column;*/
  margin-top: 10px; /* Espace entre le titre et la liste */
  margin-bottom: 5px; /* Espace entre le titre et la liste */

}

.skills-title {
  font-weight: bold;
  margin-bottom: 10px; /* Ajuste l'espacement en bas du titre */
}



    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }
  
    @media (max-width: 1024px) {
      .card {
          width: calc(50% - 30px); /* 2 cartes par ligne */
      }
    }
  
    @media (max-width: 768px) {
      .card {
          width: 100%; /* 1 carte par ligne */
      }
    }
  
    .card-title {
      padding-right: 20px;
        text-align: center;
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #006654;
      display:flex;
    }
  
    .skills-section {
      
      margin-top: 16px;
    }
  
    ul {
      margin: 0;
      padding: 0;
      list-style-type: none; /* Enlever les puces */
    }
  
    li {
      font-size: 1rem;
      color: #444; /* Couleur de texte moderne et lisible */
    }
  
    #validateButton {
      background-color: #006654;
      color: white;
      padding: 10px 20px;
      border: 2px solid #006654;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
  
    #validateButton:hover {
        background-color: #B2E0C3;
    }
  
    #validateButton i {
      margin-right: 5px;
    }
  
    .stepper-wrapper {
        margin-top: auto;
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
  
    }
    .stepper-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        cursor: pointer; /* Change le curseur en main */
        
    }
  
    .stepper-item::before {
        position: absolute;
        content: "";
        border-bottom: 2px solid #ccc;
        width: 100%;
        top: 20px;
        left: -50%;
        z-index: 2;
    }
  
    .stepper-item::after {
        position: absolute;
        content: "";
        border-bottom: 2px solid #ccc;
        width: 100%;
        top: 20px;
        left: 50%;
        z-index: 2;
    }
  
    .stepper-item .step-counter {
        position: relative;
        z-index: 5;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #ccc;
        margin-bottom: 6px;
        color: white;
    }
  
    .stepper-item.active {
        font-weight: bold;
    }
  
    .stepper-item.completed .step-counter {
        background-color: #006654;
    }
  
    .stepper-item.completed::after {
        position: absolute;
        content: "";
        border-bottom: 2px solid #006654;
        width: 100%;
        top: 20px;
        left: 50%;
        z-index: 3;
    }
  
    .stepper-item:first-child::before {
        content: none;
    }
  
    .stepper-item:last-child::after {
        content: none;
    }
  
  
    .view-cv-icon {
      width: 25px;
      height: 25px;
      padding: 5px;
      border: none;
      background-color: transparent;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
  
    .view-cv-icon:hover {
      transform: scale(1.1);
    }
  
    .button-custom {
      background-color: rgba(128, 185, 116, 0.4);
      border: 2px solid rgba(128, 185, 116, 0.6);
      transition: background-color 0.3s ease;
    }
  
    .button-custom:hover {
      background-color: rgba(128, 185, 116, 0.6);
    }
  
    .bg-color-pag{
      background-color: #006654;
    }
    .header {
      background-color: #9FD5B5;
      color: white;
      padding: 10px;
    }
  
  
  
    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-start;

    }
  
    .black-text {
      color: black;
    }
  
    .skill {
      width: 100%;
      font-weight: 500; /* Poids de police pour une meilleure lisibilité */
      color: #333; /* Couleur de texte neutre */
    }
  
    .skills-list {
      background-color: #9FD5B5; /* Couleur d'arrière-plan douce */
      padding: 12px; /* Augmenter l'espace à l'intérieur */
      border-radius: 8px; /* Coins arrondis */
      margin: 6px 0; /* Espacement entre les éléments */
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Ombre légère pour un effet de profondeur */
    }
  
    .skills-list:hover {
      background-color: #B2E0C3; /* Couleur au survol */
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); /* Ombre plus marquée au survol */
    }
  
    .custom-checkbox {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      margin-right: 10px;
      cursor: pointer;
      background-color: #9FD5B5;
      transition: background-color 0.3s ease;
    }
  
    .custom-checkbox:checked {
      background-color: #c58a8a;
    }
  
    .custom-checkbox:checked::after {
      content: "";
      position: relative;
      left: 4px;
      top: 0px;
      width: 8px;
      height: 16px;
      border-width: 0 3px 3px 0;
      transform: rotate(45deg);
    }
  
    .mini-title {
      color: #006654; /* Couleur pour le titre des sections */
      font-weight: 600;
      font-size: 17px;
      margin-bottom: 10px;
      border-bottom: 2px ; /* Ligne en bas du titre */
      padding-bottom: 4px; /* Espace sous le titre */
      display: contents;
    }
  
    .Button-confirm {
      padding: 10px 20px;
      background-color: #006654;
      color: white;
      border: 2px solid #006654;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.3);
    }
  
    .Button-confirm:hover {
      background-color: #b1cef3;
    }
  
    .styled-button {
      padding: 10px 20px;
      background-color: #9FD5B5;
      color: #006654;
      border: 2px solid #006654;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      width: calc(33.33% - 10px);
      transition: all 0.3s ease;
    }
  
    .styled-button:hover {
      background-color: #9FD5B5;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    }
  
    .message-details {
  padding: 10px;
  border-radius: 3px;
  max-height: 563px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #006654 #9FD5B5;
}

.info-container {
  display: flex;
  min-height: 200px;
  flex-wrap: wrap;
  gap: 10px;
}

.info-box {
  background-color: #ffffff;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.2);

  min-height: 200px;
  border: 1px solid #006654;
  width: calc(33.33% - 10px);
  box-sizing: border-box;
}

  
    .styled-dropdown {
      width: 100%;
      padding: 8px;
      border-radius: 5px;
      transition: box-shadow 0.3s ease;
    }
  
    .styled-dropdown:focus {
      outline: none;
      border: 1px solid #006654;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    }
    .custom-bg {
        background-color: #9FD5B5;
        border: 2px solid #006654;
      color: #006654;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .hover\:custom-bg-hover:hover {
        background-color: #9FD5C0;
    }

  #validateButton {
    padding: 10px 20px;
    font-size: 16px;
    background-color: #006654;
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .icon {
    width: 15px;
    height: 15px;
    margin-left: 8px;
    margin-bottom: 4px;
    
  }
.button-container {
  display: flex;
  justify-content: center;
  padding: 10px;

}

#validateButton {
  background-color: #006654; /* Solid green background */
  color: white;
  padding: 10px 20px;
  border: none; /* No border */
  border-radius: 20px; /* Fully rounded corners */
  cursor: pointer;
  box-shadow: none; /* No shadow */
}

#validateButton i {
  margin-right: 5px;
  color: white; /* White checkmark */
}


.stepper-wrapper {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}
.stepper-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    cursor: pointer; /* Change le curseur en main */
}

.stepper-item::before {
    position: absolute;
    content: "";
    border-bottom: 2px solid #ccc;
    width: 100%;
    top: 20px;
    left: -50%;
    z-index: 2;
}

.stepper-item::after {
    position: absolute;
    content: "";
    border-bottom: 2px solid #ccc;
    width: 100%;
    top: 20px;
    left: 50%;
    z-index: 2;
}

.stepper-item .step-counter {
    position: relative;
    z-index: 5;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #ccc;
    margin-bottom: 6px;
    color: white;
}

.stepper-item.active {
    font-weight: bold;
}

.stepper-item.completed .step-counter {
    background-color: #006654;
}

.stepper-item.completed::after {
    position: absolute;
    content: "";
    border-bottom: 2px solid #006654;
    width: 100%;
    top: 20px;
    left: 50%;
    z-index: 3;
}

.stepper-item:first-child::before {
    content: none;
}

.stepper-item:last-child::after {
    content: none;
}



.view-cv-icon {
    margin-top: 3px;
        width: 25px; /* Set the desired width */
        height: 25px; /* Set the desired height */
        padding: 5px; /* Optional: add some padding */
        border: none; /* Remove border if any */
        background-color: transparent; /* Make background transparent */
        cursor: pointer; /* Change cursor to pointer */
    }


.button-custom {
  background-color: rgba(128, 185, 116, 0.4);
  border: 2px solid rgba(128, 185, 116, 0.6);
}
.button-custom:hover {
  background-color: rgba(128, 185, 116, 0.6);
}

.header{
background-color: #9FD5B5;
color:white;
}

.title{
text-align: center;
}

.skills-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.black-text{
    color: black;
}

.skill {
    width: 100%;
    padding: 3px;
    border-radius: 3px;
    margin: 3px;
}

.skills-list {
      background-color: #9FD5B5; /* Couleur d'arrière-plan douce */
      padding: 12px; /* Augmenter l'espace à l'intérieur */
      border-radius: 8px; /* Coins arrondis */
      margin: 6px 0; /* Espacement entre les éléments */
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Ombre légère pour un effet de profondeur */
    }

.skills-list:hover {
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);  /* Adds a shadow on hover */
}
.custom-checkbox {
    appearance: none; /* Remove default checkbox styling */
    width: 20px; /* Keep the existing width */
    height: 20px; /* Keep the existing height */
    border-radius: 5px; /* Rounded corners */
    margin-right: 10px; /* Space between checkbox and label */
    cursor: pointer; /* Pointer cursor on hover */
    background-color: #9FD5B5; /* Same background color as skills-list */
}

/* Checked state */
.custom-checkbox:checked {
    background-color: #c58a8a; /* Same color when checked */
}

/* Add a checkmark */
.custom-checkbox:checked::after {
    content: ""; /* Create a checkmark */
    position: relative;
    left: 4px; /* Position the checkmark */
    top: 0px; /* Position the checkmark */
    width: 8px; /* Width of checkmark */
    height: 16px; /* Height of checkmark */
    border-width: 0 3px 3px 0; /* Create a checkmark shape */
    transform: rotate(45deg); /* Rotate to make it look like a checkmark */
}

.mini-title{
    width: fit-content;

color: #006654;

border-radius: 3px;
padding :2px 4px 2px 4px;

}
.skills-list label {

    padding: 2px;
    border-radius: 3px;
    color: white;
    font-weight: bold;
}
.Button-confirm {
    padding: 10px 20px;
    background-color: #006654;  /* Green background */
    color: #ffffff;
    border: 2px solid #006654;  /* Matching green border */
    border-radius: 5px;  /* Rounded corners */
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: none;
    text-align: center;
    margin-top: 15px;
    margin-bottom: 15px;
    width: 100%;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.3);

}
.Button-confirm:hover {
        background-color: #b1cef3;
    }
    .bordure {
  border: 2px solid #9FD5B5; /* Make sure the border style is solid */
  border-radius: 10px; /* Optional: add some rounding to the border */
}


    .styled-button {
    padding: 10px 20px;
    background-color: #9FD5B5;  /* Green background */
    color: #006654;
    border: 2px solid #006654;  /* Matching green border */
    border-radius: 5px;  /* Rounded corners */
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: none;
    text-align: center;
    margin-bottom: 15px;
    width: calc(33.33% - 10px);
}

/* Hover effect */
.styled-button:hover {
    background-color: #9FD5B5;
    color: #006654;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
}

/* Active (clicked) state */
.styled-button:active {
    transform: scale(0.98);  /* Shrinks the button slightly when clicked */
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.3);
}

  .message-details {
    border-radius: 3px;
    width: 100%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background-color: #FFFFFF;
    max-height: 563px; /* Hauteur maximale */
    overflow-y: auto; /* Active un scroll vertical */
    /* Styles pour la scrollbar */
    scrollbar-width: thin; /* Pour Firefox */
    scrollbar-color: #006654 #9FD5B5;/* Couleur du curseur et du fond pour Firefox */
}


.info-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

  }

  .selected {
    padding: 10px 20px;
    margin-top: auto; /* Assure que le bouton est poussé vers le bas */
    border: 1px solid #006654;
    border-radius: 5px; /* Coins arrondis */
    cursor: pointer; /* Curseur en forme de main */
    transition: background-color 0.3s; /* Transition douce pour le changement de couleur */
    background-color: #ffffff; /* Couleur pour le bouton sélectionné */
    color: #006654; /* Couleur du texte pour le bouton sélectionné */
}


.styled-dropdown {
    width: 100%;
    padding: 8px;
    border-radius: 5px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);  /* Adds a shadow on hover */
}

.styled-dropdown:focus {
    outline: none; /* Supprime la bordure par défaut */
    border: 1px solid #006654; /* Ajoute une petite bordure avec la couleur souhaitée */
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);  /* Adds a shadow on hover */
}

.bckclr{
    background-color: #006654;
    color:white;
}


.Position-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 70vh; /* Prend toute la hauteur de la page */
}
.Position-selection {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    width: 420px;
    background-color: #ffffff;
    border: 1px solid #006654;
    border-radius: 10px;
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.2);
}
  .delete-skill-btn {
  background-color: transparent;
  border: none;
  color: #006654;
  font-size: 14px;
  cursor: pointer;
  padding: 0 8px;
}

.delete-skill-btn:hover {
  color: #0d1626;
}

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
  }

  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 500px;
    width: 100%;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px; /* Ajoute de l'espace entre le titre et les inputs */

  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }

  .input-group {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    width: 100%;
  }



  .input-style {
    flex-grow: 1;
    padding: 0.5rem;
    border-radius: 10px; /* Coins arrondis */
    font-size: 14px;
    margin-right: 10px;
    background-color: #f1fdf9; /* Couleur de fond */
    border: 1px solid #006654; /* Bordure de 1px, couleur personnalisée et style plein */
}

  .input-spacing {

    width: 40px; /* Assurez-vous que cet espace est de la même largeur que le bouton "+" */
  }

  .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 40px;
    align-items: center;
    gap: 10px;
  }
    .blue-input{
        min-height: 40px;
        border-radius: 10px; /* Coins arrondis */
    background-color: #eef3fb; /* Couleur au survol */
    }




    .bold-icon {
    font-weight: bold; /* Not applicable directly to SVG, but you can apply this to the button */
  }

    
    .button-container {
    /* display: flex;*/
      display: flex;
      gap: 10px;
      justify-content: center;    /* Centre horizontalement le contenu */
      align-items: center;        /* Centre verticalement les éléments si nécessaire */
      padding: 20px;
    }

    
    .cards-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around; /* Ajustement pour un espacement uniforme */
      gap: 20px; /* Espacement réduit entre les cartes */
    }
    
  
    .card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* Maintient les éléments en haut */
  background-color: #ffffff;
  border: 1px solid #006654;
  border-radius: 10px;
  padding: 20px;
  min-height: 200px;
  width: calc(33% - 30px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative; /* Permet l'utilisation de positionnement absolu */

}


.edit-button {
  position: absolute;
  top: 10px;
  
  background-color: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
}



.skills-container {
  display: flex;
/* flex-direction: column;*/
  margin-top: 10px; /* Espace entre le titre et la liste */
  margin-bottom: 5px; /* Espace entre le titre et la liste */

}

.skills-title {
  font-weight: bold;
  margin-bottom: 10px; /* Ajuste l'espacement en bas du titre */
}

.skills-list {
      background-color: #9FD5B5; /* Couleur d'arrière-plan douce */
      padding: 12px; /* Augmenter l'espace à l'intérieur */
      border-radius: 8px; /* Coins arrondis */
      margin: 6px 0; /* Espacement entre les éléments */
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Ombre légère pour un effet de profondeur */
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }
    
    @media (max-width: 1024px) {
      .card {
          width: calc(50% - 30px); /* 2 cartes par ligne */
      }
    }
    
    @media (max-width: 768px) {
      .card {
          width: 100%; /* 1 carte par ligne */
      }
    }
    
    .card-title {
        text-align: center;
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #006654;
    }
    
    .skills-section {
        
      margin-top: 16px;
    }
    
    ul {
      margin: 0;
      padding: 0;
      list-style-type: none; /* Enlever les puces */
    }
    
    li {
      font-size: 1rem;
      color: #444; /* Couleur de texte moderne et lisible */
    }


    #validateButton {
      background-color: #006654;
      color: white;
      padding: 10px 20px;
      border: 2px solid #006654;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    
    #validateButton:hover {
    background-color: #9FD5B5;
    }
    
    #validateButton i {
      margin-right: 5px;
    }


    #validateButton:hover {
    background-color: #9FD5B5;
    }
    
    #validateButton i {
      margin-right: 5px;
    }
    
    
    .custom-checkbox {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      margin-right: 10px;
      cursor: pointer;
      background-color: #8AA4C5;
      transition: background-color 0.3s ease;
    }
    
    .custom-checkbox:checked {
      background-color: #c58a8a;
    }
    
    .custom-checkbox:checked::after {
      content: "";
      position: relative;
      left: 4px;
      top: 0px;
      width: 8px;
      height: 16px;
      border-width: 0 3px 3px 0;
      transform: rotate(45deg);
    }
    
    .mini-title {
      color: #006654; /* Couleur pour le titre des sections */
      font-weight: 600;
      font-size: 1.2rem;
      margin-bottom: 10px;
      border-bottom: 2px ; /* Ligne en bas du titre */
      padding-bottom: 4px; /* Espace sous le titre */
    }
    
    .Button-confirm {
      padding: 10px 20px;
      background-color: #006654;
      color: white;
      border: 2px solid #006654;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.3);
    }
    
    .Button-confirm:hover {
      background-color: #b1cef3;
    }
    
    .styled-button {
      padding: 10px 20px;
      background-color: #F2F7FF;
      color: #006654;
      border: 2px solid #006654;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      width: calc(33.33% - 10px);
      transition: all 0.3s ease;
    }
    .select-rtl {
    direction: rtl;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
    background-position: left 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -moz-appearance: none;
    -webkit-appearance: none;
    }

    .styled-button:hover {
      background-color: #8AA4C5;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    }
    
    .message-details {
  padding: 10px;
  border-radius: 3px;
  max-height: 563px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #006654 #9FD5B5;
}


.info-container {
  display: flex;
  min-height: 200px;
  flex-wrap: wrap;
  gap: 10px;
}

.info-box {
  background-color: #ffffff;
  padding: 10px 20px 10px 20px;
  border-radius: 10px;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.2);

  min-height: 100px;
  border: 1px solid #006654;
  width: calc(33.33% - 10px);
  box-sizing: border-box;
}

    
    .styled-dropdown {
      width: 100%;
      padding: 8px;
      border-radius: 5px;
      border:1px solid #006654;

      transition: box-shadow 0.3s ease;
    }

    
    .styled-dropdown:focus {
      outline: none;
      border: 1px solid #006654;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    }
    .custom-bg {
        background-color: #9FD5B5;
    border: 2px solid #006654;
      color: #006654;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .button-plus{
        background-color: #9FD5B5;
    border: 2px solid #006654;
      color: #006654;
      padding: 10px 10px;
      border-radius: 15px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
  .hover\:custom-bg-hover:hover {
    background-color: #9FD5C0;
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
    border-top: 5px solid #006654;
    animation: spin 2s linear infinite;
    background-color: white;
    display: flex;
    justify-content: center;
    align-items: center;
}

.img-loader img {
    width: 80px;
    height: 80px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

</style>



