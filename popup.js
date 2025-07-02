document.addEventListener('DOMContentLoaded', () => {
  const textArea = document.getElementById('textArea');
  const processBtn = document.getElementById('processBtn');

  chrome.storage.local.get('selectedText', (data) => {
    if (data.selectedText) {
      textArea.value = data.selectedText;
    }
  });

  processBtn.addEventListener('click', () => {
    const text = textArea.value;
    // Здесь ваша логика обработки текста
    alert("Обрабатываем текст:\n" + text);
  });
});
