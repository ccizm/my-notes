// 可复用对话框组件
export class Dialog {
  constructor(options = {}) {
    this.id = options.id || `dialog-${Date.now()}`;
    this.type = options.type || 'confirm'; // confirm, prompt, password, verify-password
    this.title = options.title || '确认操作';
    this.message = options.message || '';
    this.icon = options.icon || 'info'; // info, warning, error, success, lock
    this.primaryButtonText = options.primaryButtonText || '确认';
    this.secondaryButtonText = options.secondaryButtonText || '取消';
    this.primaryButtonType = options.primaryButtonType || 'primary'; // primary, danger
    this.showCancelButton = options.showCancelButton !== undefined ? options.showCancelButton : true;
    this.onPrimaryButtonClick = options.onPrimaryButtonClick || function() {};
    this.onSecondaryButtonClick = options.onSecondaryButtonClick || function() {};
    this.onClose = options.onClose || function() {};
    this.inputPlaceholder = options.inputPlaceholder || '';
    this.inputType = options.inputType || 'text';
    this.showCurrentPassword = options.showCurrentPassword || false;
    this.errorMessage = options.errorMessage || '';
    
    this.init();
  }

  init() {
    // 创建对话框HTML结构
    this.createDialogElement();
    // 设置对话框样式
    this.setDialogStyle();
    // 添加事件监听
    this.addEventListeners();
    // 添加到文档中
    document.body.appendChild(this.dialogOverlay);
    // 设置动画
    this.setupAnimations();
  }

  createDialogElement() {
    // 创建覆盖层
    this.dialogOverlay = document.createElement('div');
    this.dialogOverlay.id = this.id;
    this.dialogOverlay.className = 'modal-overlay';
    
    // 创建对话框容器
    this.dialogContainer = document.createElement('div');
    this.dialogContainer.className = 'delete-confirm-dialog';
    
    // 创建对话框头部
    this.dialogHeader = document.createElement('div');
    this.dialogHeader.className = 'dialog-header';
    
    // 创建图标
    this.dialogIcon = document.createElement('div');
    this.dialogIcon.className = 'dialog-icon';
    this.setIcon(this.icon);
    
    // 创建内容区域
    this.dialogContent = document.createElement('div');
    this.dialogContent.className = 'dialog-content';
    
    // 创建标题
    this.dialogTitle = document.createElement('h3');
    this.dialogTitle.textContent = this.title;
    
    // 创建消息
    if (this.message) {
      this.dialogMessage = document.createElement('p');
      this.dialogMessage.textContent = this.message;
    }
    
    // 组合头部 - 先添加标题和消息
    this.dialogContent.appendChild(this.dialogTitle);
    if (this.dialogMessage) {
      this.dialogContent.appendChild(this.dialogMessage);
    }
    
    // 创建表单（如果需要）
    if (['prompt', 'password', 'verify-password'].includes(this.type)) {
      this.createForm();
    }
    
    this.dialogHeader.appendChild(this.dialogIcon);
    this.dialogHeader.appendChild(this.dialogContent);
    
    // 创建底部按钮区域
    this.dialogFooter = document.createElement('div');
    this.dialogFooter.className = 'dialog-footer';
    
    // 创建取消按钮
    if (this.showCancelButton) {
      this.secondaryButton = document.createElement('button');
      this.secondaryButton.className = 'dialog-btn';
      this.secondaryButton.textContent = this.secondaryButtonText;
    }
    
    // 创建确认按钮
    this.primaryButton = document.createElement('button');
    this.primaryButton.className = `dialog-btn ${this.primaryButtonType}`;
    this.primaryButton.textContent = this.primaryButtonText;
    
    // 组合底部
    if (this.secondaryButton) {
      this.dialogFooter.appendChild(this.secondaryButton);
    }
    this.dialogFooter.appendChild(this.primaryButton);
    
    // 组合对话框
    this.dialogContainer.appendChild(this.dialogHeader);
    this.dialogContainer.appendChild(this.dialogFooter);
    this.dialogOverlay.appendChild(this.dialogContainer);
  }

