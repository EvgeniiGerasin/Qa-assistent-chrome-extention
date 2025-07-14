// Функция для стриминга ответа от Ollama
async function streamOllamaResponse(prompt, responseElement, thinking) {
    // Сразу очищаем поле ответа перед началом
    responseElement.innerText = 'Взял в работу...';

    var body;
    if (thinking) {
        body = JSON.stringify({
            model: 'deepseek-r1',
            prompt: prompt,
            stream: true,
        });
    } else {
        body = JSON.stringify({
            model: 'deepseek-r1',
            prompt: prompt,
            stream: true,
            think: false,
        });
    };

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body
        });

        // Очистка поля для вывода ответа
        responseElement.innerText = '';

        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const jsonObjects = chunk.split('\n').filter(s => s.trim() !== '');

            for (const jsonObjStr of jsonObjects) {
                try {
                    const parsed = JSON.parse(jsonObjStr);
                    if (parsed.response) {
                        // Просто добавляем сырой текст в элемент
                        responseElement.innerText += parsed.response;
                    }
                    if (parsed.done) {
                        return; // Завершаем, когда модель закончила генерацию
                    }
                } catch (e) {
                    console.error("Ошибка парсинга JSON фрагмента:", jsonObjStr);
                }
            }
        }
    } catch (error) {
        console.error("Ошибка при стриминге ответа:", error);
        responseElement.innerText = "Не удалось получить ответ от Ollama. Убедитесь, что сервер запущен.\n" + error.message;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const responseDiv = document.getElementById('response');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');
    const copyButton = document.getElementById('copy');

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
        let finalPrompt;
        if (checkListChecked) {
            finalPrompt = `Создай чек-лист для следующего требования: "${userInput}"`;
        } else {
            finalPrompt = `Создай тест-кейс для следующего требования: "${userInput}"`;
        }

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
