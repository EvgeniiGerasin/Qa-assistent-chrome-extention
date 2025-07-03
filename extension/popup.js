document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    const responseDiv = document.getElementById('response');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');
    const copyButton = document.getElementById('copy');


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

        // Получаем состояние чекбокса
        const checkListChecked = document.getElementById('checklist-toggle').checked;

        responseDiv.textContent = "Ожидание ответа...";

        const payload = {
            requirement: userInput,
            check_list: checkListChecked
        };

        try {
            const res = await fetch('http://127.0.0.1:8000/generate-test-cases/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Ошибка: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            // Вариант 1: Если сервер возвращает { models: [] }
            if (data.models) {
                responseDiv.textContent = `${data.models.join(', ')}`;
            }
            // Вариант 2: Если сервер возвращает { message: string }
            else if (data.message) {
                responseDiv.textContent = data.message;
            }
            // Вариант 3: Другой формат ответа
            else {
                responseDiv.textContent = `${JSON.stringify(data)}`;
            }

        } catch (error) {
            console.error("Ошибка запроса:", error);
            responseDiv.textContent = "Ошибка запроса: " + error.message;
        }
    });
    // Обработчик кнопки "Очистить"
    clearButton.addEventListener('click', () => {
        input.value = ''; // Очищаем поле ввода
        responseDiv.textContent = "Ответ появится здесь..."; // Сбрасываем поле ответа
        chrome.storage.local.remove('lastSelected'); // Удаляем сохраненный текст
    });

    // Обработчик кнопки "Копировать"
    copyButton.addEventListener('click', () => {
        // Проверяем, есть ли что копировать
        if (responseDiv.textContent &&
            responseDiv.textContent !== "Ответ появится здесь..." &&
            responseDiv.textContent !== "Ожидание ответа..." &&
            responseDiv.textContent !== "Введите текст.") {

            // Используем Clipboard API для копирования
            navigator.clipboard.writeText(responseDiv.textContent)
                .then(() => {
                    // Временно меняем текст кнопки для подтверждения
                    copyButton.textContent = "Скопировано!";
                    setTimeout(() => {
                        copyButton.textContent = "Копировать результат";
                    }, 2000);
                })
                .catch(err => {
                    console.error('Ошибка при копировании: ', err);
                    copyButton.textContent = "Ошибка копирования";
                    setTimeout(() => {
                        copyButton.textContent = "Копировать результат";
                    }, 2000);
                });
        }
    });
});
