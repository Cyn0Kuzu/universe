import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ImageZoomModal from '../components/common/ImageZoomModal';

interface PreviewOptions {
  title?: string;
}

interface ImagePreviewContextValue {
  showPreview: (uri: string, options?: PreviewOptions) => void;
  hidePreview: () => void;
}

interface PreviewState {
  visible: boolean;
  uri: string;
  title?: string;
}

const ImagePreviewContext = createContext<ImagePreviewContextValue | undefined>(undefined);

export const ImagePreviewProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<PreviewState>({
    visible: false,
    uri: '',
    title: undefined,
  });

  const showPreview = useCallback((uri: string, options?: PreviewOptions) => {
    if (!uri) {
      return;
    }

    setState({
      visible: true,
      uri,
      title: options?.title,
    });
  }, []);

  const hidePreview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const contextValue = useMemo<ImagePreviewContextValue>(
    () => ({
      showPreview,
      hidePreview,
    }),
    [showPreview, hidePreview],
  );

  return (
    <ImagePreviewContext.Provider value={contextValue}>
      {children}
      <ImageZoomModal
        visible={state.visible}
        imageUri={state.uri}
        title={state.title}
        onClose={hidePreview}
      />
    </ImagePreviewContext.Provider>
  );
};

export const useImagePreview = (): ImagePreviewContextValue => {
  const context = useContext(ImagePreviewContext);
  if (!context) {
    throw new Error('useImagePreview must be used within an ImagePreviewProvider');
  }
  return context;
};

