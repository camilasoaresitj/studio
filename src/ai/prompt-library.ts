
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';

const SendQuoteInputSchema = z.object({
    customerName: z.string(),
    quoteId: z.string(),
    rateDetails: z.object({
        origin: z.string(),
        destination: z.string(),
        carrier: z.string(),
        transitTime: z.string(),
        finalPrice: z.string(),
    }),
    approvalLink: z.string(),
    rejectionLink: z.string(),
});
  
const SendQuoteOutputSchema = z.object({
    emailSubject: z.string(),
    emailBody: z.string(),
    whatsappMessage: z.string(),
});

export const sendQuotePrompt = definePrompt({
  name: 'send-quote',
  inputSchema: SendQuoteInputSchema,
  outputSchema: SendQuoteOutputSchema,
  prompt: `You are an expert logistics communication AI, skilled in creating professional and persuasive messages for sending rate quotes to clients.

**Instructions:**
1.  **Context:** You are sending a rate quote to a client.
2.  **Input:** You will receive the client's name, quote ID, rate details, and approval/rejection links.
3.  **Output:** You must generate an email subject, email body (in HTML format), and a WhatsApp message.
4.  **Content Requirements:**
    - **Email Subject:** A concise subject line that includes the quote ID and a brief description.
    - **Email Body (HTML):** A professional and well-structured HTML email including:
        - A personalized greeting to the client.
        - A summary of the rate details (origin, destination, carrier, transit time, and final price).
        - Clear calls to action with the provided approval and rejection links.
        - A professional closing.
    - **WhatsApp Message:** A brief and direct message that includes:
        - A personalized greeting to the client.
        - The quote ID and final price.
        - A call to action to review the full quote details via a provided link (approval link).
5.  **Formatting:**
    - Ensure the email body is well-formatted HTML for readability.
    - Keep the WhatsApp message concise and suitable for mobile viewing.

**Example Input:**
\`\`\`json
{
    "customerName": "Acme Corp",
    "quoteId": "Q-2024-001",
    "rateDetails": {
        "origin": "Shanghai",
        "destination": "Santos",
        "carrier": "Maersk",
        "transitTime": "35-40 days",
        "finalPrice": "USD 5,500"
    },
    "approvalLink": "https://example.com/approve/Q-2024-001",
    "rejectionLink": "https://example.com/reject/Q-2024-001"
}
\`\`\`

**Required Output Format:**
\`\`\`json
{
    "emailSubject": "...",
    "emailBody": "...",
    "whatsappMessage": "..."
}
\`\`\`

**Begin!**

**Email Subject:** Rate Quote - {{quoteId}} - Shipping from {{rateDetails.origin}} to {{rateDetails.destination}}

**Email Body (HTML):**
\`\`\`html
<p>Dear {{customerName}},</p>

<p>We are pleased to provide you with a rate quote for your shipment:</p>

<ul>
    <li><strong>Origin:</strong> {{rateDetails.origin}}</li>
    <li><strong>Destination:</strong> {{rateDetails.destination}}</li>
    <li><strong>Carrier:</strong> {{rateDetails.carrier}}</li>
    <li><strong>Transit Time:</strong> {{rateDetails.transitTime}}</li>
    <li><strong>Final Price:</strong> {{rateDetails.finalPrice}}</li>
</ul>

<p>Please review the details and use the links below to proceed:</p>

<p><a href="{{approvalLink}}">Approve Quote</a> | <a href="{{rejectionLink}}">Reject Quote</a></p>

<p>If you have any questions, please do not hesitate to contact us.</p>

<p>Best regards,<br>Carga Inteligente Team</p>
\`\`\`

**WhatsApp Message:**
Dear {{customerName}}, we've sent you quote {{quoteId}} for USD {{rateDetails.finalPrice}} for shipment from {{rateDetails.origin}} to {{rateDetails.destination}}. Please review details and approve here: {{approvalLink}}
`,
});

const GenerateQuotePdfHtmlInputSchema = z.object({
    quoteNumber: z.string(),
    customerName: z.string(),
    date: z.string(),
    validity: z.string(),
    origin: z.string(),
    destination: z.string(),
    incoterm: z.string(),
    transitTime: z.string(),
    modal: z.string(),
    equipment: z.string(),
    freightCharges: z.array(z.object({
        name: z.string(),
        type: z.string(),
        currency: z.string(),
        total: z.string(),
    })),
    localCharges: z.array(z.object({
        name: z.string(),
        type: z.string(),
        currency: z.string(),
        total: z.string(),
    })),
    totalAllIn: z.string(),
    observations: z.string(),
});
  
