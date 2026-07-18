import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getResponse(userId: string, prompt: string): Promise<string> {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      return 'Disculpa, el asistente financiero no está configurado (falta la API Key de Gemini en el servidor).';
    }

    try {
      const [transactions, goals, user] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId },
          take: 10,
          orderBy: { date: 'desc' },
          include: { category: true },
        }),
        this.prisma.goal.findMany({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
      ]);

      const txSummary = transactions
        .map(
          (t) =>
            `- ${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: $${t.amount} en ${
              t.category?.name || 'Otro'
            } (${t.description || 'Sin nota'}) el ${
              t.date.toISOString().split('T')[0]
            }`
        )
        .join('\n');

      const goalsSummary = goals
        .map(
          (g) =>
            `- Meta: ${g.name}, Objetivo: $${g.targetAmount}, Ahorrado: $${g.currentAmount}`
        )
        .join('\n');

      const systemPrompt = `Eres un asesor financiero personal e inteligente para la aplicación FinSense.
El usuario se llama ${user?.name || 'Usuario'} y vive en ${
        user?.city || 'Tuxtla Gutiérrez'
      }.

TRANSACCIONES RECIENTES:
${txSummary || 'No hay transacciones registradas.'}

METAS DE AHORRO:
${goalsSummary || 'No hay metas de ahorro registradas.'}

Instrucciones:
1. Responde de forma concisa, útil y motivadora.
2. Si el usuario te pide crear un gasto/ingreso o una meta, usa las herramientas correspondientes para realizar la acción directamente.`;

      const tools = [
        {
          functionDeclarations: [
            {
              name: 'createTransaction',
              description: 'Registra una nueva transacción (gasto o ingreso) en el sistema para el usuario.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  amount: { type: 'NUMBER', description: 'El monto de la transacción.' },
                  type: { type: 'STRING', description: 'El tipo de transacción: expense (gasto) o income (ingreso).' },
                  categoryName: { type: 'STRING', description: 'El nombre de la categoría en español (Alimentacion, Transporte, Salud, Educacion, Entretenimiento, Servicios, Ropa, Ahorro).' },
                  description: { type: 'STRING', description: 'Descripción o nota corta sobre la transacción.' }
                },
                required: ['amount', 'type', 'categoryName']
              }
            },
            {
              name: 'createGoal',
              description: 'Crea una nueva meta de ahorro en el sistema para el usuario.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: 'El nombre o título de la meta (ej: Laptop, Viaje, Fondo de Emergencia).' },
                  targetAmount: { type: 'NUMBER', description: 'Monto total objetivo a ahorrar.' },
                  emoji: { type: 'STRING', description: 'Emoji representativo para la meta.' }
                },
                required: ['name', 'targetAmount']
              }
            }
          ]
        }
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nPregunta: ${prompt}` }],
              },
            ],
            tools: tools
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const part = data?.candidates?.[0]?.content?.parts?.[0];

      if (part?.functionCall) {
        const { name, args } = part.functionCall;

        if (name === 'createTransaction') {
          // Normalize and find category
          let category = await this.prisma.category.findFirst({
            where: { name: { contains: args.categoryName } }
          });

          if (!category) {
            category = await this.prisma.category.findFirst({
              where: { name: 'Ahorro' }
            });
          }

          await this.prisma.transaction.create({
            data: {
              userId,
              amount: args.amount,
              type: args.type === 'income' ? 'income' : 'expense',
              categoryId: category?.id,
              description: args.description || 'Registrado por el Asistente IA',
              date: new Date()
            }
          });

          return `¡Claro! He registrado tu ${args.type === 'income' ? 'ingreso' : 'gasto'} de $${args.amount} en la categoría **${category?.name || 'Ahorro'}** con la nota: *"${args.description || 'Sin nota'}"*. ¡Ya está reflejado en tu cuenta!`;
        }

        if (name === 'createGoal') {
          await this.prisma.goal.create({
            data: {
              userId,
              name: args.name,
              targetAmount: args.targetAmount,
              currentAmount: 0,
              icon: args.emoji || '🎯',
              color: '#8B5CF6'
            }
          });

          return `¡Entendido! He creado tu nueva meta de ahorro llamada **${args.name}** con un objetivo de **$${args.targetAmount}** y el emoji ${args.emoji || '🎯'}. ¡Mucho éxito en alcanzarla!`;
        }
      }

      return part?.text || 'No he podido procesar tu solicitud en este momento.';
    } catch (error: any) {
      console.error('Error calling Gemini API:', error);
      if (error?.message?.includes('429')) {
        return 'Estoy procesando muchas cosas a la vez debido al límite de la versión gratuita. Por favor, dame unos segundos de respiro y vuelve a intentarlo.';
      }
      return 'Lo siento, hubo un error al consultar con el asistente financiero.';
    }
  }

  async getAdvisorTip(userId: string): Promise<string> {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      return 'Guarda dinero para el pozol del fin de semana.';
    }

    try {
      const [transactions, goals, user] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId },
          take: 20,
          orderBy: { date: 'desc' },
          include: { category: true },
        }),
        this.prisma.goal.findMany({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
      ]);

      const txSummary = transactions
        .map(
          (t) =>
            `- ${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: $${t.amount} en ${
              t.category?.name || 'Otro'
            } (${t.description || ''})`
        )
        .join('\n');

      const goalsSummary = goals
        .map(
          (g) =>
            `- Meta: ${g.name}, Objetivo: $${g.targetAmount}, Ahorrado: $${g.currentAmount}`
        )
        .join('\n');

      const systemPrompt = `Eres un asesor financiero personal e inteligente para la aplicación FinSense.
El usuario se llama ${user?.name || 'Usuario'} y vive en ${user?.city || 'Tuxtla Gutiérrez'}.

TRANSACCIONES RECIENTES:
${txSummary || 'No hay transacciones registradas.'}

METAS DE AHORRO:
${goalsSummary || 'No hay metas de ahorro registradas.'}

Instrucciones:
Analiza los datos y genera un único consejo financiero súper conciso (máximo 140 caracteres) para el usuario.
Debe ser informal y motivador, enfocado en jóvenes de Chiapas, haciendo referencias divertidas pero útiles al contexto local (como el costo del pasaje de colectivo, ir por un pozol frío para el calor en lugar de gastar en refrescos caros, etc.) o a sus metas de ahorro activas si las tiene.
¡IMPORTANTE! No utilices NINGÚN emoji en tu respuesta. Manténla en un único párrafo de texto directo.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() || '¡Ahorra en refrescos y ve por un pozol frío en el mercado!';
    } catch (error) {
      console.error('Error getting advisor tip from Gemini:', error);
      return 'Evita gastar de más en salidas y prioriza tu meta de ahorro activa.';
    }
  }
  async getSuggestedPrompts(userId: string): Promise<string[]> {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      return ['¿Cómo puedo ahorrar más?', 'Registra un gasto', '¿Cuál es el estado de mis metas?'];
    }

    try {
      const [transactions, goals, user] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId },
          take: 10,
          orderBy: { date: 'desc' },
          include: { category: true },
        }),
        this.prisma.goal.findMany({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
      ]);

      const txSummary = transactions
        .map((t) => `- ${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: $${t.amount} en ${t.category?.name || 'Otro'} (${t.description || ''})`)
        .join('\n');

      const goalsSummary = goals
        .map((g) => `- Meta: ${g.name}, Objetivo: $${g.targetAmount}, Ahorrado: $${g.currentAmount}`)
        .join('\n');

      const systemPrompt = `Eres el sistema que genera sugerencias de interacción para el Asistente FinSense.
El usuario se llama ${user?.name || 'Usuario'}.

TRANSACCIONES RECIENTES:
${txSummary || 'No hay transacciones registradas.'}

METAS DE AHORRO:
${goalsSummary || 'No hay metas de ahorro registradas.'}

Instrucciones:
Genera exactamente 3 preguntas cortas (máximo 8 palabras cada una) que el usuario podría hacerle a su asistente financiero.
Devuelve el resultado en formato JSON como un array de strings: ["Pregunta 1", "Pregunta 2", "Pregunta 3"].
No incluyas markdown, solo el arreglo de strings.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      try {
        let cleanText = text?.trim() || '';
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.substring(7, cleanText.length - 3).trim();
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.substring(3, cleanText.length - 3).trim();
        }
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0,3);
      } catch (e) {
        console.error('Error parsing JSON from Gemini suggestions:', e);
      }
      return ['¿Cómo puedo ahorrar más?', 'Analiza mis gastos', '¿Qué opinas de mis metas?'];
    } catch (error) {
      console.error('Error getting suggested prompts from Gemini:', error);
      return ['¿Cómo puedo ahorrar más?', 'Registra un gasto', 'Resumen de mi cuenta'];
    }
  }

  async scanReceipt(imageBase64: string): Promise<{ amount?: number; description?: string; date?: string; category?: string }> {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) return {};

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Analiza este ticket de compra y extrae: el monto total (solo número), descripción del negocio o compra, fecha si está visible, y categoría probable (Alimentación, Transporte, Entretenimiento, Servicios, Salud, Ropa, u Otro). Responde SOLO en JSON con campos: amount (number), description (string), date (string ISO o null), category (string).' },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
              ]
            }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 256 }
          }),
        }
      );
      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      return JSON.parse(text);
    } catch (e) {
      console.error('OCR error:', e);
      return {};
    }
  }

  async analyzeChart(userId: string, chartData: any[]): Promise<string> {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      return 'Disculpa, la integración con IA no está configurada.';
    }

    try {
      const dataStr = JSON.stringify(chartData, null, 2);
      
      const systemPrompt = `Eres un experto analista financiero.
A continuación te proporciono los datos de una gráfica de ingresos y gastos semanales o mensuales.
Tu objetivo es analizar estos datos y proporcionar un resumen detallado y útil para el usuario.
Identifica tendencias (por ejemplo, "Tus gastos superaron tus ingresos en la semana 2"), picos inusuales, y brinda una breve recomendación financiera basada en los datos.

Datos de la gráfica:
${dataStr}

Instrucciones:
1. Sé conciso y directo, sin usar formato markdown complejo.
2. Da 2 a 3 puntos clave sobre las tendencias.
3. Termina con un consejo práctico breve.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return text || 'No pude analizar la gráfica en este momento.';
    } catch (error) {
      console.error('Error analyzing chart with Gemini:', error);
      return 'Ocurrió un error al procesar tu solicitud de análisis.';
    }
  }
}
