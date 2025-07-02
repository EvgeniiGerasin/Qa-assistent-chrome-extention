chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendText",
    title: "Отправить текст в расширение",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendText" && info.selectionText) {
    chrome.storage.local.set({ selectedText: info.selectionText }, () => {
      console.log("Текст сохранён:", info.selectionText);
    });
    chrome.action.openPopup();
  }
});
