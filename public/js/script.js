document.addEventListener("DOMContentLoaded", function() {
    // Signup button redirection
    const signupBtn = document.querySelector(".signup-btn");
    if (signupBtn) {
        signupBtn.onclick = function() {
            window.location.href = "/signup";
        };
    }

    // Signout button redirection
    const signoutBtn = document.querySelector(".signout-btn");
    if (signoutBtn) {
        signoutBtn.onclick = function() {
            window.location.href = "/logout";
        };
    }

    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(event) {
            var input = event.target;
            var value = input.value.replace(/\D/g, ''); // Remove all non-digit characters
            var formattedValue = '';
            
            if (value.length > 4 && value.length <= 8) {
                formattedValue = value.slice(0, 4) + '-' + value.slice(4);
            } else if (value.length > 8) {
                formattedValue = value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8);
            } else {
                formattedValue = value;
            }
            
            input.value = formattedValue;
        });
    }

    // National ID number validation and formatting
    const nationalIdInput = document.getElementById("national_id_number");
    if (nationalIdInput) {
        nationalIdInput.addEventListener("input", function (e) {
            const input = e.target;
            const value = input.value;
            
            // Remove any non-numeric characters
            const sanitizedValue = value.replace(/\D/g, '');
            
            // Limit to 11 digits
            if (sanitizedValue.length > 11) {
                input.value = sanitizedValue.slice(0, 11);
            } else {
                input.value = sanitizedValue;
            }
        });

        nationalIdInput.addEventListener("blur", function (e) {
            const input = e.target;
            const value = input.value;
            
            if (value.length !== 11) {
                document.getElementById("error-message").style.display = "inline";
            } else {
                document.getElementById("error-message").style.display = "none";
            }
        });
    }

    const creditScoreInput = document.getElementById("credit_score");
    if (creditScoreInput) {
        creditScoreInput.addEventListener("input", function (e) {
            const input = e.target;
            const value = input.value;
            
            // Remove any non-numeric characters
            const sanitizedValue = value.replace(/\D/g, '');
            
            // Limit to 3 digits
            if (sanitizedValue.length > 3) {
                input.value = sanitizedValue.slice(0, 3);
            } else {
                input.value = sanitizedValue;
            }
        });
    }

    const searchButton = document.getElementById('search-button')
    if(searchButton){
        searchButton.addEventListener('click', function() {
       
        this.style.display = "none";  // Hide the button
        const searchBar = document.getElementById("search-bar");
        searchBar.style.display = "inline-block";  // Show the search bar
        searchBar.focus();  // Focus the search bar for immediate typing
        })
    }


    // const socket = io('/chat');
    // // Listen for messages from the server
    // socket.on('message', (message) => {
    //     // Add the message to the chat messages container
    //     const chatMessagesContainer = document.querySelector('#chat-messages');
    //     chatMessagesContainer.innerHTML += `<p>${message}</p>`;
    // });
    // // Send a message to the server
    // const sendMessageButton = document.querySelector('#send-message');
    // sendMessageButton.addEventListener('click', () => {
    //     const message = document.querySelector('#message').value;
    //     socket.emit('message', message);
    // });

    const socket = io('/chat');
    const senderId = document.querySelector('#sender-id').value;
    const receiverInput = document.querySelector('#receiver-id').value;
    const messageInput = document.querySelector('#message');
    const sendMessageButton = document.querySelector('#send-message');
    const chatMessagesContainer = document.querySelector('#chat-messages');

    socket.on('message', (data) => {
        const { senderId, message } = data;
        //chatMessagesContainer.innerHTML += `<p><strong>User ${senderId}:</strong> ${message}</p>`;
    }); 

    sendMessageButton.addEventListener('click', () => {
        const receiverId = receiverInput;
        const message = messageInput.value;

        if (receiverId && message) {
            socket.emit('message', { senderId, receiverId, message });
            messageInput.value = ''; // Clear the input field
            this.location.reload();
           // chatMessagesContainer.innerHTML += `<p><strong>User ${senderId}:</strong> ${message}</p>`;
        }
    

    });


});