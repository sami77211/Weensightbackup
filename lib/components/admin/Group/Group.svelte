<script lang="ts">
	import { toast } from 'svelte-sonner';
    import ChevronLeft from '../../icons/ChevronLeft.svelte';
    import ChevronRight from '../../icons/ChevronRight.svelte';
    import { onMount, getContext } from 'svelte';
    import { v4 as uuidv4 } from 'uuid';
    import { models, user } from '$lib/stores';
    import { navigate } from 'svelte-routing'; // ou utilisez 'goto' si vous utilisez SvelteKit


    const i18n = getContext('i18n');
    interface selection_docs {
        id:string;
    mode: string;
    paths: string;
    types: string;
}

interface Group {
    id: number;
    group_name: string;
    Collections: string[]; // Utilisation de l'interface selection_docs
}


    let isLoading = false; // Variable pour gérer l'état du loader
    let groups: Group[]=[] ;
    let newGroupName = '';
    let newCollectionsList:string[]=[];
    let newCollections:string|null=null;
    let showModal = false;
    let selectedGroup: Group | null = null;
    let isAddMode = false;
    let isEditMode = false;
    let currentPage = 1;
    const itemsPerPage = 5;
    let paginatedList: Group[] = [];
    let SearchGroup: string = '';
    let showDeleteConfirmModal = false;
    let groupToDelete: Group | null = null;
    let showModalGroupCollection = false;
    let showPopup = false;
 // Initialize selectedTags and availableTags as empty arrays
    let selectedTags : string[]=[];
    let availableTags : string[]=[];
    // Search input for filtering tags
    let searchTags = "";
    let oldGroupName='';
    let collectionsToDelete:string[]=[];
    // Functions...
    
    function openModal(group: Group) {
        selectedGroup = group;
        newGroupName = group.group_name;
        newCollectionsList=group.Collections;
        isEditMode = false;
        showModal = true;
    }
    function totalPages() {
        totalPageCount=Math.ceil(filteredGroups().length / itemsPerPage);
    }

    function filteredGroups() {
        // Filtrer les groupes en fonction de SearchGroup
        return groups.filter(group => group.group_name.toLowerCase().includes(SearchGroup.toLowerCase()));
    }
    function updatePaginatedList() {
        const start = (currentPage - 1) * itemsPerPage;
        paginatedList = filteredGroups().slice(start, start + itemsPerPage);
        totalPages();
    }
    // Fonction qui redirige vers la page des documents avec le paramètre
  function goToDocumentsPage(collectionName:string) {
    // Créer l'URL avec le paramètre
    window.location.href = `/workspace/documents?CollectionName=${collectionName}`;

    // Utiliser navigate (si SvelteKit) ou window.location (si Svelte)
    //navigate(url); // pour SvelteKit
    // window.location.href = url; // pour Svelte sans router
  }
  
  // Exemple d'action sur le clic de l'élément de collection
  function handleCollectionClick(collectionName:string) {
    goToDocumentsPage(collectionName); // Appel de la fonction de redirection
  }

    // Function to handle adding/removing tags
    function toggleTag(tag) {
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
        } else {
            selectedTags = [...selectedTags, tag];
        }
    }
  
    // Function to handle "Select All"
    function selectAllTags() {
        selectedTags = [...availableTags];
    }

  async  function handleSubmit() {

        if (selectedGroup) {
        // Find the index of the selected group in the paginatedList
        const index = groups.findIndex(g => g.id === selectedGroup.id);
        if (index !== -1) {
            // Update the collections for the found group
            await assignCollectionToGroup(selectedTags,selectedGroup.group_name)
        }
       
      
    }
    showModalGroupCollection = false;

// Optionally, call another function to update the list if needed

}
function addToGroupCollection(group: Group) {
    
       
    updatePaginatedList();
    selectedGroup = group; // Pour afficher les détails
    selectedTags=selectedGroup.Collections
    
    
}
async function updateGroup(group: Group) {
    // Calculate the difference between group.Collections and newCollectionsList
    let itemsToRemove = group.Collections.filter(item => !newCollectionsList.includes(item));
    // Call updateGroupDetails with the additional parameter
    await updateGroupDetails(oldGroupName, newGroupName, itemsToRemove);
    closeModal();
}


 async function addGroup() {
        if (newGroupName=="") {
    toast.error($i18n.t('Please fill all fields before adding a role.'));
    return;
  } 
  insertGroup();
   // Show success message

// Fetch the updated groups
await fetchGroups();
  updatePaginatedList();

        selectedGroup = null;
        newGroupName = '';
        newCollectionsList=[];
        isEditMode = false;
        isAddMode=false;
        showModal = false;
       
    }

    function closeModal() {
        showModal = false;
        selectedGroup = null;
        isAddMode=false;
        isEditMode=false;
        oldGroupName="";

    }

    function editGroup(group: Group) {
        selectedGroup = group;
        newGroupName = group.group_name;
        newCollectionsList=group.Collections;
        isEditMode = true;
        showModal = true;
        oldGroupName=group.group_name;
    }
    function OpenAddGroupModal(){
        selectedGroup = null;
        newGroupName = '';
        newCollectionsList=[];
        isEditMode = true;
        isAddMode=true;
        showModal = true;
    }

    function openDeleteModal(group: Group) {
        groupToDelete = group;
        showDeleteConfirmModal = true;
    }
    function confirmDelete() {
        if (groupToDelete) {
            deleteGroup();
        }
        closeDeleteModal();
    }

    function closeDeleteModal() {
        showDeleteConfirmModal = false;
        groupToDelete = null;
    }

   

   

    function changePage(page: number) {
        if (page < 1 || page > totalPages()) return;
        currentPage = page;
        updatePaginatedList();
    }
   
