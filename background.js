chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "sendToOllama",
        title: "Отправить в Ollama",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "sendToOllama") {
        const selectedText = info.selectionText;
        chrome.storage.local.set({ lastSelected: selectedText }, () => {
            console.log("Сохранённый текст:", selectedText);
        });
        chrome.action.openPopup();
    }
});