  createForm() {
    this.dialogForm = document.createElement('div');
    this.dialogForm.id = `${this.id}-form`;
    
    // 根据类型创建不同的输入框
    if (this.type === 'password' && this.showCurrentPassword) {
      this.currentPasswordContainer = document.createElement('div');
      this.currentPasswordContainer.id = `${this.id}-current-password-container`;
      
      this.currentPasswordInput = document.createElement('input');
      this.currentPasswordInput.type = 'password';
      this.currentPasswordInput.placeholder = '请输入原密码';
      this.currentPasswordInput.className = 'modal-input';
      this.currentPasswordInput.style.marginBottom = '12px';
      
      this.currentPasswordContainer.appendChild(this.currentPasswordInput);
      this.dialogForm.appendChild(this.currentPasswordContainer);
    }
    
    this.input = document.createElement('input');
    this.input.type = this.inputType;
    this.input.placeholder = this.inputPlaceholder || (this.type === 'verify-password' ? '请输入密码' : '请输入内容');
    this.input.className = 'modal-input';
    this.input.style.marginTop = this.type === 'verify-password' ? '12px' : '0';
    this.input.style.marginBottom = '12px';
    
    this.dialogForm.appendChild(this.input);
    
    if (this.type === 'password') {
      this.confirmPasswordInput = document.createElement('input');
      this.confirmPasswordInput.type = 'password';
      this.confirmPasswordInput.placeholder = '请确认新密码';
      this.confirmPasswordInput.className = 'modal-input';
      this.confirmPasswordInput.style.marginBottom = '12px';
      
      this.dialogForm.appendChild(this.confirmPasswordInput);
    }
    
    // 创建错误信息显示区域
    this.errorElement = document.createElement('div');
    this.errorElement.id = `${this.id}-error`;
    this.errorElement.style.color = '#f44336';
    this.errorElement.style.fontSize = '12px';
    this.errorElement.style.marginBottom = '8px';
    this.errorElement.style.marginTop = this.type === 'verify-password' ? '8px' : '0';
    this.errorElement.style.display = 'none';
    
    this.dialogForm.appendChild(this.errorElement);
    this.dialogContent.appendChild(this.dialogForm);
  }

  setIcon(iconType) {
    let iconClass = 'fa-info-circle';
    let iconColor = '#4285f4';
    
    switch (iconType) {
      case 'warning':
        iconClass = 'fa-exclamation-triangle';
        iconColor = '#f44336';
        break;
      case 'error':
        iconClass = 'fa-times-circle';
        iconColor = '#f44336';
        break;
      case 'success':
        iconClass = 'fa-check-circle';
        iconColor = '#4CAF50';
        break;
      case 'lock':
        iconClass = 'fa-lock';
        iconColor = '#5f6368';
        break;
    }
    
    this.dialogIcon.innerHTML = `<i class="fas ${iconClass}"></i>`;
    this.dialogIcon.style.color = iconColor;
  }

  setDialogStyle() {
    // 这里可以设置对话框的自定义样式
    // 基础样式通过CSS文件加载
  }

  setupAnimations() {
    // 设置过渡动画
    setTimeout(() => {
      this.dialogOverlay.classList.add('show');
    }, 10);
  }

  addEventListeners() {
    // 背景点击关闭
    this.dialogOverlay.addEventListener('click', (e) => {
      if (e.target === this.dialogOverlay) {
        this.close();
      }
    });
    
    // 二次按钮点击
    if (this.secondaryButton) {
      this.secondaryButton.addEventListener('click', () => {
        this.onSecondaryButtonClick();
        this.close();
      });
    }
    
    // 主按钮点击
    this.primaryButton.addEventListener('click', () => {
      this.handlePrimaryButtonClick();
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Enter' && this.dialogOverlay.classList.contains('show')) {
        this.handlePrimaryButtonClick();
      }
    });
  }

  handlePrimaryButtonClick() {
    if (this.type === 'password') {
      // 密码验证逻辑
      const currentPassword = this.currentPasswordInput ? this.currentPasswordInput.value : '';
      const newPassword = this.input.value;
      const confirmPassword = this.confirmPasswordInput.value;
      
      this.onPrimaryButtonClick({
        currentPassword,
        newPassword,
        confirmPassword
      });
    } else if (['prompt', 'verify-password'].includes(this.type)) {
      // 输入框验证逻辑
      this.onPrimaryButtonClick(this.input.value);
    } else {
      // 普通确认按钮逻辑
      this.onPrimaryButtonClick();
    }
    
    // 关闭对话框
    this.close();
  }

  showError(message) {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = 'block';
    }
  }

  hideError() {
    if (this.errorElement) {
      this.errorElement.textContent = '';
      this.errorElement.style.display = 'none';
    }
  }

  close() {
    this.dialogOverlay.classList.remove('show');
    setTimeout(() => {
      if (this.dialogOverlay.parentNode) {
        this.dialogOverlay.parentNode.removeChild(this.dialogOverlay);
      }
      this.onClose();
    }, 200);
  }

  // 静态方法：快速创建对话框
  static confirm(options) {
    return new Dialog({
      ...options,
      type: 'confirm',
      icon: options.icon || 'info'
    });
  }

  static warning(options) {
    return new Dialog({
      ...options,
      type: 'confirm',
      icon: 'warning',
      primaryButtonType: 'danger'
    });
  }

  static prompt(options) {
    return new Dialog({
      ...options,
      type: 'prompt',
      icon: options.icon || 'info'
    });
  }

  static password(options) {
    return new Dialog({
      ...options,
      type: 'password',
      icon: 'lock',
      primaryButtonText: options.primaryButtonText || '确认'
    });
  }

  static verifyPassword(options) {
    return new Dialog({
      ...options,
      type: 'verify-password',
      icon: 'lock',
      primaryButtonText: options.primaryButtonText || '解锁'
    });
  }
}