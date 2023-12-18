# Deno WhatsApp Chatbot with OpenAI Integration

This project is a Deno-based server application that integrates WhatsApp messaging with OpenAI's GPT-4 model. It's designed to receive WhatsApp messages, process them using OpenAI's API, and respond back via WhatsApp.

## Features

- Receives WhatsApp messages through a webhook.
- Processes messages to extract text and image content.
- Uses OpenAI's GPT-4 model for generating responses.
- Sends responses back to the user via WhatsApp.

## Requirements

- Deno runtime
- OpenAI API key
- WhatsApp API credentials

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repository.git
   ```

## Enviroment Variables 

- WHATSAPP_TOKEN=your_whatsapp_token
- WHATSAPP_URL=your_whatsapp_url
- VERIFY_TOKEN=your_verify_token
- OPEN_VISION_API_KEY=your_openai_api_key
- ASSISTANT_ID=your_assistant_id

## Run Server

```bash
   deno run --allow-net --allow-env main.ts
```
Ensure you have the necessary permissions enabled for network access and environment variable access.


## Usage

The server listens for incoming WhatsApp messages.
On receiving a message, it processes the content and interacts with OpenAI's API.
It then sends an appropriate response back to the WhatsApp user.
