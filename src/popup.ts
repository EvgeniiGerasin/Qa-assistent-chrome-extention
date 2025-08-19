import { getPrompt, formatPrompt } from "./prompts.js";

interface StoredData {
  lastSelected?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

// Функция для стриминга ответа от OpenRouter
async function streamOpenRouterResponse(
  prompt: string,
  responseElement: HTMLElement,
  thinking: boolean = true
): Promise<void> {
  responseElement.innerText = 'Взял в работу...';

  try {
    const data = await fetch('./keys.json');
    const keys = await data.json();
    const apiKey = keys.openrouter_api_key;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Title": "Your Site Name",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free", 
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API: ${response.status} ${response.statusText} — ${errorText}`);
    }

    responseElement.innerText = '';

    if (!response.body) {
      throw new Error("Ответ не содержит тела");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Оставляем последнюю неполную строку в буфере
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith("data: ")) {
          const dataStr = trimmedLine.slice(6); // Убираем "data: "
          
          if (dataStr === "[DONE]") {
            return;
          }

          if (dataStr === "") {
            continue; // Пропускаем пустые строки
          }

          try {
            const parsed: OpenRouterResponse = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              responseElement.innerText += content;
            }
          } catch (e) {
            console.warn("Не удалось распарсить SSE-фрагмент:", dataStr);
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка при стриминге ответа:", error);
    if (error instanceof Error) {
      responseElement.innerText = "Не удалось получить ответ от модели.\n" + error.message;
    } else {
      responseElement.innerText = "Не удалось получить ответ от модели.";
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('input') as HTMLInputElement | null;
  const responseDiv = document.getElementById('response') as HTMLDivElement | null;
  const sendButton = document.getElementById('send') as HTMLButtonElement | null;
  const clearButton = document.getElementById('clear') as HTMLButtonElement | null;
  const copyButton = document.getElementById('copy') as HTMLButtonElement | null;
  const checklistToggle = document.getElementById('checklist-toggle') as HTMLInputElement | null;
  const thinkingToggle = document.getElementById('thinking-toggle') as HTMLInputElement | null;

  let finalPrompt: string;

  // Проверяем, что все элементы существуют
  if (!input || !responseDiv || !sendButton || !clearButton || !copyButton || !checklistToggle || !thinkingToggle) {
    console.error("Не удалось найти все необходимые элементы DOM");
    return;
  }

  // Подгружаем последний выделенный текст
  chrome.storage.local.get(['lastSelected'], (result: StoredData) => {
    if (result.lastSelected) {
      input.value = result.lastSelected;
    }
  });

  // Обработчик кнопки "Отправить"
  sendButton.addEventListener('click', async () => {
    const userInput = input.value.trim();
    if (!userInput) {
      responseDiv.textContent = "Введите текст.";
      return;
    }

    const checkListChecked = true;
    const thinkingChecked = thinkingToggle.checked;

    // Формируем финальный промпт
    if (checkListChecked) {
      const basePrompt = getPrompt('checklist')
      finalPrompt = formatPrompt(basePrompt, { requirement: userInput });
    } else {
      const basePrompt = getPrompt('testcase')
      finalPrompt = formatPrompt(basePrompt, { requirement: userInput });
    }

    responseDiv.textContent = "Генерация ответа..."; // Начальное сообщение

    // Вызываем функцию для стриминга
    await streamOpenRouterResponse(finalPrompt, responseDiv, thinkingChecked);
  });

  // Обработчик кнопки "Очистить"
  clearButton.addEventListener('click', () => {
    input.value = '';
    responseDiv.textContent = "Ответ появится здесь...";
    chrome.storage.local.remove('lastSelected');
  });

  // Обработчик кнопки "Копировать"
  copyButton.addEventListener('click', () => {
    const textToCopy = responseDiv.innerText;
    if (textToCopy && textToCopy !== "Ответ появится здесь..." && textToCopy !== "Введите текст.") {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = "Скопировано!";
        setTimeout(() => {
          if (copyButton) {
            copyButton.textContent = originalText || "Копировать результат";
          }
        }, 2000);
      }).catch(err => {
        console.error('Ошибка при копировании: ', err);
      });
    }
  });
});