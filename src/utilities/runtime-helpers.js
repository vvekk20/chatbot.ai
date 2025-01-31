export const useUpload = () => {
    const upload = async ({ file }) => {
      // Mock upload functionality
      return { url: `https://mock-upload-url.com/${file.name}` };
    };
  
    return [upload, { loading: false }];
  };
  