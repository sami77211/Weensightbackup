<script lang="ts" src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js">
	import { getContext, onMount, tick } from 'svelte';
	const i18n = getContext('i18n');
    import { writable } from 'svelte/store'; 
	
	import fileSaver from 'file-saver';
	  const { saveAs } = fileSaver;
		import { toast } from 'svelte-sonner';
	import TagChatModal from '../chat/TagChatModal.svelte';
	import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPE } from '$lib/constants';
    import { PDFDocument } from "pdf-lib";

    let MaxPages;
    let startpage;
    let nbr_forsubdev;
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
        let pageCount;
		interface Collection {
			id: string;
			name: string;
			description: string;
		}
		let uploadProgress = 0;
		let isUploading = false;
		// Function to handle file selection
		// Handle file selection and start upload automatically
		async function handleFileSelect(event: Event) {
		Files = Array.from((event.target as HTMLInputElement).files || []);
        documentURL=URL.createObjectURL(Files[0]);
        filepath=filepath+Files[0].name
		console.log(filepath);
    	uploadProgress = 0;
		uploadStarted = true;
		isUploading = true;
        const fileBytes = await Files[0].arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBytes);
        pageCount = pdfDoc.getPages().length;
        console.log(pageCount);
        

		startUpload();
	}


   // let filepath='d:/Doc/UsecaseExtratcation/';
let filepath='';

		function handleUploadClick() {

	
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
	
	
		

	
    let visibility=true;
	
	
	
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
	
	  show=false;
	};
	
	// Fonction pour ajouter un nouveau mode Langchain
	async function addNewLangchainMode(user, mode, path) {
			
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
						
	

					} catch (error) {
						// Affichage du message d'erreur si un problème survient
						toast.error($i18n.t(`Erreur lors du traitement du fichier '${file.name}'.`));
					}
				} else {
					// Gestion des fichiers avec des types non reconnus
					toast.error($i18n.t(`Type de fichier inconnu '${file['type']}', mais il sera traité comme du texte brut.`));
					try {
					
					

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
            visibility=true;
	
		});


        $: isButtonDisabled = !(
  pageValues.length === pageCount && // Assure que la liste contient le bon nombre d'éléments
  pageValues.every(value => value !== undefined && value !== "") // Vérifie que tous les champs sont remplis
);