const GenerateQuotePdfHtmlOutputSchema = z.object({
    html: z.string(),
});

export const generateQuotePdfHtmlPrompt = definePrompt({
  name: 'generate-quote-pdf-html',
  inputSchema: GenerateQuotePdfHtmlInputSchema,
  outputSchema: GenerateQuotePdfHtmlOutputSchema,
  prompt: `You are an expert in generating HTML content for a shipping quote PDF.
You will receive data about the quote and must return a complete, well-structured HTML document that is ready to be converted into a PDF.

**Instructions:**
1.  **Input:** You receive quote details including charges, dates, locations, and totals.
2.  **Output:** Generate a complete HTML document including:
    - Standard HTML structure (\`<html>\`, \`<head>\`, \`<body>\`).
    - All styles must be inline.
    - Structure the quote as a professional-looking document.
    - Include all data points provided.
    - The document must be in pt-BR (Brazilian Portuguese).
    - Use a clean, readable font (Arial, Helvetica or sans-serif).
    - Use a professional color palette.
3.  **Content Requirements:**
    - **Header:**
        - Quote Number: Display the quote number prominently.
        - Customer: Display the customer's name.
        - Date: Display the current date.
        - Validity: Display the quote's validity.
    - **Details:**
        - Origin and Destination: Clearly state the origin and destination.
        - Incoterm: Display the incoterm.
        - Transit Time: Display the transit time.
        - Modal: Display the transportation modal (Air/Sea).
        - Equipment: Display the equipment details.
    - **Charges:**
        - Freight Charges: List all freight charges with names, types, currencies, and totals.
        - Local Charges: List all local charges with names, types, currencies, and totals.
    - **Total:**
        - Display the total all-in price prominently.
    - **Observations:**
        - Include any relevant observations or disclaimers.
4.  **Formatting:**
    - All formatting must be inline CSS.
    - Use tables for structured data like charges.
    - Ensure the document is printer-friendly (A4 size, readable fonts).
5.  **Language:**
    - The document must be in pt-BR (Brazilian Portuguese).

**Example Input:**
\`\`\`json
{
    "quoteNumber": "Q-2024-001",
    "customerName": "Acme Corp",
    "date": "16/05/2024",
    "validity": "30 dias",
    "origin": "Shanghai",
    "destination": "Santos",
    "incoterm": "CIF",
    "transitTime": "35-40 dias",
    "modal": "Marítimo",
    "equipment": "40' HC",
    "freightCharges": [
        { "name": "Frete Marítimo", "type": "O/F", "currency": "USD", "total": "5.000,00" }
    ],
    "localCharges": [
        { "name": "THC", "type": "Local", "currency": "BRL", "total": "1.000,00" }
    ],
    "totalAllIn": "USD 5.000,00 + BRL 1.000,00",
    "observations": "Valores sujeitos a alteração sem aviso prévio."
}
\`\`\`

**Required Output Format:**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Proposta Comercial - Q-2024-001</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 12px;">

    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">Proposta Comercial - Q-2024-001</h1>
        <p><strong>Cliente:</strong> Acme Corp</p>
        <p><strong>Data:</strong> 16/05/2024</p>
        <p><strong>Validade:</strong> 30 dias</p>
    </div>

    <div style="margin-bottom: 20px;">
        <p><strong>Origem:</strong> Shanghai</p>
        <p><strong>Destino:</strong> Santos</p>
        <p><strong>Incoterm:</strong> CIF</p>
        <p><strong>Tempo de Trânsito:</strong> 35-40 dias</p>
        <p><strong>Modal:</strong> Marítimo</p>
        <p><strong>Equipamento:</strong> 40' HC</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Descrição</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Tipo</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Frete Marítimo</td>
                <td style="padding: 8px; border: 1px solid #ddd;">O/F</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">USD 5.000,00</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">THC</td>
                <td style="padding: 8px; border: 1px solid #ddd;">Local</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">BRL 1.000,00</td>
            </tr>
        </tbody>
    </table>

    <div style="font-size: 14px; margin-bottom: 20px;">
        <p style="font-weight: bold;">Total All-In: USD 5.000,00 + BRL 1.000,00</p>
    </div>

    <div style="font-size: 10px; color: #777;">
        <p><strong>Observações:</strong> Valores sujeitos a alteração sem aviso prévio.</p>
    </div>

</body>
</html>
\`\`\`

**Begin!**

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Proposta Comercial - {{quoteNumber}}</title>
</head>
<body style="font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #333;">

    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; font-size: 24px; margin-bottom: 5px;">Proposta Comercial - {{quoteNumber}}</h1>
        <p style="font-size: 14px; color: #777; margin: 5px 0;"><strong>Cliente:</strong> {{customerName}}</p>
        <p style="font-size: 14px; color: #777; margin: 5px 0;"><strong>Data:</strong> {{date}}</p>
        <p style="font-size: 14px; color: #777; margin: 5px 0;"><strong>Validade:</strong> {{validity}}</p>
    </div>

    <div style="margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 15px;">
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Origem:</strong> {{origin}}</p>
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Destino:</strong> {{destination}}</p>
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Incoterm:</strong> {{incoterm}}</p>
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Tempo de Trânsito:</strong> {{transitTime}}</p>
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Modal:</strong> {{modal}}</p>
        <p style="font-size: 16px; color: #555; margin: 5px 0;"><strong>Equipamento:</strong> {{equipment}}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
            <tr style="background-color: #f9f9f9;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Descrição</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tipo</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            {{#each freightCharges}}
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">{{name}}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{type}}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">{{currency}} {{total}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
            <tr style="background-color: #f9f9f9;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Descrição</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tipo</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            {{#each localCharges}}
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">{{name}}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{type}}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">{{currency}} {{total}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div style="font-size: 18px; color: #27ae60; font-weight: bold; text-align: right; margin-bottom: 20px;">
        Total All-In: {{totalAllIn}}
    </div>

    <div style="font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 15px;">
        <p>{{observations}}</p>
    </div>

</body>
</html>
`,
});

