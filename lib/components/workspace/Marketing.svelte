    <script lang="ts">
      import fileSaver from 'file-saver';
    const { saveAs } = fileSaver;
    import { writable } from 'svelte/store';
  
   
    
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

    import { onMount, getContext } from 'svelte';
    import { settings } from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import Pagination from '$lib/components/common/Pagination.svelte';
 

      interface Message {
        id: number;
        content: string;
        date: string;
        channel: string;
        sender: string;
        entities: string;
        urgency: string;
        sentiment: string;
        subject: string;
        answer:string
      }
      const urgencyOrder = ['Urgent', 'Moyenne', 'Faible'];


      let searchTerm = '';  // Declare the search term variable

      let dateSortOrder = 'asc'; // Default date sort order
      let sentimentSortOrder = 'asc'; // Default sentiment sort order

      let urgencySortOrder = 'asc'; // Default sort order

    let currentPage = 1;
    const itemsPerPage = 10; // Define how many items you want to show per page
    let sortKey = 'Sentiment'; // default sort key
    let sortOrder = 'asc'; // default sort order
  // Function to calculate the messages to display based on the current page

      let page = 1;
      let messages: Message[] = []; // Start with an empty array
      const messagesPerPage = 1;


     
      let selectedMessage: Message | null = null;
      let error: string | null = null; // To store error messages

      // Function to handle pagination
      function handlePagination(direction: 'next' | 'prev') {
        if (direction === 'next' && currentPage < Math.ceil(messages.length / messagesPerPage)) {
          goToPage(currentPage + 1);
        } else if (direction === 'prev' && currentPage > 1) {
          goToPage(currentPage - 1);
        }
      }


      function handleDateClick() {
    dateSortOrder = dateSortOrder === 'asc' ? 'desc' : 'asc';
  }

  function handleSentimentClick() {
    sentimentSortOrder = sentimentSortOrder === 'asc' ? 'desc' : 'asc';
  }

  // Define your sentiment order
  const sentimentOrder = ['Désolé', 'Urgent', 'Préoccupé', 'Calme', 'Sincère', 'Neutre'];


      // Navigate to a specific page and update the selected message
      function goToPage(page: number) {
        if (page < 1 || page > Math.ceil(messages.length / messagesPerPage)) return; // Out of bounds check
        currentPage = page;
        const paginatedMessages = getPaginatedMessages();
        if (paginatedMessages.length > 0) {
          selectedMessage = paginatedMessages[0]; // Select the first message in the new page
        }
      }
  

      // Get messages for the current page
      function getPaginatedMessages() {
        const startIndex = (currentPage - 1) * messagesPerPage;
        return messages.slice(startIndex, startIndex + messagesPerPage);
      }

      // Select a message and display its details
      function selectMessage(message: Message) {
       selectedMessage = message;
      console.log('Selected Message:', selectedMessage);
}

      // Fetch messages from the backend
      async function fetchMessages() {
        try {
          const response = await fetch('http://localhost:3001/messages');
          if (!response.ok) throw new Error('Failed to fetch messages');
          
          const data = await response.json();
          messages = data.map((item: any) => ({
            id: item._id.$oid,
            content: item.message,
            date: item.reception_date,
            channel: item.canal,
            sender: item.client_name,
            entities: item.entities,
            urgency: item.emergency,
            sentiment: item.sentiment,
            subject: item.object,
            answer:item.proposed_answer
          }));

          // After fetching, select the first message by default
          if (messages.length > 0) {
            selectedMessage = messages[0];
          }
        } catch (err) {
          error = err.message;
          console.error('Error fetching messages:', error);
        }
      }

      // Call fetchMessages when the component is mounted
      onMount(() => {
        fetchMessages();
        sortMessages('Sentiment');
      });

      let showPopup = false;

  function showDetails(message) {
    selectedMessage = message;
    showPopup = true;
  }

  function getDisplayedMessages() {
    console.log(searchTerm);
    if (searchTerm) {
      return messages.filter((message) => {
        // Convert everything to lowercase to handle case-insensitive matching
        const term = searchTerm.toLowerCase();
        return (
          message.sender.toLowerCase().includes(term) ||    // Search by sender
          message.date.includes(term) ||                    // Search by date
          message.urgency.toLowerCase().includes(term) ||   // Search by urgency
          message.sentiment.toLowerCase().includes(term) || // Search by sentiment
          message.content.toLowerCase().includes(term)      // Search by message content
        );
      });
    }
    
    // Return all messages if no search term is entered
    return messages;
  }
 

  let sortBy = ''; // Quelle colonne est triée
  let sortDirection = 'asc'; // Direction de tri: 'asc' ou 'desc'

  // Tri des messages en fonction de la colonne et de la direction
  function sortMessages(column) {
    if (sortBy === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortDirection = 'asc';
    }

    messages = messages.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a[column] > b[column] ? 1 : -1;
      } else {
        return a[column] < b[column] ? 1 : -1;
      }
    });
  }


  function getFilteredMessages() {
    return messages.filter((message) => {
      if (searchTerm === '') {
        return true; // Retourne tous les messages si le terme de recherche est vide
      } else {
        const query = searchTerm.toLowerCase();
        const name = message.sender.toLowerCase();
        const urgency = message.urgency.toLowerCase();
        const date = message.date.toLowerCase(); // Assurez-vous que la date est au format string
        const sentiment = message.sentiment.toLowerCase();

        // Vérifie si l'un des champs contient le terme de recherche
        return (
          name.includes(query) ||
          urgency.includes(query) ||
          date.includes(query) ||
          sentiment.includes(query)
        );
      }
    });
  }

  function getUrgencyStyles(urgency) {
    switch (urgency) {
      case 'Urgent':
        return {
          text: 'text-red-600',
          bg: 'bg-red-200',
          dot: 'bg-red-600',
        };
      case 'Moyenne':
        return {
          text: 'text-yellow-600',
          bg: 'bg-yellow-200',
          dot: 'bg-yellow-600',
        };
      case 'Faible':
        return {
          text: 'text-green-600',
          bg: 'bg-green-200',
          dot: 'bg-green-600',
        };
      default:
        return {
          text: '',
          bg: '',
          dot: '',
        };
    }
  }
  const i18n = getContext('i18n');

    </script>


    <style>
      .rtl-style{
            direction:rtl;
              text-align:right;
              flex-direction: row-reverse;
          }
        .ltr{
          direction: ltr;
        }
      