async function fetchGroups() {
    isLoading=true;

  try {
    const response = await fetch('http://20.84.80.6:5000/groups-with-collections');
    if (!response.ok) {
      throw new Error('Failed to fetch groups');
    }
    const data = await response.json();
    // Mappage des groupes
     groups = data.map((item, index) => ({
      id: index,
      group_name: item.group_name,
      Collections: item.collections||"" // Ajouter un tableau vide comme placeholder
    }));


    // Appeler updatePaginatedList pour actualiser la liste paginée
    updatePaginatedList();
  } catch (error) {
    console.error('Error fetching groups:', error);
  }
  isLoading=false;

}

// Async function to fetch categories from the API
async function fetchCollections() {
    try {
        // Fetching collections from the API using the provided username
        const response = await fetch(`http://20.84.80.6:5000/collections/dev_user2`, {
            headers: {
                'accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error fetching categories');

        const data = await response.json();

        // Assuming data is an array of strings
        availableTags = data as string[];
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}
async function assignCollectionToGroup(group_collections: string[], groupName: string) {
    try {
        // Effectuer la requête POST pour mettre à jour le nom du groupe
        let response = await fetch(`http://20.84.80.6:5000/associate_collections_and_update_users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Envoyer l'ancien nom et le nouveau nom dans le corps de la requête
            body: JSON.stringify({
                group: groupName,
                groups_collections: group_collections,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update group collections');
        }

        const data = await response.json();
        toast.success($i18n.t('role collections successfully updated.'));

        await fetchGroups();

    } catch (error) {
        console.error('Error updating group collections:', error);
    }
}

async function updateGroupDetails(oldName: string, newName: string,collections:string[]) {
    try {
        // Effectuer la requête POST pour mettre à jour le nom du groupe
        let response = await fetch(`http://20.84.80.6:5000/edit_group`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            // Envoyer l'ancien nom et le nouveau nom dans le corps de la requête
            body: JSON.stringify({
                old_name: oldName,
                new_name: newName,
                coll_supprime:collections
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update group');
        }

        const data = await response.json();
        toast.success($i18n.t('role successfully updated.'));

        await fetchGroups();

    } catch (error) {
        console.error('Error updating group:', error);
    }
}

    async function insertGroup() {
  try {
    // Prepare the group data to insert
   

    // Perform a POST request to the API
    const response = await fetch('http://20.84.80.6:5000/add_group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        group_name: newGroupName
            }),
    });

    // Vérifier si la requête a réussi
    if (!response.ok) {
      throw new Error('Failed to insert group');
    }
    const result = await response.json();
    // Vérifier si le message indique que le groupe existe déjà
    if (result.message === 'Le nom du groupe existe déjà, essayez un nouveau') {
      toast.error($i18n.t('The role already exists.'));
    } else {
      console.log('Groupe inséré avec succès :', result);
      toast.success($i18n.t('role successfully added!'));

      // Récupérer les groupes mis à jour
      await fetchGroups();
      console.log('roles récupérés avec succès après l\'insertion.');
    }
  } catch (error) {
    console.error('Error inserting group:', error);
    // Optionally, show an error message to the user
    toast.error($i18n.t('Failed to add the role.'));
  }
}
async function deleteGroup() {
  try {
    // Perform a POST request to the API
    const response = await fetch('http://20.84.80.6:5000/delete_group', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
                group_name: groupToDelete?.group_name
               
            }),
    
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error('Failed to delete group');
    }

    const result = await response.json();
    console.log('Group successfully deleted:', result);
    toast.success($i18n.t('role successfully deleted.'));
    // Fetch the updated groups
    await fetchGroups();
    if (groups.length < itemsPerPage) {
  currentPage = 1;
} else {
  currentPage = Math.ceil(groups.length / itemsPerPage);
}
    console.log('Groups successfully fetched after deleting.', paginatedList);
  } catch (error) {
    console.error('Error deleting group:', error);
    // Optionally, show an error message to the user
    toast.error($i18n.t('Failed to delete the role.'));
  }
}
    
