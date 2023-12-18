import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import OpenAI from 'https://deno.land/x/openai@v4.22.0/mod.ts';


config(); // Load environment variables

const app = new Application();
const router = new Router();


const token = Deno.env.get("WHATSAPP_TOKEN");
const whatsappUrl = Deno.env.get("WHATSAPP_URL")
const verifyToken = Deno.env.get("VERIFY_TOKEN");
const openVisionApiKey = Deno.env.get("OPEN_VISION_API_KEY"); 
const assistantId = Deno.env.get("ASSISTANT_ID")

const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const openai = new OpenAI({
  apiKey: openVisionApiKey, // This is the default and can be omitted
});

const assistant = await openai.beta.assistants.retrieve(assistantId)

console.log(assistant)


const thread = await openai.beta.threads.create();

console.log(thread)

function isImageUrl(url) {
  return typeof url === 'string' && url.match(/\.(jpeg|jpg|gif|png)$/) != null;
}

async function extractMessageBodies(data) {
  const messages = [];
  data.entry.forEach(entry => {
    entry.changes.forEach(change => {
      if (change.value && change.value.messages) {
        change.value.messages.forEach(message => {
          if (message.text && message.text.body) {
            messages.push(message.text.body)
          }
        });
      }
    });
  });
  return messages;
}

async function callOpenAI(imageUrl) {

  const DEFAULT_IMAGE_URL = "https://thepartysource.com/image/cache/catalog/inventory/ORANGE-500x500.jpg";
  if (!imageUrl) {
    imageUrl = DEFAULT_IMAGE_URL;
  }
  const response = await fetch(OPENAI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openVisionApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What’s in this image?" },
            {
              type: "image_url",
              image_url: {
                "url": imageUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function sendWhatsappMessage(data) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log("Sending ", data);

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "525534363911",
      "type": "text",
      "text": { // the text object
        "preview_url": false,
        "body": data
        }
      })
    });

    if (response.status === 200) {
      return ['message sent', 200];
    } else {
      return ['error sending message', response];
    }
  } catch (e) {
    console.error(e);
    return [e.message, 403];
  }
}


async function getUserInstruction(messageBodies) {
  if (messageBodies.length > 0 && isImageUrl(messageBodies[0])) {
    return await callOpenAI(messageBodies[0]);
  } else if (messageBodies.length > 0) {
    return messageBodies[0];
  } else {
    return null; // 
  }
}



async function getOpenAIAssistanteResponse(runId) {
  let openAIResponse = "";
  let runStatus = true; // Initialize runStatus to true to start the loop

  while (runStatus) {
    const run = await openai.beta.threads.runs.retrieve(
      thread.id,
      runId
    );
    console.log(run);

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id);
      console.log(messages.data)
      openAIResponse = messages.data[0].content[0].text.value;
      runStatus = false; // Update runStatus to exit the loop
    } else if (run.status === "failed") {
      return null; // Return null if the run failed
    }

    // Wait for 2 seconds before the next iteration
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return openAIResponse;
}

router.post("/webhook", async (context) => {
  const reqBody = await context.request.body().value;
  
  
  if (reqBody.object) {
    const messageBodies = await extractMessageBodies(reqBody);
    let userInstruction =  await getUserInstruction(messageBodies);
    let openAIResponse = null


    if (userInstruction !== null){
      const threadMessages = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: userInstruction
        }
      );
      const run = await openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: assistant.id }
      );
      console.log(threadMessages);
      console.log(run);
      openAIResponse = await getOpenAIAssistanteResponse(run.id)

    }
    

    
    
    if (openAIResponse !== null) {

      try {
          const result = await sendWhatsappMessage(openAIResponse);
      } catch (error) {
          console.error('Error:', error);
      }
    } else {
        // Handle the case where userInstruction is null
        console.log("No valid instruction received or message body is empty.");
    }
    context.response.status = 200;
  } else {
    context.response.status = 404;
  }
});

router.get("/webhook", (context) => {
  const queryParams = context.request.url.searchParams;
  const mode = queryParams.get("hub.mode");
  const token = queryParams.get("hub.verify_token");
  const challenge = queryParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      context.response.status = 200;
      context.response.body = challenge;
    } else {
      context.response.status = 403;
    }
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT")) || 1337;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
