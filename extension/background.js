// Создаем контекстное меню при установке
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToWindow",
    title: "Отправить QA-ассистенту",
    contexts: ["selection"]
  });
});

// Обработка клика в контекстном меню
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "sendToWindow") {
    const selectedText = info.selectionText;
    
    // Сохраняем текст
    await chrome.storage.local.set({ lastSelected: selectedText });
    
    // Открываем отдельное окно
    chrome.windows.create({
      url: chrome.runtime.getURL("workspace.html"),
      type: "popup",
      width: 600,
      height: 800,
      left: 200,
      top: 200
    });
  }
});