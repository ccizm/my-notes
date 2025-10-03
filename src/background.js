// background.js
// 处理扩展按钮点击事件
chrome.action.onClicked.addListener(() => {
  // 打开新标签页并加载note-app.html
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/note-app.html')
  });
});