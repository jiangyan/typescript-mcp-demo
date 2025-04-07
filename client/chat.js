// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const toolResults = document.getElementById('tool-results');

// Message history for context
const messageHistory = [];

// API Endpoints
const API_URL = 'http://localhost:3000/api';

// Helper function to generate a unique ID
function generateUniqueId() {
    return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize the chat interface
async function initChat() {
    // Fetch available tools
    try {
        const response = await fetch(`${API_URL}/tools`);
        const data = await response.json();
        console.log('Available tools:', data.tools);
    } catch (error) {
        console.error('Failed to fetch tools:', error);
        addSystemMessage('Failed to connect to the server. Please try again later.');
    }

    // Set up event listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

// Handle sending messages
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addUserMessage(message);
    userInput.value = '';

    // Update message history
    messageHistory.push({ role: 'user', content: message });

    // Clear the tool results panel
    toolResults.innerHTML = '<div class="placeholder">Processing your request...</div>';

    try {
        // Send message to server for processing
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messageHistory })
        });

        const data = await response.json();
        
        if (data.error) {
            addSystemMessage(`Error: ${data.error}`);
            return;
        }

        // Process the response
        await processResponse(data.response);
    } catch (error) {
        console.error('Error processing message:', error);
        addSystemMessage('An error occurred while processing your message.');
    }
}

// Process Claude's response
async function processResponse(response) {
    // Clear the placeholder
    toolResults.innerHTML = '';
    
    // Process each content part
    for (const content of response.content) {
        if (content.type === 'text') {
            // Add text response to chat
            addAssistantMessage(content.text);
            // Add to message history
            messageHistory.push({ role: 'assistant', content: content.text });
        } 
        else if (content.type === 'tool_use') {
            // Handle tool calls
            const toolName = content.name;
            const toolInput = content.input;
            const toolId = content.id || generateUniqueId();
            
            // Add tool call information to the tool results panel
            const toolCallDiv = document.createElement('div');
            toolCallDiv.className = 'tool-call';
            toolCallDiv.innerHTML = `
                <h3>Tool Call: ${toolName}</h3>
                <pre>${JSON.stringify(toolInput, null, 2)}</pre>
            `;
            toolResults.appendChild(toolCallDiv);
            
            // Add a message indicating tool use
            addSystemMessage(`Using tool: ${toolName}`);
            
            try {
                // Call the tool via API
                const toolResponse = await fetch(`${API_URL}/tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: toolName, input: toolInput })
                });
                
                const toolData = await toolResponse.json();
                
                // Display tool result
                const toolResultDiv = document.createElement('div');
                toolResultDiv.className = 'tool-result';
                toolResultDiv.innerHTML = `
                    <h3>Tool Result:</h3>
                    <pre>${JSON.stringify(toolData.result, null, 2)}</pre>
                `;
                toolResults.appendChild(toolResultDiv);
                
                // Add tool call to message history
                messageHistory.push({ 
                    role: 'assistant', 
                    content: [
                        { type: 'tool_use', id: toolId, name: toolName, input: toolInput }
                    ]
                });
                
                // Add tool result to message history in the correct format
                messageHistory.push({ 
                    role: 'user', 
                    content: [
                        { 
                            type: 'tool_result', 
                            tool_use_id: toolId,
                            content: JSON.stringify(toolData.result)
                        }
                    ]
                });
                
                // Get a follow-up response from Claude with the tool result
                const followUpResponse = await fetch(`${API_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: messageHistory })
                });
                
                const followUpData = await followUpResponse.json();
                
                // Process the follow-up response
                if (followUpData.response && followUpData.response.content) {
                    const followUpContent = followUpData.response.content.find(c => c.type === 'text');
                    if (followUpContent) {
                        addAssistantMessage(followUpContent.text);
                        messageHistory.push({ role: 'assistant', content: followUpContent.text });
                    }
                }
            } catch (error) {
                console.error('Error using tool:', error);
                addSystemMessage(`Error using tool ${toolName}: ${error.message}`);
            }
        }
    }
}

// Helper function to add a user message to the chat
function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to add an assistant message to the chat
function addAssistantMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to add a system message to the chat
function addSystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the chat interface when the page loads
document.addEventListener('DOMContentLoaded', initChat); 