.flex-space-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .send-container {
    text-align: right;
    margin-top: 10px; /* Espace entre le texte et le lien */
  }

  .send-link {
    font-size: 14px;
    font-weight: bold;
    text-decoration: none;
    color: #168c77; /* Couleur du lien */
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .send-icon {
    width: 16px;
    height: 16px;
    margin-right: 5px; /* Espace entre l'image et le texte */
  }

      


.send-button {
  background-color: #4CAF50; /* Green background */
  color: white; /* White text */
  border: none; /* Remove border */
  border-radius: 5px; /* Rounded corners */
  padding: 5px 10px; /* Padding */
  cursor: pointer; /* Pointer cursor on hover */
  display: flex;
  align-items: center;
}

.send-button:hover {
  background-color: #45a049; /* Darker green on hover */
}

.send-icon {
  width: 16px; /* Adjust icon size */
  height: 16px; /* Adjust icon size */
}

.info-pair {
    display: flex; /* Use flexbox to arrange pairs */
    justify-content: space-between; /* Space between the title and content */
    font-size: 14px; /* Adjust font size as needed */
    line-height: 1.5; /* Adjust line height for better spacing */
    margin: 0; /* Remove default margin */
    padding: 0; /* Remove default padding */
    line-height: 1.2; /* Adjust line height for closer text */
    
}


    .header-info-box {
      background-color: rgba(128, 185, 116, 0.188);
      padding: 10px;
      border-radius: 8px;
      border: 2px solid rgba(128, 185, 116, 0.4);
      font-weight: bold;
    }

    .container {

      display: flex;
     
      border-radius: 8px;
      overflow: hidden;
      width: 100%; /* Pour s'assurer que la conteneur occupe toute la largeur disponible */

    }

    .message-list {
      width: 40%; /* Augmente la largeur de la liste des messages */
      background-color: transparent;  
      padding: 10px;
      max-height: 563px; /* Augmente la hauteur maximale de la liste des messages */
      overflow-y: auto;  /* Active un scroll si la liste dépasse cette hauteur */
      border: 1px solid #ccc;
      border-radius: 8px;
      height: 100%;


    /* Styles pour la scrollbar */
    scrollbar-width: thin; /* Pour Firefox */
      scrollbar-color: rgba(128, 185, 116, 0.4) #f0f0f0;/* Couleur du curseur et du fond pour Firefox */
    }


    .message-list::-webkit-scrollbar {
      width: 12px; /* Augmente la largeur de la scrollbar */
    }

    .message-list::-webkit-scrollbar-track {
      background: #f0f0f0; /* Couleur de la piste de la scrollbar */
    }

    .message-list::-webkit-scrollbar-thumb {
      background: rgba(128, 185, 116, 0.188); /* Couleur du curseur de la scrollbar */
      border-radius: 6px; /* Bordure arrondie du curseur */
    }

    .message-list::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 185, 116, 0.4); /* Couleur du curseur au survol */
    }

    .message-details {
      width: 100%;
      padding: 10px;
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 20px;
      max-height: 563px; /* Hauteur maximale */
      overflow-y: auto; /* Active un scroll vertical */
      
      /* Styles pour la scrollbar */
      scrollbar-width: thin; /* Pour Firefox */
      scrollbar-color: rgba(128, 185, 116, 0.4) #f0f0f0; /* Couleur du curseur et du fond pour Firefox */
  }

  .message-details::-webkit-scrollbar {
      width: 12px; /* Largeur de la scrollbar */
  }

  .message-details::-webkit-scrollbar-track {
      background: #f0f0f0; /* Couleur de la piste de la scrollbar */
  }

  .message-details::-webkit-scrollbar-thumb {
      background: rgba(128, 185, 116, 0.188); /* Couleur du curseur de la scrollbar */
      border-radius: 6px; /* Bordure arrondie du curseur */
  }

  .message-details::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 185, 116, 0.4); /* Couleur du curseur au survol */
  }
    .message {
      padding: 8px;
      margin: 4px 0;
      background-color: white;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      display: flex; /* Aligner les conteneurs icône et texte sur une ligne */
      align-items: center; /* Aligner verticalement l'icône et le texte */
      justify-content: space-between; /* Espacer le texte et l'icône */

    }

    .message:hover {
      background-color: #e0ffe0;
    }


    .repon{
      background-color: #f1fdf9;
      border:gray;  
    }

    .selected {
      background-color: #e8f5e9; /* Light green background */
      border: 1px solid #a5d6a7; /* Slightly darker green border */
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow for a modern touch */
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }

    .selected:hover {
      background-color: #c8e6c9; /* Slightly darker green on hover */
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); /* Darker shadow on hover */
    }




    .info-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
}

