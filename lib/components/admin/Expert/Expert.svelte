<script lang="ts">
	import { toast } from 'svelte-sonner';
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, documents, showSidebar } from '$lib/stores';
	import { createNewDoc, deleteDocByName, getDocs } from '$lib/apis/documents';

	import { SUPPORTED_FILE_TYPE, SUPPORTED_FILE_EXTENSIONS } from '$lib/constants';
	import { processDocToVectorDB, uploadDocToVectorDB } from '$lib/apis/rag';
	import { blobToFile, transformFileName } from '$lib/utils';

	import Checkbox from '$lib/components/common/Checkbox.svelte';

	import EditDocModal from '$lib/components/documents/EditDocModal.svelte';
	import AddFilesPlaceholder from '$lib/components/AddFilesPlaceholder.svelte';
	import AddDocModal from '$lib/components/documents/AddDocModal.svelte';
	import { transcribeAudio } from '$lib/apis/audio';
	import { uploadFile } from '$lib/apis/files';
	import ChatItem from '$lib/components/layout/Sidebar/ChatItem.svelte';
	import FileItem from '$lib/components/common/FileItem.svelte';
	import { title } from 'process';

	const i18n = getContext('i18n');


  // État pour le tab sélectionné
  let activeTab = 'SystemPrompts';

  interface Theme {
  label: string;
  collection: string;
  showConfigList: boolean;
  configList:string[];
  activeConfigTitle:string;
  selectedConfigTitle:string;
}


  interface ExpertParam {
  id: string; // _id.$oid (string format for ObjectId)
  system_prompt_type: string;
  system_prompt: string;
  context: string;
  chat_conversation: string;
  text_context_list: string;
  input: string;
  pre_prompt_query: string;
  prompt_query: string;
  pre_prompt_summary: string;
  prompt_summary: string;
  hyde_llm_prompt: string;
  llava_prompt: string;
  llava_prompt_type: string;
  image_audio_loaders_options: string[]; // array of strings
  pdf_loaders_options: string[]; // array of strings
  url_loaders_options: string[]; // array of strings
  jq_schema: string;
  top_k_docs: number;
  chunk: boolean;
  chunk_size: number;
  docs_ordering_type: string;
  docs_token_handling: string;
  docs_joiner: string;
  hyde_level: number;
  hyde_template: string;
  hyde_show_only_final: boolean;
  doc_json_mode: boolean;
  metadata_in_context: string;
  stream_output: boolean;
  seed: number;
  max_time: number;
  temperature: number;
  top_p: number;
  top_k: number;
  penalty_alpha: number;
  max_new_tokens: number;
  min_new_tokens: number;
  min_max_new_tokens: number;
  max_input_tokens: number;
  max_total_input_tokens: number;
  repetition_penalty: number;
  type: string;
  titre: string;
  date: string; // Assuming this is a string in ISO format (2024-05-21T14:07:09.359Z)
}
interface promptsType{
  id: string; // _id.$oid (string format for ObjectId)
  name:string;
  prompt:string;

}
let showAddThemeForm = false; // Initialement caché
let showInfoPopup = false; // Initialement caché
let newTheme: string="";
let systemPrompts:promptsType[]=[];
let LLaVaLLMPrompts: promptsType[]=[];
let themes:Theme[]=[];
let expertParams:ExpertParam[]=[];
let error: string | null = null; // To store error messages
let selectedTheme :Theme;
let selectedType:string="";
let selectedParams:ExpertParam;


  async function fetchSystemPrompts() {

try {
      const response = await fetch('http://localhost:3005/api/GetSystemPrompts');
      if (!response.ok) throw new Error('Failed to fetch System Prompts');
      const data = await response.json();
      systemPrompts = data.map((item: any) => ({
        id: item.$oid, // _id.$oid (string format for ObjectId)
        name: item.name,
        prompt: item.prompt,}));
    } catch (err) {
      error = err.message;
      console.error('Error fetching messages:', error);
    }
  }
  async function fetchLLaVaLLMPrompts() {

try {
      const response = await fetch('http://localhost:3005/api/GetLLaVaLLMPrompts');
      if (!response.ok) throw new Error('Failed to fetch LLaVa LLM Prompts');
      const data = await response.json();
      LLaVaLLMPrompts = data.map((item: any) => ({
        id: item.$oid, // _id.$oid (string format for ObjectId)
        name: item.name,
        prompt: item.prompt,}));
    } catch (err) {
      error = err.message;
      console.error('Error fetching messages:', error);
    }
  }
  async function fetchThemes() {

    try {
          const response = await fetch('http://localhost:3005/api/themes-with-expert-titles');
          if (!response.ok) throw new Error('Failed to fetch themes');
          const data = await response.json();
          themes = data.map((item: any) => ({
            label: item.label,
            collection: item.collection,
            showConfigList:false,
            configList:item.expert_titles as string[],
            activeConfigTitle:item.most_recent_title,
            selectedConfigTitle:item.most_recent_title,
          }));
            console.log(themes);
        } catch (err) {
          error = err.message;
          console.error('Error fetching messages:', error);
        }
      }
    // Fetch Expert Parameters based on theme title
async function fetchExpertParams(titre: string) { // Changer le paramètre de 'paramsTitle' à 'titre'
  try {
    const response = await fetch('http://localhost:3005/api/find-params-by-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titre }), // Assurez-vous que le nom correspond à ce que le backend attend
    });

    if (!response.ok) {
      throw new Error('Failed to fetch params');
    }

    const data = await response.json();
    expertParams = {
      id: data._id?.$oid, // Utilisation de l'opérateur de coalescence pour éviter les erreurs si '_id' est indéfini
      system_prompt_type: data.system_prompt_type,
      system_prompt: data.system_prompt,
      context: data.context,
      chat_conversation: data.chat_conversation,
      text_context_list: data.text_context_list,
      input: data.input,
      pre_prompt_query: data.pre_prompt_query,
      prompt_query: data.prompt_query,
      pre_prompt_summary: data.pre_prompt_summary,
      prompt_summary: data.prompt_summary,
      hyde_llm_prompt: data.hyde_llm_prompt,
      llava_prompt_type: data.llava_prompt_type,
      llava_prompt: data.llava_prompt,
      image_audio_loaders_options: data.image_audio_loaders_options as string[],
      pdf_loaders_options: data.pdf_loaders_options as string[],
      url_loaders_options: data.url_loaders_options as string[],
      jq_schema: data.jq_schema,
      top_k_docs: data.top_k_docs,
      chunk: data.chunk,
      chunk_size: data.chunk_size,
      docs_ordering_type: data.docs_ordering_type,
      docs_token_handling: data.docs_token_handling,
      docs_joiner: data.docs_joiner,
      hyde_level: data.hyde_level,
      hyde_template: data.hyde_template,
      hyde_show_only_final: data.hyde_show_only_final,
      doc_json_mode: data.doc_json_mode,
      metadata_in_context: data.metadata_in_context,
      stream_output: data.stream_output,
      seed: data.seed,
      max_time: data.max_time,
      temperature: data.temperature,
      top_p: data.top_p,
      top_k: data.top_k,
      penalty_alpha: data.penalty_alpha,
      max_new_tokens: data.max_new_tokens,
      min_new_tokens: data.min_new_tokens,
      min_max_new_tokens: data.min_max_new_tokens,
      max_input_tokens: data.max_input_tokens,
      max_total_input_tokens: data.max_total_input_tokens,
      repetition_penalty: data.repetition_penalty,
      type: data.type,
      titre: data.titre,
      date: data.date,
    };

    console.log('Expert Params:', expertParams);
  } catch (err) {
    console.error('Error fetching expert params:', err.message);
  }
}

  async function AddConfig() {
try {
 const response = await fetch('http://localhost:3005/api/add-params', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify(expertParams), // La collection mise à jour

 });
 console.log(expertParams);
 if(response.ok){
  toast.success($i18n.t('Configuration added successfully'));

 }
 if (!response.ok) {

   throw new Error('Failed to add config');
 }


} catch (error) {
 toast.error($i18n.t('Error adding new config: ' + error.message));
}
}
async function checkExistenceParams(titre:string, type:string) {
  try {
    const response = await fetch('http://localhost:3005/api/check-existence-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titre, type })
    });

    // Vérifiez si la réponse est correcte
    if (response.ok) {
      const data = await response.json();
      return data.existe; // Retourne true ou false selon l'existence
    } else {
      throw new Error('Erreur lors de la vérification.');
    }

  } catch (error) {
    console.error('Erreur: ' + error.message);
    return null; // Retourne null en cas d'erreur
  }
}

