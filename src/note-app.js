import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Dialog } from './dialog-component.js';

// 使用立即执行函数表达式(IIFE)创建模块模式
(function() {
  /**
   * 应用状态管理
   */
  let notes = [];
  let currentNoteId = null;
  let currentPageUrl = '';
  let currentPasswordNoteId = null;
  let unlockedNotes = [];
  let autoSaveTimeout = null;
  
  /**
   * DOM元素引用 - 统一使用const声明（不可变引用）
   */
  const notesList = document.getElementById('notes-list');
  const addNoteBtn = document.getElementById('add-note');
  const noteTitle = document.getElementById('note-title');
  const markdownInput = document.getElementById('markdown-input');
  const notePreviewPanel = document.getElementById('note-preview-panel');
  const noteEditContent = document.getElementById('note-edit-content');
  const toggleEditBtn = document.getElementById('toggle-edit-mode');
  const emptyState = document.getElementById('empty-state');
  const editorContent = document.getElementById('editor-content');
  // 字数统计元素
  const wordCountElement = document.getElementById('word-count');
  // 文件上传元素
  const uploadNoteBtn = document.getElementById('upload-note');
  const fileInput = document.getElementById('file-input');
  // 储存统计元素
  const notesCountElement = document.getElementById('notes-count');
  const totalSizeElement = document.getElementById('total-size');
  const storageProgressBar = document.getElementById('storage-progress-bar');
  const storagePercentageElement = document.getElementById('storage-percentage');

  /**
   * 工具函数 - 密码解码（抽取重复逻辑）
   */
  const decodePassword = (encodedPassword) => {
    return decodeURIComponent(escape(atob(encodedPassword)));
  };

;

  /**
   * 工具函数 - 更新标题输入框状态（减少重复代码）
   */
  const updateNoteTitleState = (noteId) => {
    if (!noteTitle) return;
    const note = notes.find(n => n.id === noteId);
    noteTitle.disabled = note?.password && !isNoteUnlocked(noteId);
  };

  /**
   * 计算并更新储存统计信息
   */
  function updateStorageStats() {
    if (!notesCountElement || !totalSizeElement || !storageProgressBar || !storagePercentageElement) {
      return;
    }
    
    // 计算笔记数量
    const noteCount = notes.length;
    notesCountElement.textContent = noteCount;
    
    // 计算总大小（以字节为单位）
    let totalBytes = 0;
    notes.forEach(note => {
      // 计算每个笔记对象的大小
      const noteSize = new Blob([JSON.stringify(note)]).size;
      totalBytes += noteSize;
    });
    
    // 格式化大小显示
    let sizeText;
    if (totalBytes < 1024) {
      sizeText = `${totalBytes} B`;
    } else if (totalBytes < 1024 * 1024) {
      sizeText = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else {
      sizeText = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    
    totalSizeElement.textContent = sizeText;
    
    // 估算localStorage的总容量（通常为5MB）和使用率
    const estimatedTotalStorage = 4.5 * 1024 * 1024; // 5MB
    const usedPercentage = Math.min((totalBytes / estimatedTotalStorage) * 100, 100);
    
    // 更新进度条和百分比
    storageProgressBar.style.width = `${usedPercentage}%`;
    storagePercentageElement.textContent = `${usedPercentage.toFixed(1)}%`;
    
    // 根据使用率改变进度条颜色
    if (usedPercentage > 80) {
      storageProgressBar.style.backgroundColor = '#f44336'; // 红色
    } else if (usedPercentage > 60) {
      storageProgressBar.style.backgroundColor = '#ff9800'; // 橙色
    } else {
      storageProgressBar.style.backgroundColor = '#4285f4'; // 蓝色
    }
    
    // 根据存储使用率更新添加笔记按钮状态
    updateAddNoteButtonState(usedPercentage);
  }
  
  /**
   * 根据存储使用率更新添加笔记按钮状态
   */
  function updateAddNoteButtonState(usedPercentage) {
    const STORAGE_LIMIT_PERCENTAGE = 90; // 存储限制阈值（90%）
    
    if (addNoteBtn) {
      if (usedPercentage >= STORAGE_LIMIT_PERCENTAGE) {
        addNoteBtn.disabled = true;
        addNoteBtn.title = `存储空间已达${STORAGE_LIMIT_PERCENTAGE}%，请删除一些笔记后再添加`;
        addNoteBtn.style.backgroundColor = '#ccc';
        addNoteBtn.style.cursor = 'not-allowed';
      } else {
        addNoteBtn.disabled = false;
        addNoteBtn.title = '添加新笔记';
        addNoteBtn.style.backgroundColor = '#4285f4';
        addNoteBtn.style.cursor = 'pointer';
      }
    }
  }
  
  /**
   * 检查是否达到存储限制
   */
  function isStorageLimitReached() {
    const estimatedTotalStorage = 4.5 * 1024 * 1024; // 5MB
    const STORAGE_LIMIT_PERCENTAGE = 90; // 存储限制阈值（90%）
    
    // 计算总大小（以字节为单位）
    let totalBytes = 0;
    notes.forEach(note => {
      const noteSize = new Blob([JSON.stringify(note)]).size;
      totalBytes += noteSize;
    });
    
    const usedPercentage = Math.min((totalBytes / estimatedTotalStorage) * 100, 100);
    return usedPercentage >= STORAGE_LIMIT_PERCENTAGE;
  }

  /**
   * 应用程序初始化函数
   */
  function init() {
    loadNotes();
    
    // 监听来自content script的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'PAGE_URL') {
        currentPageUrl = event.data.url;
        filterNotesByUrl();
      }
    });
    
    // 事件监听设置 - 按功能分组
    // 核心操作
    addNoteBtn.addEventListener('click', createNewNote);
    markdownInput.addEventListener('input', autoSaveNote);
    noteTitle.addEventListener('input', autoSaveNote);
    toggleEditBtn.addEventListener('click', toggleEditMode);
    markdownInput.addEventListener('input', updateWordCount);
    
    // 文件上传
    uploadNoteBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    
    // 笔记列表事件委托（优化大量笔记时的性能）
    notesList.addEventListener('click', (e) => {
      const noteItem = e.target.closest('.note-item');
      if (noteItem) {
        const noteId = noteItem.dataset.id;
        selectNote(noteId);
      }
    });
    
    // 初始化
    updatePreview();
    updateWordCount();
    updateEmptyStateDisplay();
    updateStorageStats();
  }

  /**
   * 更新字数统计
   */
  function updateWordCount() {
    const content = markdownInput.value;
    const charCount = content.length;
    const lineCount = content === '' ? 0 : content.split('\n').length;
    
    if (wordCountElement) {
      wordCountElement.textContent = `字数: ${charCount} | 行数: ${lineCount}`;
    }
  }

  /**
   * 从本地存储加载笔记数据
   */
  function loadNotes() {
    try {
      const savedNotes = localStorage.getItem('webNotes');
      notes = savedNotes ? JSON.parse(savedNotes) : [];
      renderNotesList();
    } catch (error) {
      console.error('Failed to load notes:', error);
      notes = [];
      renderNotesList();
    }
  }

  /**
   * 更新空状态和编辑器的显示/隐藏
   */
  function updateEmptyStateDisplay() {
    const hasNotes = notes.length > 0;
    emptyState.style.display = hasNotes && currentNoteId ? 'none' : 'flex';
    editorContent.style.display = hasNotes && currentNoteId ? 'flex' : 'none';
  }

  /**
   * 保存笔记数据到本地存储
   */
  function saveNotesToStorage() {
    try {
      localStorage.setItem('webNotes', JSON.stringify(notes));
      console.log('Notes saved to localStorage');
      updateStorageStats(); // 更新储存统计
    } catch (error) {
      console.error('Failed to save notes:', error);
      showAutoSaveIndicator('保存失败');
    }
  }

  /**
   * 过滤笔记函数
   */
  function filterNotesByUrl() {
    renderNotesList();
  }

  /**
   * 渲染笔记列表
   */
  function renderNotesList() {
    notesList.innerHTML = '';
    updateEmptyStateDisplay();
    
    if (notes.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'note-item';
      emptyItem.style.textAlign = 'center';
      emptyItem.style.padding = '20px';
      emptyItem.style.color = '#5f6368';
      emptyItem.textContent = '暂无笔记';
      notesList.appendChild(emptyItem);
      return;
    }
    
    // 使用文档片段优化DOM操作性能
    const fragment = document.createDocumentFragment();
    
    notes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
      noteItem.dataset.id = note.id;
      noteItem.title = note.title || '未命名笔记';
      
      const contentContainer = document.createElement('div');
      contentContainer.className = 'note-item-content';
      
      const titleElement = document.createElement('div');
      titleElement.className = 'note-item-title';
      titleElement.textContent = note.title || '未命名笔记';
      
      contentContainer.appendChild(titleElement);
      
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'note-item-actions';
      
      // 锁按钮
      const lockBtn = document.createElement('button');
      lockBtn.className = 'lock-note-item-btn';
      lockBtn.innerHTML = note.password ? 
        '<i class="fas fa-lock"></i>' : 
        '<i class="fas fa-lock-open"></i>';
      lockBtn.title = note.password ? '重置或移除密码' : '设置密码';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPasswordModal(note.id);
      });
      actionsContainer.appendChild(lockBtn);
      
      // 下载按钮
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'download-note-item-btn';
      downloadBtn.title = '下载笔记';
      downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadNote(note);
      });
      actionsContainer.appendChild(downloadBtn);
      
      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-note-item-btn';
      deleteBtn.title = '删除笔记';
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentNoteId === note.id) {
          deleteNote();
        } else {
          selectNote(note.id);
          setTimeout(() => deleteNote(), 100);
        }
      });
      actionsContainer.appendChild(deleteBtn);
      
      noteItem.appendChild(contentContainer);
      noteItem.appendChild(actionsContainer);
      fragment.appendChild(noteItem);
    });
    
    notesList.appendChild(fragment);
  }

  /**
   * 创建新笔记
   */
  function createNewNote() {
    // 检查是否达到存储限制
    if (isStorageLimitReached()) {
      const STORAGE_LIMIT_PERCENTAGE = 90; // 存储限制阈值（90%）
      
      // 使用Dialog组件显示提示信息
      const dialogOptions = {
        type: 'confirm',
        title: '存储空间已满',
        message: `当前存储空间已达${STORAGE_LIMIT_PERCENTAGE}%，无法添加新笔记。请删除一些不需要的笔记后再试。`,
        icon: 'error',
        primaryButtonText: '确定',
        showCancelButton: false
      };
      
      Dialog.confirm(dialogOptions);
      return;
    }
    
    const newNote = {
      id: Date.now().toString(),
      title: '新建笔记',
      content: '',
      url: currentPageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    notes.unshift(newNote);
    saveNotesToStorage();
    selectNote(newNote.id);
    renderNotesList();
    
    if (toggleEditBtn && !toggleEditBtn.classList.contains('active')) {
      toggleEditMode();
    }
  }

  /**
   * 限制字符串长度
   */
  function limitStringLength(str, maxLength) {
    return str && str.length > maxLength ? str.substring(0, maxLength) : str;
  }

  /**
   * 选择笔记
   */
  function selectNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    noteTitle.value = note.title || '';
    markdownInput.value = note.content || '';
    
    updateNoteTitleState(noteId);
    updatePreview();
    renderNotesList();
    updateWordCount();
    
    // 重置为预览模式
    toggleEditBtn.querySelector('i').className = 'fas fa-edit';
    toggleEditBtn.title = '编辑模式';
    toggleEditBtn.classList.remove('active');
    notePreviewPanel.style.display = 'block';
    noteEditContent.style.display = 'none';
    
    emptyState.style.display = 'none';
    editorContent.style.display = 'flex';
  }

  /**
   * 检查笔记是否需要密码验证
   */
  function checkNotePassword(noteId, callback) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.password || isNoteUnlocked(noteId)) {
      return true;
    } else {
      showPasswordVerifyModal(noteId, callback);
      return false;
    }
  }

  /**
   * 自动保存笔记（添加防抖优化）
   */
  function autoSaveNote() {
    if (!currentNoteId) return;
    
    // 清除之前的计时器，实现防抖
    clearTimeout(autoSaveTimeout);
    
    autoSaveTimeout = setTimeout(() => {
      const noteIndex = notes.findIndex(n => n.id === currentNoteId);
      if (noteIndex === -1) return;
      
      if (notes[noteIndex].password && !isNoteUnlocked(currentNoteId)) {
        if (noteTitle.value !== notes[noteIndex].title) {
          noteTitle.value = notes[noteIndex].title || '';
        }
        return;
      }
      
      let title = noteTitle.value || '未命名笔记';
      const isTitleTooLong = title.length > 100;
      
      if (isTitleTooLong) {
        title = limitStringLength(title, 100);
        noteTitle.value = title;
        showAutoSaveIndicator('笔记标题请控制在100个字符以内！');
      }
      
      notes[noteIndex] = {
        ...notes[noteIndex],
        title,
        content: markdownInput.value,
        updatedAt: new Date().toISOString()
      };
      
      saveNotesToStorage();
      renderNotesList();
      updatePreview();
    }, 300); // 300ms防抖延迟
  }

  /**
   * 显示自动保存指示器
   */
  function showAutoSaveIndicator(message = '已自动保存') {
    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.textContent = message;
    
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${message === '保存失败' ? '#f44336' : '#4CAF50'};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => indicator.style.opacity = '1', 10);
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 1500);
  }

  // 显示密码设置模态框
  function showPasswordModal(noteId) {
    currentPasswordNoteId = noteId;
    const note = notes.find(n => n.id === noteId);
    
    const dialogOptions = {
      title: note?.password ? '重置或移除密码' : '设置密码',
      icon: 'lock',
      primaryButtonText: '确认',
      secondaryButtonText: '取消',
      showCurrentPassword: !!note?.password,
      inputPlaceholder: note?.password ? '请输入新密码（留空则移除密码）' : '请输入密码',
      onPrimaryButtonClick: (data) => {
        const { currentPassword, newPassword, confirmPassword } = data;
        
        if (!note) {
          return;
        }
        
        if (note.password) {
          const decodedCurrentPassword = decodePassword(note.password);
          if (currentPassword !== decodedCurrentPassword) {
            dialog.showError('原密码错误，请重试');
            return;
          }
          
          if (newPassword === '' && confirmPassword === '') {
            delete note.password;
            saveNotesToStorage();
            renderNotesList();
            dialog.close();
            return;
          }
        }
        
        if (newPassword.length < 4 && newPassword !== '') {
          dialog.showError('密码至少需要4个字符');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          dialog.showError('两次输入的密码不一致');
          return;
        }
        
        if (newPassword !== '') {
          note.password = btoa(unescape(encodeURIComponent(newPassword)));
        }
        
        saveNotesToStorage();
        renderNotesList();
        dialog.close();
      },
      onClose: () => {
        currentPasswordNoteId = null;
      }
    };
    
    const dialog = Dialog.password(dialogOptions);
  }

  // 显示密码验证模态框
  function showPasswordVerifyModal(noteId, callback) {
    currentPasswordNoteId = noteId;
    
    const dialogOptions = {
      title: '此笔记已加密',
      message: '请输入密码解锁笔记',
      icon: 'lock',
      primaryButtonText: '解锁',
      secondaryButtonText: '取消',
      onPrimaryButtonClick: (password) => {
        const note = notes.find(n => n.id === currentPasswordNoteId);
        
        if (!note?.password) {
          dialog.close();
          return;
        }
        
        if (password === decodePassword(note.password)) {
          if (!unlockedNotes.includes(note.id)) {
            unlockedNotes.push(note.id);
          }
          
          updateNoteTitleState(note.id);
          
          if (typeof callback === 'function') {
            callback();
          }
          
          dialog.close();
        } else {
          dialog.showError('密码错误，请重试');
        }
      },
      onClose: () => {
        currentPasswordNoteId = null;
      }
    };
    
    const dialog = Dialog.verifyPassword(dialogOptions);
  }

  // 检查笔记是否已解锁
  function isNoteUnlocked(noteId) {
    const note = notes.find(n => n.id === noteId);
    return !note?.password || unlockedNotes.includes(noteId);
  }

  /**
   * 显示删除确认对话框
   */
  function showDeleteConfirmDialog() {
    if (!currentNoteId) return;
    
    const dialogOptions = {
      title: '确认删除',
      message: '确定要删除这条笔记吗？此操作无法撤销。',
      icon: 'warning',
      primaryButtonText: '删除',
      primaryButtonType: 'danger',
      secondaryButtonText: '取消',
      onPrimaryButtonClick: () => {
        handleConfirmDelete();
      },
      onClose: () => {
        if (currentNoteId) {
          const note = notes.find(n => n.id === currentNoteId);
          if (note?.password) {
            const index = unlockedNotes.indexOf(currentNoteId);
            if (index > -1) {
              unlockedNotes.splice(index, 1);
            }
            updateNoteTitleState(currentNoteId);
          }
        }
      }
    };
    
    const dialog = Dialog.warning(dialogOptions);
  }

  /**
   * 处理确认删除操作
   */
  function handleConfirmDelete() {
    if (!currentNoteId) return;
    
    notes = notes.filter(note => note.id !== currentNoteId);
    currentNoteId = null;
    
    saveNotesToStorage();
    renderNotesList();
    updateEmptyStateDisplay();
  }

  /**
   * 下载笔记为Markdown文件
   */
  function downloadNote(note) {
    try {
      if (note.password && !isNoteUnlocked(note.id)) {
        showPasswordVerifyModal(note.id, () => downloadNoteAfterVerification(note));
        return;
      }
      downloadNoteAfterVerification(note);
    } catch (error) {
      console.error('Failed to download note:', error);
      showAutoSaveIndicator('下载失败');
    }
  }

  /**
   * 实际执行笔记下载的函数
   */
  function downloadNoteAfterVerification(note) {
    try {
      const content = `﻿${note.content}`;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = `${(note.title || '未命名笔记').replace(/[\\/:*?"<>|]/g, '_')}.md`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 0);
      
      showAutoSaveIndicator('下载成功');
    } catch (error) {
      console.error('Failed to download note:', error);
      showAutoSaveIndicator('下载失败');
    }
  }

  /**
   * 删除笔记
   */
  function deleteNote() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (note?.password && !isNoteUnlocked(currentNoteId)) {
      showPasswordVerifyModal(currentNoteId, showDeleteConfirmDialog);
    } else {
      showDeleteConfirmDialog();
    }
  }

  /**
   * 更新预览
   */
  function updatePreview() {
    const html = DOMPurify.sanitize(marked.parse(markdownInput.value));
    notePreviewPanel.innerHTML = html;
  }

  /**
   * 切换编辑模式
   */
  function toggleEditMode() {
    const isEditing = toggleEditBtn.classList.contains('active');
    
    if (isEditing) {
      toggleEditBtn.querySelector('i').className = 'fas fa-edit';
      toggleEditBtn.title = '编辑模式';
      toggleEditBtn.classList.remove('active');
      notePreviewPanel.style.display = 'block';
      noteEditContent.style.display = 'none';
      
      if (currentNoteId) {
        const note = notes.find(n => n.id === currentNoteId);
        if (note?.password && !isNoteUnlocked(currentNoteId)) {
          const index = unlockedNotes.indexOf(currentNoteId);
          if (index > -1) unlockedNotes.splice(index, 1);
          updateNoteTitleState(currentNoteId);
        }
      }
    } else {
      if (!currentNoteId) return;
      
      const note = notes.find(n => n.id === currentNoteId);
      if (note?.password && !isNoteUnlocked(currentNoteId)) {
        showPasswordVerifyModal(currentNoteId, () => {
          toggleEditBtn.querySelector('i').className = 'fas fa-eye';
          toggleEditBtn.title = '预览模式';
          toggleEditBtn.classList.add('active');
          notePreviewPanel.style.display = 'none';
          noteEditContent.style.display = 'block';
          updateNoteTitleState(currentNoteId);
          markdownInput.scrollTop = 0;
        });
      } else {
        toggleEditBtn.querySelector('i').className = 'fas fa-eye';
        toggleEditBtn.title = '预览模式';
        toggleEditBtn.classList.add('active');
        notePreviewPanel.style.display = 'none';
        noteEditContent.style.display = 'block';
        updateNoteTitleState(currentNoteId);
        markdownInput.scrollTop = 0;
      }
    }
  }

  /**
   * 处理文件上传
   */
  function handleFileUpload(event) {
    // 检查是否达到存储限制
    if (isStorageLimitReached()) {
      const STORAGE_LIMIT_PERCENTAGE = 90; // 存储限制阈值（90%）
      
      // 使用Dialog组件显示提示信息
      const dialogOptions = {
        type: 'confirm',
        title: '存储空间已满',
        message: `当前存储空间已达${STORAGE_LIMIT_PERCENTAGE}%，无法导入新笔记。请删除一些不需要的笔记后再试。`,
        icon: 'error',
        primaryButtonText: '确定',
        showCancelButton: false
      };
      
      Dialog.confirm(dialogOptions);
      event.target.value = ''; // 清空文件选择
      return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    const isMarkdownFile = file.name.endsWith('.md') || file.name.endsWith('.markdown');
    const isTextFile = file.name.endsWith('.txt');
    
    if (!isMarkdownFile && !isTextFile) {
      showAutoSaveIndicator('请上传Markdown文件(.md, .markdown)或文本文件(.txt)');
      event.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        let title;
        if (isMarkdownFile) {
          title = file.name.replace(/\.md$|\.markdown$/i, '');
        } else {
          title = file.name.replace(/\.txt$/i, '');
        }
        const content = e.target.result;
        const limitedTitle = limitStringLength(title, 100) || '从文件导入';
        const message = title.length > 100 
          ? '文件上传成功，标题已限制在100个字符以内' 
          : '文件上传成功';
        
        const newNote = {
          id: Date.now().toString(),
          title: limitedTitle,
          content: content,
          url: currentPageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        notes.unshift(newNote);
        saveNotesToStorage();
        selectNote(newNote.id);
        renderNotesList();
        showAutoSaveIndicator(message);
      } catch (error) {
        console.error('Failed to process uploaded file:', error);
        showAutoSaveIndicator('文件上传失败');
      } finally {
        event.target.value = '';
      }
    };
    
    reader.onerror = function() {
      console.error('Failed to read file');
      showAutoSaveIndicator('文件读取失败');
      event.target.value = '';
    };
    
    reader.readAsText(file, 'utf-8');
  }

  /**
   * 当DOM内容加载完成后初始化应用
   */
  document.addEventListener('DOMContentLoaded', init);
})();