function handleProcess() {
  if (!isButtonDisabled) {
    console.log("Traitement lancé avec :", { MaxPages, startpage, nbr_forsubdev });
    // Ajouter votre logique de traitement ici
  }
}
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64); // Décoder Base64
    const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}


 let traite=false;
 async function processPdf(filePath, subdivisions) {
    isLoading = true; // Définir l'état de chargement

    const data = {
        document_path: filePath,
        subdivisions: subdivisions,
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/process-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // Vérifier le statut de la réponse
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        // Lire la réponse JSON
        const responseBody = await response.json();

        // Vérifier si la réponse contient le fichier encodé en base64
        if (responseBody.file_base64) {
            // Convertir le fichier encodé en base64 en une URL Blob
            const pdfBlob = base64ToBlob(responseBody.file_base64, 'application/pdf');
            documentpdf_traite = URL.createObjectURL(pdfBlob); // Créer une URL Blob pour le PDF

            console.log('Processed PDF Blob URL:', documentpdf_traite);
        } else {
            throw new Error('Invalid API response: Base64-encoded PDF missing.');
        }
        // Mise à jour des états
        isLoading = false;
        traite = true;
    } catch (error) {
        console.error('Error processing PDF:', error.message);
        isLoading = false; // Réinitialiser l'état
    }
}
let documentpdf_traite;
let documentBase64 = '';  // La chaîne base64 du PDF
  let documentURLtraite = '';     // L'URL du PDF à afficher dans l'iframe
  
 
  
  
  let pageValues = Array(pageCount).fill(""); // Initialise un tableau vide pour stocker les valeurs

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
{#if visibility==false}
<button
class="flex space-x-1"
on:click={() => {
    visibility=true;
    pageValues=[];
	traite=false;
	filepath="";
}}
>
<div class=" self-center">
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="w-4 h-4"
    >
        <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clip-rule="evenodd"
        />
    </svg>
</div>
<div class=" self-center font-medium text-sm">{$i18n.t('Back')}</div>
</button>
	{/if}
	<div class="container {$i18n.language === 'ar-BH' ? 'rtl-style' : ''}">
		<h2>{$i18n.t('Document proccesing')} </h2>
	
		
	{#if visibility}
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
								<p style="font-size: 17px; font-weight: bold;">{$i18n.t('Your file has been uploaded successfully')}</p>
							</div>
						{/if}
					{:else}
						<!-- Initial upload button content -->
						<div style="display: flex; justify-content: center;">
							<svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="40" height="40">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16v4a1 1 0 001 1h16a1 1 0 001-1v-4M16 8l-4-4m0 0L8 8m4-4v12" />
							</svg>
						</div>
						<p>{$i18n.t('Drop Your file Here')}</p>
						<p class="sub-text">{$i18n.t('Maximum file size 5 MB')}</p>
					{/if}
				</div>
			</button>
		</div>
        {/if}


        {#if !visibility}
        <!-- Document display view -->

        <div class="form-container-horizontal">
            <div class="input-list-container">
                <div class="form-label">
					{$i18n.t('Put subdivision number for each page:')}
                  </div>
              <div class="input-list">   
                {#each Array(pageCount) as _, index}
                  <div class="form-group">
                    <label for={`page-input-${index + 1}`} class="input-label">
                      {index + 1}
                    </label>
                    <input
                      type="number"
                      id={`page-input-${index + 1}`}
                      class="input-field"
                      bind:value={pageValues[index]}
                      placeholder={index + 1}
                    />
                  </div>
                {/each}
              </div>
            </div>
          
            <button
              class="process-button"
              on:click={() => processPdf(filepath,pageValues)}
              disabled={isButtonDisabled}
            >{$i18n.t('Execute')}
              <img src="/settings_weensight.png" alt="Settings" class="button-icon" />
            </button>
          </div>
          
          
  
        <div class="document-view">
          <!-- Display selected document -->
          {#if documentURL}
          {#if traite}
		  <div class="iframe-container">
			<div style="text-align: center;">
			<h2>{$i18n.t('Treated Document')}</h2>
		</div>
			<iframe
			  src={documentpdf_traite}
			  style="width: 100%; height: 600px; border: none;"
			  title="Document Viewer"
			></iframe>
		  </div>
            {:else}
            <div class="iframe-container">
                <iframe
                  src={documentURL}
                  style="width: 100%; height: 600px; border: none;"
                  title="Document Viewer"
                ></iframe>
              </div>
            {/if}
          {:else}
            <p>{$i18n.t('No document selected for viewing')}</p>
          {/if}
        </div>
        {/if}
        
        {#if visibility}
		<!-- Save button -->
		<div class="flex justify-end pt-3 text-sm font-medium" style="margin-top: 15px;">
			<button
			class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-gray-100 transition rounded-lg"
			type="submit"
			on:click={() => {

				if (Files.length === 0) {
					toast.error($i18n.t("please upload at least one file"));

				} else {
					visibility=false;
                  
				}
			
			}}
		>
        {#if visibility}
			{$i18n.t('Next')}
            {:else}
            {$i18n.t('procces')}
            {/if}
		</button>
		
		</div>
        {/if}
	</div>
		<style>
			.iframe-container h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #168c77; /* Utilisation d'une couleur adaptée à votre projet */
}


.button-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    margin-left: 10px;
  }
              .process-button {
                display: flex;
                margin-top: 10px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: bold;
    color: #ffffff;
    background-color: #9fd5b5;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    align-self: center;
  }

  .process-button:disabled {
    background-color: #9fd5b5;
    cursor: not-allowed;
  }

  .process-button:hover:not(:disabled) {
    background-color: #9fd5b5;
    box-shadow: 0 4px 8px rgba(22, 140, 119, 0.2);
  }

.form-container-horizontal {
   
    display: flex;
    flex-direction: row;
    gap: 20px;
    align-items: flex-start;
    justify-content: center;
    background-color: #f5fdf9;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #9fd5b5;
    max-width: 100%;
    margin-bottom: 15px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .form-group label {
    font-size: 14px;
    font-weight: bold;
    color: #168c77;
    margin-bottom: 8px;
  }

  .input-field {
    width: 200px;
    padding: 10px 16px;
    border: 2px solid #9fd5b5;
    border-radius: 8px;
    font-size: 14px;
    color: #168c77;
    background-color: #ffffff;
    outline: none;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .input-field:focus {
    border-color: #168c77;
    box-shadow: 0 0 8px rgba(22, 140, 119, 0.3);
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
			border: 2px solid #006654; /* Primary color border */
			font-size: 0.875rem; /* Smaller font size */
			outline: none; /* No outline */
			transition: border-color 0.3s ease; /* Transition effect for border color */
			cursor: pointer; /* Change cursor on hover */
			height: 40px;
		}
	
		.custom-select:focus {
			border-color: #006654; /* Keep primary color on focus */
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
			background-color: #006654; /* Primary color */
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
		background-color: #006654;
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
		color: #006654;
		font-size: 1rem;
	}
	
	.upload-icon {
		color: #006654;
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
			background-color: #006654;
			height: 100%;
			border-radius: 5px;
			transition: width 0.2s ease;
		}
	
	.select-btn {
		padding: 8px 20px;
		background-color: transparent;
		border: 1px solid #006654;
		color: #006654;
		border-radius: 5px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.3s ease, color 0.3s ease;
	}
	
	.select-btn:hover {
		background-color: #006654;
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
		background-color: #006654; /* Primary color */
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


  /* Conteneur principal */
  .form-container-horizontal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  /* Conteneur de la liste d'inputs */
  .input-list-container {
    width: 100%;
    padding: 1rem;
    border: 2px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
    overflow-x: auto; /* Défilement horizontal si nécessaire */
    white-space: nowrap; /* Empêche les inputs de passer à la ligne */
  }

  /* Liste des inputs */
  .input-list {
    display: flex;
    flex-direction: row;
    gap: 0.5rem; /* Espacement entre les inputs */
    justify-content: flex-start;
  }

  /* Groupe de formulaire */
  .form-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  /* Label des inputs */
  .input-label {
    font-size: 0.8rem;
    margin-bottom: 0.2rem;
    color: #555;
  }

  /* Style des inputs */
  .input-field {
    width: 50px;
    padding: 0.2rem;
    font-size: 0.9rem;
    text-align: center;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  /* Bouton */
  .process-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 1rem;
    color: white;
    background-color: #9fd5b5;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .process-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .process-button:hover:not(:disabled) {
    background-color: #9fd5b5;
  }

  .button-icon {
    width: 20px;
    height: 20px;
  }
	
	
   /* Label général */
   .form-label {
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #333;
    text-align: center;
  }
			
		</style>