async function checkExistencetheme(titre:string) {
  try {
    const response = await fetch('http://localhost:3005/api/check-existence-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titre})
    });

    // Vérifiez si la réponse est correcte
    if (response.ok) {
      const data = await response.json();
      return data.existe; // Retourne true ou false selon l'existence
    } else {
      throw new Error('Erreur lors de la vérification.');
    }

  } catch (error) {
    console.error('Erreur: ' + error.message);
    return null; // Retourne null en cas d'erreur
  }
}


async function AddTheme() {
  let themeToAdd: Theme = {
      label: newTheme, // This should be updated with your input
      collection: "" // Assign a default value for collection
    };
try {
 const response = await fetch('http://localhost:3005/api/add-themes', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },

   body: JSON.stringify(themeToAdd), // La collection mise à jour

 });
 if(response.ok){
  toast.success($i18n.t('Theme added successfully'));
  await fetchThemes();

 }
 if (!response.ok) {

   throw new Error('Failed to add Thème');
 }


} catch (error) {
 toast.error($i18n.t('Error adding new Thème: ' + error.message));
}
}

  function resetConfig(){
  expertParams.system_prompt_type="";
  expertParams.system_prompt="";
  expertParams.context="";
  expertParams.chat_conversation="";
  expertParams.text_context_list="";
  expertParams.input="";
  expertParams.pre_prompt_query="";
  expertParams.prompt_query="";
  expertParams.pre_prompt_summary="";
  expertParams.prompt_summary="";
  expertParams.hyde_llm_prompt="";
  expertParams.llava_prompt="";
  expertParams.llava_prompt_type="";
  expertParams.image_audio_loaders_options=[]; // array of strings
  expertParams.pdf_loaders_options=[]; // array of strings
  expertParams.url_loaders_options=[]; // array of strings
  expertParams.jq_schema="";
  expertParams.chunk=false;
  expertParams.docs_ordering_type="";
  expertParams.docs_token_handling="";
  expertParams.docs_joiner="";
  expertParams.hyde_template="";
  expertParams.hyde_show_only_final=false;
  expertParams.doc_json_mode=false;
  expertParams.metadata_in_context="";
  expertParams.stream_output=false;
  expertParams.type="";
  expertParams.titre="";
  expertParams.date="";
    expertParams.top_k_docs=0;
    expertParams.chunk_size=0;
    expertParams.hyde_level=0;
    expertParams.seed=0;
    expertParams.max_time=0;
    expertParams.temperature=0;
    expertParams.top_p=0;
    expertParams.top_k=0;
    expertParams.penalty_alpha=0;
    expertParams.max_new_tokens=0;
    expertParams.min_new_tokens=0;
    expertParams.min_max_new_tokens=0;
    expertParams.max_input_tokens=0;
    expertParams.max_total_input_tokens=0;
    expertParams.repetition_penalty=0;
  }

  // Fonction pour changer de tab
  function selectTab(tab) {
    activeTab = tab;
  }
  function selectTheme(theme:Theme){
    selectedTheme=theme;
    selectedType=theme.label;
    resetConfig();
    fetchExpertParams(selectedType);

  }
  function handleSelectChange(event) {
    resetConfig();
    expertParams.type=selectedType;
  }
    // Fonction pour mettre à jour expertParams.llava_prompt en fonction de la sélection
    function handleSelectChangeSystem_prompt(event) {
    const selectedType = event.target.value;

    // Rechercher le prompt correspondant au type sélectionné
    const selectedPrompt = systemPrompts.find(prpt => prpt.name === selectedType);

    // Mettre à jour le prompt dans expertParams
    if (selectedPrompt) {
      expertParams.system_prompt = selectedPrompt.prompt;
    }
  }
  // Fonction pour mettre à jour expertParams.llava_prompt en fonction de la sélection
  function handleSelectChangellava_prompt(event) {
    const selectedType = event.target.value;

    // Rechercher le prompt correspondant au type sélectionné
    const selectedPrompt = LLaVaLLMPrompts.find(prpt => prpt.name === selectedType);

    // Mettre à jour le prompt dans expertParams
    if (selectedPrompt) {
      expertParams.llava_prompt = selectedPrompt.prompt;
    }
  }
  function toggleOption(option) {
    const options = expertParams.image_audio_loaders_options;
    const index = options.indexOf(option);

    if (index > -1) {
      // Option exists, so remove it
      options.splice(index, 1);
    } else {
      // Option doesn't exist, so add it
      options.push(option);
    }

    // Trigger UI update if necessary
    expertParams.image_audio_loaders_options = [...options];
  }
 // Fonction pour vérifier si une option PDF est cochée
 function isPDFOptionChecked(option) {
    return expertParams.pdf_loaders_options?.includes(option) || false;
  }

  // Fonction pour ajouter ou retirer une option dans pdf_loaders_options
  function togglePDFOption(option) {
    if (!expertParams.pdf_loaders_options) {
      // Si la propriété n'existe pas encore, on initialise un tableau vide
      expertParams.pdf_loaders_options = [];
    }

    const options = expertParams.pdf_loaders_options;
    const index = options.indexOf(option);

    if (index > -1) {
      // Si l'option existe, on la retire
      options.splice(index, 1);
    } else {
      // Sinon, on l'ajoute
      options.push(option);
    }

    // Mettre à jour la variable
    expertParams.pdf_loaders_options = [...options];
  }

 async function AddThemeOnclick(){

    if (!newTheme || newTheme.trim() === "") {
    toast.error($i18n.t('The theme title is mandatory.')); // Affiche un message d'erreur si titre est vide
    return; // Arrête l'exécution si le titre est vide
  }
  // Vérifier l'existence de la configuration
  const existe = await checkExistencetheme(newTheme); // Assurez-vous d'attendre le résultat
  if (existe === null) {
    toast.error($i18n.t('Error when checking for existence.'));
    return; // Arrêtez l'exécution en cas d'erreur
  }
  if (existe) {
    toast.error($i18n.t('The theme already exists.')); // Affiche un message si elle existe
    return; // Arrêtez l'exécution si le document existe
  }
    AddTheme();
    handleCancelAddTheme();
  }
    // Fonction pour ajouter ou retirer une option dans url_loaders_options
    function toggleURLOption(option) {
    if (!expertParams.url_loaders_options) {
      // Si la propriété n'existe pas encore, on initialise un tableau vide
      expertParams.url_loaders_options = [];
    }

    const options = expertParams.url_loaders_options;
    const index = options.indexOf(option);

    if (index > -1) {
      // Si l'option existe, on la retire
      options.splice(index, 1);
    } else {
      // Sinon, on l'ajoute
      options.push(option);
    }

    // Mettre à jour la variable
    expertParams.url_loaders_options = [...options];
    console.log(expertParams.url_loaders_options);
  }

  function OpenAddTheme(){
    showAddThemeForm=true
    newTheme="";

  }


  function toggleSubList(clickedTheme) {
  themes = themes.map(theme => {
    // Fermer toutes les sous-listes sauf celle sélectionnée
    if (theme.label === clickedTheme.label) {
      selectedTheme=clickedTheme;
      theme.showConfigList = !theme.showConfigList; // Bascule l'affichage de la sous-liste du thème sélectionné
      selectedType="";
      resetConfig();
      selectedType=theme.label;
      fetchExpertParams(theme.activeConfigTitle);
    } else {
      theme.showConfigList = false; // Ferme les autres sous-listes
      theme.selectedConfigTitle=theme.activeConfigTitle;

    }
    return theme;
  });

  // Appliquer la classe 'show' au bon élément après mise à jour
  setTimeout(() => {
    themes.forEach(theme => {
      const sublist = document.querySelector(`.sub-list[data-id='${theme.label}']`);
      if (sublist) {
        if (theme.showConfigList) {
          sublist.classList.add('show');
        } else {
          sublist.classList.remove('show');
        }
      }
    });
  }, 0);
}
function handleCancelPopup(){
  showInfoPopup=false;
}