.info-box {
  background-color: #f7f7f7;
  padding: 8px 12px; /* Adjusted padding for a smaller box */
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 14px; /* Smaller font size */
  line-height: 1.4; /* Improved line height for readability */
  width: 50%; /* Keep the width to your preference */
  margin-bottom: 8px; /* Space between info boxes */
}

.info-box strong {
  margin-right: 6px; /* Space between the label and content */
}


.info-box::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  margin-right: 8px;
}


    .message-content-container {
      background-color: #f1fdf9;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid gray;
    }

    .response-container {
      background-color:   #f1fdf9;
      padding: 20px;
      border-radius: 8px;
      
        display: flex;
      justify-content: space-between;
      align-items: flex-start; /* Align items to the start for better text alignment */
      flex-wrap: wrap; /* Ensure content wraps on smaller screens */
      width: 100%;
    }

    .response-button {
      background-color: #168c77;
      
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      flex-shrink: 0; /* Prevent button from shrinking */
      margin-left: 20px; /* Space between text and button */
    }

    .response-button:hover {
      background-color: #9FD5B5;
    }

    .pagination {
      margin-top: 10px;
      text-align: center;
    }

    .pagination button {
      background-color: #4caf50;
      color: white;
      border: none;
      padding: 5px 10px;
      margin: 0 5px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      
     
      
    }

    .pagination button:hover {
      background-color: #388e3c;
    }

    .pagination span {
      margin: 0 5px;
    }
    .header-bar {
      display: flex;
      flex-direction: column; /* Aligne en colonne */
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 20px;
      width: 100%;
      box-sizing: border-box;
      background-color: transparent;
      position: relative;
    }


    .header-title {
      flex: 1;
      text-align: center;
      font-size: 18px;
      text-align: left; /* Alignement à gauche */
    }

    .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.pagination-arrow {
  background-color: transparent;
  border: none;
  padding: 5px;
  margin-right: 5px;
  height:25px;
  
 
}



.rotate-left {
  transform: rotate(180deg);
  
}


