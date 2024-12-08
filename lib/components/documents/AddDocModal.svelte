<script lang="ts">
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import { onMount, getContext } from 'svelte';

	import { createNewDoc, getDocs, tagDocByName, updateDocByName } from '$lib/apis/documents';
	import Modal from '../common/Modal.svelte';
	import { documents } from '$lib/stores';
	import TagInput from '../common/Tags/TagInput.svelte';
	import Tags from '../common/Tags.svelte';
	import { addTagById } from '$lib/apis/chats';
	import { uploadDocToVectorDB } from '$lib/apis/rag';
	import { transformFileName } from '$lib/utils';
	import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPE } from '$lib/constants';

	const i18n = getContext('i18n');

	export let show = false;
	export let uploadDoc: Function;
	
	export let processFile: (file: File, langchain_mode: string, chunk?: boolean, chunk_size?: number, embed?: boolean) => Promise<void>;
		const langchain_mode = 'RessourcesHumaines'; // Replace with the actual mode you want to use
const chunk = true; // Set according to your needs
const chunk_size = 512; // Adjust if needed
const embed = true; // Set according to your needs

		let uploadDocInputElement: HTMLInputElement;
	let inputFiles;
	let tags = [];

	let doc = {
		name: '',
		title: '',
		content: null
	};

	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo (ajustez selon vos besoins)

const submitHandler = async () => {
   
    if (inputFiles && inputFiles.length > 0) {
		isLoading=true;
		show = false;
        for (const file of inputFiles) {
            // Vérification de la taille du fichier
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`File '${file.name}' exceeds the maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
                continue; // Ignore le fichier trop volumineux
            }

            console.log(file, file.name.split('.').at(-1));
            if (
                SUPPORTED_FILE_TYPE.includes(file['type']) ||
                SUPPORTED_FILE_EXTENSIONS.includes(file.name.split('.').at(-1))
				
            ) {
                uploadDoc(file, tags);
				await processFile(file, langchain_mode, chunk, chunk_size, embed);
				isLoading=false;

            } else {
                toast.error(
                    `Unknown File Type '${file['type']}', but accepting and treating as plain text`
                );
                uploadDoc(file, tags);
				await processFile(file, langchain_mode, chunk, chunk_size, embed);
				isLoading=false;


            }
        }

        inputFiles = null;
        uploadDocInputElement.value = '';
    } else {
        toast.error($i18n.t(`File not found.`));
    }

   
    documents.set(await getDocs(localStorage.token));
};

	const addTagHandler = async (tagName) => {
		if (!tags.find((tag) => tag.name === tagName) && tagName !== '') {
			tags = [...tags, { name: tagName }];
		} else {
			console.log('tag already exists');
		}
	};

	const deleteTagHandler = async (tagName) => {
		tags = tags.filter((tag) => tag.name !== tagName);
	};
	let isLoading= false

	onMount(() => {});
</script>

<Modal size="sm" bind:show>
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4">
			<div class=" text-lg font-medium self-center">{$i18n.t('Add your CVs')}</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>
		<div class="flex flex-col md:flex-row w-full px-5 py-4 md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<form
					class="flex flex-col w-full"
					on:submit|preventDefault={() => {
						submitHandler();
					}}
				>
					<div class="mb-3 w-full">
						<input
							id="upload-doc-input"
							bind:this={uploadDocInputElement}
							hidden
							bind:files={inputFiles}
							type="file"
							multiple
						/>

						<button
							class="w-full text-sm font-medium py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-center rounded-xl"
							type="button"
							on:click={() => {
								uploadDocInputElement.click();
							}}
						>
							{#if inputFiles}
								{inputFiles.length > 0 ? `${inputFiles.length}` : ''} {$i18n.t('document(s) selected.')}
							{:else}
								{$i18n.t('Click here to select your CVs')}
							{/if}
						</button>

						<div class="flex items-center relative"  style="display: flex; align-items: center; justify-content: center; margin-top: 18px;">
		
						<!-- SVG Chevron with larger size -->
						<svg id="chevron" class="chevron absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
						  <path d="M8.12 9.29L12 13.17L15.88 9.29C16.27 8.9 16.9 8.9 17.29 9.29C17.68 9.68 17.68 10.31 17.29 10.7L12.71 15.29C12.32 15.68 11.68 15.68 11.29 15.29L6.71 10.7C6.32 10.31 6.32 9.68 6.71 9.29C7.1 8.9 7.73 8.9 8.12 9.29Z"/>
						</svg>
						  </div>
						
					</div>

			

					<div class="flex justify-end pt-5 text-sm font-medium">
						<button
							class=" px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-gray-100 transition rounded-lg"
							type="submit"
						>
							{$i18n.t('Save')}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</Modal>
{#if isLoading}
<div class="loader-overlay">
  <div class="loader-maxance">
      <div class="img-loader">
          <img src="/weensight_circle.png" alt="Loader Image">
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

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type='number'] {
		-moz-appearance: textfield; /* Firefox */
	}
</style>