onMount(() => {
     fetchGroups();
     fetchCollections();
    });

    // Mise à jour du nombre total de pages en fonction du filtre
    $: totalPageCount = Math.ceil(filteredGroups().length / itemsPerPage);
  // Trigger pagination update on SearchGroup change
  $: SearchGroup, currentPage, updatePaginatedList();
 // Fonction pour mettre à jour les groupes et gérer la pagination
 let switchState = false;

</script>

<!-- Template -->
<div class="container">
    <p class="list-title">{$i18n.t('List of the roles')}</p>
    <div class="flex items-center space-x-2 bg-white p-2 rounded-xl mb-2 dark:border-gray-600">
        <div class="flex flex-1 items-center bg-white rounded-xl border border-gray-200 p-1.5">
            <input
                class="w-full text-sm pr-4 py-1 outline-none {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}"
                bind:value={SearchGroup}
                placeholder={$i18n.t('Search a role')} 
            />
        </div>
        <button
            class="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white hover:bg-gray-100 transition font-medium text-sm flex items-center space-x-1"
            aria-label="Add Docs"
            on:click={OpenAddGroupModal}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
            </svg>
        </button>
    </div>
    {#if paginatedList.length==0 && SearchGroup!=''}
  <div style="display: flex; justify-content: center;">
  <p style="font-size: large;">{$i18n.t('No role matches your search.')}</p>
  </div>
  {:else if paginatedList.length==0 && SearchGroup==''}
  <div style="display: flex; justify-content: center;">
  <p style="font-size: large;">{$i18n.t('No role found.')}</p>
  </div>
  {:else}
  
    <ul class="group-list {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
        {#each paginatedList as group}
            <li class="group-item">
                <div class="group-info">
                    <strong>{group.group_name}</strong>
                </div>
                <div class="button-group">
                    <button on:click={() => openModal(group)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                            <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                            <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
                        </svg>
                    </button>
                    <button on:click={() => editGroup(group)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                        </svg>
                    </button>
                    <button on:click={() => {addToGroupCollection(group);
                    showModalGroupCollection = true;}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
                            <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
                            <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
                        </svg>
                    </button>
                    <button on:click={() => openDeleteModal(group)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zm-2.5 0V3H4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3h-1.5z"/>
                        </svg>
                    </button>
                </div>
            </li>
        {/each}
    </ul>
    <!--{#if showDeleteConfirmModal}
    <div class="modal-overlay">
        <div class="modal">
            <p>Êtes-vous sûr de vouloir supprimer le groupe {groupToDelete?.group_name} ?</p>
            <div class="modal-buttons">
                <button on:click={confirmDelete} class="confirm-button">Confirmer</button>
                <button on:click={closeDeleteModal} class="cancel-button">Annuler</button>
            </div>
        </div>
    </div>
{/if}-->
    <div class="flex justify-center">
    <div class="my-2 flex items-center">
        <!-- Bouton page précédente -->
        <button
        class="mr-[25px] inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-700 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent"
        on:click={() => changePage(currentPage - 1)}
        disabled={currentPage === 1}>
        <ChevronLeft class="size-4" strokeWidth="2" />
    </button>
    <!-- Boutons de pages -->
    <div class="flex items-center gap-2.5">
        {#each Array(totalPageCount) as _, index (index)}
          <button
            class=" inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium hover:bg-dark-10 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent ${index + 1 === currentPage ? 'pagination-arrow bg-color-pag text-gray-100' : ''}"
            on:click={() => changePage(index + 1)}
          >
            {index + 1}
          </button>
        {/each}
      </div>
        
    
        <!-- Bouton page suivante -->
        <button
        class="ml-[25px]  inline-flex size-8 items-center justify-center rounded-[9px] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-700 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent"
        on:click={() => changePage(currentPage + 1)}
          disabled={currentPage >= totalPageCount}>
          <ChevronRight class="size-4" strokeWidth="2" />
        </button>
      </div>
      </div>
      {/if}
</div>
{#if showDeleteConfirmModal}
<div class="modal-overlay {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <h2 class="modal-title">{$i18n.t('Delete confirmation')}</h2> <!-- Title added here -->
        <button class="close-button" on:click={closeDeleteModal}>
          &times;
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <h3 style="text-align:center;">{$i18n.t('Are you sure you want to delete the role {{groupName}}?', { groupName: groupToDelete?.group_name })}
        </h3>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="custom-bg hover:custom-bg-hover" on:click={closeDeleteModal}>
          {$i18n.t('Cancel')}
        </button>
        <button id="validateButton" on:click={confirmDelete}>
          {$i18n.t('Confirm')}
        </button>
      </div>
    </div>
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
  {#if showModal}
  <!-- Fond d'arrière-plan du popup -->
  <div class="popup-background" on:click={closeModal}></div>
  <div class="popup {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
    <div class="popup-content">
      
      <!-- Titre du popup et bouton de fermeture, centré -->
      <div class="modal-header">
        <h2 class="modal-title" style="text-align:center; color:black!important;">
          {#if isEditMode && isAddMode==false}
            {$i18n.t('Update role')}
          {:else if isAddMode}
          {$i18n.t('Add role')}

          {:else}
            {$i18n.t('Role Details')}
          {/if}
        </h2>
        <button class="close-button" on:click={closeModal}>
          &times;
        </button>
      </div>
      
      <!-- Informations sur le groupe -->
      <div class="candidate-info">
        <div class="field">
            <label class="mini-title">{$i18n.t('Role name')}</label><br>

            {#if isEditMode}
              <!-- Input pour le mode édition -->
              <input type="text" bind:value={newGroupName} class="input-style" 
              placeholder={$i18n.t("Enter the name of the role")}
              />
            {:else}
              <!-- Texte statique pour le mode affichage -->
              <p>{newGroupName}</p>
            {/if}
        </div>

        <!-- Affichage des informations Collections -->
        <div class="field">
            <label class="mini-title">{$i18n.t('Collection list')}</label><br>

            <div class="skills-section">
                {#if newCollectionsList.length > 0}
                  <ul class="skills-container">
                    {#each newCollectionsList as doc, index}
                      <li class="" style="display: flex; align-items: center; justify-content: space-between;">
                        <button class="tag" on:click={() => handleCollectionClick(newCollectionsList[index])}
                            >{newCollectionsList[index]}<!-- Bouton 'x' pour supprimer l'élément si en mode édition -->
                            {#if isEditMode}
                              <button
                                class="delete-skill-btn"
                                on:click={() => newCollectionsList = newCollectionsList.filter((_, i) => i !== index)}
                              >
                                ✕
                              </button>
                            {/if}</button>
              
                        
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p>{$i18n.t('No collections')}</p>
                {/if}
              </div>
              
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="modal-actions" style="text-align: center; margin-top: 20px;">
        <button type="button" class="custom-bg hover:custom-bg-hover" on:click={closeModal}>{$i18n.t('Close')}</button>

        {#if isEditMode && isAddMode==false}
     
          <!-- Boutons pour mode édition -->
          <button type="button" id="validateButton" on:click={updateGroup(selectedGroup)}>{$i18n.t('Apply')}</button>
          {:else if isAddMode}
          <button type="button" id="validateButton" on:click={addGroup}>{$i18n.t('Apply')}</button>

        {/if}
      </div>
      
    </div>
  </div>
{/if}
{#if showModalGroupCollection}
    <div class="popup-background" on:click={() => (showModalGroupCollection = false)}>
        <div class="popup {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}" on:click|stopPropagation>
            <!-- Modal Header with Title and Close Button -->
            <div class="modal-header">
                <h2 class="modal-title" style="text-align:center; color:black!important;">{$i18n.t('Assign Your Collections To')} {selectedGroup?.group_name}</h2>
                

                <!-- Close Button (X) -->
                <button class="close-button" on:click={() => { selectedTags = []; showModalGroupCollection = false; 
                    switchState=false;
                }}>X</button>
            </div>
            
            <div class="dropdown-container">
                <!-- Selected Tags -->
                <div class="dropdown">
                    <input type="text" class="search-bar" placeholder="{$i18n.t('Search collection')}" bind:value={searchTags} />
                    <label class="switch">
                        <input 
                            type="checkbox" 
                            bind:checked={switchState} 
                            on:change={() => selectAllTags()} 
                        />
                        <span class="slider"></span>
                    </label>
                    
                    <div class="tag-list">
                        {#each selectedTags as tag}
                            {#if !selectedGroup?.Collections.includes(tag)}
                                <!-- Afficher le tag avec '×' et l'action on:click si le tag n'est pas dans selectedgroup.collections -->
                                <span class="tag" on:click={() => toggleTag(tag)}>
                                    {tag} ×
                                </span>
                            {:else}
                                <!-- Afficher le tag sans '×' si le tag existe dans selectedgroup.collections -->
                                <span class="tag">
                                    {tag}
                                </span>
                            {/if}
                        {/each}
                    </div>
                    
                   
                    <!-- Dropdown Options -->
                    <div class="dropdown-options">
                        <div class="option" on:click={selectAllTags}>{$i18n.t('select All')}</div>
                        {#each availableTags.filter(tag => !searchTags || tag.toLowerCase().includes(searchTags.toLowerCase())) as tag}
                        {#if !selectedGroup?.Collections.includes(tag)}
                            <div class="option" on:click={() => toggleTag(tag)}>{tag}</div> <!-- Affichage de 'mode' -->
                            {:else}
                            <div class="option" >{tag}</div>
                            {/if}

                        {/each}
                    </div>
                </div>
             
                <!-- Submit Button -->
                <div style="display: flex; justify-content: {$i18n.language === 'ar-BH' ? 'left' : 'right'};">
                    <button id="validateButton" on:click={handleSubmit}>{$i18n.t('submit')}</button>
                </div>
            </div>
        </div>
    </div>
{/if}




<style>
    .rtl-style{
				direction:rtl;
				  text-align:right;
				  flex-direction: row-reverse;
			  }
			

.switch {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 20px;
    margin-left: 10px; /* Space between search bar and switch */
}

/* Hide default checkbox */
.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}
    .rtl-style{
				direction:rtl;
				  text-align:right;
				  flex-direction: row-reverse;
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
     .tag-list {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-bottom: 8px;
        margin-top: 15px;
    }
    .tag {
        background-color: #9FD5B5;
        color: #006654;
        padding: 4px 8px;
        font-size: 16px;
        border-radius: 16px;
        cursor: pointer;
        border: 1px solid #006654;
    }
    .tag:hover {
        background-color: #e8f5f0;
    }
    .search-bar {
        margin-top: 8px;
        border: 1px solid #e0e0e0;
        padding: 6px;
        width: 100%;
        font-size: 16px;
        border-radius: 10px;
        background-color: #fff;
    }
  .dropdown-options {
        max-height: 120px;
        overflow-y: auto;
        border-top: 1px solid #e0e0e0;
        margin-top: 5px;
        background-color: #fff;
    }
    .option {
        padding: 6px 8px;
        font-size: 16px;
        cursor: pointer;
        color: #006654;
    }
    .option:hover {
        background-color: #f0f9f7;
    }
    .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000; /* Ensure it's above other content */
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
.skills-list label {
padding: 2px;
border-radius: 3px;
color: white;
font-weight: bold;
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

  .skills-section {

margin-top: 16px;
}
.skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-start;
      margin-top: 10px; /* Espace entre le titre et la liste */
      margin-bottom: 5px; /* Espace entre le titre et la liste */
    }
.mini-title {
      color: #006654; /* Couleur pour le titre des sections */
      font-weight: 600;
      font-size: 1.2rem;
      margin-bottom: 10px;
      border-bottom: 2px ; /* Ligne en bas du titre */
      padding-bottom: 4px; /* Espace sous le titre */
    }
.input-style {
    flex-grow: 0.15;
    padding: 0.5rem;
    border-radius: 10px; /* Coins arrondis */
    font-size: 14px;
    margin: 10px 10px 8px 2px;
    background-color: #f1fdf9; /* Couleur de fond */
    border: 1px solid #006654; /* Bordure de 1px, couleur personnalisée et style plein */
}

.field label {
    /*display: block;*/
    font-weight: 600;
    color: #006654; /* Couleur plus vive pour le label */
    font-size: 1.1rem;
   /* margin-bottom: 8px; /* Espacement pour une meilleure lisibilité */
}
  .field p {
    font-size: 17px;
    color: #333;
    margin: 10px 0px 8px 2px; /* Marge spécifique */
  }
    .popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 700px;
  background-color: #ffffff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 15px;
  padding: 20px;
  z-index: 9999;
  transition: all 0.3s ease;
  opacity: 1;
  visibility: visible;

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
.popup-content {
    padding: 20px;
    border-radius: 8px;
   /* box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);*/
    }
 .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 40px;
    align-items: center;
    gap: 10px;
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
  .modal-title {
  flex-grow: 1;
  text-align: center;
  margin: 0; /* Supprime les marges par défaut du titre */
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
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 10px; /* Ajuste l’espace pour un alignement vertical */
  margin-bottom: 40px; /* Espace entre le titre et les inputs */
}
.close-button {
  position: absolute;
  right: 10px; /* Ajuste l'espace avec le bord droit */
  top: 50%;
  transform: translateY(-50%); /* Centre verticalement le bouton */
  font-size: 24px; /* Ajuste la taille du bouton */
  background: none;
  border: none;
  cursor: pointer;
}
  .modal-buttons {
        margin-top: 20px;
        display: flex;
        justify-content: space-around;
    }
    .confirm-button {
        background-color: red;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    .cancel-button {
        background-color: grey;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
.list-title {
    color: #333;
    font-size: 24px;
    gap:5px;
    text-align: center; /* Centrer le titre */
        margin-bottom: 20px; /* Espacement en bas du titre */
  }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }

    .add-group {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
    }

    .group-list {
        list-style: none;
        padding: 0;
    }

 
    .group-item:hover {
        transform: translateY(-4px);
        box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.15);
    }

   
    .group-item strong {
        font-size: 1.2em;
        color: #333;
        display: block;
        margin-bottom: 5px;
    }

    .group-item p {
        font-size: 0.9em;
        color: #666;
        margin: 0;
    }

    .button-group button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 35px;
        height: 35px;
        background-color: #f1f1f1;
        border: 1px solid #006654;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
    }

    .button-group button:hover {
        background-color: #e0e0e0;
        transform: scale(1.05);
    }
    .button-group button svg {
        width: 20px;
        height: 20px;
        fill: #333;
    }
    body {
        font-family: 'Arial', sans-serif;
        background-color: #f5f5f5; /* Couleur de fond douce */
        color: #333; /* Couleur de texte sombre */
    }

    .container {
        max-width: 800px; /* Largeur maximale de la page */
        margin: 0 auto; /* Centrer la page */
        padding: 20px; /* Espacement intérieur */
        background-color: #fff; /* Couleur de fond de la carte */
        border-radius: 10px; /* Coins arrondis */
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); /* Ombre */
    }

    h1 {
        text-align: center; /* Centrer le titre */
        color: #006654; /* Couleur du titre */
        margin-bottom: 20px; /* Espacement en bas du titre */
    }

    .add-group {
        display: flex; /* Utiliser flex pour aligner les éléments */
        justify-content: space-between; /* Espacer le champ et le bouton */
        margin-bottom: 20px; /* Espacement en bas */
    }
    .group-info {
        flex: 1;
    }
    .group-info strong {
        font-size: 1.2em;
        color: #333;
        display: block;
        margin-bottom: 5px;
    }
    .input-group {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    width: 100%;
  }
    .group-info p {
        font-size: 0.9em;
        color: #666;
        margin: 0;
    }

    .button-group {
        display: flex;
        gap: 8px;
        
    }
    .group-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #006654;
    margin-bottom: 15px;
}

    .pagination {
        display: flex;
        justify-content: center; /* Centrer les boutons de pagination */
        margin-top: 20px; /* Espacement en haut */
    }

  

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5); /* Arrière-plan semi-transparent */
        z-index: 1000; /* Mettre le fond au-dessus du contenu */
    }

    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%); /* Centrer la modale */
        background: white; /* Fond blanc pour la modale */
        padding: 20px; /* Espacement intérieur */
        border-radius: 10px; /* Coins arrondis */
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); /* Ombre de la modale */
        z-index: 1001; /* Mettre la modale au-dessus du fond */
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
    .bg-color-pag{
      background-color: #006654;
    }
 

</style>