.arrow-icon {
  width: 17px;
  height: 17px;
}
    .pagination-arrow {
      background-color: #168c77; /* Fond des boutons de pagination */
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      transition: background-color 0.3s ease;
      height:36px;
    }

    .pagination-arrow:disabled {
      background-color: #c8e6c9; /* Fond des boutons désactivés */
      cursor: not-allowed;
    }

    .pagination-arrow:hover {
      background-color: #9FD5B5; /* Couleur au survol */
    }

    .message-content-container {
      background-color: #f1fdf9;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid gray;
    }

    .message-info {
      margin-bottom: 10px; /* Space between lines of info */
      width: 100%;
    }

    .message-info p {
      margin: 0;
      padding: 0;
      color: #333; /* Ensure text color is consistent */
    }

    .info-title {
      font-weight: bold;
      color: #168c77; /* Couleur verte pour le titre */
      margin-bottom: 5px;
      display: block; /* Assurer que le titre occupe toute la largeur disponible */
    }

    .info-content {
      margin: 0;
      padding: 10px 0;
      color: #333; /* Couleur du texte pour le contenu */
    }
    .header-top {
      display: flex;
      justify-content: space-between; /* Met "Marketing" à gauche et la pagination à droite */
      width: 100%;
      align-items: center;
    }

    .header-title-message {
      font-size: 16px;
      text-align: center;
      width: 30%;
      margin-top: 5px; /* Espacement pour le positionner en dessous */
    }

    .message .icon {
      margin-right: 8px; /* Ajoute un espace entre la flèche et le nom */
      width: 16px; /* Taille de la flèche */
      height: 16px;
    }
    .icon-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 10px; /* Espace entre l'icône et le texte */
    }

    .icon-reponse-prop {
      display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 32px; /* Set the width */
    height: 32px; /* Set the height */
    border: 2px solid #168c77; /* Green border */
    border-radius: 50%; /* Make it circular */
    cursor: pointer;
    padding: 4px;

    }
    .icon-reponse-prop:hover {
    background-color: #9FD5B5; /* Couleur de fond au survol */
  }


    .icon {
      width: 16px;
      height: 16px;
    }
    .text-container {
      display: flex;
      flex-direction: column; /* Garde le nom et le texte sur deux lignes distinctes */
    }

    .message-sender {
      font-size: 14px; /* Change la taille de la police ici */
      
      color: #333; /* Couleur du texte, ajustable si nécessaire */
    }
    .flex-space-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .edit-button {
    display: flex;
    align-items: center;
    border: 1px solid green;
    background-color: transparent;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 4px;
  }
  .refresh-icon {
      width: 18px; /* Ajustez la taille selon vos besoins */
      height: 18px;
      background-image: url('/static/static/refresh.png');
      background-size: cover;
      display: inline-block;
  }
  .disquette-icon {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .container {
    display: flex;
    justify-content: flex-end; /* Aligns items to the right */
    padding: 10px; /* Optional: Adjust padding as needed */
   
}

.chevron-icon {
  width: 16px;
  height: 16px;
}


table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #f4f4f4;
  }

  tr:hover {
    background-color: #e0e0e0;
    cursor: pointer;
  }


