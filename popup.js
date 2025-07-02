document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const responseDiv = document.getElementById('response');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');


    // Подгружаем последний выделенный текст
    chrome.storage.local.get(['lastSelected'], (result) => {
        if (result.lastSelected) {
            input.value = result.lastSelected;
        }
    });

    sendButton.addEventListener('click', async () => {
        const userInput = input.value.trim();
        if (!userInput) {
            responseDiv.textContent = "Введите текст.";
            return;
        }

        responseDiv.textContent = "Ожидание ответа...";

        const payload = {
            model: 'mistral:latest',
            messages: [
                {
                    role: 'user',
                    content: userInput
                }
            ]
        };

        try {
            const res = await fetch('http://127.0.0.1:5000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Ошибка: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            const reply = data.message?.content || "Ответа нет.";
            responseDiv.textContent = reply;

        } catch (error) {
            responseDiv.textContent = "Ошибка запроса: " + error.message;
        }
    });
    // Обработчик кнопки "Очистить"
    clearButton.addEventListener('click', () => {
        input.value = ''; // Очищаем поле ввода
        responseDiv.textContent = "Ответ появится здесь..."; // Сбрасываем поле ответа
        chrome.storage.local.remove('lastSelected'); // Удаляем сохраненный текст
    });
});