function handleCancelAddTheme(){
  showAddThemeForm=false;
  newTheme="";
}


async function AddNewConfig() {
  expertParams.type=selectedType;

    // Vérifier si selectedType ou titre est vide
  if (!selectedType || selectedType.trim() === "") {
    toast.error($i18n.t('The selected configuration type is required.')); // Affiche un message d'erreur si vide
    return; // Arrête l'exécution si selectedType est vide
  }

  if (!expertParams.titre || expertParams.titre.trim() === "") {
    toast.error($i18n.t('The configuration title is required.')); // Affiche un message d'erreur si titre est vide
    return; // Arrête l'exécution si le titre est vide
  }
  // Vérifier l'existence de la configuration
  const existe = await checkExistenceParams(expertParams.titre, selectedType); // Assurez-vous d'attendre le résultat
  if (existe === null) {
    toast.error($i18n.t('Error when checking for existence.'));
    return; // Arrêtez l'exécution en cas d'erreur
  }
  if (existe) {
    toast.error($i18n.t('The configuration already exists.')); // Affiche un message si elle existe
    return; // Arrêtez l'exécution si le document existe
  }
  // Si la validation est réussie, continuer
  expertParams.date = new Date().toISOString();
  await AddConfig(); // Assurez-vous que AddConfig est une fonction asynchrone
  await fetchThemes();

  // Réinitialiser les champs
  selectedType = "";
  resetConfig();
}

    // Call fetchMessages when the component is mounted
    onMount(() => {
      selectedType="";
      resetConfig();
      fetchThemes();
      fetchSystemPrompts();
      fetchLLaVaLLMPrompts();
      });

</script>

<svelte:head>
	<title>{$i18n.t('Expert')} | {$WEBUI_NAME}</title>
</svelte:head>