/* General Popup Styling */
.popup {
  position: fixed;
  top: 50%;   
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 800px;
  background-color: #fff;
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

.message-info {
  margin-bottom: 15px;
}

.info-title {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
}

.info-content {
  font-size: 0.9rem;
  color: #555;
}

.message-content-container {
  background-color: white;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
}

/* Response blockquote styling */
blockquote {
  background-color: #f1fdf9;
  padding: 15px;
  border-left: 5px solid #168c77;
    
  border-radius: 10px;
  margin-top: 15px;
  margin-left: 23px;
}

.flex-space-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Icons styling */
.icon-reponse-prop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.icon-reponse-prop img {
  width: 100%;
  height: 100%;
}

.icon-reponse-prop:hover {
  transform: scale(1.1);
}

/* Animations for popup */
.popup-enter {
  opacity: 0;
  transform: translate(-50%, -60%);
}

.popup-enter-active {
  opacity: 1;
  transform: translate(-50%, -50%);
  transition: opacity 0.3s, transform 0.3s ease;
}

.popup-exit {
  opacity: 1;
  transform: translate(-50%, -50%);
}

.popup-exit-active {
  opacity: 0;
  transform: translate(-50%, -60%);
  transition: opacity 0.3s, transform 0.3s ease;
}



.blue-text {
  color: #3b82f6; /* Blue for Neutre */
  background-color: #bfdbfe; /* Light Blue background */
}

.sky-text {
  color: #0284c7; /* Sky for Sincère */
  background-color: #7dd3fc; /* Light Sky background */
}

.red-text {
  color: #ef4444; /* Red for Préoccupé */
  background-color: #fecaca; /* Light Red background */
}

.orange-text {
  color: #f97316; /* Orange for Désolé */
  background-color: #fed7aa; /* Light Orange background */
}

.green-text {
  color: #10b981; /* Green for Calme */
  background-color: #a7f3d0; /* Light Green background */
}

.yellow-text {
  color: #facc15; /* Yellow for Urgent */
  background-color: #fef08a; /* Light Yellow background */
}

.gray-bg {
  background-color: #737373; /* Gray for Neutre */
}

.sky-bg {
  background-color: #0284c7; /* Sky for Sincère */
}

.red-bg {
  background-color: #ef4444; /* Red for Préoccupé */
}

.orange-bg {
  background-color: #f97316; /* Orange for Désolé */
}

.green-bg {
  background-color: #10b981; /* Green for Calme */
}

.yellow-bg {
  background-color: #facc15; /* Yellow for Urgent */
}


/* Centering the button content */
button.flex.items-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.bordure {
  border: 2px solid #9FD5B5; /* Make sure the border style is solid */
  border-radius: 10px; /* Optional: add some rounding to the border */
}

.info-item {
    display: flex; /* Use flexbox for individual items */
    justify-content: space-between; /* Space between title and content */
    width: 48%; /* Adjust width to fit two items per row */
    font-size: 14px; /* Adjust font size as needed */
    line-height: 1.5; /* Adjust line height for better spacing */
}

.info-list {
    list-style-type: none; /* Remove default list styles */
    padding: 0; /* Remove padding */
    display: flex; /* Use flexbox to arrange list items horizontally */
    flex-wrap: wrap; /* Allow wrapping for multiple items */
    gap: 1rem; /* Space between items */
}

.info-item {
    display: flex; /* Use flexbox for individual items */
    justify-content: space-between; /* Space between title and content */
    width: 100%; /* Adjust width to fit two items per row */
    font-size: 14px; /* Adjust font size as needed */
    line-height: 1.5; /* Adjust line height for better spacing */
}

.info-pair {
    flex: 1; /* Allow each pair to take equal space */
    display: flex; /* Use flexbox for the pair */
    flex-direction: column; /* Arrange title and content vertically */
}

.close {
    cursor: pointer; /* Change cursor to pointer for the close button */
}

.send-container {
    text-align: right;
    margin-top: 10px;
  }

  .send-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #168c77; /* Couleur du bouton */
    color: white; /* Couleur du texte */
    font-size: 14px;
    font-weight: bold;
    padding: 10px 20px; /* Taille et espacement du bouton */
    border: none;
    border-radius: 5px; /* Coins arrondis */
    cursor: pointer; /* Curseur en forme de main */
    transition: background-color 0.3s, transform 0.2s ease-in-out; /* Animation sur hover */
  }

  .send-button:hover {
    background-color: #135e5a; /* Couleur du bouton en hover */
    transform: scale(1.05); /* Effet d'agrandissement en hover */
  }

  .send-icon {
    width: 18px;
    height: 18px;
    margin-left: 10px; /* Espace entre le texte et l'image */
  }
    </style>



