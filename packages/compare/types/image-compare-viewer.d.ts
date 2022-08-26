declare module 'image-compare-viewer' {
  interface IOptions {
    controlColor: string;
    showLabels: boolean;
    labelOptions: {
      before: string;
      after: string;
    };
    fluidMode: boolean;
    smoothing: boolean;
  }

  declare class ImageCompareViewer {
    public constructor(elem: HTMLElement, options: Partial<IOptions>);
    public mount(): void
  }

  export default ImageCompareViewer;
}
