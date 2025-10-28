import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export const saveImage = async (folderName, fileUri) => {
  try {
    
    let fileName = filePath(folderName);
    
    // Read file as base64 (await the async operation)
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // Decode base64 to array buffer
    let imageData = decode(fileBase64);
    
    // Upload to Supabase storage (correct parameter order: fileName, data, options)
    const { data, error } = await supabase
      .storage
      .from('images')
      .upload(fileName, imageData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return null; // Return null on error to match your EnterOtp.js expectation
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase
      .storage
      .from('images')
      .getPublicUrl(fileName);

    return publicUrl; // Return the public URL directly
    
  } catch (error) {
    console.error('Error in saveImage:', error);
    return null;
  }
};

const filePath = (folderName) => {
  return `${folderName}/${new Date().getTime()}.png`;
};

export default saveImage;