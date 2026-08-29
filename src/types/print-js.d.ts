declare module "print-js" {
  interface PrintOptions {
    printable: any;
    type?: "pdf" | "html" | "image" | "json" | "raw-html";
    header?: string;
    headerStyle?: string;
    maxWidth?: number;
    font?: string;
    font_size?: string;
    honorMarginPadding?: boolean;
    honorColor?: boolean;
    targetStyles?: string[];
    targetStyle?: string[];
    css?: string | string[];
    style?: string;
    scanStyles?: boolean;
    onError?: (error: any) => void;
    onLoadingStart?: () => void;
    onLoadingEnd?: () => void;
    onPrintDialogClose?: () => void;
    showModal?: boolean;
    modalMessage?: string;
    documentTitle?: string;
    base64?: boolean;
  }

  function printJS(options: PrintOptions | string): void;
  export default printJS;
}
