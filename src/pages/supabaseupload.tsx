import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Put your actual Supabase details here:
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function UploadPage() {
  const [uploading, setUploading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Upload to your 'images' bucket
      const { error: uploadError } = await supabase.storage
        .from('Slider Images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('Slider Images')
        .getPublicUrl(fileName);
       

      setImageUrl(data.publicUrl);
      alert('Upload successful!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert('Upload Error: ' + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h2>Upload Image Page</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />

      {uploading && <p style={{ color: 'blue' }}>Uploading...</p>}

      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <p>Uploaded Preview:</p>
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{ width: '300px', borderRadius: '8px' }}
          />
          <br />
          <a href={imageUrl} target="_blank" rel="noreferrer">
            View Original
          </a>
          <p>{setImageUrl}</p>
        </div>
      )}
    </div>
  );
}