<div>
  <div class={`header-top ${$i18n.language === 'ar-BH' ? 'rtl-style ltr' : ''}`}>
    <div class="mb-3 flex justify-between items-center">
      <div class="text-lg font-semibold self-center">{$i18n.t('Marketing')}</div>
    </div>
    <div class="pagination-controls">
    </div>
  </div>
  

  <div class={`flex justify-start mb-4 ${$i18n.language === 'ar-BH' ? 'rtl-style ltr' : ''}`}>
    <input
      type="text"
      class="w-full md:w-60 rounded-xl py-1.5 px-4 text-sm dark:text-gray-300 dark:bg-gray-850 outline-none bordure  "
    
      bind:value={searchTerm} 
    />

  </div>
  
  <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-auto max-w-full s-FoVA_WMOgxUD">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-850 dark:text-gray-400 s-FoVA_WMOgxUD">
      <tr class="s-FoVA_WMOgxUD">
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('date')} 
        style="text-align: center; border: none; border-radius: 15px 0 0 0; text-transform: none; background-color:#9FD5B5">
        {$i18n.t('Date')} {  (dateSortOrder === 'asc' ? '↑' : '↓')}
    </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">{$i18n.t('Nom')}</th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
    on:click={() => {
      urgencySortOrder = urgencySortOrder === 'asc' ? 'desc' : 'asc';
      // Trigger reactivity if needed, e.g., by calling a function to sort messages.
    }}
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
        {$i18n.t('Emergency')} { (urgencySortOrder === 'asc' ? '↓' :'↑')}
    </th>
    <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" 
        on:click={() => sortMessages('sentiment')} 
        style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">
        {$i18n.t('Feeling')} { (sentimentSortOrder === 'asc' ? '↑' : '↓')}
    </th>

        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" style="text-align: center; border: none; text-transform: none; background-color:#9FD5B5">{$i18n.t('Beginning of the message')}</th>
        <th class="px-3 py-2 cursor-pointer select-none s-FoVA_WMOgxUD" style="text-align: center; border: none; border-radius: 0 15px 0 0; text-transform: none; background-color:#9FD5B5">{$i18n.t('Details')}</th>
        
      </tr>
    </thead>
    <tbody class="s-FoVA_WMOgxUD">
      {#if messages.filter((message) => {
          if (searchTerm === '') {
            return true; // Return all messages if the search term is empty
          } else {
            const query = searchTerm.toLowerCase();
            const name = message.sender.toLowerCase();
            const urgency = message.urgency.toLowerCase();
            const date = message.date.toLowerCase(); // Ensure the date is in string format
            const sentiment = message.sentiment.toLowerCase();
        
            // Check if any field contains the search term
            return (
              name.includes(query) ||
              urgency.includes(query) ||
              date.includes(query) ||
              sentiment.includes(query)
            );
          }
        }).length === 0}
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px; color: white; background-color:white;">
           <p style="color:gray"> {$i18n.t('No post matching your search')}</p>
          </td>
        </tr>
      {:else}
        {#each messages
          .filter((message) => {
            if (searchTerm === '') {
              return true; // Return all messages if the search term is empty
            } else {
              const query = searchTerm.toLowerCase();
              const name = message.sender.toLowerCase();
              const urgency = message.urgency.toLowerCase();
              const date = message.date.toLowerCase(); // Ensure the date is in string format
              const sentiment = message.sentiment.toLowerCase();
        
              // Check if any field contains the search term
              return (
                name.includes(query) ||
                urgency.includes(query) ||
                date.includes(query) ||
                sentiment.includes(query)
              );
            }
          })
          .sort((a, b) => {
            const urgencyOrder = ['Urgent', 'Average', 'Low'];
            const urgencyComparison = urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency);
            
            // Sort based on urgency sort order
            return urgencySortOrder === 'asc' ? urgencyComparison : -urgencyComparison;
          })
          .slice((page - 1) * 10, page * 10) as message}
          <tr 
            class="text-xs s-FoVA_WMOgxUD" 
            style="background-color: white; border-bottom: 1px solid rgba(0, 0, 0, 0.1);" 
            on:click={() => selectMessage(message)} 
            class:selected={message === selectedMessage}
          >
            <td style="text-align: center; border-right: none;">{message.date}</td>
            <td style="text-align: center; border-left: none; border-right: none;">{message.sender}</td>
            <td style="text-align: center; display: flex; justify-content: center; align-items: center; border: none;">
              <button 
                class="flex items-center gap-2 text-xs px-3 py-0.5 rounded-lg 
                  {message.urgency === 'Urgent' && 'text-red-600 bg-red-200/30'} 
                  {message.urgency === 'Average' && 'text-yellow-600 bg-yellow-200/30'} 
                  {message.urgency === 'Low' && 'text-green-600 bg-green-200/30'}"
                on:click={() => handleUrgencyClick(message.urgency)}
              >
                <div 
                  class="w-1 h-1 rounded-full 
                    {message.urgency === 'Urgent' && 'bg-red-600'} 
                    {message.urgency === 'Average' && 'bg-yellow-600'} 
                    {message.urgency === 'Low' && 'bg-green-600'}">
                </div>
                 {$i18n.t(message.urgency)}
              </button>
            </td>
            <td style="text-align: center; border-left: none; border-right: none;">{message.sentiment}</td>
            <td style="text-align: center; border-left: none; border-right: none;">{message.content.substring(0, 50)}...</td>
            <td style="text-align: center; vertical-align: middle; padding: 10px; border-left: none;">
              <img 
                src="/more.png" 
                alt="Voir les détails" 
                on:click={(event) => { 
                  event.stopPropagation(); // Prevent row click event
                  showDetails(message); // Function to show popup
                }} 
                style="cursor: pointer; width: 20px; height: 20px; display: block; margin: auto;" 
              />
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
    
  </table>
  

	<Pagination bind:page count={messages.length} />

</div>

