// Функция для стриминга ответа от Ollama
async function streamOllamaResponse(prompt, responseElement, thinking = true) {
    // Сразу очищаем поле ответа и показываем статус
    responseElement.innerText = 'Взял в работу...';

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer <<api-key>",
                "X-Title": "Your Site Name",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // model: "qwen/qwen3-coder:free",
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
                        const parsed = JSON.parse(dataStr);
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
        responseElement.innerText = "Не удалось получить ответ от модели.\n" + error.message;
    }
}

function getPrompt(type_prompt) {
    let prompt = {
        "testcase": "Ты опытный тестировщик ПО::Создай как можно больше тест-кейсов (положительные и негативные сценарии) по заданному требованию к ПО::ТРЕБОВАНИЕ: {requirement}::Пример: Пример: Тест-кейс 1. Проверка наличия окна приветствия\n Шаги\n 1. Авторизоваться под пользователем\n 2. Перейти в оглавление\n Ожидаемый результат: надпись приветствие\n\n::В ответе только результат без лишнего текста. Не надо размечать его markdown",
        "checklist": "Ты опытный тестировщик ПО::Создай как можно подробный чек-лист (положительные и негативные сценарии) по заданному требованию к ПО::ТРЕБОВАНИЕ: {requirement}::Пример: Пример: Проверка 1. Проверка наличия окна приветствия\n Проверка 2. Перейти в оглавление и проверить кнопку\n::В ответе только результат без лишнего текста. Не надо размечать его markdown",
    }
    return prompt[type_prompt]
};


document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const responseDiv = document.getElementById('response');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');
    const copyButton = document.getElementById('copy');
    let finalPrompt;



    // Подгружаем последний выделенный текст (эта логика остается)
    chrome.storage.local.get(['lastSelected'], (result) => {
        if (result.lastSelected) {
            input.value = result.lastSelected;
        }
    });

    // Обработчик кнопки "Отправить" - ТЕПЕРЬ С ЛОГИКОЙ СТРИМИНГА
    sendButton.addEventListener('click', async () => {
        const userInput = input.value.trim();
        if (!userInput) {
            responseDiv.textContent = "Введите текст.";
            return;
        }

        const checkListChecked = document.getElementById('checklist-toggle').checked;
        const thinkingChecked = document.getElementById('thinking-toggle').checked;

        // Формируем финальный промпт для Ollama на основе ввода и чекбокса
        if (checkListChecked) {
            finalPrompt = getPrompt('checklist').replace('{requirement}', userInput);
        } else {
            finalPrompt = getPrompt('testcase').replace('{requirement}', userInput);
        };


        responseDiv.textContent = "Генерация ответа..."; // Начальное сообщение

        // Вызываем нашу новую функцию для стриминга
        await streamOllamaResponse(finalPrompt, responseDiv, thinkingChecked);
    });

    // Обработчик кнопки "Очистить" (без изменений)
    clearButton.addEventListener('click', () => {
        input.value = '';
        responseDiv.textContent = "Ответ появится здесь...";
        chrome.storage.local.remove('lastSelected');
    });

    // Обработчик кнопки "Копировать" (адаптирован для копирования текста)
    copyButton.addEventListener('click', () => {
        const textToCopy = responseDiv.innerText;
        if (textToCopy && textToCopy !== "Ответ появится здесь..." && textToCopy !== "Введите текст.") {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyButton.textContent = "Скопировано!";
                setTimeout(() => { copyButton.textContent = "Копировать результат"; }, 2000);
            }).catch(err => {
                console.error('Ошибка при копировании: ', err);
            });
        }
    });
});

// Функция formatTestCases больше не нужна, она удалена.
