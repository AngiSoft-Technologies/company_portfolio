import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from '../utils/toast';

const FileUploadManager = ({ theme }) => {
    const [uploading, setUploading] = useState(false);
    const [category, setCategory] = useState('image');
    const [ownerType, setOwnerType] = useState('general');
    const [ownerId, setOwnerId] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState('');

    const categories = [
        { value: 'avatar', label: 'Profile Picture / Avatar' },
        { value: 'cv', label: 'CV / Resume' },
        { value: 'logo', label: 'Logo' },
        { value: 'document', label: 'Document' },
        { value: 'image', label: 'Image' },
        { value: 'other', label: 'Other' }
    ];

    const ownerTypes = [
        { value: 'general', label: 'General' },
        { value: 'employee', label: 'Employee' },
        { value: 'service', label: 'Service' },
        { value: 'project', label: 'Project' },
        { value: 'booking', label: 'Booking' }
    ];

    const handleUploadComplete = (results) => {
        setUploadedFiles([...uploadedFiles, ...results]);
    };

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const cardBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    return (
        <div className={`p-8 ${bgColor} min-h-screen`}>
            <h1 className="text-4xl font-bold mb-8 ${textColor}">File Upload Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Form */}
                <div className={`${cardBg} rounded-lg p-6`}>
                    <h2 className="text-2xl font-bold mb-4 ${textColor}">Upload Files</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block mb-2 font-semibold">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold">Owner Type</label>
                            <select
                                value={ownerType}
                                onChange={(e) => setOwnerType(e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {ownerTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {ownerType !== 'general' && (
                            <div>
                                <label className="block mb-2 font-semibold">Owner ID (optional)</label>
                                <input
                                    type="text"
                                    value={ownerId}
                                    onChange={(e) => setOwnerId(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Enter owner ID (e.g., employee ID, project ID)"
                                />
                            </div>
                        )}

                        <FileUpload
                            onUpload={handleUploadComplete}
                            accept={
                                category === 'avatar' || category === 'image' || category === 'logo' ? 'image/*' :
                                category === 'cv' || category === 'document' ? '.pdf,.doc,.docx,image/*' :
                                '*/*'
                            }
                            maxSizeMB={category === 'avatar' || category === 'image' ? 5 : 10}
                            multiple={true}
                            category={category}
                            ownerType={ownerType}
                            ownerId={ownerId}
                            label="Upload Files"
                            showPreview={true}
                        />
                    </div>
                </div>

                {/* Uploaded Files List */}
                <div className={`${cardBg} rounded-lg p-6`}>
                    <h2 className="text-2xl font-bold mb-4 ${textColor}">Recently Uploaded</h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {uploadedFiles.length === 0 ? (
                            <p className="text-gray-500">No files uploaded yet</p>
                        ) : (
                            uploadedFiles.map((fileData, idx) => (
                                <div key={idx} className="p-3 bg-gray-600 dark:bg-gray-800 rounded">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{fileData.file?.filename}</p>
                                            <p className="text-xs text-gray-400">
                                                {fileData.file?.mime} • {(fileData.file?.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={fileData.url || fileData.file?.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                            >
                                                View
                                            </a>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(fileData.url || fileData.file?.url);
                                                    alert('URL copied to clipboard!');
                                                }}
                                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                            >
                                                Copy URL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileUploadManager;

