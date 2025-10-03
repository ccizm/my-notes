/**
 * 网页笔记扩展内容脚本
 * 负责在网页中创建悬浮按钮和管理笔记应用iframe
 */

// 动态引入 FontAwesome CSS
function loadFontAwesome() {
  // 检查是否已经加载了 FontAwesome
  if (document.getElementById('font-awesome-css')) {
    return;
  }
  
  const link = document.createElement('link');
  link.id = 'font-awesome-css';
  link.rel = 'stylesheet';
  // 使用CDN引入FontAwesome，确保在任何网页环境下都能正常加载
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  document.head.appendChild(link);
}

/**
 * 全局状态管理
 */
// 当前笔记应用的iframe实例
let currentIframe = null;
// 弹窗容器元素
let popupContainer = null;

/**
 * 创建悬浮窗按钮
 * 在页面右下角创建一个固定位置的笔记按钮
 */
function createFloatingButton() {
  // 创建按钮元素
  const button = document.createElement('button');
  button.id = 'web-notes-floating-button';
  button.title = '添加笔记（拖拽可移动位置）';
  
  // 创建 FontAwesome 图标
  const icon = document.createElement('i');
  icon.className = 'fas fa-edit';
  button.appendChild(icon);
  
  // 设置按钮样式
  // 先读取本地存储的位置，如果没有则使用默认位置
  const savedPosition = localStorage.getItem('web-notes-button-position');
  let bottom = '150px';
  let right = '10px';
  
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition);
      if (pos.bottom) bottom = pos.bottom;
      if (pos.right) right = pos.right;
    } catch (e) {
      console.error('Failed to parse saved button position:', e);
    }
  }
  
  button.style.cssText = `
    position: fixed;
    bottom: ${bottom};
    right: ${right};
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #4285f4;
    color: white;
    font-size: 18px;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    transition: background-color 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // 设置图标样式
  icon.style.cssText = `
    font-size: 14px;
  `;
  
  // 添加悬停效果
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#2c74f3';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#4285f4';
  });
  
  // 用于区分点击和拖动的变量
  let startX, startY;
  let isClick = true;
  
  // 鼠标按下事件
  button.addEventListener('mousedown', (e) => {
    // 记录鼠标按下位置
    startX = e.clientX;
    startY = e.clientY;
    isClick = true;
  });
  
  // 鼠标移动事件 - 用于检测是否为点击还是拖动
  document.addEventListener('mousemove', (e) => {
    // 如果鼠标按下并且位置发生了明显变化，则认为是拖动
    if (startX !== undefined && startY !== undefined) {
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);
      
      // 如果移动距离超过5像素，则认为是拖动，不是点击
      if (diffX > 5 || diffY > 5) {
        isClick = false;
      }
    }
  });
  
  // 鼠标释放事件 - 重置变量
  document.addEventListener('mouseup', () => {
    startX = undefined;
    startY = undefined;
  });
  
  // 添加点击事件 - 切换笔记应用显示状态
  button.addEventListener('click', () => {
    // 只有当确认是点击而不是拖动时，才切换笔记应用显示状态
    if (isClick) {
      toggleNoteApp();
    }
  });
  
  // 添加拖拽功能
  let isDragging = false;
  let offsetX, offsetY;
  
  button.addEventListener('mousedown', (e) => {
    // 如果是右键点击，则不触发拖拽
    if (e.button === 2) return;
    
    isDragging = true;
    
    // 计算鼠标相对于按钮左上角的偏移量
    const rect = button.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // 改变鼠标样式
    document.body.style.cursor = 'move';
    button.style.cursor = 'move';
    
    // 提高z-index，确保拖拽时在最上层
    const originalZIndex = button.style.zIndex;
    button.style.zIndex = '10001';
    
    // 阻止默认行为和冒泡
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 鼠标移动时更新按钮位置
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // 计算新的位置
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 确保按钮不会超出视口
    let newRight = viewportWidth - (e.clientX - offsetX) - button.offsetWidth;
    let newBottom = viewportHeight - (e.clientY - offsetY) - button.offsetHeight;
    
    // 设置最小边距，确保按钮不会完全贴边
    newRight = Math.max(10, Math.min(newRight, viewportWidth - 40));
    newBottom = Math.max(10, Math.min(newBottom, viewportHeight - 40));
    
    // 更新按钮位置
    button.style.right = newRight + 'px';
    button.style.bottom = newBottom + 'px';
    
    // 阻止默认行为
    e.preventDefault();
  });
  
  // 鼠标释放时结束拖拽
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 恢复鼠标样式
    document.body.style.cursor = '';
    button.style.cursor = 'pointer';
    button.style.zIndex = '10000';
    
    // 自动吸附到左右两边
    const viewportWidth = window.innerWidth;
    const rect = button.getBoundingClientRect();
    const buttonCenterX = rect.left + rect.width / 2;
    const viewportHalf = viewportWidth / 2;
    
    // 添加吸附过渡动画
    button.style.transition = 'right 0.3s ease';
    
    // 如果按钮中心点在左半边，则吸附到左侧；否则吸附到右侧
    if (buttonCenterX < viewportHalf) {
      // 吸附到左侧（由于我们使用right属性定位，所以需要计算从右侧到左侧的距离）
      button.style.right = (viewportWidth - 40) + 'px'; // 40 = 按钮宽度 + 边距
    } else {
      // 吸附到右侧，保持固定右边距
      button.style.right = '10px';
    }
    
    // 等待吸附动画完成后保存位置
    setTimeout(() => {
      // 保存位置到本地存储
      const position = {
        bottom: button.style.bottom,
        right: button.style.right
      };
      localStorage.setItem('web-notes-button-position', JSON.stringify(position));
      
      // 移除过渡效果，避免正常点击时的延迟
      button.style.transition = '';
    }, 300);
  });
  
  // 添加到页面
  document.body.appendChild(button);
}

/**
 * 创建弹窗容器
 * 创建用于显示笔记应用的弹窗容器
 * @returns {HTMLElement} 弹窗容器元素
 */
function createPopupContainer() {
  // 如果容器已存在，直接返回
  if (popupContainer) {
    return popupContainer;
  }
  
  // 创建容器元素
  popupContainer = document.createElement('div');
  popupContainer.id = 'web-notes-popup-container';
  
  // 设置容器样式
  popupContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.2s ease;
  `;
  
  // 添加点击事件 - 点击容器背景关闭笔记应用
  popupContainer.addEventListener('click', (e) => {
    if (e.target === popupContainer) {
      closeNoteApp();
    }
  });
  
  // 添加到页面
  document.body.appendChild(popupContainer);
  return popupContainer;
}