{#if showPopup}
<div class="popup-background"></div>
<div class="popup">
  <div class={`popup-content ${$i18n.language === 'ar-BH' ? 'rtl-style' : ''}`}>


    {#if showPopup}
    <div class="message-details">
      <div style="width: 80%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2 style="font-size: 20px; font-weight: bold;">{$i18n.t('Analysis of the customer message')}</h2>
        <span class="close" on:click={() => (showPopup = false)} style="cursor: pointer;">&times;</span>
    </div>
    
   
      <ul class={`info-list ${$i18n.language === 'ar-BH' ? 'rtl-style' : ''}`}>
        <li class="info-item">
            <div class="info-pair">
                <strong style="display: flex;"><img src="/date.png" alt="Date Icon" width="16" height="16" style="margin-right: 10px;" /> {$i18n.t('Date of receipt')} :</strong><br /> {selectedMessage.date}
            </div>
            <div class="info-pair">
                <strong  style="display: flex;" ><img src="/canal.png" alt="Channel Icon" width="16" height="16" style="margin-right: 10px;" /> {$i18n.t('Receiving channel')}:</strong><br /> {selectedMessage.channel}
            </div>
            <div class="info-pair">
                <strong  style="display: flex;"><img src="/expediteur.png" alt="Sender Icon" width="16" height="16" style="margin-right: 10px;" /> {$i18n.t('Sender')} :</strong><br /> {selectedMessage.sender}
            </div>
        </li>
        <li class={`info-item ${$i18n.language === 'ar-BH' ? 'rtl-style' : ''}`}>
            <div class="info-pair">
                <strong  style="display: flex;"><img src="/entittes.png" alt="Entities Icon" width="16" height="16" style="margin-right: 10px;" /> {$i18n.t('Entities mentioned')} :</strong><br /> {selectedMessage.entities}
            </div>
            <div class="info-pair">
                <strong  style="display: flex;"><img src="/niveau.png" alt="Urgency Icon" width="16" height="16" style="margin-right: 10px;"/> {$i18n.t('Level of urgency')} :</strong><br /> {selectedMessage.urgency}
            </div>
            <div class="info-pair">
                <strong style="display: flex;"><img src="/sentiment.png" alt="Sentiment Icon" width="16" height="16" style="margin-right: 10px;" />{$i18n.t('Level of urgency')}:</strong><br /> {selectedMessage.sentiment}
            </div>
        </li>
    </ul>
    
    

        
        
        {#if selectedMessage}
           <div class={`message-content-container ${$i18n.language === 'ar-BH' ? 'rtl-style' : ''}`}>
            <div class="message-info">
              <strong class="info-title">{$i18n.t('Subject of the message')} :</strong>
              <p class="info-content">{selectedMessage.subject}</p>
            </div>
            <div class="message-info">
              <strong class="info-title">{$i18n.t('Content of the message')} :</strong>
              <p class="info-content">{selectedMessage.content}</p>
            </div>
            <blockquote contenteditable="False">
              <div class="response-container repon  ">
                <div class="message-info ">
                  <div class="flex-space-between">
                    <div>
                      <strong class="info-title">{$i18n.t('Proposed response')} :</strong>
                    </div>
                    <div>
                      <div class="icon-reponse-prop">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="icon edit-icon">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-9.439 9.439a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l9.439-9.439zM11.207 2L13 3.793 12.793 4 11 2.207 11.207 2zM10.5 2.707L2.207 11H1.5v-.707L9.793 2H10.5v.707zM1.5 11.793l.707-.707H1v.707zM3 12.793L1.207 11 1 10.793V12H3v-.207z"/>
                        </svg>
                      </div>
                      <div class="icon-reponse-prop">
                        <img src="/static/disquette.png" alt="Disquette Icon" class="disquette-icon" />
                      </div>
                      <div class="icon-reponse-prop">
                        <img src="/static/refresh.png" alt="Refresh Icon" class="refresh-icon" />
                      </div>
                      
                    </div>
                  </div>
  
                  <p class="info-content">
                    {#if selectedMessage.sentiment === 'Positif'}
                     {selectedMessage.answer} !
                    {:else if selectedMessage.sentiment === 'Négatif'}
                   {selectedMessage.answer}. 
                    {:else}
                     {selectedMessage.answer}. 
                    {/if}
                  </p>

      <div class="send-container">
        <button class="send-button" >
          {$i18n.t('Send')}
          <img src="/envoyer.png" alt="Envoyer" class="send-icon" />
        </button>
      </div>
                </div>
              </div>
              
            </blockquote>
          </div>

         
        {/if}
      </div>
    {/if}
  </div>
</div>

{/if}

  
  

  <!-- Display error if there's an issue with the fetch -->
  {#if error}
    <p style="color:red;">{error}</p>
  {/if}

  <div  style="display: none;">
    <div class="header-bar">
      <div class="header-top">
        <div class="mb-3 flex justify-between items-center">
          <div class=" text-lg font-semibold self-center">Marketing</div>
        </div>
        <div class="header-title-message">
          <strong>Réclamations ({messages.length})</strong>
        </div>
        <div class="pagination-controls">
          <button class="pagination-arrow" on:click={() => handlePagination('prev')} disabled={currentPage === 1}>
            <img src="/WhiteArrow.png" alt="Previous" class="arrow-icon rotate-left" />
          </button>
          <button class="pagination-arrow" on:click={() => handlePagination('next')} disabled={(currentPage * messagesPerPage) >= messages.length}>
            <img src="/WhiteArrow.png" alt="Next" class="arrow-icon" />
          </button>
        </div>
        
        
        
          
      </div>

      
    </div>



      <div class="container">
        <div class="message-list">
          {#each messages as message}
          <div
            class="message {selectedMessage && selectedMessage.sender === message.sender ? 'selected' : ''}"
            on:click={() => selectMessage(message)}
          >
            <div class="text-container">
              <strong class="message-sender">{message.sender}</strong>
              <p>{message.content.slice(0, 30)}{message.content.length > 30 ? '...' : ''}</p>
            </div>
            <div class="icon-container">
              <img src="/chevron.png" alt="Chevron" class="chevron-icon" />
            </div>
          </div>
        {/each}
        
        </div>

      
      
        <div class="message-details">
          {#if selectedMessage}
            <div class="info-container">
              <div class="info-box">
                <strong>Date de réception :</strong> {selectedMessage.date}
              </div>
              <div class="info-box">
                <strong>Canal de réception :</strong> {selectedMessage.channel}
              </div>
              <div class="info-box">
                <strong>Expéditeur :</strong> {selectedMessage.sender}
              </div>
              <div class="info-box">
                <strong>Entités mentionnées :</strong> {selectedMessage.entities}
              </div>
              <div class="info-box">
                <strong>Niveau d'urgence :</strong> {$i18n.t(selectedMessage.urgency)}
              </div>
              <div class="info-box">
                <strong>Sentiment:</strong> {selectedMessage.sentiment}
              </div>
            </div>

            <div class="message-content-container">
              <div class="message-info">
                <strong class="info-title">Objet du message :</strong>
                <p class="info-content">{selectedMessage.subject}</p>
              </div>
              <div class="message-info">
                <strong class="info-title">Contenu du message :</strong>
                <p class="info-content">{selectedMessage.content}</p>
              </div>
            </div>
            
            <blockquote contenteditable="true">
              
            
            
              <div class="response-container message-content-container">

                <div class="message-info">
                  <div class="flex-space-between">
                    <div>
                      <strong class="info-title">Réponse proposée :</strong>
                    </div>  
                
                    <div>
                    <div class="icon-reponse-prop">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="icon edit-icon"
                      >
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-9.439 9.439a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l9.439-9.439zM11.207 2L13 3.793 12.793 4 11 2.207 11.207 2zM10.5 2.707L2.207 11H1.5v-.707L9.793 2H10.5v.707zM1.5 11.793l.707-.707H1v.707zM3 12.793L1.207 11 1 10.793V12H3v-.207zm-.207.707L.793 14h1.5l.5-.5H3v-.5H2.793v-.5h-.5V14zm1-1.5H4v.5h.5V13.5H4v-.5H3.793V13h-.5v.293z"/>
                      </svg>
                    </div>
                    <div class="icon-reponse-prop">
                      <img src="/static/disquette.png" alt="Disquette Icon" class="disquette-icon" />
                    </div>
                    
                    <div class="icon-reponse-prop">
                    
                        <img src="/static/refresh.png" alt="Refresh Icon" class="refresh-icon" />

                      
                    </div>
                 
                  </div>
                  </div>
              
              

                  <p class="info-content">
                    {#if selectedMessage.sentiment === 'Positif'}
                      Merci pour votre message positif concernant {selectedMessage.entities} !
                    {:else if selectedMessage.sentiment === 'Négatif'}
                      Nous sommes désolés pour cette expérience négative avec {selectedMessage.entities}. Nous allons y remédier rapidement.
                    {:else}
                      Merci pour votre retour concernant {selectedMessage.entities}. Nous restons à votre disposition.
                    {/if}
                  </p>
                </div>
                <div class="container">
                <button class="response-button">Envoyer</button>
              </div>
              </div>
            
              
          </blockquote>
        


          
          {:else}
            <p class="no-selection">Sélectionnez un message pour voir les détails</p>
          {/if}
        </div>
      </div>
    </div>