<div class="container">
  <div class="sidebar">
    <div class="sidebar-content">
      <div class="flex justify-between items-center mb-6">
        <p class="list-title"> {$i18n.t('List of themes')}
          <span class="info-popup"   on:click={() => {showInfoPopup=true}}>i</span>
        </p>

        <button
          class="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-0 button-plus hover:custom-bg-hover dark:bg-gray-800 dark:hover:bg-gray-700 transition font-medium text-sm flex items-center space-x-1"
          aria-label="Add Docs"
          on:click={OpenAddTheme}
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

      <div class="message-list">
        {#each themes as theme}
          <div>
            <!-- Élément du thème -->
            <div
              class="message {selectedTheme && selectedTheme.label === theme.label ? 'selected' : ''}"
              on:click={() => toggleSubList(theme)}
            >
              <div class="message-content">
                <strong class="message-sender">{theme.label}</strong>
              </div>
              <span class="arrow-down"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg></span> <!-- Flèche vers le bas -->
            </div>
<!-- Sous-liste de titres, qui s'affiche lors du clic -->
{#if theme.showConfigList}
  <!-- Vérification si la liste est vide -->
  {#if theme.configList.length > 0}
    <ul class="sub-list {theme.configList.length > 4 ? 'scrollable' : ''}">
      {#each theme.configList as title}
        <li
          on:click={() => {
            theme.selectedConfigTitle = title; // Met à jour currentConfig
            selectedType = "";
            resetConfig();
            selectedType = theme.label;
            fetchExpertParams(title); // Appelle la fonction avec le titre sélectionné
          }}
          class="sub-list-item"
        >
          <!-- Utilisation d'une div ou d'un span pour contenir le titre et l'icône ensemble -->
          <div class="title-container">
            <span class="{title == theme.selectedConfigTitle ? 'font-bold' : 'bold'}">
              {title}
            </span>

            <!-- Afficher l'icône SVG si title == theme.activeConfigTitle -->
            {#if title == theme.activeConfigTitle}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark-check-fill icon-active" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5m8.854-9.646a.5.5 0 0 0-.708-.708L7.5 7.793 6.354 6.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z"/>
            </svg>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <!-- Afficher le message si la liste est vide -->
    <div class="empty-message">
      <p>{$i18n.t('No configuration available')}</p>
    </div>
  {/if}
{/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
  {#if showInfoPopup}
  <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
    <div class="modal-content" style="background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); width: 500px;">
      <!-- Modal Header -->
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-weight: bold; font-size: 18px; text-align: center; flex-grow: 1; margin: 0;">
          {$i18n.t('Info')}
          <span class="info-popup" style="cursor: pointer; margin-left: 5px;">i</span>
        </h3>
        <button class="close-button" on:click={handleCancelPopup} style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="input-field">
          <p style="text-align:center;"> {$i18n.t('The configurations under each theme are listed in descending chronological order (from the most recent configuration to the oldest configuration).')}</p>
        </div>
      </div>
    </div>
  </div>
{/if}



  {#if showAddThemeForm}
  <div class="modal-overlay">
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <h3>{$i18n.t('Add a theme')}</h3>
        <button class="close-button" on:click={handleCancelAddTheme}>
          &times;
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="input-field">
          <label for="themeTitleInput"> {$i18n.t('Theme name :')}</label>
          <input id="themeTitleInput" bind:value={newTheme} placeholder= {$i18n.t('Enter the theme name...')}>
        </div>
      </div>


      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="custom-bg hover:custom-bg-hover" on:click={handleCancelAddTheme}>
          {$i18n.t('Cancel')}
        </button>

        <button id="validateButton" on:click={AddThemeOnclick}>
          {$i18n.t('Add')}
        </button>
      </div>
    </div>
  </div>
{/if}


  <div class="content">
    <!-- Card 1: Configuration -->
    <div class="card {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
      <h2> {$i18n.t('Configuration')}</h2>

      <div class="input-field min-height-130">
        <div class="date-section">
          <label for="creationDate"> {$i18n.t('Creation date :')}</label>
          <p id="creationDate" class="creation-date {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
            {#if expertParams.date}
              {new Date(expertParams.date).toLocaleString( $i18n.language === 'ar-BH' ? 'ar-BH' :
              $i18n.language === 'fr-FR' ? 'fr-FR' :
              'en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }).replace(/^\w/, c => c.toUpperCase())}
            {:else}
              -
            {/if}
          </p>
        </div>

        <label for="configType"> {$i18n.t('Configuration type :')}</label>
        <input id="configType" bind:value={selectedType} placeholder= {$i18n.t('Enter a type...')} disabled>

        <label for="configTitle">{$i18n.t('Configuration title :')}</label>
        <input id="configTitle" bind:value={expertParams.titre} placeholder={$i18n.t('Enter a title...')}>
      </div>
    </div>

    <!-- Card 2: Configuration Avancée avec Tabs -->
    <div class="card {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
      <h2>{$i18n.t('Control of the prompt')}</h2>

      <div class="tabs">
        <div class="tab {activeTab === 'SystemPrompts' ? 'active' : ''}" on:click={() => selectTab('SystemPrompts')}>{$i18n.t('System prompts')}</div>
        <div class="tab {activeTab === 'InstructionPrompts' ? 'active' : ''}" on:click={() => selectTab('InstructionPrompts')}>{$i18n.t('Instruction prompts')}</div>
        <div class="tab {activeTab === 'SummaryPrompts' ? 'active' : ''}" on:click={() => selectTab('SummaryPrompts')}>{$i18n.t('Summary Prompts')}</div>
      </div>

      <div class="tab-content">
        {#if activeTab === 'SystemPrompts'}
        <div class="input-field ">
          <label for="systemPrompt_Type">{$i18n.t('System prompt type :')}</label>
          <select id="systemPrompt_Type" class="{$i18n.language === 'ar-BH' ? 'select-rtl rtl-style' : ''}" bind:value={expertParams.system_prompt_type} on:change={handleSelectChangeSystem_prompt}>
            <option value="" disabled selected>{$i18n.t('Select a type')}</option>
            {#each systemPrompts as Prpt}
              <option value={Prpt.name}>{Prpt.name}</option>
            {/each}
          </select>
        </div>
        <div class="input-field min-height-130">
          <label for="systemPrompt_Invite">{$i18n.t('System prompt :')}</label>
          <textarea id="systemPrompt_Invite" bind:value={expertParams.system_prompt} placeholder={$i18n.t('Enter the system prompt...')}></textarea>
        </div>
        <div class="input-field min-height-130">
          <label for="preContext">{$i18n.t('System pre-context :')}</label>
          <textarea id="preContext" bind:value={expertParams.context} placeholder={$i18n.t('Enter the pre-context...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="preConversation">{$i18n.t('Pre-conversation :')}</label>
          <textarea id="preConversation" bind:value={expertParams.chat_conversation} placeholder={$i18n.t('Enter the pre-conversation...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="docQA">{$i18n.t('Text doc Q/A :')}</label>
          <textarea id="docQA" bind:value={expertParams.text_context_list} placeholder={$i18n.t('Enter the text doc Q/A..')}></textarea>
        </div>        {/if}
        {#if activeTab === 'InstructionPrompts'}
        <div class="input-field min-height-130">
          <label for="instructPromptInputs">{$i18n.t('Inputs for instruct prompt types :')}</label>
          <textarea id="instructPromptInputs" bind:value={expertParams.input} placeholder={$i18n.t('Enter the inputs...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="requestPreview">{$i18n.t('Query preview :')}</label>
          <textarea id="requestPreview" bind:value={expertParams.pre_prompt_query} placeholder={$i18n.t('Enter the query preview...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="requestPrompt">{$i18n.t('Request prompt :')}</label>
          <textarea id="requestPrompt" bind:value={expertParams.prompt_query} placeholder={$i18n.t('Enter the request prompt...')}></textarea>
        </div>        {/if}
        {#if activeTab === 'SummaryPrompts'}
        <div class="input-field min-height-130">
          <label for="preSummaryIteration">{$i18n.t('Summary pre-iteration :')}</label>
          <textarea id="preSummaryIteration" bind:value={expertParams.pre_prompt_summary} placeholder={$i18n.t('Enter the pre-summary...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="summaryPrompt">{$i18n.t('Summary prompt :')}</label>
          <textarea id="summaryPrompt" bind:value={expertParams.prompt_summary} placeholder={$i18n.t('Enter summary prompt...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="hydeLLMPrompt">{$i18n.t('HYDE LLM Prompt :')}</label>
          <textarea id="hydeLLMPrompt" bind:value={expertParams.hyde_llm_prompt} placeholder={$i18n.t('Enter the HYDE LLM prompt...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="llaVaPromptType">{$i18n.t('LLaVa LLM Prompt Type :')}</label>
          <select id="llaVaPromptType" bind:value={expertParams.llava_prompt_type} on:change={handleSelectChangellava_prompt}>
              <option value="" disabled selected>{$i18n.t('Select a type')}</option>
              {#each LLaVaLLMPrompts as Prpt}
                <option value={Prpt.name}>{Prpt.name}</option>
              {/each}
            </select>
        </div>

        <div class="input-field min-height-130">
          <label for="llaVaPrompt">{$i18n.t('Prompt LLaVa :')}</label>
          <textarea id="llaVaPrompt" bind:value={expertParams.llava_prompt} placeholder={$i18n.t('Enter the LLaVa prompt...')}></textarea>
        </div>        {/if}
      </div>
    </div>

    <!-- Nouveau Bloc ajouté ici -->
    <div class="card {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
      <h2>{$i18n.t('Control of documents')}</h2>
      <div class="input-row">
      <div class="input-field min-height-130">
  <label>{$i18n.t('Force image and audio player :')}</label>
  <div>
    <label for="caption">
      <input type="checkbox" id="caption"
             on:change={() => toggleOption('Caption')}
             checked={expertParams.image_audio_loaders_options?.includes('Caption') || false}>
      Caption
    </label>
  </div>
  <div>
    <label for="doctrIO">
      <input type="checkbox" id="doctrIO"
             on:change={() => toggleOption('DocTR')}
             checked={expertParams.image_audio_loaders_options?.includes('DocTR') || false}>
      DocTR
    </label>
  </div>
  <div>
    <label for="asr">
      <input type="checkbox" id="asr"
             on:change={() => toggleOption('ASR')}
             checked={expertParams.image_audio_loaders_options?.includes('ASR') || false}>
      ASR
    </label>
  </div>
</div>

<div class="input-field min-height-130">
  <label>{$i18n.t('Force PDF reader :')}</label>
  <div>
    <label for="pymupdf">
      <input type="checkbox" id="pymupdf"
             on:change={() => togglePDFOption('PyMuPDF')}
             checked={expertParams.pdf_loaders_options?.includes('PyMuPDF') || false}>
      PyMuPDF
    </label>
  </div>
  <div>
    <label for="unstructuredPDF">
      <input type="checkbox" id="unstructuredPDF"
             on:change={() => togglePDFOption('Unstructured')}
             checked={expertParams.pdf_loaders_options?.includes('Unstructured') || false}>
      Unstructured
    </label>
  </div>
  <div>
    <label for="pypdf">
      <input type="checkbox" id="pypdf"
             on:change={() => togglePDFOption('PyPDF')}
             checked={expertParams.pdf_loaders_options?.includes('PyPDF') || false}>
      PyPDF
    </label>
  </div>
  <div>
    <label for="tryhtml">
      <input type="checkbox" id="tryhtml"
             on:change={() => togglePDFOption('TryHTML')}
             checked={expertParams.pdf_loaders_options?.includes('TryHTML') || false}>
      TryHTML
    </label>
  </div>
  <div>
    <label for="doctr">
      <input type="checkbox" id="doctr"
             on:change={() => togglePDFOption('DocTR')}
             checked={expertParams.pdf_loaders_options?.includes('DocTR') || false}>
      DocTR
    </label>
  </div>
</div>
      </div>
  <div class="input-row">
<div class="input-field min-height-130">
  <label>{$i18n.t('Force URL Reader :')}</label>
  <div>
    <label for="UnstructuredURL">
      <input type="checkbox" id="UnstructuredURL"
             on:change={() => toggleURLOption('Unstructured')}
             checked={expertParams.url_loaders_options?.includes('Unstructured') || false}>
      Unstructured
    </label>
  </div>
  <div>
    <label for="Selenium">
      <input type="checkbox" id="Selenium"
             on:change={() => toggleURLOption('Selenium')}
             checked={expertParams.url_loaders_options?.includes('Selenium') || false}>
      Selenium
    </label>
  </div>
  <div>
    <label for="PlayWright">
      <input type="checkbox" id="PlayWright"
             on:change={() => toggleURLOption('PlayWright')}
             checked={expertParams.url_loaders_options?.includes('PlayWright') || false}>
             PlayWright
    </label>
  </div>
  <div>
    <label for="ScrapeWithPlayWright">
      <input type="checkbox" id="ScrapeWithPlayWright"
             on:change={() => toggleURLOption('ScrapeWithPlayWright')}
             checked={expertParams.url_loaders_options?.includes('ScrapeWithPlayWright') || false}>
      ScrapeWithPlayWright
    </label>
  </div>
  <div>
    <label for="ScrapeWithHttp">
      <input type="checkbox" id="ScrapeWithHttp"
             on:change={() => toggleURLOption('ScrapeWithHttp')}
             checked={expertParams.url_loaders_options?.includes('ScrapeWithHttp') || false}>
      ScrapeWithHttp
    </label>
  </div>
</div>

  </div>
  <div class="input-row">

      <div class="input-field min-height-130">
        <label for="newTextarea_jq_schema">{$i18n.t('JSON jq_schema :')}</label>
        <textarea id="newTextarea_jq_schema" bind:value={expertParams.jq_schema} placeholder={$i18n.t('Enter a description...')}></textarea>
      </div>
      <div class="input-field min-height-130">
        <label for="newTextarea_chunk_size1">
            <span class="info-button" aria-label={$i18n.t('Number of pieces of documents (query) or pages/parts (summary) (-1 = automatic filling of the model context, all pages/documents for the summary)')}>i</span>
            {$i18n.t('Number of pieces of documents :')}
        </label>
        <div class="range-container">
            <input type="range" id="range" min="0" max="1000" bind:value={expertParams.chunk_size} >
            <div class="value-display" id="value">{expertParams.chunk_size}</div>
        </div>
    </div>



  </div>
  <div class="input-row">
    <div class="input-field min-height-130">
      <label>{$i18n.t('For LangChain :')}</label>
      <div>
        <label for="langchainCheckbox">
          <input type="checkbox" id="langchainCheckbox"
          bind:checked={expertParams.chunk}>
          {$i18n.t('Break up documents')}
         </label>
      </div>
    </div>

      <div class="input-field min-height-130">
        <label for="newTextarea_chunk_size2">{$i18n.t('Size of the pieces for document cutting :')}</label>
        <textarea id="newTextarea_chunk_size2" bind:value={expertParams.chunk_size} placeholder={$i18n.t('Enter a description...')}></textarea>
      </div>
  </div>
      <div class="input-row">

      <div class="input-field radio-group">
        <label for="docsOrdering">{$i18n.t('Document Sorting in the LLM context :')}</label>

        <div >
          <label>
            <input type="radio" value="best_first"
                   bind:group={expertParams.docs_ordering_type}>
            Best_First
          </label>
        </div>

        <div>
          <label>
            <input type="radio" value="best_near_prompt"
                   bind:group={expertParams.docs_ordering_type}>
            Best_Near_Prompt
          </label>
        </div>

        <div>
          <label>
            <input type="radio" value="reverse_ucurve_sort"
                   bind:group={expertParams.docs_ordering_type}>
            Reverse_ucurve_Sort
          </label>
        </div>
      </div>

      <div class="input-field min-height-130">
        <label for="docsTokenHandling">{$i18n.t('Document processing mode to complete LLM context :')}</label>

        <div>
          <label>
            <input type="radio" value="chunk"
                   bind:group={expertParams.docs_token_handling}>
            Chunk
          </label>
        </div>

       <div>
  <label class="radio-label">
    <input type="radio" value="split_or_merge" bind:group={expertParams.docs_token_handling}>
    <span class="radio-circle"></span>
    Split_or_Merge
  </label>
</div>


      </div>
      </div>
      <div class="input-row">

      <div class="input-field min-height-130">
        <label for="newTextarea_docs_joiner">{$i18n.t('String to attach lists and documents :')}</label>
        <textarea id="newTextarea_docs_joiner" bind:value={expertParams.docs_joiner} placeholder={$i18n.t('Enter a description...')}></textarea>
      </div>
      <div class="input-field min-height-130">
        <label for="newTextarea_hyde_level">{$i18n.t('HYDE Level :')}</label>
        <div class="range-container">
            <input type="range" id="range" min="0" max="1000" bind:value={expertParams.hyde_level} >
            <div class="value-display" id="value">{expertParams.hyde_level}</div>
        </div>
    </div>



      </div>
      <div class="input-row">

      <div class="input-field min-height-130">
        <label for="newTextarea_hyde_template">{$i18n.t('HYDE embedding model :')}</label>
        <textarea id="newTextarea_hyde_template" bind:value={expertParams.hyde_template} placeholder={$i18n.t('Enter a description...')}></textarea>
      </div>


      <div class="input-field min-height-130">
        <label>{$i18n.t('Show or not the final result of HYDE :')}</label>
        <div>
          <label for="Aff_rus_HYDE">
            <input type="checkbox" id="Aff_rus_HYDE"
            bind:checked={expertParams.hyde_show_only_final}>
            {$i18n.t('Only the final version of HYDE is presented')}
           </label>
        </div>
      </div>
      </div>
      <div class="input-row">

      <div class="input-field min-height-130">
        <label>{$i18n.t('Whether or not to transmit JSON to LLM and receive JSON in return from LLM :')}</label>
        <div>
          <label for="ModeJSON">
            <input type="checkbox" id="ModeJSON"
            bind:checked={expertParams.doc_json_mode}>
            {$i18n.t('Docs JSON mode')} 
          </label>
        </div>
      </div>

      <div class="input-field min-height-130">
        <label for="newTextarea_metadate_in_context">
          <span class="info-button" aria-label={$i18n.t('Metadata to be included in the LLM context (all, auto, or [key1, key2, ...] where strings are enclosed in quotation marks)')}>i</span>
          {$i18n.t('The metadata to be included in the LLM context:')}
      </label>
        <textarea id="newTextarea_metadate_in_context" bind:value={expertParams.metadate_in_context} placeholder={$i18n.t('Enter a description...')}></textarea>
      </div>
    </div>
    </div>
    <div class="card {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
      <h2>{$i18n.t('LLM Control')}</h2>

      <div class="input-row">
        <div class="input-field ">
          <label for="ModeJSONLLM">
            <input type="checkbox" id="ModeJSONLLM"
            bind:checked={expertParams.stream_output}>
            {$i18n.t('Docs JSON mode')}
          </label>
        </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newTextarea_seed">{$i18n.t('Seed for sampling. 0 creates a random seed :')}</label>
          <textarea id="newTextarea_seed" bind:value={expertParams.seed} placeholder={$i18n.t('Enter a description...')}></textarea>
        </div>

        <div class="input-field min-height-130">
          <label for="newField_max_time">{$i18n.t('Maximum duration :')}</label>
          <div class="range-container">
            <input type="range" id="range" min="0" max="1000" bind:value={expertParams.max_time} >
            <div class="value-display" id="value">{expertParams.max_time}</div>
        </div>
        </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newField_temperature">{$i18n.t('Temperature :')}</label>

          <div class="range-container">
            <input type="range" id="range" min="0" max="1" step="0.01" bind:value={expertParams.temperature} >
            <div class="value-display" id="value">{expertParams.temperature}</div>
        </div>

        </div>

        <div class="input-field min-height-130">
          <label for="newField_top_p">{$i18n.t('Top p :')}</label>
          <div class="range-container">
            <input type="range" id="range" min="0" max="1" step="0.01" bind:value={expertParams.top_p} >
            <div class="value-display" id="value">{expertParams.top_p}</div>
        </div>
         </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newField_top_k">{$i18n.t('Top k :')}</label>

          <div class="range-container">
            <input type="range" id="range" min="0" max="1" step="0.01" bind:value={expertParams.top_k} >
            <div class="value-display" id="value">{expertParams.top_k}</div>
        </div>
           </div>

        <div class="input-field min-height-130">
          <label for="newField_penalty_alpha">{$i18n.t('Alpha penalty :')}</label>
          <div class="range-container">
            <input type="range" id="range" min="0" max="1" step="0.01" bind:value={expertParams.penalty_alpha} >
            <div class="value-display" id="value">{expertParams.penalty_alpha}</div>
        </div>
              </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newField_max_new_tokens">{$i18n.t('Maximum length of the output :')}</label>
          <div class="range-container">
            <input type="range" id="range" min="0" max="2000" bind:value={expertParams.max_new_tokens} >
            <div class="value-display" id="value">{expertParams.max_new_tokens}</div>
        </div>
               </div>

        <div class="input-field min-height-130">
          <label for="newField_min_new_tokens">{$i18n.t('Minimum length of the output :')}</label>
          <div class="range-container">
            <input type="range" id="range"  min="0" max="2000" bind:value={expertParams.min_new_tokens} >
            <div class="value-display" id="value">{expertParams.min_new_tokens}</div>
        </div>
         </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newField_min_max_new_tokens">{$i18n.t('Min. max. length of output :')}</label>
          <div class="range-container">
            <input type="range" id="range" min="0" max="2000" bind:value={expertParams.min_max_new_tokens} >
            <div class="value-display" id="value">{expertParams.min_max_new_tokens}</div>
        </div>
           </div>

        <div class="input-field min-height-130">
          <label for="newField_max_input_tokens">{$i18n.t('Maximum input length :')}</label>

          <input id="newField_max_input_tokens" bind:value={expertParams.max_input_tokens} placeholder={$i18n.t('Enter a new value...')}>
        </div>
      </div>

      <div class="input-row">
        <div class="input-field min-height-130">
          <label for="newField_max_total_input_tokens">{$i18n.t('Maximum length of summary/extraction entry :')}</label>
          <input id="newField_max_total_input_tokens" bind:value={expertParams.max_total_input_tokens} placeholder={$i18n.t('Enter a new value...')}>
        </div>

        <div class="input-field min-height-130">
          <label for="newField_repetition_penalty">{$i18n.t('Penalty for repetition :')}</label>

           <div class="range-container">
            <input type="range" id="range" min="0" max="3" step="0.01" bind:value={expertParams.repetition_penalty} >
            <div class="value-display" id="value">{expertParams.repetition_penalty}</div>
        </div>
         </div>
      </div>
    </div>

      <div class="button-container  ">
        <button id="validateButton"  class="w-full" on:click={() => AddNewConfig()}>
          {$i18n.t('Save a new configuration')}

          </button>
    </div>
</div>
</div>

<style>
    .rtl-style{
				direction:rtl;
				  text-align:right;
				  flex-direction: row-reverse;
			  }
			
 .date-section {
    margin-bottom: 20px;
    text-align: left; /* Center the date */
  }

  .creation-date {
    font-size: 0.85em; /* Smaller font size */
    color: #555;
    font-style: italic;
    margin-top: 5px;
  }

  .min-height-130{
    min-height: 130px;
  }
.input-field {
    position: relative; /* Pour positionner le tooltip correctement */
}
.info-popup{
  margin-top:10px;
    display: inline-block;
    width: 16px; /* Largeur du cercle réduite */
    height: 16px; /* Hauteur du cercle réduite */
    border-radius: 50%; /* Rendre le bouton circulaire */
    background-color: #4CAF50; /* Couleur de fond */
    color: white; /* Couleur du texte */
    text-align: center; /* Centrer le texte */
    line-height: 16px; /* Centrer verticalement */
    margin-right: 5px; /* Espace entre le bouton et le titre */
    position: relative; /* Pour le tooltip */
    font-size: 12px; /* Taille de police plus petite pour le texte */
  }

.info-button {
  margin-top:3px;
    display: inline-block;
    width: 16px; /* Largeur du cercle réduite */
    height: 16px; /* Hauteur du cercle réduite */
    border-radius: 50%; /* Rendre le bouton circulaire */
    background-color: #4CAF50; /* Couleur de fond */
    color: white; /* Couleur du texte */
    text-align: center; /* Centrer le texte */
    line-height: 16px; /* Centrer verticalement */
    cursor: help; /* Curseur d'aide */
    margin-right: 5px; /* Espace entre le bouton et le titre */
    position: relative; /* Pour le tooltip */
    font-size: 12px; /* Taille de police plus petite pour le texte */
}

/* Styles pour le texte du tooltip */
.info-button:hover::after {
    content: attr(aria-label); /* Afficher le texte de l'infobulle */
    display: block; /* Afficher le texte */
    position: absolute;
    bottom: 100%; /* Positionner l'infobulle au-dessus */
    left: 50%; /* Centrer horizontalement */
    transform: translateX(-50%); /* Ajustement pour centrer */
    background: #4CAF50; /* Couleur de fond de l'infobulle */
    color: #fff; /* Couleur du texte */
    padding: 5px; /* Espacement interne */
    border-radius: 5px; /* Coins arrondis */
    white-space: normal; /* Permettre le retour à la ligne */
    z-index: 100; /* Assurer que l'infobulle est au-dessus des autres éléments */
    width: 250px; /* Largeur fixe du tooltip */
    font-size: 12px; /* Taille de police plus petite pour le texte */
    visibility: visible; /* Afficher le texte du tooltip */
    opacity: 1; /* Rendre l'infobulle opaque */
    transition: opacity 0.3s; /* Transition pour l'affichage */
}

/* Masquer le tooltip par défaut */
.info-button::after {
    content: ""; /* Masquer le texte par défaut */
    display: none; /* Masquer l'infobulle par défaut */
}

/* Afficher le texte du tooltip lors du survol */
.info-button:hover::after {
  text-align: left;
    display: block; /* Afficher le texte du tooltip au survol */
}

.empty-message {
  display: flex;               /* Utilisation de Flexbox pour le centrage */
  justify-content: center;      /* Centrage horizontal */
  align-items: center;          /* Centrage vertical */
  height: 40px;                /* Hauteur du conteneur pour le centrage vertical */
  font-size: 0.85rem;           /* Taille de texte plus petite */
  color: #888;                  /* Couleur plus discrète */
  background-color: #f1f1f1;    /* Légère couleur de fond */
  border-radius: 4px;           /* Coins arrondis */
  text-align: center;           /* Centrage du texte */
  margin: 10px 0;               /* Espacement autour du message */
}

.select-rtl {
    direction: rtl;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
    background-position: left 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    /*padding-right: 2.5rem;*/
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -moz-appearance: none;
    -webkit-appearance: none;
    }

.range-container {
    position: relative; /* Pour positionner le label correctement */
    width: 100%;
}


/* Track - style pour le track */
input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    background: #ddd; /* Couleur du track */
    border-radius: 5px; /* Coins arrondis */
}

/* Thumb - style pour le curseur */
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; /* Enlève le style par défaut */
    appearance: none;
    width: 20px; /* Largeur du curseur */
    height: 20px; /* Hauteur du curseur */
    background: #fff; /* Couleur du curseur */
    border: 2px solid #4CAF50; /* Couleur de la bordure */
    border-radius: 50%; /* Coins arrondis */
    cursor: pointer; /* Curseur en pointeur */
    margin-top: -6px; /* Centrer le curseur */
}
/* Valeur affichée */
.value-display {
    position: absolute; /* Positionnement absolu */
    bottom: -30px; /* Positionné en dessous du slider */
    left: 50%; /* Centrer horizontalement */
    transform: translateX(-50%); /* Ajustement pour centrer */
    background: #9FD5B5; /* Couleur de fond */
    color: #fff; /* Couleur du texte */
    padding: 5px 10px; /* Espacement interne */
    border-radius: 5px; /* Coins arrondis */
    white-space: nowrap; /* Empêcher le retour à la ligne */
    pointer-events: none; /* Ignorer les événements de souris */
}
input[type="range"] {
    -webkit-appearance: none; /* Enlève le style par défaut */
    width: 100%; /* Largeur du slider */
    height: 8px; /* Hauteur du track */
    background: transparent; /* Fond transparent */
    outline: none; /* Pas de contour */
}
/* Track - only for browsers that support it */
input[type="range"]::-webkit-slider-runnable-track {
  width: 100%;
  height: 8px; /* Height of the track */
  background: #9FD5B5; /* Color for the filled part */
  border-radius: 5px; /* Rounded corners */
}

/* Background of the track */
input[type="range"]::-moz-range-track {
  width: 100%;
  height: 8px; /* Height of the track */
  background: #4CAF50; /* Color for the filled part */
  border-radius: 5px; /* Rounded corners */
}

/* Left part: green */
input[type="range"]::-ms-track {
  width: 100%;
  height: 8px;
  background: transparent; /* To show background */
  border-color: transparent; /* No border */
  color: #4CAF50; /* Color for the filled part */
}

/* Thumb */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; /* Remove default styling */
  appearance: none; /* Remove default styling */
  width: 20px; /* Width of the thumb */
  height: 20px; /* Height of the thumb */
  background: #fff; /* Color of the thumb */
  border: 2px solid #4CAF50; /* Border color */
  border-radius: 50%; /* Rounded thumb */
  cursor: pointer; /* Pointer on hover */
  margin-top: -6px; /* Center the thumb */
}

/* Thumb for Firefox */
input[type="range"]::-moz-range-thumb {
  width: 20px; /* Width of the thumb */
  height: 20px; /* Height of the thumb */
  background: #fff; /* Color of the thumb */
  border: 2px solid #4CAF50; /* Border color */
  border-radius: 50%; /* Rounded thumb */
  cursor: pointer; /* Pointer on hover */
}

/* Track style for Edge */
input[type="range"]::-ms-thumb {
  width: 20px; /* Width of the thumb */
  height: 20px; /* Height of the thumb */
  background: #fff; /* Color of the thumb */
  border: 2px solid #4CAF50; /* Border color */
  border-radius: 50%; /* Rounded thumb */
  cursor: pointer; /* Pointer on hover */
}

/* Track style for Edge */
input[type="range"]::-ms-track {
  width: 100%;
  height: 8px;
  background: #ddd; /* Track color */
  border: none; /* No border */
  color: transparent; /* Hide the color to show the filled part */
}

/* Filled part - using a gradient for the left part */
input[type="range"] {
  background: linear-gradient(to right, #4CAF50 0%, #4CAF50 var(--value), #ddd var(--value), #ddd 100%);
}

/* When the value changes, update the gradient */
input[type="range"]:active {
  --value: calc((100% / 1000) * var(--input-value));
}

/* For Firefox */
input[type="range"] {
  --value: calc((100% / 1000) * var(--input-value)); /* Adjust as per your max value */
}

    .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
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
   .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 40px;
    align-items: center;
    gap: 10px;
  }
  /* Ajout d'une classe pour aligner les input-fields */
  .input-row {
    display: flex;
    justify-content: space-between;
    gap: 20px; /* Espace entre les champs */
    margin-bottom: 15px;
  }
  .input-field {
    flex: 1; /* Pour que les champs aient la même largeur */
  }
  .checkbox-group, .radio-group {
  margin-bottom: 12px; /* Réduction supplémentaire pour plus de compacité */
}
.checkbox-item, .radio-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px; /* Moins d'espace entre les éléments */
}
.checkbox-item label, .radio-item label {
  margin-left: 6px; /* Réduction des marges entre le label et l'input */
  font-weight: 500;
  font-size: 1px; /* Taille de police plus petite pour un design minimaliste */
  cursor: pointer;
}
input[type="checkbox"], input[type="radio"] {
  appearance: none;
  width: 10px; /* Taille plus petite pour un design épuré */
  height: 10px;
  border: 2px solid #9FD5B5;
  border-radius: 4px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Ombre discrète */
}
input[type="checkbox"]:checked, input[type="radio"]:checked {
  background-color: #9FD5B5;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15); /* Légère ombre pour l'état sélectionné */
}
input[type="checkbox"]:hover, input[type="radio"]:hover {
  border-color: #9FD5B5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); /* Effet de survol subtil */
}
input[type="radio"] {
  border-radius: 50%; /* Bouton radio arrondi */
}
input[type="radio"]:checked {
  background-color: #9FD5B5;
}
.checkbox-item label:hover, .radio-item label:hover {
  color: #9FD5B5; /* Effet survol plus doux sur le texte */
}
  .input-field label {
    display: flex;
    gap: 3px;
    margin-bottom: 5px;
    font-weight: bold;
  }
  .input-field {
    margin-bottom: 10px;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #ddd;
  }
  .input-field:hover {
    border-color: #4caf50;
  }
  .container {
    margin-top: 5px;
    display: flex;
    height: 100vh;
    background-color: #f4f5f7;
    font-family: 'Arial', sans-serif;
  }
  .sidebar {
    width: 30%;
    background-color: #ffffff;
    padding: 20px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }
.sidebar-content h2 {
    color: #333;
    font-size: 22px;
    margin-bottom: 20px;
  }
  .message-list {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc #f0f0f0;
}
.message-list::-webkit-scrollbar {
  width: 8px;
}
.message-list::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
}
.message {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin: 10px 0;
  border-radius: 12px;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.message-content {
  flex-grow: 1;
}
.arrow-down {
  font-size: 12px;
  color: #4CAF50;
}
.message:hover {
  background-color: #168c77;
  color: white;
}
.sub-list {
  max-height: 190px; /* Ajustez 50px à la hauteur de vos éléments */
  overflow-y: auto; /* Activer le défilement uniquement si nécessaire */
}
/* Styles pour scrollbar (comme défini précédemment) */
.sub-list::-webkit-scrollbar {
  width: 10px;
}
.sub-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
.sub-list::-webkit-scrollbar-thumb {
  background-color: #4CAF50;
  border-radius: 10px;
  border: 2px solid #f1f1f1;
}
.sub-list::-webkit-scrollbar-thumb:hover {
  background-color: #3e8e41;

}
.sub-list {
  scrollbar-width: thin;
  scrollbar-color: #ddd #f1f1f1;

}
.sub-list-item {
  padding: 10px 15px; /* Espacement interne */
  margin: 5px 0; /* Espacement entre les éléments */
  border-radius: 8px; /* Coins arrondis */
  background-color: #f8f9fa; /* Couleur de fond claire */
  cursor: pointer; /* Changer le curseur pour indiquer l'interaction */
  transition: background-color 0.3s ease, transform 0.2s ease; /* Effets de transition */
  display: flex; /* Aligner le texte et l'icône sur une même ligne */
  justify-content: space-between; /* Optionnel : pour séparer le titre de l'icône */
  align-items: center; /* Centrer verticalement le texte et l'icône */
}
.sub-list-item:hover {
  background-color: #e2e6ea; /* Couleur de fond lors du survol */
  transform: translateY(-2px); /* Légère élévation lors du survol */
}
.sub-list-item span {
  display: block; /* Permet d'aligner correctement le texte */
}
.sub-list .icon-active {
  color: green; /* Définir la couleur verte pour l'icône SVG */
}
.sub-list-item svg {
  margin-left: 8px; /* Ajouter un espace entre le titre et l'icône */
  margin-bottom: 2px;

}
.sub-list li {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #333;
}
.title-container {
  display: flex; /* Aligner le texte et l'icône sur la même ligne */
  align-items: center; /* Centrer le contenu verticalement */
}
  #validateButton {
      background-color: #168c77;
      color: white;
    /*  width: 100%;*/
      padding: 10px 20px;
      border: 2px solid #168c77;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    #validateButton:hover {
        background-color: #B2E0C3;

    }
  .selected {
    background-color: #168c77;
    color: white;
  }
  .custom-bg {
        background-color: #9FD5B5;
        border: 2px solid #168c77;
      color: #168c77;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    .hover\:custom-bg-hover:hover {
        background-color: #9FD5C0;
    }
    .button-container {
     /* display: flex;*/
      display: flex;
      gap: 10px;
      justify-content: center;    /* Centre horizontalement le contenu */
      align-items: center;        /* Centre verticalement les éléments si nécessaire */
    }
  .content {
    width: 70%;
    padding: 20px;
    overflow-y: auto;
  }
  .card {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;
  }
  .list-title {
    color: #333;
    font-size: 24px;
    display: flex;
    gap:5px;
  }
  h2 {
    color: #333;
    font-size: 24px;
    margin-bottom: 15px;
  }
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  input, select, textarea {
    width: 100%;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ccc;
    margin-bottom: 10px;
    font-size: 14px;
  }
  .tabs {
    display: flex;
    margin-bottom: 15px;
  }
  .tab {
    margin-right: 15px;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    background-color: #f0f0f0;
    transition: background-color 0.3s ease;
  }
  .tab.active {
    background-color: #168c77;
    color: white;
  }
  .tab-content {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }
</style>