/**
 * 切换笔记应用显示状态
 * 切换笔记应用的显示/隐藏状态
 */
function toggleNoteApp() {
  const container = createPopupContainer();
  
  if (container.style.display === 'flex') {
    // 如果已经显示，则关闭
    closeNoteApp();
  } else {
    // 如果已经隐藏，则显示
    showNoteApp();
  }
}

/**
 * 显示笔记应用
 * 显示笔记应用弹窗
 */
function showNoteApp() {
  const container = createPopupContainer();
  container.style.display = 'flex';
  
  // 触发淡入动画
  setTimeout(() => {
    container.style.opacity = '1';
    if (currentIframe) {
      currentIframe.style.transform = 'scale(1)';
      currentIframe.style.opacity = '1';
    }
  }, 10);
  
  // 隐藏悬浮按钮
  const floatingButton = document.getElementById('web-notes-floating-button');
  if (floatingButton) {
    floatingButton.style.display = 'none';
  }
  
  // 发送当前页面URL到iframe
  sendPageUrlToIframe();
}

/**
 * 关闭笔记应用
 * 关闭笔记应用弹窗并移除iframe以节省内存
 */
function closeNoteApp() {
  const container = document.getElementById('web-notes-popup-container');
  if (container) {
    // 触发淡出动画
    container.style.opacity = '0';
    if (currentIframe) {
      currentIframe.style.transform = 'scale(0.95)';
      currentIframe.style.opacity = '0';
    }
    
    // 等待动画完成后再隐藏容器和移除iframe
    setTimeout(() => {
      container.style.display = 'none';
      
      // 移除iframe并重置currentIframe，节省内存
      if (currentIframe) {
        if (currentIframe.parentNode) {
          currentIframe.parentNode.removeChild(currentIframe);
        }
        currentIframe = null;
      }
      
      // 显示悬浮按钮
      const floatingButton = document.getElementById('web-notes-floating-button');
      if (floatingButton) {
        floatingButton.style.display = 'flex';
      }
    }, 300);
  }
}

/**
 * 发送当前页面URL到iframe
 * 将当前网页的URL发送给笔记应用iframe
 */
function sendPageUrlToIframe() {
  if (!currentIframe) {
    // 如果没有iframe，创建一个新的
    createIframe();
  } else if (currentIframe.contentWindow) {
    // 如果已有iframe，直接发送URL
    currentIframe.contentWindow.postMessage(
      { type: 'PAGE_URL', url: window.location.href },
      '*'
    );
  }
}

/**
 * 创建iframe
 * 创建笔记应用的iframe实例并加载note-app.html
 */
function createIframe() {
  const container = createPopupContainer();
  
  // 移除已有的iframe（如果存在）
  if (currentIframe && currentIframe.parentNode) {
    currentIframe.parentNode.removeChild(currentIframe);
  }
  
  // 创建新的iframe
  currentIframe = document.createElement('iframe');
  currentIframe.id = 'web-notes-iframe';
  currentIframe.src = chrome.runtime.getURL('src/note-app.html');
  
  // 设置iframe样式
  currentIframe.style.cssText = `
    width: 90%;
    max-width: 800px;
    height: 90vh;
    border: none;
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    transform: scale(0.95);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
  `;
  
  // 设置onload事件处理器（只设置一次）
  currentIframe.onload = () => {
    if (currentIframe && currentIframe.contentWindow) {
      currentIframe.contentWindow.postMessage(
        { type: 'PAGE_URL', url: window.location.href },
        '*'
      );
    }
  };
  
  // 添加到弹窗容器
  container.appendChild(currentIframe);
}

/**
 * 初始化悬浮窗和事件监听
 * 初始化笔记扩展功能
 */
function init() {
  // 加载 FontAwesome 图标库
  loadFontAwesome();
  
  // 创建悬浮按钮
  createFloatingButton();
}

/**
 * 当页面加载完成时初始化扩展
 * 根据页面加载状态决定何时初始化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // 如果页面已经加载完成，直接初始化
  init();
}
