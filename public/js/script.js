document.addEventListener("DOMContentLoaded", function() {
    // Signup button redirection
    const signupBtn = document.querySelector(".signup-btn");
    if (signupBtn) {
        signupBtn.onclick = function() {
            window.location.href = "/signup";
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

    const searchButton = document.getElementById("search-button");
const searchBar = document.getElementById("search-bar");
const searchResults = document.getElementById("search-results");

if (searchButton && searchBar && searchResults) {
    searchButton.addEventListener("click", () => {
        searchButton.style.display = "none";
        searchBar.style.display = "inline-block";
        searchBar.focus();
    });

    let searchRequest = 0;

    searchBar.addEventListener("input", async () => {
        const query = searchBar.value.trim();
        const requestId = ++searchRequest;

        searchResults.replaceChildren();

        if (query.length < 2) return;

        try {
            const response = await fetch(
                `/api/users/search?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error("Search failed");
            }

            const users = await response.json();

            if (requestId !== searchRequest) return;

            if (users.length === 0) {
                searchResults.textContent = "No matching users.";
                return;
            }

            users.forEach(user => {
                const link = document.createElement("a");
                link.href = `/message?user_id=${user.user_id}`;
                link.textContent = `${user.first_name} ${user.last_name}`;
                link.className = "user-link d-block p-2";

                searchResults.appendChild(link);
            });
        } catch (error) {
            if (requestId === searchRequest) {
                console.error(error);
                searchResults.textContent = "Unable to search users.";
            }
        }
    });
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

    

    
    const senderInput = document.querySelector("#sender-id");
    const receiverInput = document.querySelector("#receiver-id");
    const messageInput = document.querySelector("#message");
    const sendMessageButton = document.querySelector("#send-message");
    const chatMessagesContainer = document.querySelector("#chat-messages");

    if (
        senderInput &&
        receiverInput &&
        messageInput &&
        sendMessageButton &&
        chatMessagesContainer
    ) {
        const senderId = Number(senderInput.value);
        const receiverId = Number(receiverInput.value);
        const socket = io("/chat");

        // Prevent duplicate messages from appearing
        const displayedMessages = new Set();

        function displayMessage(data) {
            const messageSender = Number(data.senderId);
            const messageReceiver = Number(data.receiverId);

            // Only display messages from this conversation
            const belongsToConversation =
                (messageSender === senderId && messageReceiver === receiverId) ||
                (messageSender === receiverId && messageReceiver === senderId);

            if (!belongsToConversation) return;

            // Avoid displaying the same message twice
            if (data.messageId && displayedMessages.has(data.messageId)) {
                return;
            }

            if (data.messageId) {
                displayedMessages.add(data.messageId);
            }

            const bubble = document.createElement("div");

            bubble.className =
                messageSender === senderId
                    ? "sender-messages"
                    : "receiver-messages";

            const paragraph = document.createElement("p");
            paragraph.textContent = data.message;

            bubble.appendChild(paragraph);
            chatMessagesContainer.appendChild(bubble);

            bubble.scrollIntoView({
                behavior: "smooth",
                block: "end"
            });
        }

        // Display incoming and outgoing messages immediately
        socket.on("message", displayMessage);

        socket.on("connect_error", (error) => {
            console.error("Chat connection failed:", error.message);
        });

        sendMessageButton.addEventListener("click", () => {
            const message = messageInput.value.trim();

            if (!message || message.length > 2000) return;

            if (!socket.connected) {
                alert("Chat is disconnected. Please try again.");
                return;
            }

            socket.emit("message", {
                receiverId,
                message
            });

            messageInput.value = "";
        });
    }

        // Admin report review validation
    const reviewForm = document.querySelector(".admin-review-panel form");
    const notesInput = document.getElementById("adminNotes");
    const errorMessage = document.getElementById("review-error");
    const requestInfoBtn = document.getElementById("request-info-btn");

    if (reviewForm && notesInput && errorMessage && requestInfoBtn) {

        function validateNotes() {
            if (!notesInput.value.trim()) {
                errorMessage.hidden = false;
                notesInput.focus();
                return false;
            }

            errorMessage.hidden = true;
            return true;
        }

        reviewForm.addEventListener("submit", function(event) {
            const action = event.submitter?.value;

            if ((action === "reject" || action === "request_info") && !validateNotes()) {
                event.preventDefault();
            }
        });

        notesInput.addEventListener("input", function() {
            if (notesInput.value.trim()) {
                errorMessage.hidden = true;
            }
        });

        requestInfoBtn.addEventListener("click", function() {
            if (!validateNotes()) return;

            const email = requestInfoBtn.dataset.email;
            const reportId = requestInfoBtn.dataset.reportId;
            const firstName = requestInfoBtn.dataset.firstName;
            const lastName = requestInfoBtn.dataset.lastName;

            if (!email) {
                errorMessage.textContent = "The submitting landlord's email is unavailable.";
                errorMessage.hidden = false;
                return;
            }

            const subject = `TrustTenant - Additional Information for Report #${reportId}`;

            const body =
                `Hello,\n\n` +
                `We need additional information to review your submitted report #${reportId} on your tenant: ${firstName} ${lastName}.\n\n` +
                `Review notes:\n\n ${notesInput.value.trim()}\n\n\n\n` +
                `Please reply with the requested information. You may also respond to this email with any inquiries\n\n` +
                `TrustTenant Administration`;

            const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            const confirmSection = document.getElementById("confirm-request-section");

            confirmSection.hidden = false;

            window.location.href = mailto;

        });
    }


});