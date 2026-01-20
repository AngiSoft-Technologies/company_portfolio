import React, { useState } from 'react';
import FileUploadComponent from '../components/FileUpload';
import { toast } from '../utils/toast';

/**
 * Simple file upload page - uses the advanced FileUpload component
 * For more advanced features, use /admin/upload-manager
 */
const FileUpload = ({ theme }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleUploadComplete = (results) => {
    setUploadedFiles([...uploadedFiles, ...results]);
    toast.success(`Successfully uploaded ${results.length} file(s)!`);
  };

  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <div className={`p-8 ${bgColor} min-h-screen`}>
      <div className="max-w-2xl mx-auto">
        <h1 className={`text-4xl font-bold mb-4 ${textColor}`}>File Upload</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload files quickly. For advanced features like categorization and owner assignment, 
          use <a href="/admin/upload-manager" className="text-teal-600 hover:underline">File Upload Manager</a>.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <FileUploadComponent
            onUpload={handleUploadComplete}
            accept="*/*"
            maxSizeMB={10}
            multiple={true}
            category="general"
            ownerType="general"
            label="Upload Files"
            showPreview={true}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Uploaded Files</h2>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-medium">{file.filename || file.name}</p>
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline text-sm">
                      View File
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload; 