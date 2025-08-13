// background.ts
interface StoredData {
  lastSelected?: string;
}

// Создаем контекстное меню при установке
chrome.runtime.onInstalled.addListener((): void => {
  chrome.contextMenus.create({
    id: "sendToWindow",
    title: "Отправить QA-ассистенту",
    contexts: ["selection"]
  });
});

// Обработка клика в контекстном меню
chrome.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData): Promise<void> => {
  if (info.menuItemId === "sendToWindow") {
    const selectedText: string | undefined = info.selectionText;
    
    if (selectedText) {
      // Сохраняем текст
      const dataToStore: StoredData = { lastSelected: selectedText };
      await chrome.storage.local.set(dataToStore);
    }
    
    // Открываем отдельное окно
    chrome.windows.create({
      url: chrome.runtime.getURL("dist/workspace.html"),
      type: "popup",
      width: 600,
      height: 800,
      left: 200,
      top: 200
    });
  }
});