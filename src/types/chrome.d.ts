// Расширяем типы Chrome API если нужно
declare namespace chrome {
  namespace contextMenus {
    interface OnClickData {
      menuItemId: string | number;
      parentMenuItemId?: string | number;
      mediaType?: string;
      linkUrl?: string;
      srcUrl?: string;
      pageUrl?: string;
      frameUrl?: string;
      selectionText?: string;
      editable?: boolean;
      wasChecked?: boolean;
      checked?: boolean;
    }
  }
}