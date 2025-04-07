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

    // Clear the tool results panel for a new query
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
        await processResponse(data.response, true);
    } catch (error) {
        console.error('Error processing message:', error);
        addSystemMessage('An error occurred while processing your message.');
    }
}

// Process Claude's response
async function processResponse(response, isInitialResponse = false) {
    // Only clear the placeholder on initial response
    if (isInitialResponse) {
        toolResults.innerHTML = '';
        
        // Add a header for this query's tool calls
        const toolCallsHeader = document.createElement('div');
        toolCallsHeader.className = 'tool-calls-header';
        toolCallsHeader.innerHTML = `<h3>Tool Calls for Current Query</h3><hr>`;
        toolResults.appendChild(toolCallsHeader);
    }
    
    // Check if there are any tool calls in the response
    const toolCalls = response.content.filter(content => content.type === 'tool_use');
    const textContents = response.content.filter(content => content.type === 'text');
    
    // Display any text content from the response
    for (const content of textContents) {
        addAssistantMessage(content.text);
        messageHistory.push({ role: 'assistant', content: content.text });
    }
    
    // If there are no tool calls, we're done
    if (toolCalls.length === 0) {
        return;
    }
    
    // Process all tool calls first
    for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const toolInput = toolCall.input;
        const toolId = toolCall.id || generateUniqueId();
        
        // Create container for this tool call and its result
        const toolCallContainer = document.createElement('div');
        toolCallContainer.className = 'tool-call-container';
        
        // Add tool call information to the tool results panel
        const toolCallDiv = document.createElement('div');
        toolCallDiv.className = 'tool-call';
        toolCallDiv.innerHTML = `
            <h3>Tool Call: ${toolName}</h3>
            <pre>${JSON.stringify(toolInput, null, 2)}</pre>
        `;
        toolCallContainer.appendChild(toolCallDiv);
        
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
            toolCallContainer.appendChild(toolResultDiv);
            
            // Add a separator
            const separator = document.createElement('div');
            separator.className = 'tool-separator';
            separator.innerHTML = '<hr>';
            toolCallContainer.appendChild(separator);
            
            // Add the whole container to the results panel
            toolResults.appendChild(toolCallContainer);
            
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
        } catch (error) {
            console.error('Error using tool:', error);
            addSystemMessage(`Error using tool ${toolName}: ${error.message}`);
        }
    }
    
    // After all tool calls are processed, get a follow-up response from Claude
    try {
        const followUpResponse = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messageHistory })
        });
        
        const followUpData = await followUpResponse.json();
        
        // Process the follow-up response (which might have more tool calls)
        if (followUpData.response) {
            await processResponse(followUpData.response, false);
        }
    } catch (error) {
        console.error('Error getting follow-up response:', error);
        addSystemMessage('An error occurred while getting the follow-up response.');
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