<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	const i18n = getContext('i18n');
	
	import fileSaver from 'file-saver';
	  const { saveAs } = fileSaver;
	  
	 
	
	
		import { toast } from 'svelte-sonner';
	import TagChatModal from '../chat/TagChatModal.svelte';
	import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPE } from '$lib/constants';
	
	
		let isLoading;
		let tags=[];
		const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo (ajustez selon vos besoins)
		const chunk = true; // Set according to your needs
		const chunk_size = 512; // Adjust if needed
		const embed = true; // Set according to your needs
		
		let documentURL
		let errorMessage = ''; // State for the error message
		let uploadStarted = false; // to track if the upload has started
		let uploading = false;
		let Collections = [];
		let selectedDoc = { nom: '', prenom: '' };
		let langchain_mode;
		let successMessage;
		let CollectionAdded;
		let selectedCategoryId;
		

		let show;
		let Files=[];
		let username = 'dev_user1'; // Nom d'utilisateur par défaut
		let path='C:\Users\sfh\OneDrive - WEVIOO\Documents\Python Scripts';
		interface Collection {
			id: string;
			name: string;
			description: string;
		}
		let uploadProgress = 0;
		let isUploading = false;
		// Function to handle file selection
		// Handle file selection and start upload automatically
		function handleFileSelect(event) {
			Files = Array.from(event.target.files); // Convert file list to array
			uploadProgress = 0; // Reset progress
			isUploading = true; // Start the upload process
			uploadStarted = true; // Set flag to true as upload started
		
	
			// Simulate file upload with progress
			const interval = setInterval(() => {
				if (uploadProgress >= 100) {
					clearInterval(interval); // Stop when progress reaches 100%
					isUploading = false; // End uploading state
				} else {
					uploadProgress += 10; // Increment progress
				}
			}, 300); // Simulate upload speed
		}
	
		function handleUploadClick() {
			if (!selectedCategoryId) {
				errorMessage = 'Please select a category before uploading files.';
				toast.error($i18n.t(errorMessage))
				return; // Prevent further execution
			
			}
	
			// Reset error message and proceed to click the hidden file input
			errorMessage = '';
			document.getElementById('pipelines-upload-input')?.click();
		}
		// Function to simulate file upload with progress
		function startUpload() {
			if (Files.length === 0) return;
	
			isUploading = true;
			uploadProgress = 0;
	
			// Simulate a file upload with progress update
			const interval = setInterval(() => {
				if (uploadProgress >= 100) {
					clearInterval(interval);
					isUploading = false;
				} else {
					uploadProgress += 10;
				}
			}, 200); // Progress updates every 200ms (for demo)
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
	
				if (!response.ok) throw new Error('Error fetching categories');
	
				const data = await response.json();
				Collections = data.map((item: any) => ({
					id: item._id,
					name: item,
					description: item.description || '' 
				})) as Collection[];
				console.log(Collections);
			} catch (error) {
				console.log('Error fetching categories:', error);
			}
		}


	let user="dev_user1";	
	
		const uploadDoc = async (file: File, tags?: object) => {
			uploading=true;
			
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
			
			if (response.ok) {
				const data = await response.json();
				
			} else {
				const errorData = await response.json();
				toast.error($i18n.t(`Erreur lors de l'upload: ${errorData.error}`));

			}
			uploading=false;
		};
		const processFile = async (file: File, langchain_mode: string, chunk = true, chunk_size = 512, embed = true) => {
	 
	  
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
		
	   
	  
	
		return data; // Retourner les données pour une utilisation ultérieure
	  } else {
		const errorData = await response.json();
		toast.error($i18n.t(`Erreur lors du traitement: ${errorData.detail || 'Erreur inconnue'}`));

		throw new Error(errorData.detail || 'Erreur inconnue');
	  }
	  
	
	};
	
	
	const submitHandler = async () => {
		
		
	  if (CollectionAdded.trim()) {
		const newCategory = { name: CollectionAdded.trim() };
	
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
		  CollectionAdded = ''; // Reset the input field if necessary
	
		  
	  
		} catch (error) {
		  console.log('Erreur de soumission de collection:', error);
		}
	  } else {
	
	 
		
	  }
	
	  fetchCategories();
	  show=false;
	};
	
	// Fonction pour ajouter un nouveau mode Langchain
	async function addNewLangchainMode(user, mode, path) {
			
	
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
	
			   const responseData = await response.json(); // Récupérez les données en format JSON
				console.log(responseData); // Affichez les données dans la console pour vérification
			} catch (err) {
				error = err.message; // Stockez l'erreur
				console.log('Error sending POST request:', error);
			} finally {
			  
			}
		}
	
	

		const Enregistrer = async () => {
		
		isLoading=true
		// Vérifie si des fichiers ont été sélectionnés
		if (Files && Files.length > 0) {
			for (const file of Files) {
				
				// Vérification de la taille du fichier
				if (file.size > MAX_FILE_SIZE) {
					toast.error($i18n.t(`Le fichier '${file.name}' dépasse la taille maximale autorisée de ${MAX_FILE_SIZE / (1024 * 1024)} MB.`));

					continue; // Ignorer le fichier trop volumineux
				}
	
				console.log(file, file.name.split('.').at(-1));
	
				// Vérification du type ou extension de fichier
				if (
					SUPPORTED_FILE_TYPE.includes(file['type']) || 
					SUPPORTED_FILE_EXTENSIONS.includes(file.name.split('.').at(-1))
				) {
					try {
						//await uploadDoc(file, tags);
						await processFile(file, selectedCategoryId, chunk, chunk_size, embed);
	
						// Affichage du message de succès
						toast.success($i18n.t(`Fichier '${file.name}' téléchargé avec succès dans la collection !`));

					} catch (error) {
						// Affichage du message d'erreur si un problème survient
						toast.error($i18n.t(`Erreur lors du traitement du fichier '${file.name}'.`));
					}
				} else {
					// Gestion des fichiers avec des types non reconnus
					toast.error($i18n.t(`Type de fichier inconnu '${file['type']}', mais il sera traité comme du texte brut.`));
					try {
						// Traiter et télécharger le fichier
						//await uploadDoc(file, tags);
						await processFile(file, selectedCategoryId, chunk, chunk_size, embed);
	
						toast.success($i18n.t("fileUploadedSuccess", { fileName: file.name }));
					

						// Indique que le chargement est terminé
		
					} catch (error) {
						toast.error($i18n.t(`Erreur lors du traitement du fichier '${file.name}'.`));

					}
				}
			}
	
		
	
		} else {
			// Aucun fichier n'a été sélectionné
			toast.error($i18n.t(`Aucun fichier sélectionné.`));

		}
		isLoading = false;

	};
	
	
		onMount(() => {
			fetchCategories();
		});


		const afficherCVEnPopup = async (nomDocument) => {
    try {
      const response = await fetch(`http://localhost:3002/api/documents/name/${nomDocument}`, {
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
	</script>

{#if isLoading}
<div class="loader-overlay">
  <div class="loader-maxance">
      <div class="img-loader">
          <img src="/weensight_circle.png" alt="Loader Image">
      </div>
  </div>
</div>
{/if}
	
	
	<div class="container {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
		<h2>{$i18n.t('Collections')} </h2>
	
		<!-- Select Dropdown -->
		<div class="select-container ">
			<select class="select-box"
			bind:value={selectedCategoryId}
			placeholder={$i18n.t('Select a collection')}
			>
				<!-- Default disabled option -->
				<option value="" selected disabled>{$i18n.t('Select a collection')}</option>
				<!-- Loop through Collections and display them as options -->
				{#each Collections as collection}
					<option value={collection.name}>{collection.name}</option>
				{/each}
			</select>
		
			<button
			class="add-doc-button"
			style="height: 38px; margin-left: 13px;"
			aria-label={$i18n.t('Add Collection')}
			on:click={() => { show = true; }}
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
	
		<!-- Upload Section -->
		<div class="flex-1 mr-2">
			<input
				id="pipelines-upload-input"
				bind:files={Files}
				type="file"
				accept=".pdf"
				multiple
				hidden
				on:change={handleFileSelect}
			/>
		
			<!-- Upload button with progress bar -->
			<button class="upload-area" on:click={handleUploadClick}>
				<div class="upload-content">
					<!-- If uploading, show the progress bar inside the button, otherwise show drag/drop content -->
					{#if uploadStarted}
						<!-- Check if upload is complete -->
						{#if uploadProgress < 100}
							<!-- Progress bar area -->
							<div class="progress-bar-container">
								<div class="progress-bar" style="width: {uploadProgress}%"></div>
								<p class="progress-text">
									{
										uploadProgress < 100 
										? `${uploadProgress}% ${$i18n.t("uploaded")}` 
										: `${Files.length} ${$i18n.t("filesSelected")}`
									}
									
								</p>
							</div>
						{:else}
							<!-- Show tick icon and uploaded files count when upload is complete -->
							<div style="text-align: center;">
								<div style="display: flex; justify-content:center;margin-bottom: 20px;">
									<img src="/correct.png" alt="Upload Successful" width="40" height="40" />
								</div>
								<p style="font-size: 17px; font-weight: bold;">{Files.length} {$i18n.t('File(s) uploaded')}</p>
							</div>
						{/if}
					{:else}
						<!-- Initial upload button content -->
						<div style="display: flex; justify-content: center;">
							<svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="40" height="40">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16v4a1 1 0 001 1h16a1 1 0 001-1v-4M16 8l-4-4m0 0L8 8m4-4v12" />
							</svg>
						</div>
						<p>{$i18n.t('Drop Your files Here')}</p>
						<p class="sub-text">{$i18n.t('Maximum file size 5 MB')}</p>
					{/if}
				</div>
			</button>
		</div>
	
		<!-- Save button -->
		<div class="flex justify-end pt-3 text-sm font-medium" style="margin-top: 15px;">
			<button
			class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-gray-100 transition rounded-lg"
			type="submit"
			on:click={() => {
			
			if(selectedCategoryId!=''){
				if (Files.length === 0) {
					console.log(selectedCategoryId);
					
					toast.error($i18n.t("please upload at least one file"));

				} else {
					Enregistrer();
				}
			}
			else{
				toast.error($i18n.t("please select a collection"));

			}
			}}
		>
			{$i18n.t('Save')}
		</button>
		
		</div>
	</div>
	
	{#if show == true}
	<div class="fixed inset-0 bg-opacity-10 flex justify-center items-center z-50" style="background-color: var(--color-gray-800, #33333394); justify-content: center;">
		<div class="bg-white rounded-lg shadow-lg w-96 {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}" style="width: 500px; margin-left: 150px;">
			<div class="flex justify-between p-4 border-b">
				<div class="font-medium" style="display: flex; text-align: center; align-items: center;">
					{$i18n.t('Add a Collection')}
				</div>
				<button on:click={() => (show = false)} class="text-gray-600 hover:text-gray-800 text-xl p-1">
					&times; 
				</button>
			</div>
			<div class="p-4">
				<label for="category-name" class="block mb-2 ">{$i18n.t('Name of collection')}</label>
				<input
					id="category-name"
					type="text"
					bind:value={CollectionAdded}
					class="border rounded-lg w-full p-2 mb-4"
					placeholder={$i18n.t('Enter the collection name')}
				/>
				<div class="flex justify-end">
					<button
						on:click={() => {
							if (CollectionAdded === undefined || CollectionAdded === "") {
								toast.error($i18n.t("Please enter a Collection Name"), "error");

							} else {
								submitHandler();
								addNewLangchainMode(username, CollectionAdded, path);
								toast.success($i18n.t("Collection added successfully!"), "success");

							}
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


	
	
	
	
	
	
		<style>

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
.img-loader img {
    width: 80px;
    height: 80px;
}
	.rtl-style{
				direction:rtl;
				  text-align:right;
				  flex-direction: row-reverse;
			  }
			
		.custom-select {
			width: 100%;
			border-radius: 1rem; /* More pronounced rounded corners */
			padding: 0.25rem 0.5rem; /* Smaller padding */
			background-color: #f0f0f0; /* Default gray background color */
			color: #333; /* Text color */
			border: 2px solid #168c77; /* Primary color border */
			font-size: 0.875rem; /* Smaller font size */
			outline: none; /* No outline */
			transition: border-color 0.3s ease; /* Transition effect for border color */
			cursor: pointer; /* Change cursor on hover */
			height: 40px;
		}
	
		.custom-select:focus {
			border-color: #168c77; /* Keep primary color on focus */
		}
	
		.custom-select option {
			background-color: #f0f0f0; /* Default gray for options */
			color: #333; /* Text color */
		}
	
		.custom-select option:hover {
			background-color: #9FD5B5; /* Secondary color on hover */
			color: white; /* Text color on hover */
		}
	
		.add-doc-button {
			background-color: #168c77; /* Primary color */
			color: white; /* Text color */
			border: none; /* No border */
			border-radius: 0.5rem; /* Rounded corners */
			padding: 0.25rem 0.5rem; /* Smaller padding */
			font-size: 0.875rem; /* Smaller font size */
			cursor: pointer; /* Change cursor on hover */
			transition: background-color 0.3s ease; /* Transition for background color */
		}
	
		.add-doc-button:hover {
			background-color: #135f58; /* Darker shade for hover effect */
		}
	
		.flex-container {
			display: flex; /* Flexbox for alignment */
			gap: 1rem; /* Margin between dropdown and button */
		}
			.spinner_ajPY {
				transform-origin: center;
				animation: spinner_AtaB 0.75s infinite linear;
			}
	
			@keyframes spinner_AtaB {
				100% {
					transform: rotate(360deg);
				}
			
			}
	
	
			* {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}
	
	body {
		font-family: Arial, sans-serif;
		background-color: #EAF8F4;
	}
	
	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 20px;
	}
	
	h2 {
		font-size: 1.5rem;
		margin-bottom: 20px;
		font-weight: 600;
		color: #333;
	}
	
	.select-container {
		display: flex;
		align-items: center;
		margin-bottom: 30px;
	}
	
	.select-box {
    width: 100%;
    padding: 12px;
    font-size: 1rem;
    background-color: white;
    border: 1px solid #e1e1e1;
    border-radius: 8px;
    outline: none;
    overflow-y: scroll; /* Force the vertical scrollbar to always be visible */
    max-height: 100px; /* Set a fixed height to make the content scrollable */
}

/* Customize the scrollbar */
.select-box::-webkit-scrollbar {
    width: 8px; /* Width of the scrollbar */
}

.select-box::-webkit-scrollbar-thumb {
    background-color: #9FD5B5; /* Scrollbar color */
    border-radius: 10px; /* Make the scrollbar rounded */
}

.select-box::-webkit-scrollbar-track {
    background-color: #f1f1f1; /* Background color for the scrollbar track */
}

	.add-button {
		background-color: #168c77;
		color: white;
		font-size: 1.5rem;
		border: none;
		margin-left: 10px;
		padding: 6px 12px;
		border-radius: 50%;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}
	
	.add-button:hover {
		background-color: #126b5a;
	}
	
	.upload-area {
		width: 100%;
		background-color: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 40px;
		text-align: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
	.upload-area:hover {
		background-color: #f0f0f0; /* Light gray when hovered */
	}
	
	.upload-content {
		color: #168c77;
		font-size: 1rem;
	}
	
	.upload-icon {
		color: #168c77;
		margin-bottom: 20px;
	}
	
	.upload-content p {
		margin-bottom: 5px;
	}
	
	.sub-text {
		font-size: 0.875rem;
		color: #999;
		margin-bottom: 20px;
	}
	
	.progress-bar-container {
			margin-top: 10px;
			width: 100%;
			background-color: #e0e0e0;
			height: 10px;
			border-radius: 5px;
		}
	
		.progress-bar {
			background-color: #168c77;
			height: 100%;
			border-radius: 5px;
			transition: width 0.2s ease;
		}
	
	.select-btn {
		padding: 8px 20px;
		background-color: transparent;
		border: 1px solid #168c77;
		color: #168c77;
		border-radius: 5px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.3s ease, color 0.3s ease;
	}
	
	.select-btn:hover {
		background-color: #168c77;
		color: white;
	}
	/* Modal Overlay */
	.fixed {
		position: fixed;
		inset: 0;
		background-color: rgba(51, 51, 51, 0.58); /* Semi-transparent gray background */
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 50; /* Ensures it's above other elements */
	}
	
	/* Modal Container */
	.bg-white {
		background-color: white; /* White background for the modal */
		border-radius: 0.5rem; /* Rounded corners */
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Slight shadow */
		width: 500px; /* Fixed width */
		margin-left: 150px; /* Custom margin */
	}
	
	/* Modal Header */
	.flex {
		display: flex;
	   
		padding: 1rem; /* Padding for the header */
	}
	
	/* Header Text */
	.font-medium {
		font-weight: 500; /* Medium font weight */
		display: flex;
		text-align: center;
		align-items: center;
	}
	
	/* Close Button */
	.text-gray-600 {
		color: #718096; /* Gray color */
		font-size: 1.25rem; /* Larger font size */
		padding: 0.25rem; /* Padding around the button */
		cursor: pointer;
	}
	
	.text-gray-600:hover {
		color: #2D3748; /* Darker gray on hover */
	}
	
	/* Modal Body */
	.p-4 {
		padding: 1rem;
	}
	
	/* Form Label */
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 1rem;
		color: #4A5568; /* Darker gray */
	}
	
	/* Input Field */
	input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #e0e0e0; /* Light gray border */
		border-radius: 0.375rem; /* Rounded corners */
		margin-bottom: 1rem; /* Space below the input */
	}
	
	/* Submit Button */
	.bg-emerald-700 {
		background-color: #168c77; /* Primary color */
		color: white; /* White text */
		padding: 0.5rem 1rem;
		font-size: 1rem;
		font-weight: 500; /* Medium font weight */
		border-radius: 17px; /* Custom rounded corners */
		cursor: pointer;
	}
	
	.bg-emerald-700:hover {
		background-color: #135f58; /* Darker green on hover */
	}
	
	
	@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

	
	
	
			
		</style>