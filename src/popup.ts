import { getPrompt, formatPrompt } from "./prompts";

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

interface PromptType {
  [key: string]: string;
}

// Функция для стриминга ответа от OpenRouter
async function streamOpenRouterResponse(
  prompt: string, 
  responseElement: HTMLElement, 
  thinking: boolean = true
): Promise<void> {
  // Сразу очищаем поле ответа и показываем статус
  responseElement.innerText = 'Взял в работу...';

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer <<api-key>>",
        "X-Title": "Your Site Name",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [
          { role: "user", content: prompt }
        ],
        stream: true  // Включаем стриминг
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API: ${response.status} ${response.statusText} — ${errorText}`);
    }

    // Очистим поле после подтверждения успешного ответа
    responseElement.innerText = '';

    if (!response.body) {
      throw new Error("Ответ не содержит тела");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim(); // Убираем "data:"
          if (dataStr === "[DONE]") {
            return; // Стриминг завершён
          }

          try {
            const parsed: OpenRouterResponse = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              responseElement.innerText += content;
            }
          } catch (e) {
            // Игнорируем ошибки парсинга отдельных фрагментов
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

    const checkListChecked = checklistToggle.checked;
    const thinkingChecked = thinkingToggle.checked;

    // Формируем финальный промпт
    if (checkListChecked) {
      const basePrompt = getPrompt('checklist')
      finalPrompt = formatPrompt(basePrompt, {requirement: userInput});
    } else {
      const basePrompt = getPrompt('testcase')
      finalPrompt = formatPrompt(basePrompt, {requirement: userInput});
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