const ExtractPartnerInfoInputSchema = z.string();

const ExtractPartnerInfoOutputSchema = z.object({
    name: z.string(),
    cnpj: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        district: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
    }),
    contacts: z.array(z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
    })).optional(),
});

export const extractPartnerInfoPrompt = definePrompt({
    name: 'extract-partner-info',
    inputSchema: ExtractPartnerInfoInputSchema,
    outputSchema: ExtractPartnerInfoOutputSchema,
    prompt: `You are an expert AI in extracting partner information from unstructured text.
Given a text containing information about a partner (customer, supplier, agent, etc.), you will extract the partner's name, CNPJ (if available), address, and contact information.

**Instructions:**
1.  **Input:** You will receive a text string containing partner information. This could be an email signature, a business card, or any other form of unstructured text.
2.  **Output:** You must return a JSON object containing the extracted information.
3.  **Content Requirements:**
    - **name:** The full name of the partner.
    - **cnpj:** The CNPJ of the partner, if available.
    - **address:** An object containing the partner's address details (street, number, complement, district, city, state, zip, country).
    - **contacts:** An array of objects, each containing the name, email, and phone number of a contact person.
4.  **Formatting:**
    - The output must be a valid JSON object.
    - All fields are optional, but you should try to extract as much information as possible.
    - If a field is not available, leave it blank ("").
    - If the address is not clearly defined, try to extract as much information as possible and leave the rest blank.
    - If no contacts are found, return an empty array for the contacts field.

**Example Input:**
\`\`\`text
Acme Corp
CNPJ: 12.345.678/0001-90
Rua da Carga, 123
Sala 45, Centro
São Paulo, SP
01001-000
Brasil

João da Silva
joao@acmecorp.com
+55 11 91234-5678
\`\`\`

**Required Output Format:**
\`\`\`json
{
    "name": "Acme Corp",
    "cnpj": "12.345.678/0001-90",
    "address": {
        "street": "Rua da Carga",
        "number": "123",
        "complement": "Sala 45",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zip": "01001-000",
        "country": "Brasil"
    },
    "contacts": [
        {
            "name": "João da Silva",
            "email": "joao@acmecorp.com",
            "phone": "+55 11 91234-5678"
        }
    ]
}
\`\`\`

**Begin!**
`,
});
